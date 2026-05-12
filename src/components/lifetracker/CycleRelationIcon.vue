<script setup>
// Tiny inline glyph for the Feud/Rival labels. Reuses the same filled
// silhouette path as the minimap glyphs so the symbol is consistent
// across the lifetracker. Sized in `em` units so it matches the
// surrounding font automatically.
defineProps({
  kind: { type: String, required: true }, // 'feud' | 'rival'
})

const SWORD = 'M12 1 L13.75 2.75 L13.75 15 L17 15 L17 17 L13.5 17 L13.5 21 L14.25 21.5 L14.25 23 L9.75 23 L9.75 21.5 L10.5 21 L10.5 17 L7 17 L7 15 L10.25 15 L10.25 2.75 Z'
</script>

<template>
  <svg
    v-if="kind === 'feud'"
    viewBox="0 0 24 24"
    class="rel-glyph"
    aria-hidden="true"
  >
    <g fill="currentColor">
      <path :transform="`rotate(45 12 9)`" :d="SWORD" />
      <path :transform="`rotate(-45 12 9)`" :d="SWORD" />
    </g>
  </svg>
  <svg
    v-else
    viewBox="0 0 24 24"
    class="rel-glyph"
    aria-hidden="true"
  >
    <path fill="currentColor" :transform="`rotate(45 12 12)`" :d="SWORD" />
  </svg>
</template>

<style scoped>
.rel-glyph {
  /* Scales with the surrounding font. Tuned so the icon reads alongside
     the label without crowding the value on the longer house names. */
  width: 1.15em;
  height: 1.15em;
  display: inline-block;
  vertical-align: middle;
  flex: 0 0 auto;
}
</style>
