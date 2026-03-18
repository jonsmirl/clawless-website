<script setup lang="ts">
const props = defineProps<{
  compiledScript: string | null
  fetchAllowlist?: string[]
}>()

const { getAllTokens } = useAuth()
const { buildContext } = usePersonalization()

const query = ref('')
const running = ref(false)
const output = ref('')
const errorMsg = ref('')

const outputIsHtml = computed(() => output.value.trimStart().startsWith('<'))

async function run() {
  if (!props.compiledScript || !query.value.trim()) return

  running.value = true
  output.value = ''
  errorMsg.value = ''

  try {
    const tokens = await getAllTokens()
    const context = await buildContext(
      query.value,
      {},
      [],
      tokens,
      props.fetchAllowlist || [],
    )

    const worker = new Worker(
      new URL('../workers/pagelet-worker.ts', import.meta.url),
      { type: 'module' },
    )

    const result = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate()
        reject(new Error('Script timed out after 15 seconds'))
      }, 15000)

      worker.onmessage = (e) => {
        if (e.data?.type === 'payment') return
        clearTimeout(timeout)
        worker.terminate()
        if (e.data?.type === 'result') resolve(e.data.html)
        else reject(new Error(e.data?.message || 'Script error'))
      }
      worker.onerror = (e) => {
        clearTimeout(timeout)
        worker.terminate()
        reject(new Error(e.message))
      }

      worker.postMessage({ type: 'run', script: props.compiledScript, context })
    })

    output.value = result
  } catch (err: any) {
    errorMsg.value = err?.message || 'Script execution failed'
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="test-runner">
    <div class="test-input-row">
      <input
        v-model="query"
        class="test-input"
        type="text"
        placeholder="Enter a test query..."
        @keydown.enter="run"
      />
      <button
        class="test-run-btn"
        :disabled="running || !compiledScript || !query.trim()"
        @click="run"
      >
        <span v-if="running" class="test-spinner" />
        <span v-else>Run</span>
      </button>
    </div>

    <div v-if="!compiledScript" class="test-empty">
      Compile a skill first to test it here.
    </div>

    <div
      v-else-if="output && outputIsHtml"
      class="test-output"
      v-html="output"
    />

    <div
      v-else-if="output"
      class="test-output test-output--text"
    >
      {{ output }}
    </div>

    <div v-if="errorMsg" class="test-error">
      <span class="test-error-icon">&#9888;</span>
      <span class="test-error-msg">{{ errorMsg }}</span>
    </div>
  </div>
</template>

<style scoped>
.test-runner {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.test-input-row {
  display: flex;
  gap: var(--sp-2);
}

.test-input {
  flex: 1;
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  background: var(--c-abyss);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  padding: var(--sp-2) var(--sp-3);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.test-input::placeholder {
  color: var(--c-shelf);
}

.test-input:focus {
  border-color: var(--c-glow-dim);
}

.test-run-btn {
  flex-shrink: 0;
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
  min-width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-run-btn:hover:not(:disabled) {
  background: var(--c-glow-bright);
}

.test-run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-spinner {
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

.test-empty {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  padding: var(--sp-4) 0;
}

.test-output {
  color: var(--c-foam);
  font-size: var(--fs-base);
  line-height: var(--lh-relaxed);
  animation: fadeInUp var(--dur-slow) var(--ease-out) both;
}

.test-output--text {
  white-space: pre-wrap;
}

.test-output :deep(a) {
  color: var(--c-glow);
  text-underline-offset: 3px;
}

.test-output :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}

.test-output :deep(td),
.test-output :deep(th) {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--c-trench);
  text-align: left;
}

.test-output :deep(th) {
  color: var(--c-crest);
  background: var(--c-deep);
}

.test-error {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
}

.test-error-icon {
  color: var(--c-error);
  flex-shrink: 0;
}

.test-error-msg {
  color: var(--c-drift);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  word-break: break-word;
}

@media (max-width: 640px) {
  .test-run-btn {
    width: 100%;
  }

  .test-input-row {
    flex-direction: column;
  }
}
</style>
