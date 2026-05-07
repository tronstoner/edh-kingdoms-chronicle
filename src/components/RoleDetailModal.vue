<script setup>
import { computed } from 'vue'
import { ROLE_COLORS, ROLE_DESCRIPTIONS, rolePortraitUrl } from '../roles.js'

const props = defineProps({
  role: { type: String, required: true },
})
const emit = defineEmits(['close'])

// Clicking the Lord header surfaces both variants side by side.
const variants = computed(() =>
  props.role === 'Lord' ? ['Zombie Lord', 'Clone Lord'] : [props.role]
)

const headerColor = computed(() => ROLE_COLORS[props.role] || '#3d3529')
</script>

<template>
  <div class="role-detail-overlay" @click.self="emit('close')">
    <div class="role-detail-panel" :style="{ borderColor: headerColor + '88' }">
      <button class="close-btn" @click="emit('close')" aria-label="Close">×</button>
      <div class="variants">
        <div v-for="v in variants" :key="v" class="variant">
          <img :src="rolePortraitUrl(v)" :alt="v" class="portrait" />
          <div class="text">
            <h2 class="title font-beleren" :style="{ color: ROLE_COLORS[v] }">{{ v }}</h2>
            <p class="description font-body">{{ ROLE_DESCRIPTIONS[v] }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.role-detail-overlay {
  position: fixed;
  inset: 0;
  background: #1a1612e6;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 1rem;
}

.role-detail-panel {
  position: relative;
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 8px;
  padding: 32px;
  width: 100%;
  max-width: 720px;
  max-height: 92vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  background: transparent;
  border: none;
  color: #8a7e66;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 3px;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover {
  color: #d4c8a8;
  background: #1a1612;
}

.variants {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.variant {
  display: grid;
  grid-template-columns: minmax(160px, 240px) 1fr;
  gap: 24px;
  align-items: center;
}

.variant + .variant {
  padding-top: 28px;
  border-top: 1px solid #3d352988;
}

.portrait {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.6));
}

.title {
  font-size: clamp(1.4rem, 3vw, 2rem);
  letter-spacing: 0.04em;
  margin: 0 0 12px;
}

.description {
  color: #d4c8a8;
  font-size: clamp(0.95rem, 1.6vw, 1.05rem);
  line-height: 1.55;
  font-style: italic;
  margin: 0;
}

@media (max-width: 600px) {
  .variant {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .portrait {
    max-width: 240px;
    margin: 0 auto;
  }
}
</style>
