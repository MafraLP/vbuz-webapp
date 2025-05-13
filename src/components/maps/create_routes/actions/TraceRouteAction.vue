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
        // Calcular rota usando o serviço (passado como prop ou usando o padrão)
        const result = await this.routeService.calculateRoute(this.routePoints);

        if (result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const distanceKm = (route.totalDistance / 1000).toFixed(2);
          const durationMin = Math.round(route.totalTime / 60);

          Notify.create({
            type: 'positive',
            message: `Rota traçada: ${distanceKm}km, ${durationMin} min`,
            position: 'top'
          });
        }

        // Emite evento para atualizar o mapa
        this.$emit('update-map', result);
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: `Erro ao traçar rota: ${error.message}`,
          position: 'top'
        });
      } finally {
        this.isTracing = false;
      }
    }
  }
}
</script>
