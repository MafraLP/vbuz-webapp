<template>
  <div class="route-confirmation-step">
    <q-card flat bordered class="q-pa-md">
      <q-card-section>
        <div class="text-h6">Resumo do Itinerário</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <div class="text-subtitle2 q-mb-sm">Informações Básicas</div>
            <q-list dense>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Nome</q-item-label>
                  <q-item-label>{{ routeInfo.name }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="routeInfo.description">
                <q-item-section>
                  <q-item-label caption>Descrição</q-item-label>
                  <q-item-label>{{ routeInfo.description }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Horário</q-item-label>
                  <q-item-label>{{ routeInfo.startTime }} - {{ routeInfo.endTime }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Dias</q-item-label>
                  <q-item-label>{{ formatDays(routeInfo.days) }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Carteirinhas Permitidas</q-item-label>
                  <q-item-label class="q-gutter-x-xs">
                    <q-chip v-for="card in routeInfo.allowedCards" :key="card.value" dense color="primary" text-color="white" size="sm">
                      {{ card.label }}
                    </q-chip>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <div class="col-12 col-md-6">
            <div class="text-subtitle2 q-mb-sm">Detalhes da Rota</div>
            <q-list dense>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Pontos</q-item-label>
                  <q-item-label>{{ routePoints.length }} pontos de parada</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Distância Total</q-item-label>
                  <q-item-label>{{ (routeDetails.totalDistance / 1000).toFixed(2) }} km</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Tempo Estimado</q-item-label>
                  <q-item-label>{{ formatDuration(routeDetails.totalDuration) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pt-md">
        <div class="text-subtitle2 q-mb-sm">Visualização da Rota</div>
        <div class="map-preview">
          <map-view
            :route-points="routePoints"
            :route-draw="routeDraw"
            readonly
          />
        </div>
      </q-card-section>
    </q-card>

    <div class="q-mt-lg row justify-between">
      <q-btn
        label="Voltar"
        color="grey"
        flat
        icon="arrow_back"
        @click="$emit('back')"
      />
      <q-btn
        :label="getRouteId() ? 'Atualizar Itinerário' : 'Salvar Itinerário'"
        color="positive"
        icon-right="save"
        @click="$emit('save')"
        :loading="isSaving"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import MapView from 'src/components/maps/MapView.vue';

export default defineComponent({
  name: 'RouteConfirmationStep',

  components: {
    MapView
  },

  props: {
    routeInfo: {
      type: Object,
      required: true
    },
    routePoints: {
      type: Array,
      required: true
    },
    routeDetails: {
      type: Object,
      required: true
    },
    routeDraw: {
      type: Array,
      required: true
    },
    isSaving: {
      type: Boolean,
      default: false
    }
  },

  emits: ['save', 'back'],

  // *** ADICIONAR MOUNTED PARA DEBUG ***
  mounted() {
    console.log('RouteConfirmationStep montado com:');
    console.log('- Pontos:', this.routePoints?.length || 0);
    console.log('- Segmentos:', this.routeDraw?.length || 0);
    console.log('- Detalhes da rota:', this.routeDetails);
    console.log('- routeDraw completo:', this.routeDraw);
  },

  // *** ADICIONAR WATCH PARA MONITORAR MUDANÇAS ***
  watch: {
    routeDraw: {
      handler(newSegments) {
        console.log('RouteConfirmationStep: routeDraw atualizado');
        console.log('Novos segmentos:', newSegments?.length || 0);
        console.log('Segmentos detalhados:', newSegments);
      },
      deep: true,
      immediate: true
    }
  },

  methods: {
    getRouteId() {
      if (this.routePoints.length > 0 && this.routePoints[0].route_id) {
        return this.routePoints[0].route_id;
      }
      return null;
    },

    // ... resto dos métodos permanecem iguais
    formatDays(days) {
      const dayNames = {
        mon: 'Segunda',
        tue: 'Terça',
        wed: 'Quarta',
        thu: 'Quinta',
        fri: 'Sexta',
        sat: 'Sábado',
        sun: 'Domingo'
      };

      const activeDays = Object.entries(days)
        .filter(([_, isActive]) => isActive)
        .map(([day]) => dayNames[day]);

      if (activeDays.length === 7) {
        return 'Todos os dias';
      } else if (activeDays.length === 5 &&
        !days.sat && !days.sun) {
        return 'Segunda a Sexta';
      } else if (activeDays.length === 2 &&
        days.sat && days.sun) {
        return 'Finais de semana';
      }

      return activeDays.join(', ');
    },

    formatDuration(seconds) {
      if (!seconds) return '0 min';

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      }
      return `${minutes} min`;
    }
  }
});
</script>

<style scoped>
.route-confirmation-step {
  width: 100%;
}

.map-preview {
  height: 400px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ddd;
}
</style>
