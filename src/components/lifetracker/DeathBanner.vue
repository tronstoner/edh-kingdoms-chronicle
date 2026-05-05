<script setup>
const props = defineProps({
  playerCount: Number,
  roleRevealed: Boolean,
  roleNotes: String,
})

const emit = defineEmits(['override', 'revealRole', 'zombify', 'clone', 'clearUndead'])
</script>

<template>
  <div class="death-banner" @click.stop @pointerdown.stop>
    <i class="ms ms-graveyard death-skull"></i>
    <span class="death-label font-beleren">DEAD</span>
    <div class="death-actions">
      <button v-if="!roleRevealed" class="death-btn" @click="emit('revealRole')">Reveal role</button>
      <button v-if="!roleNotes" class="death-btn death-btn-zombie" @click="emit('zombify')">&#x1F9DF; Zombified</button>
      <button v-if="!roleNotes && playerCount === 6" class="death-btn death-btn-clone" @click="emit('clone')">&#x1F9EC; Cloned</button>
      <button class="death-btn death-btn-override" @click="emit('override')">I'm not actually dead</button>
    </div>
  </div>
</template>

<style scoped>
.death-banner {
  position: absolute;
  inset: 0;
  background: #00000090;
  backdrop-filter: grayscale(100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 6;
}

.death-skull {
  font-size: clamp(2.5rem, 8vw, 4rem);
  color: #d4c8a8;
}

.death-label {
  font-size: clamp(0.8rem, 2vw, 1rem);
  color: #d4c8a8;
  letter-spacing: 0.2em;
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
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.death-btn:hover {
  border-color: #c9a54e;
  color: #c9a54e;
}

.death-btn-zombie {
  color: #a47be0;
  border-color: #a47be0;
}

.death-btn-zombie:hover {
  border-color: #a47be0;
}

.death-btn-clone {
  color: #5ba3d9;
  border-color: #5ba3d9;
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
