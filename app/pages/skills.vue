<script setup lang="ts">
import type { CompiledSkill } from '~/composables/useSkills'
import SkillEditor from '~/components/SkillEditor.vue'
import SkillLibrary from '~/components/SkillLibrary.vue'

const user = useSupabaseUser()
const editorRef = ref<InstanceType<typeof SkillEditor> | null>(null)
const libraryRef = ref<InstanceType<typeof SkillLibrary> | null>(null)

const activeSkillId = computed(() => editorRef.value?.activeSkillId)

function onLoadSkill(skill: CompiledSkill) {
  editorRef.value?.loadSkill(skill)
}

function onNewSkill() {
  editorRef.value?.reset()
}

function onCompiled() {
  libraryRef.value?.refresh()
}
</script>

<template>
  <div class="page-inner">
    <div class="page-header">
      <NuxtLink to="/" class="back-link">
        ← Back
      </NuxtLink>
      <h1 class="page-title">Skill Workbench</h1>
      <p class="page-sub">
        Write, compile, and test skills. Compilation is handled by Gemini Flash Lite — fast and free.
      </p>
    </div>

    <!-- Auth gate -->
    <div v-if="!user" class="auth-gate">
      <p class="auth-gate-text">Sign in to create and manage skills.</p>
      <NuxtLink to="/settings" class="auth-gate-btn">
        Sign in
      </NuxtLink>
    </div>

    <template v-else>
      <SkillLibrary
        ref="libraryRef"
        :active-skill-id="activeSkillId"
        @load="onLoadSkill"
        @new-skill="onNewSkill"
      />

      <SkillEditor
        ref="editorRef"
        class="editor-section"
        @compiled="onCompiled"
      />
    </template>
  </div>
</template>

<style scoped>
.page-inner {
  max-width: var(--max-content);
  margin: 0 auto;
  padding: var(--sp-8) var(--sp-5);
}

.back-link {
  display: inline-block;
  font-size: var(--fs-sm);
  color: var(--c-drift);
  margin-bottom: var(--sp-6);
  transition: color var(--dur-fast) var(--ease-out);
}

.back-link:hover {
  color: var(--c-glow);
}

.page-header {
  margin-bottom: var(--sp-8);
}

.page-title {
  font-family: var(--font-brand);
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-crest);
  letter-spacing: -0.02em;
  margin-bottom: var(--sp-3);
}

.page-sub {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  line-height: var(--lh-body);
}

.auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-10);
  text-align: center;
}

.auth-gate-text {
  font-size: var(--fs-base);
  color: var(--c-drift);
}

.auth-gate-btn {
  display: inline-block;
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-abyss);
  background: var(--c-glow);
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--radius-full);
  transition: all var(--dur-fast) var(--ease-out);
}

.auth-gate-btn:hover {
  background: var(--c-glow-bright);
  box-shadow: var(--shadow-glow);
}

.editor-section {
  margin-top: var(--sp-5);
}

@media (max-width: 640px) {
  .page-inner {
    padding: var(--sp-3);
  }
}
</style>
