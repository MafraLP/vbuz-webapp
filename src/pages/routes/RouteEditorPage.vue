<template>
  <div class="route-editor-container">
    <div class="row q-col-gutter-md">
      <!-- Painel de informações do itinerário (Lateral) -->
      <div class="col-12 col-md-3">
        <q-card class="route-info-card">
          <q-card-section v-if="initialRouteData">
            <div class="text-h6">{{ initialRouteData.name }}</div>
            <div class="text-subtitle2" v-if="initialRouteData.startTime">{{ formatSchedule() }}</div>
          </q-card-section>

          <q-separator v-if="initialRouteData && initialRouteData.name" />

          <PontoParadaList
            :route-points="routePoints"
            @edit-point="editPoint"
            @remove-point="removePoint"
            @move-point-up="movePointUp"
            @move-point-down="movePointDown"
            @point-selected="selectPoint"
          />
        </q-card>
      </div>

      <div class="col-12 col-md-9">
        <q-card style="height: 80vh">
          <create-route-actions>
            <template v-slot:left-actions>
              <add-point-action
                :route-points="routePoints"
                :points-service="pointsService"
                @update-map="refreshMap"
              />
            </template>

            <template v-slot:right-actions>
              <trace-route-action
                :route-points="routePoints"
                :route-service="routeService"
                @update-map="handleRouteUpdated"
              />

              <undo-action
                :history-service="historyService"
                @update-map="refreshMap"
              />

              <save-route-action
                :route-points="routePoints"
                :route-info="initialRouteData"
                :route-service="routeService"
                @update-map="refreshMap"
              />
            </template>
          </create-route-actions>

          <q-card-section class="map-container" style="height: calc(100% - 50px); padding: 0;">
            <map-view
              ref="mapView"
              :route-points="routePoints"
              @map-clicked="handleMapClick"
              @point-clicked="selectPoint"
              @route-updated="handleRouteUpdated"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script>
import { Notify } from 'quasar';
import MapView from 'components/maps/MapView.vue';
import PontoParadaList from "components/lists/PontoParadaList.vue";
import CreateRouteActions from "components/maps/create_routes/CreateRoutesActions.vue";

// Importando componentes de ação autocontidos
import AddPointAction from "components/maps/create_routes/actions/AddPointAction.vue";
import TraceRouteAction from "components/maps/create_routes/actions/TraceRouteAction.vue";
import UndoAction from "components/maps/create_routes/actions/UndoAction.vue";
import SaveRouteAction from "components/maps/create_routes/actions/SaveRouteAction.vue";

export default {
  name: 'RouteEditorPage',

  components: {
    CreateRouteActions,
    PontoParadaList,
    MapView,
    AddPointAction,
    TraceRouteAction,
    UndoAction,
    SaveRouteAction
  },

  props: {
    initialRouteData: {
      type: Object,
      default: () => ({})
    },
    initialPoints: {
      type: Array,
      default: () => []
    }
  },

  emits: ['points-updated'],

  data() {
    return {
      routePoints: [],
      selectedPoint: null,

      // Serviços para as ações (podem ser injetados ou vindos de APIs externas)
      pointsService: {
        addPoint: this.addPointService,
        removePoint: this.removePointService
      },
      routeService: {
        calculateRoute: this.calculateRouteService,
        saveRoute: this.saveRouteService
      },
      historyService: {
        undo: this.undoService
      }
    }
  },

  mounted() {
    // Se tivermos pontos iniciais, usamos eles
    if (this.initialPoints && this.initialPoints.length > 0) {
      this.routePoints = [...this.initialPoints];
    }
  },

  methods: {
    // Implementações dos serviços para as ações

    // Serviço para adicionar ponto
    async addPointService(point) {
      // Aplicar lógica de adicionar ponto
      const newId = Math.max(0, ...this.routePoints.map(p => p.id || 0)) + 1;
      const newPoint = { ...point, id: newId };
      this.routePoints.push(newPoint);
      return newPoint;
    },

    // Serviço para remover ponto
    async removePointService(pointId) {
      const index = this.routePoints.findIndex(p => p.id === pointId);
      if (index !== -1) {
        this.routePoints.splice(index, 1);
        return true;
      }
      return false;
    },

    // Serviço para calcular rota
    async calculateRouteService(points) {
      // Esta função seria substituída por uma chamada real à API
      if (this.$refs.mapView) {
        return this.$refs.mapView.calculateRoute();
      }
      return { routes: [] };
    },

    // Serviço para salvar rota
    async saveRouteService(points, info) {
      // Esta função seria substituída por uma chamada real à API
      console.log('Salvando rota com pontos:', points, 'e info:', info);
      return { id: Date.now() };
    },

    // Serviço para desfazer ação
    async undoService() {
      console.log('Desfazendo última ação...');
      return true;
    },

    // Métodos para gerenciar o mapa

    // Atualizar o mapa quando uma ação é concluída
    refreshMap() {
      if (this.$refs.mapView) {
        this.$refs.mapView.refreshMap();
      }
    },

    // Lidar com clique no mapa (passa para o componente de ação AddPoint)
    handleMapClick(coords) {
      // Buscar o componente AddPointAction
      const addPointActions = this.$children.filter(child => child.$options.name === 'AddPointAction');

      if (addPointActions.length > 0) {
        // Se encontrar, chamar o método para abrir o modal com as coordenadas
        const addPointAction = addPointActions[0];
        if (typeof addPointAction.openModal === 'function') {
          addPointAction.openModal(coords);
        }
      }
    },

    // Manipular atualização de rota
    handleRouteUpdated(routeData) {
      console.log('Rota atualizada:', routeData);
      this.refreshMap();
    },

    // Métodos existentes
    formatSchedule() {
      if (!this.initialRouteData) return '';

      let days = this.getDaysString();
      return `${days}, ${this.initialRouteData.startTime} - ${this.initialRouteData.endTime}, ${this.initialRouteData.frequency}`;
    },

    getDaysString() {
      if (!this.initialRouteData || !this.initialRouteData.days) return '';

      const days = this.initialRouteData.days;
      const dayMap = {
        mon: 'Seg',
        tue: 'Ter',
        wed: 'Qua',
        thu: 'Qui',
        fri: 'Sex',
        sat: 'Sáb',
        sun: 'Dom'
      };

      const activeDays = Object.keys(days)
        .filter(day => days[day])
        .map(day => dayMap[day]);

      if (activeDays.length === 7) return 'Todos os dias';
      if (activeDays.length === 5 &&
        days.mon && days.tue && days.wed && days.thu && days.fri) {
        return 'Segunda a Sexta';
      }
      if (activeDays.length === 2 && days.sat && days.sun) {
        return 'Fim de semana';
      }

      return activeDays.join(', ');
    },

    selectPoint(point) {
      this.selectedPoint = point;
      if (this.$refs.mapView) {
        this.$refs.mapView.centerOnPoint(point);
      }
    },

    editPoint(point) {
      console.log('Editar ponto:', point);
      // Implementação futura
    },

    removePoint(point) {
      const index = this.routePoints.findIndex(p => p.id === point.id);
      if (index !== -1) {
        this.routePoints.splice(index, 1);

        Notify.create({
          type: 'positive',
          message: `Ponto "${point.name}" removido com sucesso!`,
          position: 'top'
        });

        this.refreshMap();
      }
    },

    movePointUp(index) {
      if (index > 0) {
        const temp = this.routePoints[index];
        this.routePoints[index] = this.routePoints[index - 1];
        this.routePoints[index - 1] = temp;
        this.refreshMap();
      }
    },

    movePointDown(index) {
      if (index < this.routePoints.length - 1) {
        const temp = this.routePoints[index];
        this.routePoints[index] = this.routePoints[index + 1];
        this.routePoints[index + 1] = temp;
        this.refreshMap();
      }
    }
  }
}
</script>

<style>
.route-info-card {
  height: 80vh;
  overflow-y: auto;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.route-editor-container {
  width: 100%;
}
</style>
