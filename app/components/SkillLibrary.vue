<script setup lang="ts">
import type { CompiledSkill } from '~/composables/useSkills'

const props = defineProps<{
  activeSkillId?: string
}>()

const emit = defineEmits<{
  load: [skill: CompiledSkill]
  'new-skill': []
}>()

const { listSkills } = useSkills()
const skills = ref<CompiledSkill[]>([])
const loading = ref(true)

async function refresh() {
  loading.value = true
  try {
    skills.value = await listSkills()
  } catch {
    // silent — list may be empty
  } finally {
    loading.value = false
  }
}

function onDeleted(id: string) {
  skills.value = skills.value.filter(s => s.id !== id)
}

onMounted(() => {
  if (import.meta.client) refresh()
})

defineExpose({ refresh })
</script>

<template>
  <div class="library">
    <div class="library-header">
      <h2 class="library-title">Skill Library</h2>
    </div>

    <div v-if="loading" class="library-loading">
      <span class="library-spinner" />
      <span class="library-loading-text">Loading skills...</span>
    </div>

    <div v-else-if="skills.length === 0" class="library-empty">
      No skills yet. Create your first one below.
    </div>

    <div v-else class="library-list">
      <SkillCard
        v-for="skill in skills"
        :key="skill.id"
        :skill="skill"
        :active="skill.id === activeSkillId"
        @load="emit('load', $event)"
        @deleted="onDeleted"
      />
    </div>

    <button class="new-skill-btn" @click="emit('new-skill')">
      + New Skill
    </button>
  </div>
</template>

<style scoped>
.library {
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  padding: var(--sp-4);
}

.library-header {
  margin-bottom: var(--sp-3);
}

.library-title {
  font-family: var(--font-brand);
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-crest);
  letter-spacing: -0.02em;
}

.library-loading {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) 0;
}

.library-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--c-shelf);
  border-top-color: var(--c-glow);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.library-loading-text {
  font-size: var(--fs-sm);
  color: var(--c-drift);
}

.library-empty {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  padding: var(--sp-4) 0;
}

.library-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.new-skill-btn {
  display: block;
  width: 100%;
  margin-top: var(--sp-3);
  padding: var(--sp-2) var(--sp-4);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-glow);
  background: var(--c-glow-faint);
  border: 1px dashed var(--c-glow-dim);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.new-skill-btn:hover {
  background: var(--c-glow-dim);
  border-style: solid;
}
</style>
