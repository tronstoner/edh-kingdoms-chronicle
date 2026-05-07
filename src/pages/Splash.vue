<script setup>
// Landing page — pick Chronicle (dashboard) or Lifetracker.
// King looms in the background; cards sit below him as two playing-card-shaped tiles.
</script>

<template>
  <div class="splash">
    <img src="/zombie-goblin-king.png" alt="" class="splash-king" />
    <div class="splash-cards">
      <router-link to="/dashboard" class="splash-card">
        <div class="splash-card-art">
          <img src="/parchment.png" alt="" />
        </div>
        <div class="splash-card-label">
          <h2>Chronicle</h2>
          <p>Analytics &amp; history</p>
        </div>
      </router-link>
      <router-link to="/lifetracker" class="splash-card">
        <div class="splash-card-art">
          <img src="/potion.png" alt="" />
        </div>
        <div class="splash-card-label">
          <h2>Lifetracker</h2>
          <p>Track a live game</p>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.splash {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 0 1rem;
}

.splash-king {
  /* Constrain by both width and height so the whole splash fits in the
     viewport regardless of orientation. */
  max-width: min(72vw, 540px);
  max-height: 46vh;
  width: auto;
  height: auto;
  margin-bottom: -9vh;
  pointer-events: none;
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6));
  z-index: 0;
}

.splash-cards {
  display: flex;
  gap: clamp(1rem, 4vw, 3rem);
  position: relative;
  z-index: 1;
}

.splash-card {
  /* Cap card by viewport width AND height (via aspect-ratio), so two cards
     side-by-side never push the layout off-screen on iPad / short displays. */
  width: min(42vw, calc(42vh * 63 / 88), 310px);
  aspect-ratio: 63 / 88;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, #2a2520 0%, #1a1612 100%);
  border: 2px solid var(--color-mtg-border);
  border-radius: 14px;
  text-decoration: none;
  color: var(--color-mtg-text);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.splash-card:hover,
.splash-card:focus-visible {
  transform: translateY(-6px);
  border-color: var(--color-mtg-gold);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--color-mtg-gold) inset;
}

.splash-card-art {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1rem 0;
  min-height: 0;
}

.splash-card-art img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
}

.splash-card-label {
  text-align: center;
  padding: 0.75rem 0.5rem 1rem;
  border-top: 1px solid var(--color-mtg-border);
  background: rgba(0, 0, 0, 0.3);
}

.splash-card-label h2 {
  font-family: var(--font-beleren);
  color: var(--color-mtg-gold);
  letter-spacing: 0.04em;
  font-size: clamp(1.1rem, 2.4vw, 1.5rem);
  margin: 0;
}

.splash-card-label p {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--color-mtg-text-dim);
  font-size: clamp(0.8rem, 1.6vw, 0.95rem);
  margin: 0.25rem 0 0;
}

@media (max-width: 480px) {
  .splash-king {
    margin-bottom: -6vh;
  }
}
</style>
