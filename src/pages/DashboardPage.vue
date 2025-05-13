<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <!-- Cabeçalho com informações da instituição -->
      <div class="col-12">
        <q-card flat bordered class="institution-header q-mb-md">
          <q-card-section>
            <div class="row items-center justify-between">
              <div>
                <div class="text-h5">{{ currentInstitution.name || 'Dashboard' }}</div>
                <div class="text-subtitle2" v-if="currentInstitution.type">
                  {{ getInstitutionTypeLabel(currentInstitution.type) }}
                </div>
              </div>

              <div>
                <q-btn
                  color="primary"
                  icon="add_location"
                  label="Adicionar Ponto"
                  @click="openAddPointModal"
                  class="q-mr-sm"
                />
                <q-btn
                  color="secondary"
                  icon="cloud_download"
                  label="Auto-importar Pontos"
                  @click="openAutoImportModal"
                  v-if="points.length === 0"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Layout principal com mapa à esquerda e painel de informações à direita -->
      <div class="col-md-8 col-sm-12">
        <q-card class="map-card">
          <q-card-section class="map-container" style="height: 70vh; padding: 0;">
            <!-- Usar o componente MapView existente -->
            <map-view
              ref="mapView"
              :route-points="convertPointsToRoutePoints(points)"
              :readonly="false"
              @map-clicked="handleMapClick"
              @point-clicked="selectPoint"
              @error="handleMapError"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Painel lateral com estatísticas e listagem de pontos -->
      <div class="col-md-4 col-sm-12">
        <q-card class="stats-card q-mb-md">
          <q-card-section>
            <div class="text-h6">Estatísticas</div>
            <q-separator class="q-my-sm" />
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <div class="text-subtitle1 q-mb-none">{{ points.length }}</div>
                <div class="text-caption">Pontos</div>
              </div>
              <div class="col-6">
                <div class="text-subtitle1 q-mb-none">{{ routes.length }}</div>
                <div class="text-caption">Rotas</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="points-card">
          <q-card-section>
            <div class="text-h6">Pontos</div>
            <q-input
              v-model="pointsFilter"
              label="Buscar pontos"
              dense
              outlined
              class="q-mb-sm"
            >
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </q-card-section>

          <q-separator />

          <q-card-section class="points-list" style="max-height: 40vh; overflow-y: auto;">
            <q-list separator>
              <q-item
                v-for="point in filteredPoints"
                :key="point.id"
                clickable
                :active="selectedPoint && selectedPoint.id === point.id"
                @click="selectPoint(point)"
              >
                <q-item-section avatar>
                  <q-icon :name="getPointIcon(point.type)" color="primary" />
                </q-item-section>

                <q-item-section>
                  <q-item-label>{{ point.name }}</q-item-label>
                  <q-item-label caption>{{ getPointTypeLabel(point.type) }}</q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="more_vert"
                    @click.stop="openPointMenu(point, $event)"
                  />
                </q-item-section>
              </q-item>

              <q-item v-if="filteredPoints.length === 0">
                <q-item-section>
                  <q-item-label class="text-center text-grey-7">
                    {{ pointsFilter ? 'Nenhum ponto encontrado' : 'Nenhum ponto cadastrado' }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal para adicionar ponto -->
    <add-point-modal
      v-model="showAddPointModal"
      :initial-coords="newPointCoords"
      @point-added="addPoint"
    />

    <!-- Modal para auto-importar pontos -->
    <auto-import-points-modal
      v-model="showAutoImportModal"
      :current-institution="currentInstitution"
      :user-location="userLocation"
      @points-imported="handleImportedPoints"
    />

    <!-- Menu de contexto para pontos -->
    <q-menu
      v-model="showPointMenu"
      :position="pointMenuPosition"
      context-menu
    >
      <q-list dense style="min-width: 150px">
        <q-item clickable v-close-popup @click="editPoint(pointMenuTarget)">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>Editar</q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="centerOnPoint(pointMenuTarget)">
          <q-item-section avatar>
            <q-icon name="center_focus_strong" />
          </q-item-section>
          <q-item-section>Centralizar no mapa</q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable v-close-popup @click="confirmRemovePoint(pointMenuTarget)">
          <q-item-section avatar>
            <q-icon name="delete" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">Remover</q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <!-- Diálogo de confirmação de remoção -->
    <q-dialog v-model="showRemoveDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="delete" color="negative" text-color="white" />
          <span class="q-ml-sm">Tem certeza que deseja remover este ponto?</span>
        </q-card-section>

        <q-card-section v-if="pointToRemove">
          <p>Nome: <strong>{{ pointToRemove.name }}</strong></p>
          <p>Tipo: <strong>{{ getPointTypeLabel(pointToRemove.type) }}</strong></p>
          <p class="text-negative">Esta ação não pode ser desfeita.</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn flat label="Remover" color="negative" @click="removePoint" :loading="removingPoint" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { Notify } from 'quasar';
import MapView from 'components/maps/MapView.vue';
import AddPointModal from 'components/modal/AddPointModal.vue';
import AutoImportPointsModal from 'components/modal/AutoImportPointsModal.vue';
import { pointsService } from 'src/services/api/points/PointsService.js'
import { institutionService } from 'src/services/api/institutions/InstitutionService.js';

export default {
  name: 'DashboardPage',

  components: {
    MapView,
    AddPointModal,
    AutoImportPointsModal
  },

  data() {
    return {
      // Instituição atual
      currentInstitution: {},

      // Pontos, rotas, etc.
      points: [],
      routes: [],

      // Estado para filtro de pontos
      pointsFilter: '',
      selectedPoint: null,

      // Modal de adicionar ponto
      showAddPointModal: false,
      newPointCoords: null,

      // Modal de auto-importar pontos
      showAutoImportModal: false,
      userLocation: null,

      // Menu de contexto para pontos
      showPointMenu: false,
      pointMenuPosition: {
        top: 0,
        left: 0
      },
      pointMenuTarget: null,

      // Diálogo de remoção
      showRemoveDialog: false,
      pointToRemove: null,
      removingPoint: false,

      // Loading state
      loading: false
    }
  },

  computed: {
    filteredPoints() {
      if (!this.pointsFilter) {
        return this.points;
      }

      const filter = this.pointsFilter.toLowerCase();
      return this.points.filter(point =>
        point.name.toLowerCase().includes(filter) ||
        this.getPointTypeLabel(point.type).toLowerCase().includes(filter)
      );
    }
  },

  async mounted() {
    this.loading = true;

    try {
      // Carregar instituição atual (pode vir da store ou da URL)
      await this.loadCurrentInstitution();

      // Carregar pontos da instituição
      await this.loadPoints();

      // Carregar outros dados necessários
      await this.loadRoutes();

      // Tentar obter a localização do usuário
      this.getUserLocation();
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      Notify.create({
        type: 'negative',
        message: 'Erro ao carregar dados do dashboard',
        icon: 'report_problem'
      });
    } finally {
      this.loading = false;
    }
  },

  methods: {
    // Métodos para carregar dados
    async loadCurrentInstitution() {
      // Aqui você usaria sua store de instituições ou buscaria da API
      // Por exemplo:

      // Opção 1: Usar a store (preferivelmente)
      // const institutionsStore = useInstitutionsStore();
      // this.currentInstitution = institutionsStore.getCurrentInstitution();

      // Opção 2: Buscar da API com base na URL
      const institutionId = this.$route.params.id || this.$route.query.institutionId;
      if (institutionId) {
        this.currentInstitution = await institutionService.getInstitution(institutionId);
      } else {
        // Carregar instituição padrão do usuário
        const userInstitutions = await institutionService.getUserInstitutions();
        if (userInstitutions.length > 0) {
          this.currentInstitution = userInstitutions[0];
        }
      }
    },

    async loadPoints() {
      if (!this.currentInstitution.id) return;

      this.points = await pointsService.getPoints(this.currentInstitution.id);
    },

    async loadRoutes() {
      if (!this.currentInstitution.id) return;

      // Carregar apenas as rotas
      this.routes = await pointsService.getRoutes(this.currentInstitution.id);
    },

    // Métodos para manipulação de pontos
    async addPoint(point) {
      try {
        // Adicionar instituição ao ponto
        const pointWithInstitution = {
          ...point,
          institution_id: this.currentInstitution.id
        };

        // Chamar o serviço para salvar no backend
        const savedPoint = await pointsService.createPoint(pointWithInstitution);

        // Adicionar à lista local
        this.points.push(savedPoint);

        // Atualizar o mapa
        if (this.$refs.mapView) {
          // Forçar atualização do mapa com os novos pontos
          this.$refs.mapView.displayRoutePoints(this.convertPointsToRoutePoints(this.points));
        }

        // Selecionar o novo ponto
        this.selectPoint(savedPoint);

        Notify.create({
          type: 'positive',
          message: `Ponto "${savedPoint.name}" adicionado com sucesso!`,
          position: 'top'
        });
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: `Erro ao adicionar ponto: ${error.message}`,
          position: 'top'
        });
      }
    },

    async editPoint(point) {
      // Implementar edição de ponto (pode abrir um modal)
      console.log('Editar ponto:', point);
      // Aqui você pode abrir o modal de edição similar ao de adição
    },

    centerOnPoint(point) {
      if (this.$refs.mapView) {
        this.$refs.mapView.centerOnPoint(point);
      }
    },

    confirmRemovePoint(point) {
      this.pointToRemove = point;
      this.showRemoveDialog = true;
    },

    async removePoint() {
      if (!this.pointToRemove) return;

      this.removingPoint = true;

      try {
        // Chamar o serviço para remover no backend
        await pointsService.deletePoint(this.pointToRemove.id);

        // Remover da lista local
        const index = this.points.findIndex(p => p.id === this.pointToRemove.id);
        if (index !== -1) {
          this.points.splice(index, 1);
        }

        // Se o ponto removido era o selecionado, deselecionar
        if (this.selectedPoint && this.selectedPoint.id === this.pointToRemove.id) {
          this.selectedPoint = null;
        }

        // Atualizar o mapa
        if (this.$refs.mapView) {
          // Forçar atualização do mapa com os novos pontos
          this.$refs.mapView.displayRoutePoints(this.convertPointsToRoutePoints(this.points));
        }

        Notify.create({
          type: 'positive',
          message: `Ponto "${this.pointToRemove.name}" removido com sucesso!`,
          position: 'top'
        });

        this.showRemoveDialog = false;
        this.pointToRemove = null;
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: `Erro ao remover ponto: ${error.message}`,
          position: 'top'
        });
      } finally {
        this.removingPoint = false;
      }
    },

    selectPoint(point) {
      this.selectedPoint = point;

      if (this.$refs.mapView) {
        // Centralizar no ponto selecionado
        this.$refs.mapView.centerOnPoint(point);
      }
    },

    // Métodos de interação com o mapa
    openAddPointModal() {
      this.newPointCoords = null;
      this.showAddPointModal = true;
    },

    handleMapClick(coords) {
      this.newPointCoords = coords;
      this.showAddPointModal = true;
    },

    openPointMenu(point, event) {
      this.pointMenuTarget = point;
      this.pointMenuPosition = {
        left: event.clientX,
        top: event.clientY
      };
      this.showPointMenu = true;
    },

    handleMapError(error) {
      console.error('Erro no mapa:', error);
      Notify.create({
        type: 'negative',
        message: error.message || 'Ocorreu um erro no mapa',
        position: 'top'
      });
    },

    // Utilitários
    convertPointsToRoutePoints(points) {
      // Converter os pontos para o formato esperado pelo componente MapView
      return points.map(point => ({
        id: point.id,
        name: point.name,
        lat: point.latitude || point.lat,
        lng: point.longitude || point.lng,
        type: point.type
      }));
    },

    getInstitutionTypeLabel(type) {
      const types = {
        'prefecture': 'Prefeitura',
        'department': 'Departamento',
        'school': 'Escola',
        'social_center': 'Centro Social',
        'health_center': 'Centro de Saúde'
      };

      return types[type] || type;
    },

    getPointTypeLabel(type) {
      const types = {
        'stop': 'Parada',
        'terminal': 'Terminal',
        'landmark': 'Ponto de Referência',
        'connection': 'Conexão'
      };

      return types[type] || type;
    },

    getPointIcon(type) {
      const icons = {
        'stop': 'place',
        'terminal': 'commute',
        'landmark': 'tour',
        'connection': 'hub'
      };

      return icons[type] || 'place';
    },

    /**
     * Método para obter a localização do usuário (para auto-importação)
     */
    getUserLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
          },
          (error) => {
            console.error('Erro ao obter localização do usuário:', error);
          }
        );
      }
    },

    /**
     * Manipula os pontos importados pelo modal de auto-importação
     * @param {Array} importedPoints - Lista de pontos importados
     */
    handleImportedPoints(importedPoints) {
      if (!importedPoints || importedPoints.length === 0) return;

      // Adicionar os pontos importados à lista de pontos
      this.points = [...this.points, ...importedPoints];

      // Atualizar o mapa
      if (this.$refs.mapView) {
        this.$refs.mapView.displayRoutePoints(this.convertPointsToRoutePoints(this.points));
      }

      // Notificar sucesso
      Notify.create({
        type: 'positive',
        message: `${importedPoints.length} pontos foram importados com sucesso!`,
        position: 'top'
      });
    }
  }
}
</script>

<style lang="scss" scoped>
.map-card {
  height: 70vh;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.institution-header {
  background-color: #f5f5f5;
}

.stats-card {
  background-color: #f9f9f9;
}

.points-list::-webkit-scrollbar {
  width: 8px;
}

.points-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.points-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.points-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>

