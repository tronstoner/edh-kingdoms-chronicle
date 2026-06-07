<script setup>
import { computed } from 'vue'
import { layoutsForCount } from '../../composables/useTableLayouts.js'

const props = defineProps({
  playerCount: Number,
  selected: String,
})

const emit = defineEmits(['select'])

const layouts = computed(() => layoutsForCount(props.playerCount))
</script>

<template>
  <div class="layout-picker">
    <div
      v-for="layout in layouts"
      :key="layout.id"
      class="layout-option"
      :class="{ active: selected === layout.id }"
      @click="emit('select', layout.id)"
    >
      <div class="layout-diagram">
        <div
          v-for="(row, ri) in layout.rows"
          :key="ri"
          class="diagram-row"
        >
          <div
            v-for="s in row.seats.length"
            :key="s"
            class="diagram-dot"
          ></div>
        </div>
      </div>
      <div class="layout-label">{{ layout.label }}</div>
    </div>
  </div>
</template>

<style scoped>
.layout-picker {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.layout-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 24px;
  border-radius: 3px;
  border: 2px solid var(--lt-border);
  background: var(--lt-panel-bg);
  cursor: pointer;
  transition: all 0.2s;
}

.layout-option:hover {
  border-color: var(--lt-text-dim);
}

.layout-option.active {
  border-color: var(--lt-gold);
  background: color-mix(in srgb, var(--lt-gold) 7%, transparent);
}

.layout-diagram {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diagram-row {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.diagram-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--lt-text-dim);
}

.active .diagram-dot {
  background: var(--lt-gold);
}

.layout-label {
  font-family: 'EB Garamond', serif;
  font-size: 0.8rem;
  color: var(--lt-text-dim);
}

.active .layout-label {
  color: var(--lt-gold);
}
</style>
