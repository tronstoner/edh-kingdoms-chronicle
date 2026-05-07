import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router.js'

// iOS Safari ignores viewport user-scalable=no, so block pinch and double-tap zoom explicitly.
const blockGesture = (e) => e.preventDefault()
document.addEventListener('gesturestart', blockGesture)
document.addEventListener('gesturechange', blockGesture)
document.addEventListener('gestureend', blockGesture)

let lastTouchEnd = 0
document.addEventListener('touchend', (e) => {
  const now = Date.now()
  if (now - lastTouchEnd <= 350) e.preventDefault()
  lastTouchEnd = now
}, { passive: false })

createApp(App).use(router).mount('#app')
