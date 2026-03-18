<script setup lang="ts">
import { marked } from 'marked'

const props = defineProps<{
  entry: {
    query: string
    markdown?: string | null
    script?: string | null
    nano_prompt?: string | null
    required_permissions?: string[]
    required_tokens?: string[]
    fetch_allowlist?: string[]
    follow_ups?: string[]
  }
}>()

const emit = defineEmits<{
  followUp: [query: string]
}>()

const renderedHtml = computed(() => {
  if (!props.entry.markdown) return ''
  return marked.parse(props.entry.markdown) as string
})
</script>

<template>
  <article class="entry">
    <div class="entry-query">
      <span class="entry-query-icon" aria-hidden="true">&#x2192;</span>
      {{ entry.query }}
    </div>
    <div
      v-if="renderedHtml"
      class="entry-content"
      v-html="renderedHtml"
    />
    <PageletRunner v-if="entry.script" :entry="entry" :query="entry.query" />

    <div v-if="entry.follow_ups?.length" class="entry-followups">
      <button
        v-for="followUp in entry.follow_ups"
        :key="followUp"
        class="followup-chip"
        @click="emit('followUp', followUp)"
      >
        {{ followUp }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.entry {
  animation: fadeInUp var(--dur-slow) var(--ease-out) both;
  padding-bottom: var(--sp-8);
  border-bottom: 1px solid var(--c-deep);
  margin-bottom: var(--sp-8);
}

.entry:last-child {
  border-bottom: none;
}

.entry-query {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-family: var(--font-brand);
  font-size: var(--fs-md);
  color: var(--c-glow);
  margin-bottom: var(--sp-5);
  letter-spacing: -0.01em;
}

.entry-query-icon {
  flex-shrink: 0;
  opacity: 0.5;
  font-size: var(--fs-sm);
}

.entry-content {
  color: var(--c-foam);
  line-height: var(--lh-relaxed);
}

.entry-content :deep(h1),
.entry-content :deep(h2),
.entry-content :deep(h3) {
  color: var(--c-crest);
}

.entry-content :deep(a) {
  color: var(--c-glow);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

.entry-content :deep(a:hover) {
  color: var(--c-glow-bright);
}

.entry-followups {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-5);
}

.followup-chip {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  color: var(--c-drift);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.followup-chip:hover {
  color: var(--c-glow);
  border-color: var(--c-glow-dim);
  background: var(--c-glow-faint);
  transform: translateY(-1px);
}
</style>
