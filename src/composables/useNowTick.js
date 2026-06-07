import { ref, onUnmounted } from 'vue'

// Reactive `now` (milliseconds since epoch) that updates on a fixed
// interval. Used by the turn-nudge logic to compare elapsed time
// against a per-round threshold without polling every frame.
//
// 1s default — drives the nudgeActive flip AND the discrete clock
// tick of the turn-cycle fuse/radial. JS-driven on purpose: a CSS
// animation with steps() can't take a var() for the step count
// (parse-time literal required), and we want a one-tick-per-second
// "clock face" feel rather than smooth interpolation. Cost is one ref
// update + one style binding per second — trivially cheap.
export function useNowTick(intervalMs = 1000) {
  const now = ref(Date.now())
  const id = setInterval(() => { now.value = Date.now() }, intervalMs)
  onUnmounted(() => clearInterval(id))
  return now
}
