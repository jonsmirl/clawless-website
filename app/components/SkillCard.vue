<script setup lang="ts">
import type { CompiledSkill } from '~/composables/useSkills'

const props = defineProps<{
  skill: CompiledSkill
  active: boolean
}>()

const emit = defineEmits<{
  load: [skill: CompiledSkill]
  deleted: [id: string]
}>()

const { deleteSkill } = useSkills()
const deleting = ref(false)

async function handleDelete() {
  if (!confirm(`Delete skill "${props.skill.name}"?`)) return
  deleting.value = true
  try {
    await deleteSkill(props.skill.id)
    emit('deleted', props.skill.id)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="skill-card" :class="{ 'skill-card--active': active }">
    <div class="skill-info">
      <div class="skill-name">{{ skill.name }}</div>
      <div class="skill-desc">{{ skill.description }}</div>
      <div class="skill-meta">
        <SkillClassBadge :skill-class="skill.skill_class" />
        <span class="status-dot" :class="skill.verified ? 'status-dot--verified' : 'status-dot--unverified'" />
      </div>
    </div>
    <div class="skill-actions">
      <button class="skill-btn skill-btn--load" @click="emit('load', skill)">
        Load
      </button>
      <button
        class="skill-btn skill-btn--delete"
        :disabled="deleting"
        @click="handleDelete"
      >
        {{ deleting ? '...' : 'Delete' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.skill-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  gap: var(--sp-4);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.skill-card--active {
  border-color: var(--c-glow-dim);
}

.skill-info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.skill-name {
  font-size: var(--fs-base);
  font-weight: 500;
  font-family: var(--font-mono);
  color: var(--c-crest);
}

.skill-desc {
  font-size: var(--fs-xs);
  color: var(--c-drift);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-top: var(--sp-1);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot--verified {
  background: var(--c-glow);
  box-shadow: 0 0 6px var(--c-glow-dim);
}

.status-dot--unverified {
  background: var(--c-shelf);
}

.skill-actions {
  display: flex;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.skill-btn {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.skill-btn--load {
  background: var(--c-glow);
  color: var(--c-abyss);
}

.skill-btn--load:hover {
  background: var(--c-glow-bright);
}

.skill-btn--delete {
  background: var(--c-trench);
  color: var(--c-drift);
  border: 1px solid var(--c-shelf);
}

.skill-btn--delete:hover:not(:disabled) {
  color: var(--c-error);
  border-color: var(--c-error);
}

.skill-btn--delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .skill-card {
    flex-direction: column;
    align-items: stretch;
  }

  .skill-actions {
    justify-content: stretch;
  }

  .skill-btn {
    flex: 1;
    text-align: center;
  }
}
</style>
