/**
 * compile-skill Edge Function
 *
 * Accepts SKILL.md (Markdown + YAML frontmatter), classifies it,
 * compiles natural language → JavaScript via Gemini 2.5 Flash Lite,
 * and upserts the result into openclaw.compiled_skills.
 *
 * Input:  { skill_markdown: string }
 * Output: { name, description, skill_class, compiled_script, verified, cached, error? }
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCorsPreflightRequest, jsonResponse, errorResponse } from '../_shared/cors.ts'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SkillFrontmatter {
  name: string
  description: string
  services?: string[]
  user_invocable?: boolean
  model_invocable?: boolean
  command_dispatch?: 'direct' | 'model'
  env?: string[]
  fetch_allowlist?: string[]
  required_permissions?: string[]
  required_tokens?: string[]
}

type SkillClass = 'deterministic' | 'llm_assisted' | 'llm_required'

interface CompileResult {
  name: string
  description: string
  skill_class: SkillClass
  compiled_script: string | null
  verified: boolean
  cached: boolean
  error?: string
}

// ─── Frontmatter parser ─────────────────────────────────────────────────────

function parseFrontmatter(markdown: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    throw new Error('Invalid SKILL.md: missing YAML frontmatter (---)')
  }

  const yamlStr = match[1]
  const body = match[2].trim()

  // Simple YAML parser for flat key-value + arrays
  const frontmatter: Record<string, any> = {}
  for (const line of yamlStr.split('\n')) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)$/)
    if (!kv) continue
    const [, key, rawVal] = kv
    let val: any = rawVal.trim()

    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    // Parse arrays: [item1, item2]
    else if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
    }
    // Parse booleans
    else if (val === 'true') val = true
    else if (val === 'false') val = false

    frontmatter[key] = val
  }

  if (!frontmatter.name) throw new Error('SKILL.md frontmatter must include "name"')
  if (!frontmatter.description) throw new Error('SKILL.md frontmatter must include "description"')

  // Apply defaults
  frontmatter.user_invocable ??= true
  frontmatter.model_invocable ??= true
  frontmatter.command_dispatch ??= 'model'
  frontmatter.services ??= []
  frontmatter.env ??= []
  frontmatter.fetch_allowlist ??= []
  frontmatter.required_permissions ??= []
  frontmatter.required_tokens ??= []

  return { frontmatter: frontmatter as SkillFrontmatter, body }
}

// ─── Classification ─────────────────────────────────────────────────────────

function classifySkill(frontmatter: SkillFrontmatter, body: string): SkillClass {
  const text = body.toLowerCase()

  // LLM Required indicators: synthesis, reasoning, creative generation
  const llmRequiredSignals = [
    'summarize', 'analyze', 'interpret', 'explain why',
    'compare and contrast', 'generate a report', 'write a',
    'reason about', 'infer', 'creative', 'compose',
  ]
  const llmAssistedSignals = [
    'extract', 'classify', 'parse the response', 'pick the best',
    'format as natural language', 'convert to readable',
  ]

  const hasLLMRequired = llmRequiredSignals.some(s => text.includes(s))
  const hasLLMAssisted = llmAssistedSignals.some(s => text.includes(s))

  // If command_dispatch is 'direct', author is declaring it deterministic
  if (frontmatter.command_dispatch === 'direct') return 'deterministic'

  if (hasLLMRequired) return 'llm_required'
  if (hasLLMAssisted) return 'llm_assisted'

  // Default: if it references APIs/fetch and no LLM signals, it's deterministic
  const fetchSignals = ['fetch', 'api', 'endpoint', 'url', 'http', 'json']
  const hasFetch = fetchSignals.some(s => text.includes(s))
  if (hasFetch) return 'deterministic'

  return 'llm_assisted'
}

// ─── Content hash ───────────────────────────────────────────────────────────

async function hashContent(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Gemini compilation ─────────────────────────────────────────────────────

async function compileWithGemini(
  frontmatter: SkillFrontmatter,
  body: string,
  skillClass: SkillClass,
): Promise<{ script: string | null; error?: string }> {
  // LLM Required skills cannot be compiled to deterministic JS
  if (skillClass === 'llm_required') {
    return {
      script: null,
      error: 'Skill classified as llm_required — cannot compile to deterministic JavaScript. This skill needs an LLM at runtime.',
    }
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return { script: null, error: 'GEMINI_API_KEY not configured' }
  }

  const systemPrompt = `You are a skill compiler. You convert natural language skill descriptions into JavaScript functions.

The function will execute inside a Web Worker with this signature:
- It receives \`context\` (object) and \`fetch\` (sandboxed fetch function)
- context.query: string — the user's query
- context.params: object — extracted parameters
- context.location: { lat, lng, city?, zip? } | null
- context.locale: { language, timezone, currency, units }
- context.tokens: Record<string, string> — OAuth tokens by provider
- context.device: { online, platform }
- It must return a string (HTML or plain text)

Rules:
- Write the BODY of an async function only — no function declaration, no exports
- Use \`fetch\` for HTTP calls (it's sandboxed to the allowlist)
- Access tokens via \`context.tokens.provider_name\`
- Return HTML string for rich output, plain string for simple output
- Handle errors gracefully — return an error message string, don't throw
- No imports, no require, no external dependencies
- Keep it concise — this runs in a sandboxed worker

Skill metadata:
- Name: ${frontmatter.name}
- Description: ${frontmatter.description}
- Services: ${JSON.stringify(frontmatter.services)}
- Fetch allowlist: ${JSON.stringify(frontmatter.fetch_allowlist)}
- Required tokens: ${JSON.stringify(frontmatter.required_tokens)}
- Required permissions: ${JSON.stringify(frontmatter.required_permissions)}
- Environment keys: ${JSON.stringify(frontmatter.env)}

Output ONLY the JavaScript function body. No markdown fences, no explanation.`

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: body }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    },
  )

  if (!resp.ok) {
    const errText = await resp.text()
    return { script: null, error: `Gemini API error (${resp.status}): ${errText}` }
  }

  const data = await resp.json()
  let script = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!script) {
    return { script: null, error: 'Gemini returned empty response' }
  }

  // Strip markdown fences if Gemini included them despite instructions
  script = script.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim()

  return { script }
}

// ─── Verification ───────────────────────────────────────────────────────────

function verifyScript(script: string): boolean {
  // Basic safety checks on compiled output
  const dangerous = [
    'eval(', 'Function(', 'importScripts(',
    'process.', 'require(', 'import ',
    'localStorage', 'sessionStorage', 'indexedDB',
    'document.', 'window.',
    'XMLHttpRequest',
  ]
  return !dangerous.some(d => script.includes(d))
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Authenticate
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('Unauthorized', 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return errorResponse('Unauthorized', 401)

    // Parse input
    const { skill_markdown } = await req.json()
    if (!skill_markdown || typeof skill_markdown !== 'string') {
      return errorResponse('skill_markdown is required')
    }

    // Parse frontmatter
    const { frontmatter, body } = parseFrontmatter(skill_markdown)

    // Check cache by content hash
    const contentHash = await hashContent(skill_markdown)
    const { data: existing } = await supabase
      .schema('openclaw')
      .from('compiled_skills')
      .select('*')
      .eq('content_hash', contentHash)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return jsonResponse({
        name: existing.name,
        description: existing.description,
        skill_class: existing.skill_class,
        compiled_script: existing.compiled_script,
        verified: existing.verified,
        cached: true,
      } satisfies CompileResult)
    }

    // Classify
    const skillClass = classifySkill(frontmatter, body)

    // Compile
    const { script, error: compileError } = await compileWithGemini(frontmatter, body, skillClass)

    // Verify
    const verified = script ? verifyScript(script) : false

    // Upsert into compiled_skills
    const { error: upsertError } = await supabase
      .schema('openclaw')
      .from('compiled_skills')
      .upsert({
        user_id: user.id,
        name: frontmatter.name,
        description: frontmatter.description,
        content_hash: contentHash,
        skill_class: skillClass,
        source_markdown: skill_markdown,
        compiled_script: script,
        verified,
        compiled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,name',
      })

    if (upsertError) {
      return errorResponse(`Database error: ${upsertError.message}`, 500)
    }

    const result: CompileResult = {
      name: frontmatter.name,
      description: frontmatter.description,
      skill_class: skillClass,
      compiled_script: script,
      verified,
      cached: false,
      ...(compileError ? { error: compileError } : {}),
    }

    return jsonResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return errorResponse(message, 500)
  }
})
