<script setup lang="ts">
interface Entry {
  id: string
  query: string
  markdown?: string | null
  script?: string | null
  nano_prompt?: string | null
  required_permissions?: string[]
  required_tokens?: string[]
  fetch_allowlist?: string[]
  follow_ups?: string[]
  timestamp?: string
}

const history = ref<Entry[]>([])
const currentIndex = ref(-1) // -1 = hero/empty state
const loading = ref(false)
const lastSource = ref<'cache' | 'miss' | ''>('')
const resultView = ref<HTMLElement | null>(null)
const rejection = ref<{ rejected: boolean; candidates?: Array<{ query: string; score: number }> } | null>(null)

const config = useRuntimeConfig()
const API_URL = config.public.apiUrl || 'http://localhost:8787'
const CDN_URL = config.public.cdnUrl || 'https://cdn.cesproofs.org'
const { modelReady, modelLoading, indexSize, search, loadIndex } = useSearch()

const currentEntry = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= history.value.length) return null
  return history.value[currentIndex.value]
})

const showHero = computed(() => currentIndex.value < 0 && !loading.value && !rejection.value)

async function handleQuery(query: string) {
  loading.value = true
  lastSource.value = ''
  rejection.value = null

  try {
    const match = await search(query)
    let entry: Entry

    // Gibberish rejection from Worker
    if (match && match.rejected) {
      rejection.value = {
        rejected: true,
        candidates: match.candidates,
      }
      loading.value = false
      return
    }

    if (match && match.match && match.has_article && match.url) {
      // Index hit WITH article — fetch from R2 CDN (instant)
      const resp = await fetch(match.url)
      if (resp.ok) {
        entry = await resp.json()
        entry.query = query
        lastSource.value = 'cache'
      }
      else {
        // Article fetch failed — generate fresh
        entry = await callMiss(query)
        lastSource.value = 'miss'
      }
    }
    else if (match && match.match && !match.has_article) {
      // Index hit WITHOUT article — query is known but no page yet
      entry = await callMiss(query)
      lastSource.value = 'miss'
    }
    else {
      // Recognizable or no match — generate via /miss
      entry = await callMiss(query)
      lastSource.value = 'miss'
    }

    // Trim any forward history if we navigated back then searched
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    history.value.push(entry)
    currentIndex.value = history.value.length - 1

    // Push browser history state
    window.history.pushState({ idx: currentIndex.value }, '', `/?q=${encodeURIComponent(query)}`)

    // Scroll result area to top
    await nextTick()
    resultView.value?.scrollTo(0, 0)
  }
  catch (err: any) {
    console.error('Query failed:', err)
    // Check if it was a server 422 (rejected by server)
    const is422 = err?.message?.includes('422')
    history.value.push({
      id: crypto.randomUUID(),
      query,
      markdown: is422
        ? '**Could not process this query.** Try rephrasing or searching for something else.'
        : '**Error**: Could not generate a response. Please try again.',
      follow_ups: [],
    })
    currentIndex.value = history.value.length - 1
    window.history.pushState({ idx: currentIndex.value }, '', `/?q=${encodeURIComponent(query)}`)
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

// Handle browser back/forward
if (import.meta.client) {
  onMounted(() => {
    window.addEventListener('popstate', (e) => {
      if (e.state && typeof e.state.idx === 'number') {
        currentIndex.value = e.state.idx
      }
      else {
        currentIndex.value = -1
      }
      nextTick(() => resultView.value?.scrollTo(0, 0))
    })
  })
}
</script>

<template>
  <div class="page">
    <!-- Empty state: centered branding -->
    <div v-if="showHero" class="hero">
      <div class="hero-glow" />
      <h1 class="hero-title">
        Claw<span class="hero-accent">less</span>
      </h1>
      <p class="hero-sub">
        No install. No API keys. Just ask.
      </p>
      <p v-if="modelLoading" class="hero-status">
        <span class="status-dot status-dot--loading" /> Loading search model...
      </p>
      <p v-else-if="modelReady && indexSize > 0" class="hero-status">
        <span class="status-dot status-dot--ready" /> {{ indexSize }} entries indexed
      </p>
      <p v-else-if="modelReady" class="hero-status">
        <span class="status-dot status-dot--ready" /> Search ready
      </p>
      <p v-else class="hero-status">
        <span class="status-dot status-dot--off" /> Search unavailable
      </p>
    </div>

    <!-- Gibberish rejection -->
    <div v-else-if="rejection" class="result-view">
      <div class="rejection">
        <p class="rejection-msg">This doesn't look like a search query.</p>
        <div v-if="rejection.candidates?.length" class="rejection-suggestions">
          <p class="rejection-hint">Did you mean:</p>
          <button
            v-for="c in rejection.candidates"
            :key="c.query"
            class="suggestion-chip"
            @click="rejection = null; handleQuery(c.query)"
          >
            {{ c.query }}
          </button>
        </div>
      </div>
    </div>

    <!-- Single result view -->
    <div v-else-if="currentEntry" ref="resultView" class="result-view">
      <EntryResult
        :key="currentEntry.id"
        :entry="currentEntry"
        @follow-up="handleFollowUp"
      />
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="result-view">
      <div class="skeleton">
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
  height: calc(100dvh - var(--header-h));
  padding: 0 var(--sp-5);
  overflow: hidden;
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

.hero-status {
  font-size: var(--fs-xs);
  color: var(--c-shelf);
  margin-top: var(--sp-4);
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot--ready {
  background: var(--c-glow);
  box-shadow: 0 0 6px var(--c-glow);
}

.status-dot--loading {
  background: var(--c-warning);
  animation: breathe 1.5s ease-in-out infinite;
}

.status-dot--off {
  background: var(--c-drift);
}

/* ─── Result view (single entry, scrollable) ─── */
.result-view {
  flex: 1;
  max-width: var(--max-content);
  width: 100%;
  margin: 0 auto;
  padding: var(--sp-6) 0;
  overflow-y: auto;
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

/* ─── Rejection state ─── */
.rejection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-8) 0;
  text-align: center;
}

.rejection-msg {
  font-size: var(--fs-lg);
  color: var(--c-drift);
}

.rejection-suggestions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
}

.rejection-hint {
  font-size: var(--fs-sm);
  color: var(--c-shelf);
  margin-bottom: var(--sp-1);
}

.suggestion-chip {
  background: var(--c-trench);
  color: var(--c-foam);
  border: 1px solid var(--c-shelf);
  border-radius: var(--radius-md);
  padding: var(--sp-2) var(--sp-4);
  font-size: var(--fs-sm);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.suggestion-chip:hover {
  background: var(--c-deep);
  border-color: var(--c-glow);
}

/* ─── Prompt area ─── */
.prompt-area {
  flex-shrink: 0;
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
