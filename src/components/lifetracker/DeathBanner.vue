<script setup>
const props = defineProps({
  playerCount: Number,
})

const emit = defineEmits(['override', 'revealRole', 'zombify', 'clone'])
</script>

<template>
  <div class="death-banner" @click.stop @pointerdown.stop>
    <div class="death-actions">
      <button class="death-btn" @click="emit('revealRole')">Reveal role</button>
      <button class="death-btn death-btn-zombie" @click="emit('zombify')">&#x1F9DF; Zombified</button>
      <button v-if="playerCount === 6" class="death-btn death-btn-clone" @click="emit('clone')">&#x1F9EC; Cloned</button>
      <button class="death-btn death-btn-override" @click="emit('override')">I'm not actually dead</button>
    </div>
  </div>
</template>

<style scoped>
.death-banner {
  position: absolute;
  inset: 0;
  background: #0d0b09e8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 6;
}

.death-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.death-btn {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.8rem, 2.2vw, 1rem);
  padding: 12px 28px;
  border-radius: 3px;
  border: 1px solid #d4c8a844;
  background: #231f1a;
  color: #d4c8a8;
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
  border-color: #a47be066;
}

.death-btn-zombie:hover {
  border-color: #a47be0;
}

.death-btn-clone {
  color: #5ba3d9;
  border-color: #5ba3d966;
}

.death-btn-clone:hover {
  border-color: #5ba3d9;
}

.death-btn-override {
  color: #8a7e66;
  border-color: #3d3529;
  font-size: clamp(0.65rem, 1.8vw, 0.85rem);
}

.death-btn-override:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
