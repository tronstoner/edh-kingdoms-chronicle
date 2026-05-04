<template>
  <section class="bg-mtg-card border-2 border-mtg-border rounded-xl overflow-hidden shadow-lg shadow-black/30">
    <div class="border-b border-mtg-border bg-mtg-card-alt px-6 py-4">
      <h2 class="text-2xl font-beleren text-mtg-gold tracking-wide">
        <slot name="title" />
      </h2>
    </div>
    <div class="p-6">
      <slot />
    </div>
  </section>
</template>
