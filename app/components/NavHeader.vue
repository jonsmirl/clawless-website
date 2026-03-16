<script setup lang="ts">
const showSignIn = ref(false)
</script>

<template>
  <header class="nav-header">
    <div class="nav-inner">
      <NuxtLink to="/" class="nav-brand">
        <span class="nav-brand-icon" aria-hidden="true">&#x1F99E;</span>
        <span class="nav-brand-text">OpenClaw<span class="nav-brand-accent">Next</span></span>
      </NuxtLink>

      <nav class="nav-links">
        <a href="/community" class="nav-link">Community</a>
        <button class="nav-signin" @click="showSignIn = !showSignIn">
          Sign in
        </button>
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

.nav-signin:hover {
  background: var(--c-glow-bright);
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}
</style>
