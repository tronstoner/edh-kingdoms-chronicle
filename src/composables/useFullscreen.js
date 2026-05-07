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
  const isFullscreen = ref(!!document.fullscreenElement)

  // Fullscreen API is unreliable on iOS (shows X overlay, exits on keyboard).
  // In standalone PWA mode there's already no browser chrome, so the toggle is moot.
  const canToggleFullscreen = computed(() => {
    if (isStandalone.value) return false
    if (isIOS.value) return false
    return !!document.documentElement.requestFullscreen
  })

  function onFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement
  }

  function onStandaloneChange(e) {
    isStandalone.value = e.matches || detectStandalone()
  }

  async function toggleFullscreen() {
    if (!canToggleFullscreen.value) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Browser may reject (e.g. not from user gesture); ignore.
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
    standaloneQuery?.addEventListener?.('change', onStandaloneChange)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
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
