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

const history = ref<Entry[]>([])
const currentIndex = ref(-1) // -1 = hero/empty state
const loading = ref(false)
const lastSource = ref<'cache' | 'miss' | ''>('')
const resultView = ref<HTMLElement | null>(null)

const config = useRuntimeConfig()
const API_URL = config.public.apiUrl || 'http://localhost:8787'
const CDN_URL = config.public.cdnUrl || 'https://s3.lowpan.com'
const { modelReady, modelLoading, indexSize, search, loadIndex } = useSearch()

const currentEntry = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= history.value.length) return null
  return history.value[currentIndex.value]
})

const showHero = computed(() => currentIndex.value < 0 && !loading.value)

async function handleQuery(query: string) {
  loading.value = true
  lastSource.value = ''

  try {
    const match = await search(query)
    let entry: Entry

    if (match && match.url) {
      // Cache hit — fetch from R2 CDN
      const resp = await fetch(match.url)
      if (resp.ok) {
        entry = await resp.json()
        entry.query = query
        lastSource.value = 'cache'
      }
      else {
        entry = await callMiss(query)
        lastSource.value = 'miss'
      }
    }
    else {
      // Cache miss — generate via Claude
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
    window.history.pushState({ idx: currentIndex.value }, '', `#q=${encodeURIComponent(query)}`)

    // Scroll result area to top
    await nextTick()
    resultView.value?.scrollTo(0, 0)
  }
  catch (err) {
    console.error('Query failed:', err)
    history.value.push({
      id: crypto.randomUUID(),
      query,
      markdown: '**Error**: Could not generate a response. Please try again.',
      follow_ups: [],
    })
    currentIndex.value = history.value.length - 1
    window.history.pushState({ idx: currentIndex.value }, '', `#q=${encodeURIComponent(query)}`)
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
