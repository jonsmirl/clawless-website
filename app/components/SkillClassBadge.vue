<script setup lang="ts">
defineProps<{
  skillClass: 'deterministic' | 'llm_assisted' | 'llm_required'
}>()

const labels: Record<string, string> = {
  deterministic: 'Deterministic',
  llm_assisted: 'LLM Assisted',
  llm_required: 'LLM Required',
}
</script>

<template>
  <span
    class="skill-badge"
    :class="`skill-badge--${skillClass}`"
  >
    {{ labels[skillClass] || skillClass }}
  </span>
</template>

<style scoped>
.skill-badge {
  display: inline-block;
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  font-weight: 500;
  border-radius: var(--radius-full);
  padding: var(--sp-1) var(--sp-2);
  white-space: nowrap;
}

.skill-badge--deterministic {
  background: var(--c-glow-faint);
  color: var(--c-glow);
}

.skill-badge--llm_assisted {
  background: #f59e0b22;
  color: var(--c-warning);
}

.skill-badge--llm_required {
  background: #ef444422;
  color: var(--c-error);
}
</style>
