<script setup>
import { ref, computed, onMounted } from 'vue'
import { HOUSE_COLORS, houseImageUrl, cycleRelations, turnPositionFor } from '../../lifetracker/cycle.js'
import CycleRelationIcon from './CycleRelationIcon.vue'

const props = defineProps({
  seats: Array,
  startingSeatIndex: Number,
})

const emit = defineEmits(['redeal', 'begin', 'back'])

// Animation state — cards flip in sequence after the shuffle pass.
const revealed = ref([false, false, false, false])
const dealing = ref(true)
const showStart = ref(false)

function runAnimation() {
  revealed.value = [false, false, false, false]
  dealing.value = true
  showStart.value = false
  // Shuffle pass = .9s of rattle; then reveal each card spaced .25s apart;
  // then show starting-player highlight.
  setTimeout(() => {
    dealing.value = false
    props.seats.forEach((_, i) => {
      setTimeout(() => {
        revealed.value[i] = true
      }, i * 280)
    })
    setTimeout(() => {
      showStart.value = true
    }, props.seats.length * 280 + 350)
  }, 900)
}

onMounted(runAnimation)

function handleRedeal() {
  emit('redeal')
  // Allow parent to re-deal then trigger animation again on next tick.
  setTimeout(runAnimation, 50)
}

const seatRows = computed(() => [
  [props.seats[0], props.seats[1]],
  [props.seats[3], props.seats[2]], // bottom-left, bottom-right physically
])

function houseColor(house) {
  return HOUSE_COLORS[house] || '#8a7e66'
}

function relations(house) {
  return cycleRelations(house) || {}
}

function turnPos(seatIndex) {
  if (props.startingSeatIndex == null) return null
  return turnPositionFor(seatIndex, props.startingSeatIndex, props.seats.length)
}
</script>

<template>
  <div class="cycle-preview">
    <div class="preview-header">
      <h2 class="preview-title font-beleren">The Cycle</h2>
      <p class="preview-subtitle">Dealing the Houses…</p>
    </div>

    <div class="cards-grid" :class="{ shuffling: dealing }">
      <div class="cards-row">
        <!-- Top row: seats 0 (top-left) and 1 (top-right) -->
        <template v-for="seatIndex in [0, 1]" :key="seatIndex">
          <div class="card-cell">
            <div class="card-player">{{ seats[seatIndex]?.player || `Seat ${seatIndex + 1}` }}</div>
            <div
              class="card"
              :class="{ revealed: revealed[seatIndex], dealing }"
              :style="revealed[seatIndex] ? { '--house-color': houseColor(seats[seatIndex]?.house) } : undefined"
            >
              <div class="card-face card-back">
                <div class="card-back-pattern"></div>
              </div>
              <div class="card-face card-front" :style="{ borderColor: houseColor(seats[seatIndex]?.house) }">
                <span v-if="showStart && turnPos(seatIndex) === 1" class="start-badge">Starts</span>
                <img
                  v-if="seats[seatIndex]?.house"
                  class="card-house-img"
                  :src="houseImageUrl(seats[seatIndex].house)"
                  :alt="seats[seatIndex].house"
                />
                <div class="card-house-name" :style="{ color: houseColor(seats[seatIndex]?.house) }">
                  House {{ seats[seatIndex]?.house }}
                </div>
                <div class="card-house-relations">
                  <div class="rel-row">
                    <span class="rel-label"><CycleRelationIcon kind="feud" />Feud</span>
                    <span class="rel-value" :style="{ color: houseColor(relations(seats[seatIndex]?.house).feud) }">{{ relations(seats[seatIndex]?.house).feud }}</span>
                  </div>
                  <div class="rel-row">
                    <span class="rel-label"><CycleRelationIcon kind="rival" />Rival</span>
                    <span class="rel-value" :style="{ color: houseColor(relations(seats[seatIndex]?.house).rival) }">{{ relations(seats[seatIndex]?.house).rival }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div class="cards-row">
        <!-- Bottom row: physically the user-facing side; seat 2 (bottom-left), seat 3 (bottom-right) -->
        <template v-for="seatIndex in [2, 3]" :key="seatIndex">
          <div class="card-cell">
            <div class="card-player">{{ seats[seatIndex]?.player || `Seat ${seatIndex + 1}` }}</div>
            <div
              class="card"
              :class="{ revealed: revealed[seatIndex], dealing }"
              :style="revealed[seatIndex] ? { '--house-color': houseColor(seats[seatIndex]?.house) } : undefined"
            >
              <div class="card-face card-back">
                <div class="card-back-pattern"></div>
              </div>
              <div class="card-face card-front" :style="{ borderColor: houseColor(seats[seatIndex]?.house) }">
                <span v-if="showStart && turnPos(seatIndex) === 1" class="start-badge">Starts</span>
                <img
                  v-if="seats[seatIndex]?.house"
                  class="card-house-img"
                  :src="houseImageUrl(seats[seatIndex].house)"
                  :alt="seats[seatIndex].house"
                />
                <div class="card-house-name" :style="{ color: houseColor(seats[seatIndex]?.house) }">
                  House {{ seats[seatIndex]?.house }}
                </div>
                <div class="card-house-relations">
                  <div class="rel-row">
                    <span class="rel-label"><CycleRelationIcon kind="feud" />Feud</span>
                    <span class="rel-value" :style="{ color: houseColor(relations(seats[seatIndex]?.house).feud) }">{{ relations(seats[seatIndex]?.house).feud }}</span>
                  </div>
                  <div class="rel-row">
                    <span class="rel-label"><CycleRelationIcon kind="rival" />Rival</span>
                    <span class="rel-value" :style="{ color: houseColor(relations(seats[seatIndex]?.house).rival) }">{{ relations(seats[seatIndex]?.house).rival }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="preview-actions" :class="{ visible: showStart }">
      <button class="btn btn-secondary" @click="emit('back')">Back</button>
      <button class="btn btn-secondary" @click="handleRedeal">Re-deal</button>
      <button class="btn btn-primary" @click="emit('begin')">Begin Game</button>
    </div>
  </div>
</template>

<style scoped>
.cycle-preview {
  position: absolute;
  inset: 0;
  background: #1a1612;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px;
  gap: 14px;
  /* Allow scrolling if content is taller than the viewport (e.g. iPad
     landscape where height is the tight axis). */
  overflow-y: auto;
}

.preview-header {
  text-align: center;
  flex-shrink: 0;
}

.preview-title {
  font-size: 1.6rem;
  color: #c9a54e;
  letter-spacing: 0.05em;
  margin: 0;
  line-height: 1.1;
}

.preview-subtitle {
  font-family: 'EB Garamond', serif;
  font-style: italic;
  color: #8a7e66;
  margin: 2px 0 0;
  font-size: 0.85rem;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 900px;
  flex-shrink: 0;
}

.cards-row {
  display: flex;
  gap: 18px;
  justify-content: center;
}

.card-cell {
  flex: 1;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.card-player {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  color: #d4c8a8;
  letter-spacing: 0.04em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.card {
  position: relative;
  width: 100%;
  aspect-ratio: 5 / 7;
  perspective: 900px;
  transform-style: preserve-3d;
}

.card-face {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-back {
  background: linear-gradient(135deg, #2a2520, #1a1612);
  border: 2px solid #3d3529;
  transition: transform 0.6s cubic-bezier(0.3, 0.7, 0.4, 1);
  transform: rotateY(0deg);
}

.card-back-pattern {
  width: 60%;
  height: 60%;
  border: 2px solid #c9a54e44;
  border-radius: 4px;
  background:
    repeating-linear-gradient(45deg, #c9a54e11 0, #c9a54e11 4px, transparent 4px, transparent 8px);
}

.card-front {
  background: #231f1a;
  border: 2px solid #3d3529;
  transform: rotateY(180deg);
  transition: transform 0.6s cubic-bezier(0.3, 0.7, 0.4, 1), box-shadow 0.4s;
  padding: 10px;
  gap: 4px;
}

.card.revealed .card-back { transform: rotateY(-180deg); }
.card.revealed .card-front {
  transform: rotateY(0deg);
  box-shadow: 0 0 24px var(--house-color, #c9a54e)44;
}

.card.dealing {
  animation: shuffle 0.9s ease-in-out;
}

@keyframes shuffle {
  0%   { transform: translate(0, 0) rotate(0); }
  15%  { transform: translate(-12px, -10px) rotate(-6deg); }
  30%  { transform: translate(14px, -6px) rotate(8deg); }
  45%  { transform: translate(-10px, 8px) rotate(-5deg); }
  60%  { transform: translate(12px, 4px) rotate(7deg); }
  75%  { transform: translate(-6px, -4px) rotate(-3deg); }
  100% { transform: translate(0, 0) rotate(0); }
}

.card-house-img {
  width: 65%;
  max-height: 55%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
}

.card-house-name {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
}

.card-house-relations {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 0 8px;
}

.rel-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'EB Garamond', serif;
  font-size: 0.8rem;
}

.rel-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.65rem;
}

.rel-value {
  color: #d4c8a8;
}

.start-badge {
  /* Sits inside the revealed card's front face, anchored at the top. */
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  color: #c9a54e;
  border: 1px solid #c9a54e;
  border-radius: 3px;
  padding: 2px 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: #c9a54e22;
  white-space: nowrap;
  z-index: 2;
  animation: pop 0.5s ease;
}

@keyframes pop {
  0% { transform: translateX(-50%) scale(0.6); opacity: 0; }
  60% { transform: translateX(-50%) scale(1.15); opacity: 1; }
  100% { transform: translateX(-50%) scale(1); }
}

.preview-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.4s, transform 0.4s;
}

.preview-actions.visible {
  opacity: 1;
  transform: translateY(0);
}

.btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 10px 22px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

/* Landscape with limited height (iPad mini / 11" landscape, ~768-834px):
   keep header + cards in the centred column flow (so the cards stay
   aligned under the title) and float the buttons absolutely to the
   right side of the screen so they don't push the cards off-centre. */
@media (orientation: landscape) and (max-height: 900px) {
  .cycle-preview {
    padding: 14px 18px;
    gap: 10px;
  }

  .cards-grid { gap: 12px; }

  .preview-title { font-size: 1.4rem; }
  .preview-subtitle { font-size: 0.8rem; }

  .preview-actions {
    position: absolute;
    right: 24px;
    top: 50%;
    flex-direction: column;
    width: 150px;
    /* Compose the entry animation's translate with the vertical centring
       translate so neither overrides the other. */
    transform: translateY(calc(-50% + 8px));
  }

  .preview-actions.visible {
    transform: translateY(-50%);
  }

  .btn {
    width: 100%;
  }
}

.btn-primary {
  color: #c9a54e;
  border: 2px solid #c9a54e66;
  background: #c9a54e22;
}

.btn-primary:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
}

.btn-secondary {
  color: #8a7e66;
  border: 1px solid #3d3529;
  background: none;
}

.btn-secondary:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
