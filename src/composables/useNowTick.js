import { ref, onUnmounted } from 'vue'

// Reactive `now` (milliseconds since epoch) that updates on a fixed
// interval. Used by the turn-nudge logic to compare elapsed time
// against a per-round threshold without polling every frame.
//
// Default 1s tick gives the fuse and radial pie a clean per-second
// step without burning compositor cycles on a continuous animation.
// Calculations are cheap (one subtraction + clamp), so the load is
// dominated by the watcher itself.
export function useNowTick(intervalMs = 1000) {
  const now = ref(Date.now())
  const id = setInterval(() => { now.value = Date.now() }, intervalMs)
  onUnmounted(() => clearInterval(id))
  return now
}
