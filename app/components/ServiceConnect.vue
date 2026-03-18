<script setup lang="ts">
const props = defineProps<{
  provider: 'google' | 'github' | 'microsoft'
  connected: boolean
}>()

const emit = defineEmits<{
  connected: [provider: string]
  disconnected: [provider: string]
}>()

const { removeToken } = useAuth()
const { connectProvider, PROVIDER_CONFIG } = useOAuth()

const connecting = ref(false)

const providerConfig = computed(() => ({
  ...PROVIDER_CONFIG[props.provider],
  icon: { google: '🔵', github: '⚫', microsoft: '🟦' }[props.provider],
}))

async function connect() {
  connecting.value = true
  const token = await connectProvider(props.provider)
  connecting.value = false
  if (token) emit('connected', props.provider)
}

async function disconnect() {
  await removeToken(props.provider)
  emit('disconnected', props.provider)
}
</script>

<template>
  <div class="service-row">
    <div class="service-info">
      <span class="service-icon">{{ providerConfig.icon }}</span>
      <div>
        <div class="service-label">{{ providerConfig.label }}</div>
        <div class="service-status">
          {{ connected ? 'Connected' : 'Not connected' }}
        </div>
      </div>
    </div>
    <button
      v-if="!connected"
      class="service-btn service-btn--connect"
      :disabled="connecting"
      @click="connect"
    >
      {{ connecting ? 'Connecting...' : 'Connect' }}
    </button>
    <button
      v-else
      class="service-btn service-btn--disconnect"
      @click="disconnect"
    >
      Disconnect
    </button>
  </div>
</template>

<style scoped>
.service-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  gap: var(--sp-4);
}

.service-info {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.service-icon {
  font-size: 1.25rem;
  width: 2rem;
  text-align: center;
}

.service-label {
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--c-crest);
}

.service-status {
  font-size: var(--fs-xs);
  color: var(--c-drift);
  margin-top: 2px;
}

.service-btn {
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

.service-btn--connect {
  background: var(--c-glow);
  color: var(--c-abyss);
}

.service-btn--connect:hover:not(:disabled) {
  background: var(--c-glow-bright);
}

.service-btn--connect:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.service-btn--disconnect {
  background: var(--c-trench);
  color: var(--c-drift);
  border: 1px solid var(--c-shelf);
}

.service-btn--disconnect:hover {
  color: var(--c-error);
  border-color: var(--c-error);
}
</style>
