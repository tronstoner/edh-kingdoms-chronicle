import { ref, onUnmounted } from 'vue'

// Reactive `now` (milliseconds since epoch) that updates on a fixed
// interval. Used by the turn-nudge logic to compare elapsed time
// against a per-round threshold without polling every frame.
//
// Default 5s tick is plenty for a nudge that fires on a minute-scale
// threshold and keeps the watcher load minimal.
export function useNowTick(intervalMs = 5000) {
  const now = ref(Date.now())
  const id = setInterval(() => { now.value = Date.now() }, intervalMs)
  onUnmounted(() => clearInterval(id))
  return now
}
