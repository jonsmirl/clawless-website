<script setup lang="ts">
const { getUnits, setUnits, requestLocation, getCachedLocation } = usePersonalization()
const { getPreference, setPreference, getWallet, setWallet, removeWallet } = useAuth()

interface WalletData {
  address: string
  private_key: string
  balance_usdc: number
  spend_cap_usdc: number
}

const units = ref<'metric' | 'imperial'>('metric')
const locationStatus = ref<'unknown' | 'cached' | 'denied' | 'requesting'>('unknown')
const cachedCity = ref<string | null>(null)

// Wallet state
const walletAddress = ref<string | null>(null)
const walletBalance = ref<number>(0)
const walletSpendCap = ref<number>(1.00)
const walletConnecting = ref(false)

onMounted(async () => {
  if (!import.meta.client) return
  units.value = await getUnits()

  const loc = await getCachedLocation()
  if (loc) {
    locationStatus.value = 'cached'
    cachedCity.value = loc.city || `${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}`
  } else {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName }).catch(() => null)
    if (perm?.state === 'denied') locationStatus.value = 'denied'
    else locationStatus.value = 'unknown'
  }

  // Load wallet
  const wallet = await getWallet()
  if (wallet) {
    walletAddress.value = wallet.address
    walletBalance.value = wallet.balance_usdc
    walletSpendCap.value = wallet.spend_cap_usdc
  }
})

async function changeUnits(val: 'metric' | 'imperial') {
  units.value = val
  await setUnits(val)
}

async function refreshLocation() {
  locationStatus.value = 'requesting'
  const loc = await requestLocation()
  if (loc) {
    locationStatus.value = 'cached'
    cachedCity.value = loc.city || `${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}`
  } else {
    locationStatus.value = 'denied'
  }
}

async function clearLocation() {
  await setPreference('location_cache', null)
  locationStatus.value = 'unknown'
  cachedCity.value = null
}

// ─── Wallet actions ─────────────────────────────────────────────────────────

function generatePrivateKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function deriveAddress(privateKey: string): string {
  // Simplified address derivation — first 20 bytes of the key hash as placeholder.
  // In production, use @x402/evm to derive the real address from the private key.
  const hex = privateKey.replace('0x', '')
  const addressBytes = hex.slice(0, 40)
  return '0x' + addressBytes
}

async function connectWallet() {
  walletConnecting.value = true
  try {
    const privateKey = generatePrivateKey()
    const address = deriveAddress(privateKey)

    const wallet: WalletData = {
      address,
      private_key: privateKey,
      balance_usdc: 0,
      spend_cap_usdc: walletSpendCap.value,
    }

    await setWallet(wallet)
    walletAddress.value = address
    walletBalance.value = 0
  } finally {
    walletConnecting.value = false
  }
}

async function disconnectWallet() {
  await removeWallet()
  walletAddress.value = null
  walletBalance.value = 0
  walletSpendCap.value = 1.00
}

async function updateSpendCap() {
  const wallet = await getWallet()
  if (!wallet) return
  wallet.spend_cap_usdc = walletSpendCap.value
  await setWallet(wallet)
}

function formatAddress(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}
</script>

<template>
  <div class="page-inner">
    <div class="page-header">
      <NuxtLink to="/" class="back-link">
        ← Back
      </NuxtLink>
      <h1 class="page-title">Settings</h1>
    </div>

    <section class="settings-section">
      <h2 class="section-title">Units</h2>
      <div class="radio-group">
        <label class="radio-option" :class="{ 'radio-option--active': units === 'metric' }">
          <input
            type="radio"
            name="units"
            value="metric"
            :checked="units === 'metric'"
            @change="changeUnits('metric')"
          >
          <span>Metric (km, °C, kg)</span>
        </label>
        <label class="radio-option" :class="{ 'radio-option--active': units === 'imperial' }">
          <input
            type="radio"
            name="units"
            value="imperial"
            :checked="units === 'imperial'"
            @change="changeUnits('imperial')"
          >
          <span>Imperial (mi, °F, lb)</span>
        </label>
      </div>
    </section>

    <section class="settings-section">
      <h2 class="section-title">Location</h2>
      <p class="section-desc">Used for weather, local search, and other location-aware results.</p>

      <div class="location-status">
        <template v-if="locationStatus === 'cached'">
          <span class="status-dot status-dot--ready" />
          <span class="location-text">{{ cachedCity }}</span>
          <button class="text-btn" @click="refreshLocation">Refresh</button>
          <button class="text-btn text-btn--muted" @click="clearLocation">Clear</button>
        </template>
        <template v-else-if="locationStatus === 'requesting'">
          <span class="status-dot status-dot--loading" />
          <span class="location-text">Requesting location...</span>
        </template>
        <template v-else-if="locationStatus === 'denied'">
          <span class="status-dot status-dot--off" />
          <span class="location-text">Location access denied in browser settings</span>
        </template>
        <template v-else>
          <span class="status-dot status-dot--off" />
          <span class="location-text">Not set</span>
          <button class="text-btn" @click="refreshLocation">Allow location</button>
        </template>
      </div>
    </section>

    <section class="settings-section">
      <h2 class="section-title">Wallet</h2>
      <p class="section-desc">Base L2 wallet for x402 micropayments to data providers.</p>

      <div v-if="walletAddress" class="wallet-card">
        <div class="wallet-row">
          <span class="wallet-label">Address</span>
          <span class="wallet-value wallet-address">{{ formatAddress(walletAddress) }}</span>
        </div>
        <div class="wallet-row">
          <span class="wallet-label">USDC Balance</span>
          <span class="wallet-value">${{ walletBalance.toFixed(4) }}</span>
        </div>
        <div class="wallet-row wallet-row--slider">
          <span class="wallet-label">Spend cap per query</span>
          <div class="slider-group">
            <input
              type="range"
              min="0.01"
              max="10.00"
              step="0.01"
              v-model.number="walletSpendCap"
              class="wallet-slider"
              @change="updateSpendCap"
            >
            <span class="wallet-value">${{ walletSpendCap.toFixed(2) }}</span>
          </div>
        </div>
        <button class="text-btn text-btn--muted wallet-disconnect" @click="disconnectWallet">
          Disconnect Wallet
        </button>
        <p class="wallet-privacy">Your wallet key is encrypted and stored locally. It never leaves your browser.</p>
      </div>

      <div v-else class="wallet-empty">
        <span class="status-dot status-dot--off" />
        <span class="location-text">No wallet connected</span>
        <button
          class="text-btn"
          :disabled="walletConnecting"
          @click="connectWallet"
        >
          {{ walletConnecting ? 'Generating...' : 'Connect Wallet' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-inner {
  max-width: var(--max-content);
  margin: 0 auto;
  padding: var(--sp-8) var(--sp-5);
}

.back-link {
  display: inline-block;
  font-size: var(--fs-sm);
  color: var(--c-drift);
  margin-bottom: var(--sp-6);
  transition: color var(--dur-fast) var(--ease-out);
}

.back-link:hover {
  color: var(--c-glow);
}

.page-header {
  margin-bottom: var(--sp-8);
}

.page-title {
  font-family: var(--font-brand);
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-crest);
  letter-spacing: -0.02em;
}

.settings-section {
  margin-bottom: var(--sp-10);
}

.section-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-crest);
  margin-bottom: var(--sp-4);
}

.section-desc {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  margin-bottom: var(--sp-4);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.radio-option {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--c-drift);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.radio-option--active {
  border-color: var(--c-glow-dim);
  color: var(--c-foam);
}

.radio-option input[type="radio"] {
  accent-color: var(--c-glow);
}

.location-status {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
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
  background: var(--c-shelf);
}

.location-text {
  flex: 1;
  color: var(--c-drift);
}

.text-btn {
  font-family: var(--font-body);
  font-size: var(--fs-xs);
  color: var(--c-glow);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.text-btn--muted {
  color: var(--c-shelf);
}

.text-btn:hover {
  opacity: 0.8;
}

.text-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ─── Wallet ─────────────────────────────────────────────────────────────── */

.wallet-card {
  padding: var(--sp-4);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.wallet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--fs-sm);
}

.wallet-row--slider {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-2);
}

.wallet-label {
  color: var(--c-drift);
}

.wallet-value {
  color: var(--c-foam);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
}

.wallet-address {
  color: var(--c-glow);
}

.slider-group {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
}

.wallet-slider {
  flex: 1;
  accent-color: var(--c-glow);
  height: 4px;
  cursor: pointer;
}

.wallet-disconnect {
  align-self: flex-start;
  margin-top: var(--sp-1);
}

.wallet-privacy {
  font-size: var(--fs-xs);
  color: var(--c-shelf);
  margin: 0;
  line-height: var(--lh-body);
}

.wallet-empty {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
}
</style>
