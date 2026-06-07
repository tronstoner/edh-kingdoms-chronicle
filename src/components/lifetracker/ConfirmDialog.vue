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
  background: #1a1612dd;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.confirm-dialog {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 3px;
  padding: 32px;
  max-width: 400px;
  width: 85vw;
  text-align: center;
}

.confirm-title {
  font-size: 1.2rem;
  color: #c9a54e;
  margin-bottom: 12px;
}

.confirm-message {
  font-family: 'EB Garamond', serif;
  font-size: 1rem;
  color: #d4c8a8;
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
  transition: all 0.2s;
}

.confirm-btn-primary {
  color: #c9a54e;
  border-color: #c9a54e66;
  background: #c9a54e22;
}

.confirm-btn-primary:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
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
  color: #8a7e66;
  border-color: #3d3529;
  background: none;
}

.confirm-btn-cancel:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
