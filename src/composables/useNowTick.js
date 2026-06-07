import { ref, onUnmounted } from 'vue'

// Reactive `now` (milliseconds since epoch) that updates on a fixed
// interval. Used by the turn-nudge logic to compare elapsed time
// against a per-round threshold without polling every frame.
//
// 1s default keeps the nudgeActive check accurate to ~1s of the
// threshold without flooding the watcher. The fuse / radial visuals
// don't depend on this — they run on a CSS animation handled by the
// compositor thread.
export function useNowTick(intervalMs = 1000) {
  const now = ref(Date.now())
  const id = setInterval(() => { now.value = Date.now() }, intervalMs)
  onUnmounted(() => clearInterval(id))
  return now
}
