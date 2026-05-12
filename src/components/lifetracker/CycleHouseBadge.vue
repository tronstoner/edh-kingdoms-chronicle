<script setup>
import { computed } from 'vue'
import { HOUSE_COLORS, houseImageUrl, cycleRelations } from '../../lifetracker/cycle.js'
import CycleRelationIcon from './CycleRelationIcon.vue'

const props = defineProps({
  house: String,
  deadHouses: { type: Array, default: () => [] },
})

const color = computed(() => HOUSE_COLORS[props.house] || '#8a7e66')
const img = computed(() => houseImageUrl(props.house))
const rel = computed(() => cycleRelations(props.house) || {})

function isDead(houseName) {
  return houseName && props.deadHouses.includes(houseName)
}
</script>

<template>
  <div v-if="house" class="house-badge">
    <img class="house-img" :src="img" :alt="house" />
    <div class="house-plate" :style="{ borderColor: color }">
      <div class="house-name" :style="{ color }">{{ house }}</div>
      <div class="house-rels">
        <div class="rel">
          <span class="rel-label"><CycleRelationIcon kind="feud" />Feud</span>
          <span
            class="rel-value"
            :class="{ 'rel-dead': isDead(rel.feud) }"
            :style="{ color: HOUSE_COLORS[rel.feud] }"
          >{{ rel.feud }}</span>
        </div>
        <div class="rel">
          <span class="rel-label"><CycleRelationIcon kind="rival" />Rival</span>
          <span
            class="rel-value"
            :class="{ 'rel-dead': isDead(rel.rival) }"
            :style="{ color: HOUSE_COLORS[rel.rival] }"
          >{{ rel.rival }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.house-badge {
  position: relative;
  /* No frame around the badge — the heraldry sits directly on the panel's
     deck-gradient background. Only the lower name/kill-list plate is a
     discrete box, laid over the bottom third of the sigil like a sign. */
  width: clamp(108px, 16vw, 150px);
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
}

.house-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* Push the heraldry upward so the plate below doesn't bury the icon. */
  object-position: center 22%;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.6));
}

.house-plate {
  position: absolute;
  /* Sign-shaped plate, narrower than the sigil so the heraldry shows
     around it at the bottom corners. Wide enough to fit "Dragon" in the
     rival row without crowding the right border. */
  left: 11%;
  right: 11%;
  bottom: 4%;
  height: 36%;
  background: rgba(20, 16, 12, 0.9);
  border: 1px solid;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 3px 4px;
  box-sizing: border-box;
}

.house-name {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.7rem, 1.8vw, 0.95rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: center;
  text-transform: uppercase;
  line-height: 1;
  /* House colour set inline — bright text on the dark plate. */
}

.house-rels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.rel {
  display: flex;
  justify-content: space-between;
  /* Label uses Cinzel uppercase, value uses EB Garamond serif — different
     baselines. Lock both to the same line-height and centre them so the
     serif descender doesn't make the value look "lower" than the label. */
  align-items: center;
  gap: 4px;
  line-height: 1;
}

.rel-label,
.rel-value {
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.rel-label {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.45rem, 0.95vw, 0.55rem);
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  gap: 2px;
}

.rel-value {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.5rem, 1.05vw, 0.65rem);
  font-weight: 600;
  color: #d4c8a8;
  letter-spacing: 0.02em;
}

.rel-dead {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  opacity: 0.55;
}
</style>
