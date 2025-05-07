<!-- src/pages/RouteEditorPage.vue (modificado) -->
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
          <create-route-actions
            @add-point="openAddPointModal"
            @trace-route="traceRoute"
            @undo="undoLastAction"
            :disable-trace-route="routePoints.length < 2"
          />

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
    <add-point-modal
      v-model="showAddPointModal"
      @cancel="handleModalCancel"
      @point-added="addPoint"
      ref="addPointModal"
    />
  </div>
</template>

<script>
import { Notify } from 'quasar';
import MapView from 'components/maps/MapView.vue';
import PontoParadaList from "components/lists/PontoParadaList.vue";
import AddPointModal from "components/modal/AddPointModal.vue";
import CreateRouteActions from "components/maps/create_routes/CreateRoutesActions.vue";

export default {
  name: 'RouteEditorPage',

  components: {
    CreateRouteActions,
    AddPointModal,
    PontoParadaList,
    MapView
  },

  props: {
    // Adicionamos esta prop para receber os dados iniciais do wizard
    initialRouteData: {
      type: Object,
      default: () => ({})
    },
    // Poderíamos também ter uma prop para pontos iniciais se necessário
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
      showAddPointModal: false,
    }
  },

  mounted() {
    // Se tivermos pontos iniciais, usamos eles
    if (this.initialPoints && this.initialPoints.length > 0) {
      this.routePoints = [...this.initialPoints];
    }

    console.log("RouteEditorPage montado, métodos disponíveis:", Object.keys(this));
    console.log("handleMapClick existe?", typeof this.handleMapClick === 'function');
    console.log("Referências disponíveis:", Object.keys(this.$refs));
  },

  methods: {
    // Método público para obter os pontos da rota
    getRoutePoints() {
      return this.routePoints;
    },

    handleRouteUpdated(routeData) {
      console.log('Rota atualizada:', routeData);

      if (routeData.routes && routeData.routes.length > 0) {
        const route = routeData.routes[0];
        const distanceKm = (route.totalDistance / 1000).toFixed(2);
        const durationMin = Math.round(route.totalTime / 60);

        Notify.create({
          type: 'positive',
          message: `Rota traçada: ${distanceKm}km, ${durationMin} min`,
          position: 'top'
        });
      }
    },

    // Formata as informações de programação
    formatSchedule() {
      if (!this.initialRouteData) return '';

      let days = this.getDaysString();
      return `${days}, ${this.initialRouteData.startTime} - ${this.initialRouteData.endTime}, ${this.initialRouteData.frequency}`;
    },

    // Formata os dias da semana
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

    handleMapClick(coords) {
      console.log("MÉTODO handleMapClick CHAMADO COM:", coords);

      // Use a referência direta ao modal
      if (this.$refs.addPointModal) {
        console.log("Referência ao modal encontrada, chamando método open");
        // Verifique se o método open existe
        if (typeof this.$refs.addPointModal.open === 'function') {
          this.$refs.addPointModal.open({ coords });
          this.showAddPointModal = true;
        } else {
          console.error("Método open não encontrado no modal!");
          console.log("Métodos disponíveis:", Object.keys(this.$refs.addPointModal));

          // Alternativa: definir coordenadas e abrir modal manualmente
          this.newPointCoords = coords;
          this.showAddPointModal = true;
        }
      } else {
        console.error("Referência ao modal não encontrada!");
        // Alternativa sem usar a referência
        this.newPointCoords = coords;
        this.showAddPointModal = true;
      }
    },

    openAddPointModal() {
      if (this.$refs.addPointModal && typeof this.$refs.addPointModal.open === 'function') {
        this.$refs.addPointModal.open();
      }
      this.showAddPointModal = true;
    },

    handleModalCancel() {
      this.showAddPointModal = false;
    },

    traceRoute() {
      if (this.$refs.mapView) {
        this.$refs.mapView.calculateRoute();
      } else {
        console.error("Referência ao MapView não encontrada!");
      }
    },

    undoLastAction() {
      console.log('Desfazendo última ação...');
    },

    selectPoint(point) {
      this.selectedPoint = point;
      if (this.$refs.mapView) {
        this.$refs.mapView.centerOnPoint(point);
      }
    },

    addPoint(point) {
      // Gerar ID único para o novo ponto
      const newId = Math.max(0, ...this.routePoints.map(p => p.id || 0)) + 1;

      const newPoint = {
        ...point,
        id: newId
      };

      // Adicionar à lista de pontos
      this.routePoints.push(newPoint);

      // Notificar usuário
      Notify.create({
        type: 'positive',
        message: `Ponto "${newPoint.name}" adicionado com sucesso!`,
        position: 'top'
      });

      // Fechar modal
      this.showAddPointModal = false;
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
      }
    },

    movePointUp(index) {
      if (index > 0) {
        const temp = this.routePoints[index];
        this.routePoints[index] = this.routePoints[index - 1];
        this.routePoints[index - 1] = temp;
      }
    },

    movePointDown(index) {
      if (index < this.routePoints.length - 1) {
        const temp = this.routePoints[index];
        this.routePoints[index] = this.routePoints[index + 1];
        this.routePoints[index + 1] = temp;
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
