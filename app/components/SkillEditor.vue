<script setup lang="ts">
import type { CompiledSkill, CompileResponse } from '~/composables/useSkills'

type Tab = 'edit' | 'compiled' | 'test'
type CompileStatus = 'idle' | 'compiling' | 'success' | 'cached' | 'error'

const TEMPLATE = `---
name: my-skill
description: Describe what this skill does
services: []
user_invocable: true
model_invocable: true
command_dispatch: model
env: []
fetch_allowlist: []
required_tokens: []
required_permissions: []
---

Write your skill instructions here.

Deterministic skills (API lookups, data transforms) compile to JS automatically.
Skills needing summarization or reasoning are classified as LLM-assisted or LLM-required.
`

const emit = defineEmits<{
  compiled: []
}>()

const activeTab = ref<Tab>('edit')
const source = ref(TEMPLATE)
const compiledScript = ref<string | null>(null)
const compileStatus = ref<CompileStatus>('idle')
const compileError = ref('')
const skillClass = ref<CompiledSkill['skill_class'] | null>(null)
const activeSkillId = ref<string | undefined>()

const { compileSkill } = useSkills()

function reset() {
  source.value = TEMPLATE
  compiledScript.value = null
  compileStatus.value = 'idle'
  compileError.value = ''
  skillClass.value = null
  activeSkillId.value = undefined
  activeTab.value = 'edit'
}

function loadSkill(skill: CompiledSkill) {
  source.value = skill.source_markdown
  compiledScript.value = skill.compiled_script
  skillClass.value = skill.skill_class
  activeSkillId.value = skill.id
  compileStatus.value = skill.verified ? 'success' : 'idle'
  compileError.value = ''
  activeTab.value = 'edit'
}

async function handleCompile() {
  compileStatus.value = 'compiling'
  compileError.value = ''

  try {
    const result: CompileResponse = await compileSkill(source.value)

    compiledScript.value = result.compiled_script
    skillClass.value = (result.skill_class as CompiledSkill['skill_class']) || null
    compileStatus.value = result.cached ? 'cached' : 'success'

    if (result.error) {
      compileError.value = result.error
      compileStatus.value = 'error'
    } else {
      activeTab.value = 'compiled'
      emit('compiled')
    }
  } catch (err: any) {
    compileError.value = err?.message || 'Compilation failed'
    compileStatus.value = 'error'
  }
}

defineExpose({ reset, loadSkill, activeSkillId })
</script>

<template>
  <div class="editor">
    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        v-for="tab in (['edit', 'compiled', 'test'] as Tab[])"
        :key="tab"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab === 'edit' ? 'Edit' : tab === 'compiled' ? 'Compiled' : 'Test' }}
      </button>
    </div>

    <!-- Edit tab -->
    <div v-show="activeTab === 'edit'" class="tab-panel">
      <textarea
        v-model="source"
        class="source-textarea"
        spellcheck="false"
      />
      <div class="edit-footer">
        <SkillClassBadge v-if="skillClass" :skill-class="skillClass" />
        <div class="edit-spacer" />
        <button
          class="compile-btn"
          :disabled="compileStatus === 'compiling'"
          @click="handleCompile"
        >
          <span v-if="compileStatus === 'compiling'" class="compile-spinner" />
          <span
            v-else
            class="compile-dot"
            :class="{
              'compile-dot--success': compileStatus === 'success',
              'compile-dot--cached': compileStatus === 'cached',
              'compile-dot--error': compileStatus === 'error',
            }"
          />
          {{ compileStatus === 'compiling' ? 'Compiling...' : 'Compile' }}
        </button>
      </div>
      <div v-if="compileError" class="compile-error">
        <span class="compile-error-icon">&#9888;</span>
        <span class="compile-error-msg">{{ compileError }}</span>
      </div>
    </div>

    <!-- Compiled tab -->
    <div v-show="activeTab === 'compiled'" class="tab-panel">
      <div v-if="skillClass === 'llm_required'" class="compiled-warning">
        This skill is classified as LLM Required and cannot be compiled to deterministic JavaScript.
      </div>
      <div v-else-if="compiledScript" class="compiled-code">
        <pre><code>{{ compiledScript }}</code></pre>
      </div>
      <div v-else class="compiled-empty">
        No compiled output yet. Write a skill and click Compile.
      </div>
    </div>

    <!-- Test tab -->
    <div v-show="activeTab === 'test'" class="tab-panel">
      <SkillTestRunner :compiled-script="compiledScript" />
    </div>
  </div>
</template>

<style scoped>
.editor {
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--c-trench);
}

.tab-btn {
  flex: 1;
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-drift);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: var(--sp-3) var(--sp-4);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.tab-btn:hover {
  color: var(--c-foam);
}

.tab-btn--active {
  color: var(--c-glow);
  border-bottom-color: var(--c-glow);
}

.tab-panel {
  padding: var(--sp-4);
}

.source-textarea {
  width: 100%;
  min-height: 300px;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-sm);
  padding: var(--sp-3);
  resize: vertical;
  outline: none;
  line-height: var(--lh-body);
  transition: border-color var(--dur-fast) var(--ease-out);
  box-sizing: border-box;
}

.source-textarea:focus {
  border-color: var(--c-glow-dim);
}

.edit-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}

.edit-spacer {
  flex: 1;
}

.compile-btn {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-abyss);
  background: var(--c-glow);
  border: none;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.compile-btn:hover:not(:disabled) {
  background: var(--c-glow-bright);
  box-shadow: var(--shadow-glow);
}

.compile-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.compile-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--c-abyss);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.compile-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-abyss);
}

.compile-dot--success {
  background: var(--c-abyss);
  box-shadow: 0 0 6px var(--c-abyss);
}

.compile-dot--cached {
  background: var(--c-abyss);
  opacity: 0.5;
}

.compile-dot--error {
  background: var(--c-error);
}

.compile-error {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
}

.compile-error-icon {
  color: var(--c-error);
  flex-shrink: 0;
}

.compile-error-msg {
  color: var(--c-drift);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  word-break: break-word;
}

.compiled-code pre {
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-sm);
  padding: var(--sp-3);
  overflow-x: auto;
}

.compiled-code code {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  line-height: var(--lh-body);
}

.compiled-empty {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  padding: var(--sp-4) 0;
}

.compiled-warning {
  font-size: var(--fs-sm);
  color: var(--c-warning);
  padding: var(--sp-4);
  background: #f59e0b11;
  border: 1px solid #f59e0b33;
  border-radius: var(--radius-md);
}

@media (max-width: 640px) {
  .source-textarea {
    min-height: 200px;
  }

  .compile-btn {
    width: 100%;
    justify-content: center;
  }

  .edit-footer {
    flex-wrap: wrap;
  }
}
</style>
