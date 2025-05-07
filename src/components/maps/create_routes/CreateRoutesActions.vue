<template>
  <q-card-section class="row items-center q-pb-none">
    <div class="text-h6">Editor de Itinerário</div>
    <q-space />
    <q-btn-group flat>
      <q-btn flat icon="add_location" label="Adicionar ponto" @click="onAddPoint" />
      <q-btn
        flat
        icon="route"
        label="Traçar rota"
        @click="onTraceRoute"
        :disable="disableTraceRoute"
      />
      <q-btn flat icon="undo" label="Desfazer" @click="onUndo" />
    </q-btn-group>
  </q-card-section>
</template>

<script>
export default {
  name: 'CreateRouteActions',
  props: {
    disableTraceRoute: {
      type: Boolean,
      default: false
    }
  },
  emits: ['add-point', 'trace-route', 'undo'],
  methods: {
    onAddPoint() {
      this.$emit('add-point');
    },
    onTraceRoute() {
      this.$emit('trace-route');
    },
    onUndo() {
      this.$emit('undo');
    }
  }
};
</script>
