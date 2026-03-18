<script setup lang="ts">
/**
 * Supabase OAuth callback page.
 * After OAuth, Supabase redirects here with tokens in the URL hash.
 * The @nuxtjs/supabase module picks up the session automatically.
 * We just redirect the user back to where they came from (or home).
 */

const user = useSupabaseUser()

onMounted(() => {
  if (!import.meta.client) return

  // Wait for supabase to process the hash and set the user
  const stop = watch(user, (u) => {
    if (u) {
      stop()
      navigateTo('/')
    }
  }, { immediate: true })

  // Fallback: redirect home after 5s even if auth didn't complete
  setTimeout(() => {
    stop()
    navigateTo('/')
  }, 5000)
})
</script>

<template>
  <div class="confirm-page">
    <span class="confirm-spinner" />
    <p class="confirm-text">Completing sign in...</p>
  </div>
</template>

<style scoped>
.confirm-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  min-height: 100dvh;
  background: var(--c-void);
}

.confirm-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--c-shelf);
  border-top-color: var(--c-glow);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.confirm-text {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  color: var(--c-drift);
}
</style>
