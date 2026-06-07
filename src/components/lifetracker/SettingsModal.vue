<script setup>
const props = defineProps({
  settings: { type: Object, required: true },
})

const emit = defineEmits(['close', 'update'])

function update(key, value) {
  emit('update', { ...props.settings, [key]: value })
}
</script>

<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <div class="settings-panel" @click.stop>
      <h3 class="settings-title font-beleren">Session Settings</h3>

      <!-- Turn nudge group -->
      <section class="settings-section">
        <header class="settings-section-header">
          <h4 class="settings-section-title">Turn nudge</h4>
          <p class="settings-section-help">
            Pulse the turn-cycle button after a round has run longer
            than expected. The cap below sets the budget at round 6
            onwards (min&nbsp;/&nbsp;player); earlier rounds scale
            proportionally — 10% of the cap at round 1, 20%, 40%, 60%,
            80%, 100% at round 6+. So halving the cap halves every
            round's budget, not just the late ones. Total round time
            also scales with the table — at cap 5, round 4 is
            3 min/player → 15 min for 5 players, 12 min for 4.
          </p>
        </header>

        <label class="settings-row">
          <span class="settings-row-label">Enable nudge</span>
          <input
            type="checkbox"
            class="settings-toggle"
            :checked="settings.turnNudgeEnabled"
            @change="(e) => update('turnNudgeEnabled', e.target.checked)"
          />
        </label>

        <label class="settings-row" :class="{ 'settings-row-disabled': !settings.turnNudgeEnabled }">
          <span class="settings-row-label">Cap (min&nbsp;/&nbsp;player)</span>
          <input
            type="number"
            min="1"
            max="15"
            step="0.5"
            class="settings-number"
            :disabled="!settings.turnNudgeEnabled"
            :value="settings.turnNudgeMaxMinutesPerPlayer"
            @change="(e) => update('turnNudgeMaxMinutesPerPlayer', Math.max(1, Math.min(15, Number(e.target.value) || 5)))"
          />
        </label>
      </section>

      <button class="settings-close" @click="emit('close')">Close</button>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: #1a1612ee;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 260;
}

.settings-panel {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 3px;
  padding: 20px 24px;
  width: 92vw;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 90vh;
  overflow-y: auto;
}

.settings-title {
  font-size: 1.2rem;
  color: #c9a54e;
  margin: 0;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid #3d3529;
  padding-top: 14px;
}

.settings-section:first-of-type {
  border-top: none;
  padding-top: 0;
}

.settings-section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-section-title {
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  color: #d4c8a8;
  margin: 0;
  letter-spacing: 0.04em;
}

.settings-section-help {
  font-family: 'EB Garamond', serif;
  font-style: italic;
  font-size: 0.85rem;
  color: #8a7e66;
  margin: 0;
  line-height: 1.4;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}

.settings-row-label {
  font-family: 'Cinzel', serif;
  font-size: 0.9rem;
  color: #d4c8a8;
}

.settings-row-disabled .settings-row-label {
  color: #8a7e6688;
}

.settings-toggle {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #c9a54e;
}

.settings-number {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 6px 10px;
  width: 90px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #d4c8a8;
  outline: none;
  text-align: right;
}

.settings-number:focus {
  border-color: #c9a54e66;
}

.settings-number:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.settings-close {
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  padding: 10px 24px;
  border-radius: 3px;
  border: 1px solid #c9a54e66;
  background: #c9a54e22;
  color: #c9a54e;
  cursor: pointer;
  transition: all 0.2s;
  align-self: center;
}

.settings-close:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
}
</style>
