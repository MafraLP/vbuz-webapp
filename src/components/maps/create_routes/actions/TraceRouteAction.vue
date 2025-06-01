<template>
  <q-btn
    flat
    icon="timeline"
    color="secondary"
    label="Traçar rota"
    @click="traceRoute"
    :disable="routePoints.length < 2"
    :loading="isTracing"
  />
</template>

<script>
import { Notify } from 'quasar';

export default {
  name: "TraceRouteAction",
  emits: ['trace-route-direct'],
  props: {
    // Recebe os pontos da rota
    routePoints: {
      type: Array,
      default: () => []
    },

    // Recebe o serviço de rotas (ou implementação padrão)
    routeService: {
      type: Object,
      default: () => ({
        calculateRoute: (points) => Promise.resolve({
          routes: [{ totalDistance: 0, totalTime: 0 }]
        })
      })
    }
  },

  data() {
    return {
      isTracing: false
    };
  },

  methods: {
    async traceRoute() {
      if (this.routePoints.length < 2) return;

      this.isTracing = true;

      try {
        this.$emit('trace-route-direct');

      } catch (error) {
        Notify.create({
          type: 'negative',
          message: `Erro ao traçar rota: ${error.message}`,
          position: 'top'
        });
      } finally {
        this.isTracing = false;
      }
    }  }
}
</script>
