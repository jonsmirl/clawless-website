<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()

const showMenu = ref(false)
const signingIn = ref(false)

async function signInWith(provider: 'google' | 'github') {
  signingIn.value = true
  showMenu.value = false
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/confirm`,
    },
  })
  if (error) {
    console.error('OAuth error:', error.message)
    signingIn.value = false
  }
}

async function signOut() {
  showMenu.value = false
  await client.auth.signOut()
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

// Close menu on click outside
function onClickOutside(e: Event) {
  const target = e.target as HTMLElement
  if (!target.closest('.nav-auth')) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})

const userEmail = computed(() => user.value?.email || '')
const userInitial = computed(() => {
  const name = user.value?.user_metadata?.full_name || user.value?.email || '?'
  return name.charAt(0).toUpperCase()
})
</script>

<template>
  <header class="nav-header">
    <div class="nav-inner">
      <NuxtLink to="/" class="nav-brand">
        <span class="nav-brand-icon" aria-hidden="true">&#x1F99E;</span>
        <span class="nav-brand-text">Claw<span class="nav-brand-accent">less</span></span>
      </NuxtLink>

      <nav class="nav-links">
        <a href="/community" class="nav-link">Community</a>
        <NuxtLink to="/skills" class="nav-link">Skills</NuxtLink>
        <NuxtLink to="/services" class="nav-link">Services</NuxtLink>
        <NuxtLink to="/settings" class="nav-link">Settings</NuxtLink>

        <div class="nav-auth">
          <!-- Signed out -->
          <template v-if="!user">
            <button
              class="nav-signin"
              :disabled="signingIn"
              @click.stop="toggleMenu"
            >
              {{ signingIn ? 'Signing in...' : 'Sign in' }}
            </button>
            <div v-if="showMenu" class="auth-dropdown">
              <button class="auth-option" @click="signInWith('google')">
                <span class="auth-icon">G</span>
                Continue with Google
              </button>
              <button class="auth-option" @click="signInWith('github')">
                <span class="auth-icon">GH</span>
                Continue with GitHub
              </button>
            </div>
          </template>

          <!-- Signed in -->
          <template v-else>
            <button class="nav-avatar" @click.stop="toggleMenu">
              {{ userInitial }}
            </button>
            <div v-if="showMenu" class="auth-dropdown">
              <div class="auth-user">
                {{ userEmail }}
              </div>
              <button class="auth-option auth-option--signout" @click="signOut">
                Sign out
              </button>
            </div>
          </template>
        </div>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-h);
  z-index: 100;
  background: linear-gradient(to bottom, var(--c-void), transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.nav-inner {
  max-width: var(--max-wide);
  margin: 0 auto;
  padding: 0 var(--sp-5);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--c-crest);
  text-decoration: none;
  font-family: var(--font-brand);
  font-size: var(--fs-base);
  letter-spacing: -0.02em;
}

.nav-brand:hover {
  color: var(--c-crest);
}

.nav-brand-icon {
  font-size: 1.25rem;
  filter: grayscale(0.3);
  transition: filter var(--dur-normal) var(--ease-out);
}

.nav-brand:hover .nav-brand-icon {
  filter: grayscale(0);
}

.nav-brand-text {
  font-weight: 700;
}

.nav-brand-accent {
  color: var(--c-glow);
  font-weight: 400;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
}

.nav-link {
  font-size: var(--fs-sm);
  color: var(--c-drift);
  transition: color var(--dur-fast) var(--ease-out);
}

.nav-link:hover {
  color: var(--c-foam);
}

.nav-auth {
  position: relative;
}

.nav-signin {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-abyss);
  background: var(--c-glow);
  border: none;
  padding: var(--sp-1) var(--sp-4);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.nav-signin:hover:not(:disabled) {
  background: var(--c-glow-bright);
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}

.nav-signin:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.nav-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--c-glow);
  color: var(--c-abyss);
  font-family: var(--font-body);
  font-size: var(--fs-xs);
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--dur-fast) var(--ease-out);
}

.nav-avatar:hover {
  background: var(--c-glow-bright);
  box-shadow: var(--shadow-glow);
}

.auth-dropdown {
  position: absolute;
  top: calc(100% + var(--sp-2));
  right: 0;
  min-width: 220px;
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: fadeInUp var(--dur-fast) var(--ease-out) both;
  z-index: 200;
}

.auth-user {
  padding: var(--sp-3) var(--sp-4);
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  color: var(--c-drift);
  border-bottom: 1px solid var(--c-trench);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-option {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  color: var(--c-foam);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background var(--dur-fast) var(--ease-out);
}

.auth-option:hover {
  background: var(--c-trench);
}

.auth-option--signout {
  color: var(--c-drift);
  border-top: 1px solid var(--c-trench);
}

.auth-option--signout:hover {
  color: var(--c-error);
}

.auth-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-crest);
  background: var(--c-shelf);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
</style>
