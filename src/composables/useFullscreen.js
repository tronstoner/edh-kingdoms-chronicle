import { ref, computed, onMounted, onUnmounted } from 'vue'

const standaloneQuery = typeof window !== 'undefined'
  ? window.matchMedia('(display-mode: standalone)')
  : null

function detectStandalone() {
  if (typeof window === 'undefined') return false
  if (standaloneQuery?.matches) return true
  // iOS Safari sets navigator.standalone when launched from home screen
  return window.navigator.standalone === true
}

function detectIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ reports as Mac; distinguish via touch points
  const isIPadOS = ua.includes('Mac') && navigator.maxTouchPoints > 1
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS
}

export function useFullscreen() {
  const isStandalone = ref(detectStandalone())
  const isIOS = ref(detectIOS())
  const isFullscreen = ref(!!(document.fullscreenElement || document.webkitFullscreenElement))

  // In standalone PWA mode there's already no browser chrome, so the toggle is moot.
  // (On iOS browser the API is buggy — shows an X overlay and exits on keyboard —
  // but we still surface the button so users can opt in.)
  const canToggleFullscreen = computed(() => {
    if (isStandalone.value) return false
    return !!document.documentElement.requestFullscreen
      || !!document.documentElement.webkitRequestFullscreen
  })

  function onFullscreenChange() {
    isFullscreen.value = !!(document.fullscreenElement || document.webkitFullscreenElement)
  }

  function onStandaloneChange(e) {
    isStandalone.value = e.matches || detectStandalone()
  }

  async function toggleFullscreen() {
    if (!canToggleFullscreen.value) return
    const el = document.documentElement
    const request = el.requestFullscreen || el.webkitRequestFullscreen
    const exit = document.exitFullscreen || document.webkitExitFullscreen
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await exit?.call(document)
      } else {
        await request?.call(el)
      }
    } catch {
      // Browser may reject (e.g. not from user gesture); ignore.
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
    standaloneQuery?.addEventListener?.('change', onStandaloneChange)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
    standaloneQuery?.removeEventListener?.('change', onStandaloneChange)
  })

  return {
    isFullscreen,
    isStandalone,
    isIOS,
    canToggleFullscreen,
    toggleFullscreen,
  }
}
