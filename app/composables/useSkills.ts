/**
 * Skills composable — CRUD for compiled skills via Supabase (openclaw schema).
 */
import type { Database } from '~/types/database.types'

export interface CompiledSkill {
  id: string
  name: string
  description: string
  skill_class: 'deterministic' | 'llm_assisted' | 'llm_required'
  source_markdown: string
  compiled_script: string | null
  verified: boolean
  compiled_at: string
  updated_at: string
}

export interface CompileResponse {
  name: string
  skill_class: string
  compiled_script: string | null
  verified: boolean
  cached: boolean
  error?: string
}

export function useSkills() {
  const client = useSupabaseClient<Database>()

  // Helper to access the openclaw schema
  const openclaw = () => client.schema('openclaw')

  async function listSkills(): Promise<CompiledSkill[]> {
    const { data, error } = await openclaw()
      .from('compiled_skills')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data as CompiledSkill[]) || []
  }

  async function compileSkill(skillMarkdown: string): Promise<CompileResponse> {
    const { data, error } = await client.functions.invoke('compile-skill', {
      body: { skill_markdown: skillMarkdown },
    })

    if (error) throw error
    return data as CompileResponse
  }

  async function deleteSkill(id: string): Promise<void> {
    const { error } = await openclaw()
      .from('compiled_skills')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  return { listSkills, compileSkill, deleteSkill }
}
