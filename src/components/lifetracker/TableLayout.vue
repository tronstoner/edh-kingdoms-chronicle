<script setup>
import { computed } from 'vue'
import { LAYOUTS } from '../../composables/useTableLayouts.js'
import PlayerPanel from './PlayerPanel.vue'

const props = defineProps({
  layoutId: String,
  seats: Array,
})

const emit = defineEmits(['changeLife', 'openSeat', 'override', 'openCmdDamage', 'revealRole', 'zombify', 'clone'])

const layout = computed(() => LAYOUTS[props.layoutId])
</script>

<template>
  <div class="table-layout">
    <div
      v-for="(row, ri) in layout.rows"
      :key="ri"
      class="table-row"
    >
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
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-layout {
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
}
</style>
