<script setup>
import { computed } from 'vue'

const props = defineProps({
  playerCount: Number,
  roleRevealed: Boolean,
  roleNotes: String,
  mode: { type: String, default: 'kingdoms' },
});

const isCycle = computed(() => props.mode === 'cycle')
const deathLabel = computed(() => isCycle.value ? 'ELIMINATED' : 'DEAD')

const emit = defineEmits([
  "override",
  "revealRole",
  "zombify",
  "clone",
  "clearUndead",
]);
</script>

<template>
  <div class="death-banner" @click.stop @pointerdown.stop>
    <div class="death-icon-group">
      <i class="ms ms-graveyard death-skull"></i>
      <span class="death-label font-beleren">{{ deathLabel }}</span>
    </div>
    <div class="death-actions">
      <template v-if="!isCycle">
        <button
          v-if="!roleRevealed"
          class="death-btn death-btn-primary"
          @click="emit('revealRole')"
        >
          Reveal role
        </button>
        <button
          v-if="!roleNotes"
          class="death-btn death-btn-zombie"
          @click="emit('zombify')"
        >
          &#x1F9DF; Zombified
        </button>
        <button
          v-if="!roleNotes && playerCount === 6"
          class="death-btn death-btn-clone"
          @click="emit('clone')"
        >
          &#x1F9EC; Cloned
        </button>
      </template>
      <button class="death-btn death-btn-override" @click="emit('override')">
        I'm not actually dead
      </button>
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
  padding-top: 50px;
  gap: 4px;
  z-index: 6;
}

.death-icon-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.death-skull {
  font-size: clamp(1.75rem, 16.4cqmin, 4rem);
  color: var(--lt-text);
  text-shadow:
    0 2px 12px #000000,
    0 0 30px #00000080;
}

.death-label {
  font-size: clamp(0.8rem, 5.7cqmin, 1.4rem);
  color: var(--lt-text);
  letter-spacing: 0.2em;
}

.death-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.death-btn {
  font-family: "Cinzel", serif;
  font-size: clamp(0.7rem, 4.1cqmin, 1rem);
  padding: 12px 28px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-panel-bg);
  color: var(--lt-text);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  white-space: nowrap;
}

.death-btn:hover {
  border-color: var(--lt-gold);
  color: var(--lt-gold);
}

.death-btn-primary {
  color: color-mix(in srgb, var(--lt-gold) 75%, #888);
  border-color: color-mix(in srgb, var(--lt-gold) 75%, #888);
  background: color-mix(in srgb, var(--lt-gold) 10%, #0d0a07);
}

.death-btn-primary:hover {
  background: color-mix(in srgb, var(--lt-gold) 16%, #0d0a07);
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
  color: var(--lt-text-dim);
  border-color: var(--lt-border);
  font-size: clamp(0.55rem, 3.9cqmin, 0.85rem);
}

.death-btn-override:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}
</style>
