<script setup>
import { computed } from 'vue'
import { HOUSE_COLORS, houseImageUrl, cycleRelations } from '../../lifetracker/cycle.js'
import CycleRelationIcon from './CycleRelationIcon.vue'

const props = defineProps({
  house: String,
  deadHouses: { type: Array, default: () => [] },
  // { nemesis: angleDeg, rival: angleDeg } — bearings from this seat to
  // each target's seat. 0° points right (east), 90° down, 180° left, etc.
  // — standard CSS rotate convention. Null/undefined skips the arrow.
  targetArrows: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['open-map'])

const color = computed(() => HOUSE_COLORS[props.house] || 'var(--lt-text-dim)')
const img = computed(() => houseImageUrl(props.house))
const rel = computed(() => cycleRelations(props.house) || {})

function isDead(houseName) {
  return houseName && props.deadHouses.includes(houseName)
}
</script>

<template>
  <div
    v-if="house"
    class="house-badge clickable"
    title="Show kill list map"
    @pointerdown.stop
    @click.stop="emit('open-map', house)"
  >
    <img
      class="house-img"
      :src="img"
      :alt="house"
    />
    <div class="house-plate" :style="{ borderColor: color }">
      <div class="house-name" :style="{ color }">{{ house }}</div>
      <div class="house-rels">
        <div class="rel">
          <span class="rel-icon" :class="{ 'rel-dead': isDead(rel.nemesis) }"><CycleRelationIcon kind="nemesis" /></span>
          <span
            class="rel-value"
            :class="{ 'rel-dead': isDead(rel.nemesis) }"
            :style="{ color: HOUSE_COLORS[rel.nemesis] }"
          >
            {{ rel.nemesis }}
            <svg
              v-if="targetArrows.nemesis != null"
              class="rel-arrow"
              :style="{ transform: `rotate(${targetArrows.nemesis}deg)` }"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M 4 12 L 18 12 M 13 7 L 18 12 L 13 17" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <div class="rel">
          <span class="rel-icon" :class="{ 'rel-dead': isDead(rel.rival) }"><CycleRelationIcon kind="rival" /></span>
          <span
            class="rel-value"
            :class="{ 'rel-dead': isDead(rel.rival) }"
            :style="{ color: HOUSE_COLORS[rel.rival] }"
          >
            {{ rel.rival }}
            <svg
              v-if="targetArrows.rival != null"
              class="rel-arrow"
              :style="{ transform: `rotate(${targetArrows.rival}deg)` }"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M 4 12 L 18 12 M 13 7 L 18 12 L 13 17" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
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
  /* Container so the kill-list plate can drop the "Nemesis" / "Rival" word
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
  /* Heraldry shifted up to make room for the kill-list plate below. */
  object-position: center 16%;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.6));
  transform: scale(1.05);
}

.house-badge.clickable {
  cursor: pointer;
}

.house-plate {
  position: absolute;
  /* Narrower sign-shaped plate: with the word labels gone (icon + house
     name only) the rows fit comfortably so the plate can pull in from
     the badge edges and let more of the heraldry show. */
  left: 14%;
  right: 14%;
  bottom: 4%;
  height: 44%;
  background: rgba(20, 16, 12, 0.9);
  border: 1px solid;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  /* Extra bottom padding so the "g" descender in "Dragon" doesn't
     touch the plate border on phone-sized badges where the rel-row
     line-height of 1 leaves no room below the baseline. */
  padding: 3px 6px 0;
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

/* Same two-column grid pattern the preview cards use: icons right-aligned
   in the left column, values left-aligned in the right. .rel uses
   display: contents so its children become direct grid items, which lets
   both rows share consistent column edges. */
.house-rels {
  display: grid;
  grid-template-columns: max-content max-content;
  column-gap: 3px;
  row-gap: 2px;
  justify-content: center;
  align-items: center;
  width: 100%;
  line-height: 1;
  padding-top: 3px;
  border-top: 1px solid color-mix(in srgb, var(--lt-text-dim) 35%, transparent);
}

.rel {
  display: contents;
}

.rel-icon {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  color: var(--lt-text-dim);
  font-size: clamp(0.5rem, 8.2cqmin, 0.78rem);
  line-height: 1;
  /* The sword/shield paths fill the viewBox bottom-heavy (pommel near
     y=23), so the bounding box centre sits below the icon's visual
     mass. Nudge upward by feel so the glyph reads centred against the
     house-name text it sits next to. */
  transform: translateY(0.04em);
}


.rel-value {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.5rem, 9.1cqmin, 0.85rem);
  font-weight: 600;
  color: var(--lt-text);
  letter-spacing: 0.02em;
  justify-self: start;
}

.rel-dead {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  opacity: 0.3;
}

/* Compass arrow pointing toward the target seat. The bearing comes from
   the parent (PlayerPanel) computed against the grid layout, so it
   automatically picks up the 8 compass directions a 2×2 table allows.
   Rendered inline-after the house name so they read as one unit. */
.rel-arrow {
  display: inline-block;
  vertical-align: -0.15em;
  width: 1em;
  height: 1em;
  color: var(--lt-text-dim);
  margin-left: -2px;
}
</style>
