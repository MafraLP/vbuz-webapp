<template>
  <q-card-section class="q-pa-sm q-pt-xs">
    <div class="row q-col-gutter-sm justify-between items-center">
      <div class="row q-gutter-sm">
        <!-- Renderiza as ações da esquerda -->
        <slot name="left-actions"></slot>
      </div>

      <div class="row q-gutter-sm">
        <!-- Renderiza as ações da direita -->
        <slot name="right-actions"></slot>
      </div>
    </div>
  </q-card-section>
</template>

<script>
export default {
  name: "CreateRouteActions"
}
</script>
