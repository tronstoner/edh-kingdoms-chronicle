<script setup>
import { computed } from 'vue'
import { LAYOUTS } from '../../composables/useTableLayouts.js'
import PlayerPanel from './PlayerPanel.vue'
import GameMenuInline from './GameMenuInline.vue'

const props = defineProps({
  layoutId: String,
  seats: Array,
  turnCount: Number,
  mode: { type: String, default: 'kingdoms' },
  startingSeatIndex: { type: Number, default: null },
  nudgeActive: { type: Boolean, default: false },
  fuseProgress: { type: Number, default: 0 },
})

const emit = defineEmits([
  'changeLife', 'openSeat', 'override', 'openCmdDamage',
  'revealRole', 'zombify', 'clone', 'clearUndead',
  'advanceTurn', 'endGame', 'export', 'newGame', 'back',
  'openCycleMap', 'openSettings',
])

const layout = computed(() => LAYOUTS[props.layoutId])
</script>

<template>
  <!-- Menu-column layouts (4-player 2+2, 6-player 3+3): CSS grid with menu column between seat columns -->
  <div
    v-if="layout.menuColumn"
    class="table-layout table-layout--grid"
    :style="{ gridTemplateColumns: layout.gridTemplateColumns }"
  >
    <template v-for="(row, ri) in layout.rows" :key="ri">
      <div
        v-for="(seatIndex, si) in row.seats"
        :key="seatIndex"
        class="table-cell"
        :style="{
          transform: row.rotate ? `rotate(${row.rotate}deg)` : undefined,
          gridRow: ri + 1,
          gridColumn: row.seatGridColumns[si],
        }"
      >
        <PlayerPanel
          v-if="seats[seatIndex]"
          :seat="seats[seatIndex]"
          :rotated="row.rotate === 180"
          :all-seats="seats"
          :layout-rows="layout.rows"
          :mode="mode"
          :starting-seat-index="startingSeatIndex"
          @change-life="(delta) => emit('changeLife', seatIndex, delta)"
          @override="emit('override', seatIndex)"
          @open-seat="emit('openSeat', seatIndex)"
          @open-cmd-damage="emit('openCmdDamage', seatIndex)"
          @reveal-role="emit('revealRole', seatIndex)"
          @zombify="emit('zombify', seatIndex)"
          @clone="emit('clone', seatIndex)"
          @clear-undead="emit('clearUndead', seatIndex)"
          @open-cycle-map="emit('openCycleMap')"
        />
      </div>
    </template>
    <div class="menu-column" :style="{ gridColumn: layout.menuGridColumn }">
      <GameMenuInline
        :turn-count="turnCount"
        :nudge-active="nudgeActive"
        :fuse-progress="fuseProgress"
        vertical
        @advance-turn="(d) => emit('advanceTurn', d)"
        @end-game="emit('endGame')"
        @export="emit('export')"
        @new-game="emit('newGame')"
        @back="emit('back')"
        @open-settings="emit('openSettings')"
      />
    </div>
  </div>

  <!-- 5-player: menu gap in the row with fewer seats -->
  <div v-else class="table-layout">
    <div
      v-for="(row, ri) in layout.rows"
      :key="ri"
      class="table-row"
    >
      <template v-if="row.menuGap">
        <div
          class="table-cell"
          :style="{ transform: row.rotate ? `rotate(${row.rotate}deg)` : undefined }"
        >
          <PlayerPanel
            v-if="seats[row.seats[0]]"
            :seat="seats[row.seats[0]]"
            :rotated="row.rotate === 180"
            :all-seats="seats"
            :layout-rows="layout.rows"
            @change-life="(delta) => emit('changeLife', row.seats[0], delta)"
            @override="emit('override', row.seats[0])"
            @open-seat="emit('openSeat', row.seats[0])"
            @open-cmd-damage="emit('openCmdDamage', row.seats[0])"
            @reveal-role="emit('revealRole', row.seats[0])"
            @zombify="emit('zombify', row.seats[0])"
            @clone="emit('clone', row.seats[0])"
            @clear-undead="emit('clearUndead', row.seats[0])"
          />
        </div>
        <div class="menu-gap" :style="{ transform: row.rotate ? `rotate(${row.rotate}deg)` : undefined }">
          <GameMenuInline
            :turn-count="turnCount"
            :nudge-active="nudgeActive"
            :fuse-progress="fuseProgress"
            @advance-turn="(d) => emit('advanceTurn', d)"
            @end-game="emit('endGame')"
            @export="emit('export')"
            @new-game="emit('newGame')"
            @back="emit('back')"
            @open-settings="emit('openSettings')"
          />
        </div>
        <div
          class="table-cell"
          :style="{ transform: row.rotate ? `rotate(${row.rotate}deg)` : undefined }"
        >
          <PlayerPanel
            v-if="seats[row.seats[1]]"
            :seat="seats[row.seats[1]]"
            :rotated="row.rotate === 180"
            :all-seats="seats"
            :layout-rows="layout.rows"
            @change-life="(delta) => emit('changeLife', row.seats[1], delta)"
            @override="emit('override', row.seats[1])"
            @open-seat="emit('openSeat', row.seats[1])"
            @open-cmd-damage="emit('openCmdDamage', row.seats[1])"
            @reveal-role="emit('revealRole', row.seats[1])"
            @zombify="emit('zombify', row.seats[1])"
            @clone="emit('clone', row.seats[1])"
            @clear-undead="emit('clearUndead', row.seats[1])"
          />
        </div>
      </template>
      <template v-else>
        <div
          v-for="seatIndex in row.seats"
          :key="seatIndex"
          class="table-cell"
          :style="{ transform: row.rotate ? `rotate(${row.rotate}deg)` : undefined }"
        >
          <PlayerPanel
            v-if="seats[seatIndex]"
            :seat="seats[seatIndex]"
            :rotated="row.rotate === 180"
            :all-seats="seats"
            :layout-rows="layout.rows"
            @change-life="(delta) => emit('changeLife', seatIndex, delta)"
            @override="emit('override', seatIndex)"
            @open-seat="emit('openSeat', seatIndex)"
            @open-cmd-damage="emit('openCmdDamage', seatIndex)"
            @reveal-role="emit('revealRole', seatIndex)"
            @zombify="emit('zombify', seatIndex)"
            @clone="emit('clone', seatIndex)"
            @clear-undead="emit('clearUndead', seatIndex)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.table-layout {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 3px;
  background-color: #3d3529;
}

.table-row {
  display: flex;
  flex: 1;
  gap: 3px;
}

.table-cell {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.menu-gap {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  /* Same responsive rule as the menu column in 4/6-player grid layouts:
     ~64px on iPad, ~40px on phones. */
  width: clamp(40px, 8vmin, 64px);
  min-width: clamp(40px, 8vmin, 64px);
  z-index: 15;
  /* Container query context so GameMenuInline icons scale with the gap. */
  container-type: size;
}

.table-layout--grid {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 3px;
}

.menu-column {
  grid-row: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
  /* Container query context so GameMenuInline icons scale with the column. */
  container-type: size;
}
</style>
