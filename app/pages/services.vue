<script setup lang="ts">
const { connectedProviders, loadConnectedProviders } = useAuth()

onMounted(async () => {
  if (import.meta.client) {
    await loadConnectedProviders()
  }
})

function isConnected(provider: string) {
  return connectedProviders.value.includes(provider)
}

function onConnected(provider: string) {
  if (!connectedProviders.value.includes(provider)) {
    connectedProviders.value = [...connectedProviders.value, provider]
  }
}

function onDisconnected(provider: string) {
  connectedProviders.value = connectedProviders.value.filter(p => p !== provider)
}
</script>

<template>
  <div class="page-inner">
    <div class="page-header">
      <NuxtLink to="/" class="back-link">
        ← Back
      </NuxtLink>
      <h1 class="page-title">Connected Services</h1>
      <p class="page-sub">
        Connect accounts to unlock live, personalized results. Tokens are encrypted and stored only in your browser — never sent to any server.
      </p>
    </div>

    <div class="services-list">
      <ServiceConnect
        provider="google"
        :connected="isConnected('google')"
        @connected="onConnected"
        @disconnected="onDisconnected"
      />
      <ServiceConnect
        provider="github"
        :connected="isConnected('github')"
        @connected="onConnected"
        @disconnected="onDisconnected"
      />
      <ServiceConnect
        provider="microsoft"
        :connected="isConnected('microsoft')"
        @connected="onConnected"
        @disconnected="onDisconnected"
      />
    </div>

    <div class="privacy-note">
      <span class="privacy-icon">🔒</span>
      <p>
        OAuth tokens are encrypted with AES-256-GCM using the Web Crypto API and stored in your browser's IndexedDB. They are never transmitted to Clawless servers.
      </p>
    </div>
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
  margin-bottom: var(--sp-3);
}

.page-sub {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  line-height: var(--lh-body);
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-bottom: var(--sp-8);
}

.privacy-note {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-glow-faint);
  border: 1px solid var(--c-glow-dim);
  border-radius: var(--radius-md);
}

.privacy-icon {
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.privacy-note p {
  font-size: var(--fs-xs);
  color: var(--c-drift);
  line-height: var(--lh-body);
  margin: 0;
}
</style>
