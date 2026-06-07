<script setup>
import { watch } from 'vue'

const props = defineProps({
  text: String,
  subtitle: { type: String, default: null },
  duration: { type: Number, default: 2500 },
})

const emit = defineEmits(['done'])

let timer = null

watch(() => props.text, (val) => {
  if (val) {
    clearTimeout(timer)
    timer = setTimeout(() => emit('done'), props.duration)
  }
}, { immediate: true })
</script>

<template>
  <div v-if="text" class="announce-overlay" :style="{ animationDuration: duration + 'ms' }" :key="text">
    <div class="announce-block announce-top" :style="{ animationDuration: duration + 'ms' }">
      <span class="announce-title font-beleren">{{ text }}</span>
      <span v-if="subtitle" class="announce-subtitle font-beleren">{{ subtitle }}</span>
    </div>
    <div class="announce-block announce-bottom" :style="{ animationDuration: duration + 'ms' }">
      <span class="announce-title font-beleren">{{ text }}</span>
      <span v-if="subtitle" class="announce-subtitle font-beleren">{{ subtitle }}</span>
    </div>
  </div>
</template>

<style scoped>
.announce-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 300;
  background: color-mix(in srgb, var(--lt-bg) 80%, transparent);
  animation: announce-fade 2.5s ease-out forwards;
}

.announce-block {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  animation: announce-pop 2.5s ease-out forwards;
}

.announce-title {
  font-size: clamp(4rem, 12vw, 7rem);
  line-height: 1;
  color: var(--lt-gold);
  text-shadow: 0 0 40px var(--lt-bg), 0 0 80px var(--lt-bg);
  white-space: nowrap;
}

.announce-subtitle {
  font-size: clamp(1.6rem, 4.5vw, 3rem);
  line-height: 1.1;
  color: var(--lt-gold);
  text-shadow: 0 0 30px var(--lt-bg), 0 0 60px var(--lt-bg);
  font-style: italic;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.announce-top {
  top: 18%;
  rotate: 180deg;
}

.announce-bottom {
  bottom: 18%;
}

@keyframes announce-fade {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes announce-pop {
  0% { transform: scale(0.6); opacity: 0; }
  10% { transform: scale(1.1); opacity: 1; }
  20% { transform: scale(1); }
  70% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.05); opacity: 0; }
}
</style>
