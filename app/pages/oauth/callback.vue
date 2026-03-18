<script setup lang="ts">
/**
 * OAuth implicit flow callback page.
 * Opened as a popup by ServiceConnect.vue.
 * Reads the access_token from the URL fragment and postMessages it to the opener.
 */

onMounted(() => {
  if (!import.meta.client) return

  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams(hash)

  const access_token = params.get('access_token')
  const expires_in = params.get('expires_in')
  const error = params.get('error')
  const state = params.get('state')

  if (window.opener) {
    window.opener.postMessage(
      {
        type: 'oauth_callback',
        access_token,
        expires_in,
        error,
        state,
      },
      window.location.origin,
    )
  }

  // Close the popup
  window.close()
})
</script>

<template>
  <div class="callback-page">
    <p class="callback-text">Completing authorization...</p>
  </div>
</template>

<style scoped>
.callback-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  background: var(--c-void);
}

.callback-text {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  color: var(--c-drift);
}
</style>
