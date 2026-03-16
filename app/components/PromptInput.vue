<script setup lang="ts">
const emit = defineEmits<{
  submit: [query: string]
}>()

const props = defineProps<{
  loading?: boolean
}>()

const query = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)

function autoResize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function handleSubmit() {
  const trimmed = query.value.trim()
  if (!trimmed || props.loading) return
  emit('submit', trimmed)
  query.value = ''
  nextTick(autoResize)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

onMounted(() => {
  textarea.value?.focus()
})
</script>

<template>
  <div class="prompt-wrap">
    <div class="prompt-glow" />
    <div class="prompt-container">
      <textarea
        ref="textarea"
        v-model="query"
        class="prompt-textarea"
        placeholder="Ask anything..."
        rows="1"
        :disabled="loading"
        @input="autoResize"
        @keydown="handleKeydown"
      />
      <button
        class="prompt-send"
        :class="{ 'prompt-send--active': query.trim().length > 0 }"
        :disabled="!query.trim() || loading"
        @click="handleSubmit"
      >
        <svg v-if="!loading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <span v-else class="prompt-spinner" />
      </button>
    </div>
    <p class="prompt-hint">
      Press Enter to send, Shift+Enter for new line
    </p>
  </div>
</template>

<style scoped>
.prompt-wrap {
  position: relative;
  width: 100%;
  max-width: var(--prompt-max);
  margin: 0 auto;
}

.prompt-glow {
  position: absolute;
  inset: -2px;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    135deg,
    var(--c-glow-dim),
    transparent 40%,
    transparent 60%,
    var(--c-glow-dim)
  );
  opacity: 0.5;
  animation: breathe 4s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

.prompt-container {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: var(--sp-2);
  background: var(--c-deep);
  border: 1px solid var(--c-trench);
  border-radius: var(--radius-lg);
  padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
  transition: border-color var(--dur-normal) var(--ease-out),
              box-shadow var(--dur-normal) var(--ease-out);
}

.prompt-container:focus-within {
  border-color: var(--c-glow);
  box-shadow: var(--shadow-glow);
}

.prompt-textarea {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--c-crest);
  font-family: var(--font-body);
  font-size: var(--fs-base);
  line-height: var(--lh-body);
  resize: none;
  max-height: 200px;
}

.prompt-textarea::placeholder {
  color: var(--c-shelf);
}

.prompt-textarea:disabled {
  opacity: 0.5;
}

.prompt-send {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-trench);
  border: none;
  border-radius: var(--radius-md);
  color: var(--c-drift);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.prompt-send--active {
  background: var(--c-glow);
  color: var(--c-abyss);
}

.prompt-send:hover:not(:disabled) {
  transform: scale(1.05);
}

.prompt-send:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.prompt-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--c-drift);
  border-top-color: var(--c-glow);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.prompt-hint {
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--c-shelf);
  margin-top: var(--sp-2);
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .prompt-hint {
    display: none;
  }
}
</style>
