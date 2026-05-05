<script setup>
import { layoutsForCount } from '../../composables/useTableLayouts.js'

const props = defineProps({
  playerCount: Number,
  selected: String,
})

const emit = defineEmits(['select'])

const layouts = layoutsForCount(props.playerCount)
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
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid #3d3529;
  background: #231f1a;
  cursor: pointer;
  transition: all 0.2s;
}

.layout-option:hover {
  border-color: #8a7e66;
}

.layout-option.active {
  border-color: #c9a54e;
  background: #c9a54e11;
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
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8a7e66;
}

.active .diagram-dot {
  background: #c9a54e;
}

.layout-label {
  font-family: 'EB Garamond', serif;
  font-size: 0.8rem;
  color: #8a7e66;
}

.active .layout-label {
  color: #c9a54e;
}
</style>
