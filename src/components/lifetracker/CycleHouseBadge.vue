<script setup>
import { computed } from 'vue'
import { HOUSE_COLORS, houseImageUrl, cycleRelations } from '../../lifetracker/cycle.js'
import CycleRelationIcon from './CycleRelationIcon.vue'

const props = defineProps({
  house: String,
  deadHouses: { type: Array, default: () => [] },
})

const emit = defineEmits(['open-map'])

const color = computed(() => HOUSE_COLORS[props.house] || '#8a7e66')
const img = computed(() => houseImageUrl(props.house))
const rel = computed(() => cycleRelations(props.house) || {})

function isDead(houseName) {
  return houseName && props.deadHouses.includes(houseName)
}
</script>

<template>
  <div v-if="house" class="house-badge">
    <img
      class="house-img clickable"
      :src="img"
      :alt="house"
      title="Show kill list map"
      @pointerdown.stop
      @click.stop="emit('open-map')"
    />
    <div class="house-plate" :style="{ borderColor: color }">
      <div class="house-name" :style="{ color }">{{ house }}</div>
      <div class="house-rels">
        <div class="rel">
          <span class="rel-label">
            <CycleRelationIcon kind="feud" />
            <span class="rel-label-text">Feud</span>
          </span>
          <span
            class="rel-value"
            :class="{ 'rel-dead': isDead(rel.feud) }"
            :style="{ color: HOUSE_COLORS[rel.feud] }"
          >{{ rel.feud }}</span>
        </div>
        <div class="rel">
          <span class="rel-label">
            <CycleRelationIcon kind="rival" />
            <span class="rel-label-text">Rival</span>
          </span>
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
  width: clamp(80px, 38cqmin, 150px);
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
  /* Container so the kill-list plate can drop the "Feud" / "Rival" word
     labels when the badge is too narrow to fit them next to the opposing
     house name. */
  container-type: inline-size;
}

.house-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* Heraldry shifted up to make room for the kill-list plate below.
     On large badges (iPad/tablet) the plate is shorter (36%) so the
     heraldry only needs a small nudge; on narrow badges the plate is
     taller (44%) so the heraldry has to move further up. The
     @container rule below restores the iPad value. */
  object-position: center 16%;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.6));
}

.house-img.clickable {
  cursor: pointer;
  transition: transform 0.15s, filter 0.15s;
}

.house-img.clickable:hover {
  transform: scale(1.04);
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.6)) brightness(1.15);
}

.house-plate {
  position: absolute;
  /* Sign-shaped plate, narrower than the sigil so the heraldry shows
     around it at the bottom corners. Wide enough to fit "Dragon" in the
     rival row without crowding the right border. */
  left: 9%;
  right: 9%;
  bottom: 4%;
  /* Default (narrow / phone-sized badges): taller plate so the icon
     rows don't clip. Wider badges get the original shorter plate via
     the @container rule below. */
  height: 44%;
  background: rgba(20, 16, 12, 0.9);
  border: 1px solid;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 3px 5px;
  box-sizing: border-box;
}

.house-name {
  font-family: 'Cinzel', serif;
  /* Badge-relative cqmin now that .house-badge is its own container.
     iPad badge ~150px wide → 10cqmin matches the previous 0.95rem
     ceiling; phone badges (80px) hit the 0.6rem floor as before. */
  font-size: clamp(0.6rem, 10cqmin, 0.95rem);
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
  /* Badge-relative cqmin: iPad badge 150px → 5.9% = 0.55rem (matches
     previous panel-cqmin ceiling). */
  font-size: clamp(0.4rem, 5.9cqmin, 0.55rem);
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  gap: 2px;
}

.rel-value {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.45rem, 6.9cqmin, 0.65rem);
  font-weight: 600;
  color: #d4c8a8;
  letter-spacing: 0.02em;
}

.rel-dead {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  opacity: 0.55;
}

/* Hide the "Feud" / "Rival" word labels by default — they appear only
   on badges wide enough to fit them comfortably alongside the opposing
   house name (~ tablet / iPad sized panels). The crossed-sword and
   sword icons carry the meaning on smaller screens. */
.rel-label-text {
  display: none;
}

@container (min-width: 115px) {
  .rel-label-text {
    display: inline;
  }
  /* Wider badge → labels are visible and the rows are slightly more
     compact, so reclaim some heraldry by going back to the original
     36% plate height. */
  .house-plate {
    height: 36%;
  }
  .house-img {
    object-position: center 22%;
  }
}
</style>
