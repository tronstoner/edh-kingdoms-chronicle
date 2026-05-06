<script setup>
import { watch } from 'vue'

const props = defineProps({
  text: String,
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
    <span class="announce-text announce-top font-beleren" :style="{ animationDuration: duration + 'ms' }">{{ text }}</span>
    <span class="announce-text announce-bottom font-beleren" :style="{ animationDuration: duration + 'ms' }">{{ text }}</span>
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
  background: #1a1612cc;
  animation: announce-fade 2.5s ease-out forwards;
}

.announce-text {
  position: absolute;
  font-size: clamp(4rem, 12vw, 7rem);
  color: #c9a54e;
  text-shadow: 0 0 40px #1a1612, 0 0 80px #1a1612;
  animation: announce-pop 2.5s ease-out forwards;
}

.announce-top {
  top: 20%;
  rotate: 180deg;
}

.announce-bottom {
  bottom: 20%;
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
