<script setup lang="ts">
interface Entry {
  script?: string | null
  required_permissions?: string[]
  required_tokens?: string[]
  fetch_allowlist?: string[]
  nano_prompt?: string | null
}

const props = defineProps<{
  entry: Entry
  query: string
}>()

type RunState = 'idle' | 'authorizing' | 'needs-permission' | 'running' | 'done' | 'error'

interface PaymentRecord {
  amount: string
  recipient: string
}

const state = ref<RunState>('idle')
const output = ref('')
const errorMsg = ref('')
const authorizingProvider = ref('')
const payments = ref<PaymentRecord[]>([])

const { getAllTokens } = useAuth()
const { buildContext, requestLocation } = usePersonalization()
const { connectProvider } = useOAuth()

// ─── Check requirements, auto-trigger OAuth/permission, then run ────────────

async function checkAndRun() {
  if (!props.entry.script) return

  const requiredPerms = props.entry.required_permissions || []
  const requiredToks = props.entry.required_tokens || []

  // ── Geolocation: check if denied; if not granted, prompt browser ──
  if (requiredPerms.includes('geolocation')) {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName }).catch(() => null)
    if (perm?.state === 'denied') {
      state.value = 'needs-permission'
      return
    }
    // Will be requested inside buildContext when needed
  }

  // ── Tokens: auto-open OAuth popup for each missing provider ──
  const tokens = await getAllTokens()
  const missingToks = requiredToks.filter(t => !tokens[t])

  for (const provider of missingToks) {
    state.value = 'authorizing'
    authorizingProvider.value = provider

    const token = await connectProvider(provider as 'google' | 'github' | 'microsoft')
    if (!token) {
      // User cancelled — surface an error rather than silently failing
      state.value = 'error'
      errorMsg.value = `Login cancelled for ${provider}. This result requires a ${provider} account.`
      return
    }
  }

  await runScript()
}

async function runScript() {
  if (!props.entry.script) return
  state.value = 'running'
  authorizingProvider.value = ''
  payments.value = []

  try {
    const tokens = await getAllTokens()
    const context = await buildContext(
      props.query,
      {},
      props.entry.required_permissions || [],
      tokens,
      props.entry.fetch_allowlist || [],
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
        if (e.data?.type === 'payment') {
          // Collect payment events while script is still running
          payments.value = [...payments.value, {
            amount: e.data.amount,
            recipient: e.data.recipient,
          }]
          return
        }
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

      worker.postMessage({ type: 'run', script: props.entry.script, context })
    })

    output.value = result
    state.value = 'done'
  } catch (err: any) {
    errorMsg.value = err?.message || 'Script execution failed'
    state.value = 'error'
  }
}

async function grantPermission() {
  const loc = await requestLocation()
  if (loc) {
    await checkAndRun()
  } else {
    state.value = 'needs-permission'
  }
}

onMounted(() => {
  if (import.meta.client && props.entry.script) {
    checkAndRun()
  }
})

watch(() => props.entry.script, () => {
  if (import.meta.client && props.entry.script) {
    state.value = 'idle'
    output.value = ''
    errorMsg.value = ''
    payments.value = []
    checkAndRun()
  }
})

const outputIsHtml = computed(() => output.value.trimStart().startsWith('<'))
</script>

<template>
  <div v-if="entry.script" class="pagelet">
    <!-- Authorizing (popup open) -->
    <div v-if="state === 'authorizing'" class="pagelet-status">
      <span class="pagelet-spinner" />
      <span class="pagelet-status-text">
        Waiting for {{ authorizingProvider }} login...
      </span>
    </div>

    <!-- Running -->
    <div v-else-if="state === 'running'" class="pagelet-status">
      <span class="pagelet-spinner" />
      <span class="pagelet-status-text">Fetching live data...</span>
    </div>

    <!-- Result (HTML) -->
    <div
      v-else-if="state === 'done' && outputIsHtml"
      class="pagelet-output"
      v-html="output"
    />

    <!-- Result (plain text / markdown) -->
    <div
      v-else-if="state === 'done'"
      class="pagelet-output pagelet-output--text"
    >
      {{ output }}
    </div>

    <!-- Payment log (shown after output when payments occurred) -->
    <div v-if="state === 'done' && payments.length > 0" class="pagelet-payments">
      <div v-for="(p, i) in payments" :key="i" class="pagelet-payment">
        <span class="pagelet-payment-check">&#10003;</span>
        <span class="pagelet-payment-text">Paid ${{ p.amount }} to {{ p.recipient }}</span>
      </div>
    </div>

    <!-- Geolocation denied (can't auto-fix, needs user action in browser) -->
    <div v-if="state === 'needs-permission'" class="pagelet-prompt">
      <p class="pagelet-prompt-text">
        Location access is blocked. Allow it in your browser settings, then:
      </p>
      <button class="pagelet-btn" @click="grantPermission">
        Retry
      </button>
    </div>

    <!-- Error -->
    <div v-if="state === 'error'" class="pagelet-error">
      <span class="pagelet-error-icon">&#9888;</span>
      <span class="pagelet-error-msg">{{ errorMsg }}</span>
    </div>
  </div>
</template>

<style scoped>
.pagelet {
  margin-top: var(--sp-5);
  padding-top: var(--sp-5);
  border-top: 1px dashed var(--c-trench);
}

.pagelet-status {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.pagelet-spinner {
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

.pagelet-status-text {
  font-size: var(--fs-sm);
  color: var(--c-drift);
}

.pagelet-output {
  color: var(--c-foam);
  font-size: var(--fs-base);
  line-height: var(--lh-relaxed);
  animation: fadeInUp var(--dur-slow) var(--ease-out) both;
}

.pagelet-output--text {
  white-space: pre-wrap;
}

.pagelet-output :deep(h1),
.pagelet-output :deep(h2),
.pagelet-output :deep(h3) {
  color: var(--c-crest);
  margin: var(--sp-4) 0 var(--sp-2);
}

.pagelet-output :deep(a) {
  color: var(--c-glow);
  text-underline-offset: 3px;
}

.pagelet-output :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}

.pagelet-output :deep(td),
.pagelet-output :deep(th) {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--c-trench);
  text-align: left;
}

.pagelet-output :deep(th) {
  color: var(--c-crest);
  background: var(--c-deep);
}

.pagelet-prompt {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
}

.pagelet-prompt-text {
  flex: 1;
  font-size: var(--fs-sm);
  color: var(--c-drift);
  margin: 0;
}

.pagelet-btn {
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
  transition: background var(--dur-fast) var(--ease-out);
}

.pagelet-btn:hover {
  background: var(--c-glow-bright);
}

.pagelet-error {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
}

.pagelet-error-icon {
  color: var(--c-error);
  flex-shrink: 0;
}

.pagelet-error-msg {
  color: var(--c-drift);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  word-break: break-word;
}

.pagelet-payments {
  margin-top: var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.pagelet-payment {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--c-drift);
}

.pagelet-payment-check {
  color: var(--c-glow);
  font-size: var(--fs-xs);
  flex-shrink: 0;
}

.pagelet-payment-text {
  font-family: var(--font-mono);
}
</style>
