<script setup>
defineProps({
  title: String,
  message: String,
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  danger: { type: Boolean, default: false },
  rotated: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div class="confirm-overlay" @click.self="emit('cancel')">
    <div class="confirm-dialog" :style="{ transform: rotated ? 'rotate(180deg)' : undefined }">
      <button class="lt-modal-close" @click="emit('cancel')" aria-label="Close">×</button>
      <h3 class="confirm-title font-beleren">{{ title }}</h3>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button
          class="confirm-btn"
          :class="danger ? 'confirm-btn-danger' : 'confirm-btn-primary'"
          @click="emit('confirm')"
        >{{ confirmLabel }}</button>
        <button class="confirm-btn confirm-btn-cancel" @click="emit('cancel')">{{ cancelLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--lt-bg) 87%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.confirm-dialog {
  position: relative;
  background: var(--lt-panel-bg);
  border: 2px solid var(--lt-border);
  border-radius: 3px;
  padding: 32px;
  max-width: 400px;
  width: 85vw;
  text-align: center;
}

.confirm-title {
  font-size: 1.2rem;
  color: var(--lt-gold);
  margin-bottom: 12px;
}

.confirm-message {
  font-family: 'EB Garamond', serif;
  font-size: 1rem;
  color: var(--lt-text);
  margin-bottom: 24px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 12px 28px;
  border-radius: 3px;
  border: 1px solid;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.confirm-btn-primary {
  color: color-mix(in srgb, var(--lt-gold) 75%, #888);
  border-color: color-mix(in srgb, var(--lt-gold) 75%, #888);
  background: color-mix(in srgb, var(--lt-gold) 10%, #0d0a07);
}

.confirm-btn-primary:hover {
  background: color-mix(in srgb, var(--lt-gold) 16%, #0d0a07);
  border-color: var(--lt-gold);
}

.confirm-btn-danger {
  color: #d95555;
  border-color: #d95555;
  background: #d9555522;
}

.confirm-btn-danger:hover {
  background: #d9555533;
}

.confirm-btn-cancel {
  color: var(--lt-text-dim);
  border-color: var(--lt-border);
  background: none;
}

.confirm-btn-cancel:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}
</style>
