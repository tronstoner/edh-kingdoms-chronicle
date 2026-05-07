<script setup>
import { ROLE_COLORS, ROLE_DESCRIPTIONS, rolePortraitUrl } from '../roles.js'

defineProps({
  role: { type: String, required: true },
})
const emit = defineEmits(['close'])
</script>

<template>
  <div class="role-detail-overlay" @click.self="emit('close')">
    <div class="role-detail-panel" :style="{ borderColor: (ROLE_COLORS[role] || '#3d3529') + '88' }">
      <button class="close-btn" @click="emit('close')" aria-label="Close">×</button>
      <div class="content">
        <img :src="rolePortraitUrl(role)" :alt="role" class="portrait" />
        <div class="text">
          <h2 class="title font-beleren" :style="{ color: ROLE_COLORS[role] }">{{ role }}</h2>
          <p class="description font-body">{{ ROLE_DESCRIPTIONS[role] }}</p>
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

.content {
  display: grid;
  grid-template-columns: minmax(180px, 280px) 1fr;
  gap: 28px;
  align-items: center;
}

.portrait {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.6));
}

.title {
  font-size: clamp(1.6rem, 3.6vw, 2.4rem);
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
  .content {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .portrait {
    max-width: 280px;
    margin: 0 auto;
  }
}
</style>
