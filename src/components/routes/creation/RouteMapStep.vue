<template>
  <div class="route-map-step">
    <!-- Barra de ações para o mapa -->
    <create-route-actions class="q-mb-sm">
      <template v-slot:left-actions>
        <add-point-action
            ref="addPointAction"
            :route-points="localRoutePoints"
            :points-service="pointsService"
            @update-map="onPointAdded"
        />
        <trace-route-action
            :route-points="localRoutePoints"
            :route-service="routeService"
            @update-map="onRouteTraced"
            @trace-route-direct="calculateRouteFromMap"
        />
      </template>
      <template v-slot:right-actions>
        <undo-action
            :history-service="historyService"
            @update-map="onActionUndone"
        />
        <save-route-action
            :route-points="localRoutePoints"
            :route-info="{ routeId }"
            :route-service="routeService"
            @update-map="onRouteSaved"
        />
      </template>
    </create-route-actions>

    <div class="row q-col-gutter-md">
      <!-- Coluna esquerda: Lista de pontos + Detalhes -->
      <div class="col-12 col-md-3">
        <q-card class="points-container">
          <!-- Lista de pontos (scrollável) -->
          <div class="points-list-section">
            <q-card-section class="q-pb-none">
              <div class="text-subtitle1">Pontos de parada</div>
            </q-card-section>

            <div class="points-scroll-area">
              <q-list separator>
                <q-item
                    v-for="(point, index) in localRoutePoints"
                    :key="`point-${point.id || index}-${point.lat}-${point.lng}`"
                    clickable
                    @click="selectPoint(point)"
                    class="route-point-item"
                >
                  <q-item-section>
                    <q-item-label>{{ point.name }}</q-item-label>
                    <q-item-label caption>
                      {{ formatCoords(point.lat || point.latitude, point.lng || point.longitude) }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn flat round dense icon="more_vert">
                      <q-menu>
                        <q-list style="min-width: 120px">
                          <q-item clickable v-close-popup @click="editPoint(point)">
                            <q-item-section avatar>
                              <q-icon name="edit" size="xs" />
                            </q-item-section>
                            <q-item-section>Editar</q-item-section>
                          </q-item>
                          <q-item clickable v-close-popup @click="confirmDeletePoint(point)">
                            <q-item-section avatar>
                              <q-icon name="delete" size="xs" />
                            </q-item-section>
                            <q-item-section>Remover</q-item-section>
                          </q-item>
                          <q-separator />
                          <q-item
                              clickable
                              v-close-popup
                              @click="movePointUp(index)"
                              :disable="index === 0"
                          >
                            <q-item-section avatar>
                              <q-icon name="keyboard_arrow_up" size="xs" />
                            </q-item-section>
                            <q-item-section>Mover acima</q-item-section>
                          </q-item>
                          <q-item
                              clickable
                              v-close-popup
                              @click="movePointDown(index)"
                              :disable="index === localRoutePoints.length - 1"
                          >
                            <q-item-section avatar>
                              <q-icon name="keyboard_arrow_down" size="xs" />
                            </q-item-section>
                            <q-item-section>Mover abaixo</q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </q-item-section>
                </q-item>

                <!-- Mensagem quando não há pontos -->
                <q-item v-if="localRoutePoints.length === 0">
                  <q-item-section>
                    <q-item-label class="text-grey-6 text-center">
                      Nenhum ponto adicionado
                    </q-item-label>
                    <q-item-label caption class="text-center">
                      Clique no mapa para adicionar pontos
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>

          <!-- Detalhes da rota (fixo embaixo) -->
          <div class="route-details-section">
            <q-separator v-if="localRouteDetails.totalDistance > 0" />

            <q-card-section v-if="localRouteDetails.totalDistance > 0" class="route-details">
              <div class="text-subtitle1 q-mb-sm">Detalhes da Rota</div>

              <div class="detail-item">
                <q-icon name="straighten" color="primary" size="sm" />
                <div class="detail-content">
                  <div class="detail-label">Distância</div>
                  <div class="detail-value">{{ (localRouteDetails.totalDistance / 1000).toFixed(2) }} km</div>
                </div>
              </div>

              <div class="detail-item">
                <q-icon name="schedule" color="primary" size="sm" />
                <div class="detail-content">
                  <div class="detail-label">Tempo estimado</div>
                  <div class="detail-value">{{ formatDuration(localRouteDetails.totalDuration) }}</div>
                </div>
              </div>
            </q-card-section>
          </div>
        </q-card>
      </div>

      <!-- Coluna direita: Mapa -->
      <div class="col-12 col-md-9">
        <q-card class="map-card">
          <div class="map-wrapper">
            <map-view
                ref="mapView"
                :route-points="localRoutePoints"
                :route-id="routeId"
                :route-draw="localRouteDraw"
                @map-clicked="openAddPointModal"
                @point-clicked="selectPoint"
                @point-dragged="onPointDragged"
                @route-updated="onRouteUpdated"
                @route-loaded="onRouteLoaded"
                @error="onMapError"
            />
          </div>
        </q-card>
      </div>
    </div>

    <div class="q-mt-lg row justify-between">
      <q-btn
          label="Voltar"
          color="grey"
          flat
          icon="arrow_back"
          @click="$emit('back')"
      />
      <q-btn
          label="Avançar"
          color="primary"
          icon-right="arrow_forward"
          @click="validateAndContinue"
          :disable="localRoutePoints.length < 2 || !localRouteDetails.totalDistance"
      />
    </div>

    <!-- Modal para editar ponto -->
    <q-dialog v-model="editPointModal" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Editar Ponto</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input v-model="editingPoint.name" label="Nome do ponto" class="q-mb-md" />
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input v-model.number="editingPoint.lat" label="Latitude" type="number" />
            </div>
            <div class="col-6">
              <q-input v-model.number="editingPoint.lng" label="Longitude" type="number" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Salvar" color="primary" @click="saveEditedPoint" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal para confirmar exclusão -->
    <q-dialog v-model="deleteConfirmModal">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">Tem certeza que deseja excluir este ponto?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Excluir" color="negative" @click="deletePoint" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useQuasar } from 'quasar';
import MapView from 'src/components/maps/MapView.vue';
import CreateRouteActions from 'src/components/maps/create_routes/CreateRoutesActions.vue';
import AddPointAction from 'src/components/maps/create_routes/actions/AddPointAction.vue';
import TraceRouteAction from 'src/components/maps/create_routes/actions/TraceRouteAction.vue';
import UndoAction from 'src/components/maps/create_routes/actions/UndoAction.vue';
import SaveRouteAction from 'src/components/maps/create_routes/actions/SaveRouteAction.vue';
import { routeApiService } from 'src/services/api/route/RouteApiService.js';

export default defineComponent({
  name: 'RouteMapStep',

  components: {
    MapView,
    CreateRouteActions,
    AddPointAction,
    TraceRouteAction,
    UndoAction,
    SaveRouteAction
  },

  emits: ['update:route-points', 'update:route-details', 'update:route-draw', 'next', 'back'],

  props: {
    routeId: {
      type: Number,
      default: null
    },
    routePoints: {
      type: Array,
      default: () => []
    },
    routeDetails: {
      type: Object,
      default: () => ({
        totalDistance: 0,
        totalDuration: 0
      })
    },
    routeDraw: {
      type: Array,
      default: () => []
    }
  },

  setup() {
    const quasar = useQuasar();
    return { quasar };
  },

  data() {
    return {
      localRoutePoints: [...this.routePoints],
      localRouteDetails: { ...this.routeDetails },
      localRouteDraw: [...this.routeDraw],
      // Estado para ações de edição
      editPointModal: false,
      editingPoint: {
        name: '',
        lat: 0,
        lng: 0,
        index: -1,
        id: null
      },
      deleteConfirmModal: false,
      pointToDeleteIndex: null,
      pointToDelete: null,
      actionHistory: [],
      pointsService: {
        addPoint: (point) => {
          console.log("Adicionando ponto:", point);
          return Promise.resolve(point);
        }
      },
      routeService: {
        calculateRoute: (points) => {
          if (this.$refs.mapView && typeof this.$refs.mapView.calculateRoute === 'function') {
            return this.$refs.mapView.calculateRoute();
          } else {
            console.error('MapView não encontrado ou método calculateRoute não disponível');
            return Promise.reject(new Error('MapView não disponível'));
          }
        },
        saveRoute: (points, info) => {
          const routeData = {
            points: points.map(p => ({
              id: p.id && !p.id.toString().startsWith('temp_') ? p.id : undefined,
              name: p.name,
              latitude: p.lat || p.latitude,
              longitude: p.lng || p.longitude,
              sequence: p.sequence || 0
            }))
          };

          if (info.routeId) {
            return routeApiService.updateRoute(info.routeId, routeData);
          } else {
            return routeApiService.createRoute(routeData);
          }
        }
      },
      historyService: {
        undo: () => {
          if (this.actionHistory.length > 0) {
            this.localRoutePoints = this.actionHistory.pop();
            this.$emit('update:route-points', [...this.localRoutePoints]);
            return Promise.resolve(true);
          }
          return Promise.reject(new Error('No actions to undo'));
        }
      }
    };
  },

  watch: {
    routePoints: {
      handler(newValue) {
        this.localRoutePoints = [...newValue];
      },
      deep: true
    },
    routeDetails: {
      handler(newValue) {
        this.localRouteDetails = { ...newValue };
      },
      deep: true
    },
    routeDraw: {
      handler(newValue) {
        this.localRouteDraw = [...newValue];
      },
      deep: true
    }
  },

  methods: {
    async validateAndContinue() {
      // Validar se temos pontos suficientes
      if (this.localRoutePoints.length < 2) {
        this.quasar.notify({
          type: 'warning',
          message: 'Adicione pelo menos 2 pontos para criar uma rota'
        });
        return;
      }

      // Validar se a rota foi calculada
      if (!this.localRouteDetails.totalDistance) {
        // Se não temos distância calculada, vamos calcular a rota
        try {
          await this.calculateRouteFromMap();
        } catch (error) {
          this.quasar.notify({
            type: 'warning',
            message: 'Não foi possível calcular a rota. Tente novamente.'
          });
          return;
        }
      }

      // Verificar se temos os segmentos
      if (!this.localRouteDraw || this.localRouteDraw.length === 0) {
        this.quasar.notify({
          type: 'warning',
          message: 'Aguarde o cálculo da rota ser finalizado'
        });
        return;
      }

      // Se chegamos aqui, temos todos os dados necessários
      this.$emit('next');
    },

    async calculateRouteFromMap() {
      if (this.$refs.mapView && typeof this.$refs.mapView.calculateRoute === 'function') {
        try {
          await this.$refs.mapView.calculateRoute();
        } catch (error) {
          console.error('Erro ao calcular rota via MapView:', error);
          throw error;
        }
      } else {
        console.error('MapView não encontrado');
        throw new Error('MapView não disponível');
      }
    },

    openAddPointModal(coords) {
      console.log('Coordenadas do clique recebidas:', coords);

      if (this.$refs.addPointAction) {
        console.log('Chamando openModal no AddPointAction');
        this.$refs.addPointAction.openModal(coords);
      } else {
        console.error('Componente AddPointAction não encontrado');
      }
    },

    onPointAdded(point) {
      this.saveToHistory();

      const newPoint = {
        ...point,
        sequence: this.localRoutePoints.length,
        route_id: this.routeId
      };

      this.localRoutePoints.push(newPoint);
      this.$emit('update:route-points', [...this.localRoutePoints]);
    },

    saveToHistory() {
      this.actionHistory.push(JSON.parse(JSON.stringify(this.localRoutePoints)));

      if (this.actionHistory.length > 20) {
        this.actionHistory.shift();
      }
    },

    selectPoint(point) {
      console.log('Ponto selecionado:', point);
      if (this.$refs.mapView && typeof this.$refs.mapView.centerOnPoint === 'function') {
        this.$refs.mapView.centerOnPoint(point);
      }
    },

    onPointDragged(pointData) {
      console.log('Evento de arrasto recebido:', pointData);

      this.saveToHistory();

      const index = pointData.index;
      if (index >= 0 && index < this.localRoutePoints.length) {
        this.localRoutePoints[index] = {
          ...this.localRoutePoints[index],
          lat: pointData.lat,
          lng: pointData.lng,
          latitude: pointData.lat,
          longitude: pointData.lng
        };

        this.$emit('update:route-points', [...this.localRoutePoints]);

        this.quasar.notify({
          type: 'info',
          message: `Ponto "${this.localRoutePoints[index].name}" movido`,
          position: 'top',
          timeout: 2000
        });
      }
    },

    editPoint(point) {
      const index = this.localRoutePoints.findIndex(p => p.id === point.id);

      this.editingPoint = {
        name: point.name,
        lat: point.lat || point.latitude,
        lng: point.lng || point.longitude,
        index: index,
        id: point.id
      };
      this.editPointModal = true;
    },

    saveEditedPoint() {
      const { index } = this.editingPoint;

      if (index >= 0 && index < this.localRoutePoints.length) {
        this.saveToHistory();

        this.localRoutePoints[index] = {
          ...this.localRoutePoints[index],
          name: this.editingPoint.name,
          lat: this.editingPoint.lat,
          lng: this.editingPoint.lng
        };

        this.$emit('update:route-points', [...this.localRoutePoints]);

        this.quasar.notify({
          type: 'positive',
          message: 'Ponto atualizado'
        });
      }
    },

    confirmDeletePoint(point) {
      const index = this.localRoutePoints.findIndex(p => p.id === point.id);

      this.pointToDeleteIndex = index;
      this.pointToDelete = point;
      this.deleteConfirmModal = true;
    },

    deletePoint() {
      if (this.pointToDeleteIndex !== null &&
          this.pointToDeleteIndex >= 0 &&
          this.pointToDeleteIndex < this.localRoutePoints.length) {

        this.saveToHistory();

        this.localRoutePoints.splice(this.pointToDeleteIndex, 1);

        this.localRoutePoints.forEach((point, idx) => {
          point.sequence = idx;
        });

        this.$emit('update:route-points', [...this.localRoutePoints]);

        this.quasar.notify({
          type: 'positive',
          message: `Ponto "${this.pointToDelete?.name || 'selecionado'}" removido`
        });

        this.pointToDeleteIndex = null;
        this.pointToDelete = null;
      }
    },

    movePointUp(index) {
      if (index > 0) {
        this.saveToHistory();

        const temp = this.localRoutePoints[index];
        this.localRoutePoints[index] = this.localRoutePoints[index - 1];
        this.localRoutePoints[index - 1] = temp;

        this.localRoutePoints.forEach((point, idx) => {
          point.sequence = idx;
        });

        this.$emit('update:route-points', [...this.localRoutePoints]);
      }
    },

    movePointDown(index) {
      if (index < this.localRoutePoints.length - 1) {
        this.saveToHistory();

        const temp = this.localRoutePoints[index];
        this.localRoutePoints[index] = this.localRoutePoints[index + 1];
        this.localRoutePoints[index + 1] = temp;

        this.localRoutePoints.forEach((point, idx) => {
          point.sequence = idx;
        });

        this.$emit('update:route-points', [...this.localRoutePoints]);
      }
    },

    onRouteUpdated(data) {
      console.log('Route updated:', data);
      let updatedDetails = { ...this.localRouteDetails };

      if (data) {
        if (data.totalDistance) updatedDetails.totalDistance = data.totalDistance;
        if (data.totalDuration) updatedDetails.totalDuration = data.totalDuration;

        // *** CORREÇÃO PRINCIPAL: Garantir que os segmentos sejam repassados ***
        if (data.segments) {
          this.localRouteDraw = data.segments;
          this.$emit('update:route-draw', data.segments);
          console.log('Emitindo segmentos para o pai:', data.segments.length, 'segmentos');
        }
      }

      this.localRouteDetails = updatedDetails;
      this.$emit('update:route-details', updatedDetails);
    },

    onRouteTraced(data) {
      console.log('Route traced:', data);
      if (data) {
        const updatedDetails = {
          totalDistance: data.totalDistance || 0,
          totalDuration: data.totalDuration || 0
        };

        this.localRouteDetails = updatedDetails;
        this.$emit('update:route-details', updatedDetails);

        // *** CORREÇÃO: Garantir que os segmentos sejam emitidos ***
        if (data.segments) {
          this.localRouteDraw = data.segments;
          this.$emit('update:route-draw', data.segments);
          console.log('Segmentos do trace emitidos:', data.segments.length);
        }
      }
    },

    onRouteLoaded(routeData) {
      console.log('Route loaded:', routeData);
      if (routeData) {
        if (routeData.points && routeData.points.length > 0) {
          this.localRoutePoints = routeData.points.map(p => ({
            id: p.id,
            name: p.name,
            lat: p.latitude,
            lng: p.longitude,
            sequence: p.sequence,
            route_id: this.routeId
          }));

          this.$emit('update:route-points', [...this.localRoutePoints]);
        }

        // *** CORREÇÃO: Garantir emissão dos segmentos ***
        if (routeData.segments) {
          this.localRouteDraw = routeData.segments;
          this.$emit('update:route-draw', routeData.segments);
          console.log('Segmentos carregados emitidos:', routeData.segments.length);
        }

        const updatedDetails = {
          totalDistance: routeData.total_distance || 0,
          totalDuration: routeData.total_duration || 0
        };

        this.localRouteDetails = updatedDetails;
        this.$emit('update:route-details', updatedDetails);
      }
    },

    onActionUndone() {
      this.quasar.notify({
        type: 'positive',
        message: 'Ação desfeita'
      });
    },

    onRouteSaved(data) {
      this.quasar.notify({
        type: 'positive',
        message: 'Rota salva com sucesso'
      });
    },

    onMapError(error) {
      console.error('Erro no mapa:', error);
      this.quasar.notify({
        type: 'negative',
        message: error.message || 'Erro no mapa'
      });
    },

    formatDuration(seconds) {
      if (!seconds) return '0 min';

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      }
      return `${minutes}min`;
    },

    formatCoords(lat, lng) {
      if (!lat || !lng) return 'Coordenadas não definidas';
      return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
    }
  }
});
</script>

<style scoped>
.route-map-step {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

.map-card {
  width: 100%;
  height: 100%;
}

.points-container {
  height: 600px;
  display: flex;
  flex-direction: column;
}

.points-list-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.points-scroll-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.route-details-section {
  flex-shrink: 0;
}

.route-details {
  background-color: #f8f9fa;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-content {
  flex: 1;
}

.detail-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 2px;
}

.detail-value {
  font-weight: 500;
  color: #333;
}

.route-point-item {
  border-bottom: 1px solid #e0e0e0;
}

.route-point-item:last-child {
  border-bottom: none;
}

.map-wrapper {
  height: 600px;
  width: 100%;
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

/* Responsividade */
@media (max-width: 1024px) {
  .points-container {
    height: 400px;
  }

  .map-wrapper {
    height: 500px;
  }
}

@media (max-width: 600px) {
  .points-container {
    height: 300px;
  }

  .map-wrapper {
    height: 400px;
  }

  .detail-item {
    gap: 8px;
  }
}
</style>
