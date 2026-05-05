<script setup>
const props = defineProps({
  playerCount: Number,
})

const emit = defineEmits(['override', 'revealRole', 'zombify', 'clone'])
</script>

<template>
  <div class="death-banner" @click.stop @pointerdown.stop>
    <span class="death-skull">&#x1F480;</span>
    <div class="death-actions">
      <button class="death-btn" @click="emit('override')">I'm not actually dead</button>
      <button class="death-btn" @click="emit('revealRole')">Reveal role</button>
      <button class="death-btn death-btn-zombie" @click="emit('zombify')">&#x1F9DF; Zombified</button>
      <button v-if="playerCount === 6" class="death-btn death-btn-clone" @click="emit('clone')">&#x1F9EC; Cloned</button>
    </div>
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
  gap: 16px;
  z-index: 10;
}

.death-skull {
  font-size: clamp(2.5rem, 8vw, 4rem);
  animation: pulse 2s ease-in-out infinite;
}

.death-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.death-btn {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.75rem, 2vw, 0.95rem);
  padding: 10px 24px;
  border-radius: 3px;
  border: 1px solid #8a7e6644;
  background: #231f1a;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.death-btn:hover {
  border-color: #c9a54e66;
  color: #c9a54e;
}

.death-btn-zombie {
  color: #a47be0;
  border-color: #a47be044;
}

.death-btn-zombie:hover {
  border-color: #a47be088;
  color: #a47be0;
}

.death-btn-clone {
  color: #5ba3d9;
  border-color: #5ba3d944;
}

.death-btn-clone:hover {
  border-color: #5ba3d988;
  color: #5ba3d9;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
</style>
