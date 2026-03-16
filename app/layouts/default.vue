<template>
  <div class="layout">
    <NavHeader />
    <main class="layout-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.layout-main {
  flex: 1;
  padding-top: var(--header-h);
}
</style>
