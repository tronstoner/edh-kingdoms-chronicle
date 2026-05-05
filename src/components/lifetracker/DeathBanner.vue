<script setup>
const emit = defineEmits(['override'])
</script>

<template>
  <div class="death-banner" @click.stop>
    <span class="death-skull">&#x1F480;</span>
    <button class="override-btn" @click="emit('override')">I'm not actually dead</button>
  </div>
</template>

<style scoped>
.death-banner {
  position: absolute;
  inset: 0;
  background: #1a1612cc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

.death-skull {
  font-size: clamp(2.5rem, 8vw, 4rem);
  animation: pulse 2s ease-in-out infinite;
}

.override-btn {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  padding: 12px 28px;
  border-radius: 4px;
  border: 1px solid #8a7e6644;
  background: #231f1a;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
}

.override-btn:hover {
  border-color: #c9a54e66;
  color: #c9a54e;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
</style>
