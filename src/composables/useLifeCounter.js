const HOLD_THRESHOLD = 400
const TICK_INTERVAL = 500

export function useLifeCounter(onChange) {
  let holdTimer = null
  let tickTimer = null
  let currentSign = 0
  let held = false

  function vibrate() {
    if (navigator.vibrate) navigator.vibrate(10)
  }

  function start(sign) {
    currentSign = sign
    held = false
    holdTimer = setTimeout(() => {
      held = true
      // First +10 on hold trigger
      onChange(sign * 10)
      vibrate()
      tickTimer = setInterval(() => {
        onChange(currentSign * 10)
        vibrate()
      }, TICK_INTERVAL)
    }, HOLD_THRESHOLD)
  }

  function stop() {
    clearTimeout(holdTimer)
    clearInterval(tickTimer)
    holdTimer = null
    tickTimer = null
    // Single tap: only fires if hold didn't trigger
    if (!held) {
      onChange(currentSign)
      vibrate()
    }
    held = false
    currentSign = 0
  }

  function getSign(event, el, rotated) {
    const rect = el.getBoundingClientRect()
    const x = event.clientX - rect.left
    const half = rect.width / 2
    const sign = x < half ? -1 : 1
    return rotated ? -sign : sign
  }

  return { start, stop, getSign }
}
