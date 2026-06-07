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
      <button class="lt-modal-close" @click="emit('close')" aria-label="Close">×</button>
      <h3 class="settings-title font-beleren">Session Settings</h3>

      <!-- Display group -->
      <section class="settings-section">
        <h4 class="settings-section-title">Display</h4>

        <div class="settings-row">
          <span class="settings-row-label">Theme</span>
          <div class="theme-toggle" role="radiogroup" aria-label="Theme">
            <button
              type="button"
              class="theme-option"
              :class="{ 'theme-option-active': (settings.theme || 'classic') === 'classic' }"
              role="radio"
              :aria-checked="(settings.theme || 'classic') === 'classic'"
              @click="update('theme', 'classic')"
            >Classic</button>
            <button
              type="button"
              class="theme-option"
              :class="{ 'theme-option-active': settings.theme === 'bright' }"
              role="radio"
              :aria-checked="settings.theme === 'bright'"
              @click="update('theme', 'bright')"
            >Bright</button>
          </div>
        </div>
      </section>

      <!-- Turn nudge group -->
      <section class="settings-section">
        <h4 class="settings-section-title">Turn nudge</h4>

        <label class="settings-row">
          <span class="settings-row-label">Enable</span>
          <input
            type="checkbox"
            class="settings-toggle"
            :checked="settings.turnNudgeEnabled"
            @change="(e) => update('turnNudgeEnabled', e.target.checked)"
          />
        </label>

        <label class="settings-row" :class="{ 'settings-row-disabled': !settings.turnNudgeEnabled }">
          <span class="settings-row-label">Show countdown</span>
          <input
            type="checkbox"
            class="settings-toggle"
            :disabled="!settings.turnNudgeEnabled"
            :checked="settings.turnNudgeShowFuse"
            @change="(e) => update('turnNudgeShowFuse', e.target.checked)"
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
  background: color-mix(in srgb, var(--lt-bg) 93%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 260;
}

.settings-panel {
  position: relative;
  background: var(--lt-panel-bg);
  border: 2px solid var(--lt-border);
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
  color: var(--lt-gold);
  margin: 0;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid var(--lt-border);
  padding-top: 14px;
}

.settings-section:first-of-type {
  border-top: none;
  padding-top: 0;
}

.settings-section-title {
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  color: var(--lt-text);
  margin: 0 0 4px;
  letter-spacing: 0.04em;
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
  color: var(--lt-text);
}

.settings-row-disabled .settings-row-label {
  color: color-mix(in srgb, var(--lt-text-dim) 53%, transparent);
}

.settings-toggle {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--lt-gold);
}

.settings-number {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 6px 10px;
  width: 90px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-bg);
  color: var(--lt-text);
  outline: none;
  text-align: right;
}

.settings-number:focus {
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
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
  border: 1px solid color-mix(in srgb, var(--lt-gold) 40%, transparent);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
  color: var(--lt-gold);
  cursor: pointer;
  transition: all 0.2s;
  align-self: center;
}

.settings-close:hover {
  background: color-mix(in srgb, var(--lt-gold) 20%, transparent);
  border-color: var(--lt-gold);
}

.theme-toggle {
  display: inline-flex;
  border: 1px solid var(--lt-border);
  border-radius: 3px;
  overflow: hidden;
}

.theme-option {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  padding: 6px 14px;
  background: var(--lt-bg);
  color: var(--lt-text-dim);
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.theme-option + .theme-option {
  border-left: 1px solid var(--lt-border);
}

.theme-option:hover {
  color: var(--lt-text);
}

.theme-option-active {
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
  color: var(--lt-gold);
}
</style>
