<script setup lang="ts">
interface Entry {
  id: string
  query: string
  markdown?: string | null
  script?: string | null
  nano_prompt?: string | null
  follow_ups?: string[]
  timestamp?: string
}

const entries = ref<Entry[]>([])
const loading = ref(false)
const resultsContainer = ref<HTMLElement | null>(null)

const config = useRuntimeConfig()
const API_URL = config.public.apiUrl || 'http://localhost:8787'

async function handleQuery(query: string) {
  loading.value = true

  try {
    // TODO: Phase 1 — walk semantic index for cached hit
    // Call server /miss for generation
    const entry = await callMiss(query)
    entries.value.push(entry)

    // Scroll to the new result
    await nextTick()
    resultsContainer.value?.lastElementChild?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  catch (err) {
    console.error('Query failed:', err)
    entries.value.push({
      id: crypto.randomUUID(),
      query,
      markdown: '**Error**: Could not generate a response. Please try again.',
      follow_ups: [],
    })
  }
  finally {
    loading.value = false
  }
}

function handleFollowUp(query: string) {
  handleQuery(query)
}

async function callMiss(query: string): Promise<Entry> {
  const res = await fetch(`${API_URL}/miss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Server error ${res.status}: ${err}`)
  }
  return await res.json()
}
</script>

<template>
  <div class="page">
    <!-- Empty state: centered branding -->
    <div v-if="entries.length === 0 && !loading" class="hero">
      <div class="hero-glow" />
      <h1 class="hero-title">
        Claw<span class="hero-accent">less</span>
      </h1>
      <p class="hero-sub">
        No install. No API keys. Just ask.
      </p>
    </div>

    <!-- Results -->
    <div ref="resultsContainer" class="results">
      <EntryResult
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @follow-up="handleFollowUp"
      />

      <!-- Loading skeleton -->
      <div v-if="loading" class="skeleton">
        <div class="skeleton-bar skeleton-bar--short" />
        <div class="skeleton-bar" />
        <div class="skeleton-bar" />
        <div class="skeleton-bar skeleton-bar--medium" />
      </div>
    </div>

    <!-- Prompt input pinned to bottom -->
    <div class="prompt-area">
      <PromptInput :loading="loading" @submit="handleQuery" />
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - var(--header-h));
  padding: 0 var(--sp-5);
}

/* ─── Hero (empty state) ─── */
.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  padding-bottom: var(--sp-20);
}

.hero-glow {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--c-glow-dim) 0%, transparent 70%);
  filter: blur(60px);
  pointer-events: none;
  animation: breathe 6s ease-in-out infinite;
}

.hero-title {
  font-family: var(--font-brand);
  font-size: var(--fs-3xl);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--c-crest);
  position: relative;
  z-index: 1;
}

.hero-accent {
  color: var(--c-glow);
  font-weight: 400;
}

.hero-sub {
  font-size: var(--fs-md);
  color: var(--c-drift);
  margin-top: var(--sp-3);
  position: relative;
  z-index: 1;
}

/* ─── Results ─── */
.results {
  flex: 1;
  max-width: var(--max-content);
  width: 100%;
  margin: 0 auto;
  padding: var(--sp-8) 0;
}

/* ─── Loading skeleton ─── */
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  animation: fadeInUp var(--dur-slow) var(--ease-out) both;
}

.skeleton-bar {
  height: 14px;
  background: linear-gradient(
    90deg,
    var(--c-deep) 25%,
    var(--c-trench) 50%,
    var(--c-deep) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
  width: 100%;
}

.skeleton-bar--short {
  width: 40%;
}

.skeleton-bar--medium {
  width: 70%;
}

/* ─── Prompt area ─── */
.prompt-area {
  position: sticky;
  bottom: 0;
  padding: var(--sp-4) 0 var(--sp-6);
  background: linear-gradient(to top, var(--c-void) 60%, transparent);
}

/* ─── Responsive ─── */
@media (max-width: 640px) {
  .hero-title {
    font-size: var(--fs-2xl);
  }

  .hero-sub {
    font-size: var(--fs-base);
  }

  .page {
    padding: 0 var(--sp-3);
  }

  .prompt-area {
    padding: var(--sp-3) 0 var(--sp-4);
  }
}
</style>
