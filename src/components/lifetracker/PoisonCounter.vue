<script setup>
const props = defineProps({
  count: Number,
  enabled: Boolean,
})

const emit = defineEmits(['change', 'toggle'])
</script>

<template>
  <div class="poison-wrap" @pointerdown.stop>
    <button
      class="poison-toggle"
      :class="{ active: enabled }"
      @click="emit('toggle')"
      title="Toggle poison"
    >
      <span class="poison-icon">&#x2620;</span>
    </button>
    <template v-if="enabled">
      <button class="poison-btn" @click="emit('change', -1)">&minus;</button>
      <span class="poison-count" :class="{ lethal: count >= 10 }">{{ count }}</span>
      <button class="poison-btn" @click="emit('change', 1)">+</button>
    </template>
  </div>
</template>

<style scoped>
.poison-wrap {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 4;
}

.poison-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #3d3529;
  background: #1a161288;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.poison-toggle.active {
  border-color: #00733e66;
  background: #00733e22;
}

.poison-icon {
  font-size: 1.1rem;
  opacity: 0.5;
}

.active .poison-icon {
  opacity: 1;
}

.poison-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #00733e44;
  background: #00733e11;
  color: #00733e;
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.poison-btn:hover {
  background: #00733e22;
  border-color: #00733e66;
}

.poison-count {
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  color: #00733e;
  min-width: 24px;
  text-align: center;
}

.poison-count.lethal {
  color: #d95555;
}
</style>
