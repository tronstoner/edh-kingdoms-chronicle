<script setup>
import { computed } from 'vue'
import { LAYOUTS } from '../../composables/useTableLayouts.js'
import PlayerPanel from './PlayerPanel.vue'
import GameMenuInline from './GameMenuInline.vue'

const props = defineProps({
  layoutId: String,
  seats: Array,
  turnCount: Number,
})

const emit = defineEmits([
  'changeLife', 'openSeat', 'override', 'openCmdDamage',
  'revealRole', 'zombify', 'clone', 'clearUndead',
  'advanceTurn', 'endGame', 'export', 'newGame', 'back',
])

const layout = computed(() => LAYOUTS[props.layoutId])
</script>

<template>
  <!-- 6-player: each row split as 2 seats | menu column | 1 seat -->
  <div v-if="layout.menuColumn" class="table-layout">
    <div
      v-for="(row, ri) in layout.rows"
      :key="ri"
      class="table-row"
    >
      <!-- First two seats -->
      <div
        v-for="seatIndex in row.seats.slice(0, 2)"
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
      <!-- Spacer to keep grid alignment (menu is absolutely positioned) -->
      <div class="menu-column-spacer"></div>
      <!-- Third seat -->
      <div
        class="table-cell"
        :style="{ transform: row.rotate ? `rotate(${row.rotate}deg)` : undefined }"
      >
        <PlayerPanel
          v-if="seats[row.seats[2]]"
          :seat="seats[row.seats[2]]"
          :rotated="row.rotate === 180"
          :all-seats="seats"
          :layout-rows="layout.rows"
          @change-life="(delta) => emit('changeLife', row.seats[2], delta)"
          @override="emit('override', row.seats[2])"
          @open-seat="emit('openSeat', row.seats[2])"
          @open-cmd-damage="emit('openCmdDamage', row.seats[2])"
          @reveal-role="emit('revealRole', row.seats[2])"
          @zombify="emit('zombify', row.seats[2])"
          @clone="emit('clone', row.seats[2])"
          @clear-undead="emit('clearUndead', row.seats[2])"
        />
      </div>
    </div>
    <!-- Menu column spanning full height -->
    <div class="menu-column">
      <GameMenuInline
        :turn-count="turnCount"
        vertical
        @advance-turn="(d) => emit('advanceTurn', d)"
        @end-game="emit('endGame')"
        @export="emit('export')"
        @new-game="emit('newGame')"
        @back="emit('back')"
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
        <div class="menu-gap" :class="{ 'menu-gap--rotated': row.rotate }" :style="{ transform: row.rotate ? `rotate(${row.rotate}deg)` : undefined }">
          <GameMenuInline
            :turn-count="turnCount"
            @advance-turn="(d) => emit('advanceTurn', d)"
            @end-game="emit('endGame')"
            @export="emit('export')"
            @new-game="emit('newGame')"
            @back="emit('back')"
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
  width: 48px;
  min-width: 48px;
  z-index: 15;
}

.menu-gap--rotated {
  align-items: flex-end;
}

.menu-column {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 0);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 48px;
  z-index: 10;
}

.menu-column-spacer {
  width: 48px;
  min-width: 48px;
}
</style>
