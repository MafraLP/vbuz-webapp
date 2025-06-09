<template>
  <div class="route-map-step">
    <!-- Gerenciadores invisíveis -->
    <RouteDataManager
      ref="dataManager"
      :route-id="routeId"
      :readonly="false"
      :auto-load="true"
      @route-loaded="onRouteLoaded"
      @route-updated="onRouteUpdated"
      @points-updated="onPointsUpdated"
      @segments-updated="onSegmentsUpdated"
      @error="onDataError"
    />

    <RoutePointsManager
      ref="pointsManager"
      :points="localRoutePoints"
      :readonly="false"
      :max-points="50"
      :auto-sequence="true"
      @points-updated="onPointsManagerUpdated"
      @point-added="onPointAddedByManager"
      @point-updated="onPointUpdatedByManager"
      @point-removed="onPointRemovedByManager"
      @error="onPointsError"
    />

    <RouteCalculationManager
      ref="calculationManager"
      :route-id="routeId"
      :route-points="localRoutePoints"
      :auto-calculate="false"
      :institution-id="institutionId"
      :route-name="routeName || 'Nova Rota'"
      @calculation-started="onCalculationStarted"
      @calculation-completed="onCalculationCompleted"
      @calculation-failed="onCalculationFailed"
      @route-created="onRouteCreated"
      @route-updated="onCalculationRouteUpdated"
      @error="onCalculationError"
    />

    <RouteNotificationManager
      ref="notificationManager"
      :enable-sound="true"
      :default-timeout="3000"
      :default-position="'top'"
    />

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
                          <q-item clickable v-close-popup @click="editPoint(point, index)">
                            <q-item-section avatar>
                              <q-icon name="edit" size="xs" />
                            </q-item-section>
                            <q-item-section>Editar</q-item-section>
                          </q-item>
                          <q-item clickable v-close-popup @click="confirmDeletePoint(point, index)">
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
            <MapView
              ref="mapView"
              :route-points="localRoutePoints"
              :route-segments="localRouteDraw"
              :route-data="routeData"
              :readonly="false"
              :auto-fit="true"
              :center-on-load="true"
              :show-user-location="true"
              @map-ready="onMapReady"
              @map-clicked="openAddPointModal"
              @point-clicked="selectPoint"
              @point-dragged="onPointDragged"
              @error="onMapError"
            >
              <!-- Slots podem ser adicionados aqui se necessário -->
            </MapView>
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
import { defineComponent } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

// Componentes gerenciadores
import RouteDataManager from 'src/components/maps/managers/RouteDataManager.vue'
import RoutePointsManager from 'src/components/maps/managers/RoutePointsManager.vue'
import RouteCalculationManager from 'src/components/maps/managers/RouteCalculationManager.vue'
import RouteNotificationManager from 'src/components/maps/managers/RouteNotificationManager.vue'

// Componentes de UI
import MapView from 'src/components/maps/MapView.vue'
import CreateRouteActions from 'src/components/maps/create_routes/CreateRoutesActions.vue'
import AddPointAction from 'src/components/maps/create_routes/actions/AddPointAction.vue'
import TraceRouteAction from 'src/components/maps/create_routes/actions/TraceRouteAction.vue'
import UndoAction from 'src/components/maps/create_routes/actions/UndoAction.vue'
import SaveRouteAction from 'src/components/maps/create_routes/actions/SaveRouteAction.vue'

export default defineComponent({
  name: 'RouteMapStep',

  components: {
    RouteDataManager,
    RoutePointsManager,
    RouteCalculationManager,
    RouteNotificationManager,
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
    },
    routeName: {
      type: String,
      default: 'Nova Rota'
    }
  },

  setup() {
    const quasar = useQuasar()
    const authStore = useAuthStore()
    return { quasar, authStore }
  },

  data() {
    return {
      // Estado local (sincronizado com props e managers)
      localRoutePoints: [...this.routePoints],
      localRouteDetails: { ...this.routeDetails },
      localRouteDraw: [...this.routeDraw],
      routeData: null,

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

      // Serviços para compatibilidade com componentes action existentes
      pointsService: {
        addPoint: (point) => {
          console.log('PointsService.addPoint chamado:', point)

          // Corrigir ID duplicado
          const newPoint = {
            ...point,
            id: `temp_${Date.now()}_${Math.random()}`, // ID único
            sequence: this.localRoutePoints.length,
            route_id: this.routeId
          }

          console.log('Adicionando ponto ao manager:', newPoint)
          return this.$refs.pointsManager?.addPoint(newPoint)
        }
      },
      routeService: {
        calculateRoute: (points) => {
          console.log('RouteService.calculateRoute chamado com:', points?.length, 'pontos')

          // Usar o RouteCalculationManager para calcular
          if (this.$refs.calculationManager) {
            return this.$refs.calculationManager.calculateRoute()
          } else {
            console.error('CalculationManager não disponível')
            return Promise.reject(new Error('CalculationManager não disponível'))
          }
        },
        saveRoute: (points, info) => {
          console.log('RouteService.saveRoute chamado')

          // Usar o RouteDataManager para salvar
          if (this.$refs.dataManager) {
            return this.$refs.dataManager.saveRouteData(info.routeId)
          } else {
            console.error('DataManager não disponível')
            return Promise.reject(new Error('DataManager não disponível'))
          }
        }
      },
      historyService: {
        undo: () => {
          const success = this.$refs.pointsManager?.undo()
          if (success) {
            return Promise.resolve(true)
          }
          return Promise.reject(new Error('No actions to undo'))
        }
      }
    }
  },

  computed: {
    institutionId() {
      return this.authStore.primaryInstitutionId
    }
  },

  watch: {
    routePoints: {
      handler(newValue) {
        console.log('Props routePoints changed:', newValue.length)
        // Evitar loop infinito comparando conteúdo
        if (JSON.stringify(this.localRoutePoints) !== JSON.stringify(newValue)) {
          this.localRoutePoints = [...newValue]
        }
      },
      deep: true
    },
    routeDetails: {
      handler(newValue) {
        this.localRouteDetails = { ...newValue }
      },
      deep: true
    },
    routeDraw: {
      handler(newValue) {
        this.localRouteDraw = [...newValue]
      },
      deep: true
    }
    // REMOVIDO: localRoutePoints watcher que causava loop infinito
  },

  methods: {
    // ===========================================
    // EVENTOS DOS MANAGERS
    // ===========================================
    onRouteLoaded(routeData) {
      console.log('Rota carregada pelo manager:', routeData)
      this.routeData = routeData

      if (routeData.points?.length > 0) {
        this.localRoutePoints = [...routeData.points]
        this.$emit('update:route-points', this.localRoutePoints)
      }

      if (routeData.segments?.length > 0) {
        this.localRouteDraw = [...routeData.segments]
        this.$emit('update:route-draw', this.localRouteDraw)
      }

      const updatedDetails = {
        totalDistance: routeData.total_distance || 0,
        totalDuration: routeData.total_duration || 0
      }
      this.localRouteDetails = updatedDetails
      this.$emit('update:route-details', updatedDetails)
    },

    onRouteUpdated(routeData) {
      console.log('Rota atualizada pelo manager:', routeData)
      this.routeData = routeData
    },

    onPointsUpdated(points) {
      console.log('Pontos atualizados pelo DataManager:', points.length)
      this.localRoutePoints = [...points]
      this.$emit('update:route-points', this.localRoutePoints)
    },

    onSegmentsUpdated(segments) {
      console.log('Segmentos atualizados pelo DataManager:', segments.length)
      this.localRouteDraw = [...segments]
      this.$emit('update:route-draw', this.localRouteDraw)
    },

    onPointsManagerUpdated(points) {
      console.log('Pontos atualizados pelo PointsManager:', points.length)

      // CRUCIAL: Evitar loop comparando conteúdo antes de atualizar
      if (JSON.stringify(this.localRoutePoints) !== JSON.stringify(points)) {
        this.localRoutePoints = [...points]
        this.$emit('update:route-points', this.localRoutePoints)

        console.log('Pontos sincronizados - emitindo para parent')
      } else {
        console.log('Pontos já estão sincronizados - evitando loop')
      }
    },

    onPointAddedByManager(data) {
      console.log('Ponto adicionado pelo manager:', data.point.name)
      this.$refs.notificationManager?.showPointAdded(data.point.name)

      // CRUCIAL: Sincronizar imediatamente
      this.syncPointsFromManager()
    },

    onPointUpdatedByManager(data) {
      console.log('Ponto atualizado pelo manager:', data.point.name)
      this.$refs.notificationManager?.showInfo(`Ponto "${data.point.name}" atualizado`)

      // CRUCIAL: Sincronizar imediatamente
      this.syncPointsFromManager()
    },

    onPointRemovedByManager(data) {
      console.log('Ponto removido pelo manager:', data.point.name)
      this.$refs.notificationManager?.showTemplateNotification('pointRemoved', data.point.name)

      // CRUCIAL: Sincronizar imediatamente
      this.syncPointsFromManager()
    },

    // Método para sincronizar pontos do manager
    syncPointsFromManager() {
      if (this.$refs.pointsManager) {
        const currentPoints = this.$refs.pointsManager.getAllPoints()
        console.log('Sincronizando pontos do manager:', currentPoints.length)

        // CRUCIAL: Evitar loop comparando antes de atualizar
        if (JSON.stringify(this.localRoutePoints) !== JSON.stringify(currentPoints)) {
          this.localRoutePoints = [...currentPoints]
          this.$emit('update:route-points', this.localRoutePoints)

          console.log('Sincronização completa')
        } else {
          console.log('Pontos já sincronizados')
        }
      }
    },

    onCalculationStarted() {
      this.$refs.notificationManager?.showCalculationStarted()
    },

    onCalculationCompleted(data) {
      console.log('Cálculo concluído pelo manager:', data)

      this.$refs.notificationManager?.showCalculationCompleted(
        data.calculationTime,
        data.routeData?.total_distance / 1000 || 0
      )

      // Atualizar dados locais COM VALIDAÇÃO
      if (data.routeData) {
        // Atualizar detalhes
        const updatedDetails = {
          totalDistance: data.routeData.total_distance || 0,
          totalDuration: data.routeData.total_duration || 0
        }

        // Só atualizar se os valores mudaram
        if (JSON.stringify(this.localRouteDetails) !== JSON.stringify(updatedDetails)) {
          this.localRouteDetails = updatedDetails
          this.$emit('update:route-details', updatedDetails)
          console.log('Detalhes da rota atualizados:', updatedDetails)
        }

        // Atualizar segmentos
        if (data.routeData.segments && Array.isArray(data.routeData.segments)) {
          const newSegments = [...data.routeData.segments]

          // Só atualizar se os segmentos mudaram
          if (JSON.stringify(this.localRouteDraw) !== JSON.stringify(newSegments)) {
            this.localRouteDraw = newSegments
            this.$emit('update:route-draw', newSegments)
            console.log('Segmentos da rota atualizados:', newSegments.length)
          }
        }

        // Emitir evento para TraceRouteAction saber que terminou
        this.$emit('route-calculated', {
          success: true,
          totalDistance: updatedDetails.totalDistance,
          totalDuration: updatedDetails.totalDuration,
          segments: this.localRouteDraw
        })
      }
    },

    onCalculationFailed(data) {
      console.log('Cálculo falhou:', data.error)

      this.$refs.notificationManager?.showCalculationError(data.error)

      // Emitir evento para TraceRouteAction saber que falhou
      this.$emit('route-calculation-failed', {
        success: false,
        error: data.error
      })
    },

    onRouteCreated(routeData) {
      console.log('Nova rota criada:', routeData.id)
      this.routeData = routeData
      this.unsavedChanges = false

      this.$refs.notificationManager?.showRouteCreated(
        routeData.name,
        routeData.id
      )

      // *** NÃO REDIRECIONAR - Apenas emitir evento ***
      this.$emit('route-created', routeData)

      // NÃO FAZER: this.$emit('route-id-changed', routeData.id)
      // Isso evita redirecionamento automático
    },

    onCalculationRouteUpdated(routeData) {
      this.routeData = routeData
    },

    onDataError(errorData) {
      this.$refs.notificationManager?.showError(errorData.message)
    },

    onPointsError(errorData) {
      this.$refs.notificationManager?.showError(errorData.message)
    },

    onCalculationError(errorData) {
      this.$refs.notificationManager?.showError(errorData.message)
    },

    onMapReady(mapInstance) {
      console.log('Mapa pronto')
    },

    onMapError(errorData) {
      this.$refs.notificationManager?.showError(errorData.message)
    },

    // ===========================================
    // MÉTODOS DE VALIDAÇÃO E NAVEGAÇÃO
    // ===========================================
    async validateAndContinue() {
      // Validar se temos pontos suficientes
      if (this.localRoutePoints.length < 2) {
        this.$refs.notificationManager?.showWarning('Adicione pelo menos 2 pontos para criar uma rota')
        return
      }

      // Validar se a rota foi calculada
      if (!this.localRouteDetails.totalDistance) {
        try {
          await this.calculateRouteFromMap()
        } catch (error) {
          this.$refs.notificationManager?.showWarning('Não foi possível calcular a rota. Tente novamente.')
          return
        }
      }

      // Verificar se temos os segmentos
      if (!this.localRouteDraw || this.localRouteDraw.length === 0) {
        this.$refs.notificationManager?.showWarning('Aguarde o cálculo da rota ser finalizado')
        return
      }

      this.$emit('next')
    },

    async calculateRouteFromMap() {
      console.log('calculateRouteFromMap chamado')

      // Verificar se temos pontos suficientes
      if (this.localRoutePoints.length < 2) {
        this.$refs.notificationManager?.showWarning('Adicione pelo menos 2 pontos para calcular a rota')
        return Promise.reject(new Error('Pontos insuficientes'))
      }

      try {
        console.log('Iniciando cálculo via CalculationManager...')

        // Usar o RouteCalculationManager
        if (this.$refs.calculationManager) {
          const result = await this.$refs.calculationManager.calculateRoute()
          console.log('Cálculo concluído via manager:', result)
          return result
        } else {
          throw new Error('CalculationManager não disponível')
        }
      } catch (error) {
        console.error('Erro ao calcular rota via manager:', error)

        // Fallback: notificar erro via NotificationManager
        this.$refs.notificationManager?.showCalculationError(error)
        throw error
      }
    },

    // ===========================================
    // MÉTODOS DE MANIPULAÇÃO DE PONTOS
    // ===========================================
    openAddPointModal(coords) {
      console.log('Coordenadas do clique recebidas:', coords)

      if (this.$refs.addPointAction) {
        this.$refs.addPointAction.openModal(coords)
      } else {
        // Fallback: adicionar ponto diretamente via manager
        console.log('AddPointAction não encontrado, adicionando ponto diretamente')
        const newPoint = this.$refs.pointsManager?.addPointAtCoordinates(
          coords.lat,
          coords.lng,
          `Ponto ${this.localRoutePoints.length + 1}`
        )

        if (newPoint) {
          console.log('Ponto adicionado diretamente:', newPoint)
        }
      }
    },

    onPointAdded(point) {
      console.log('Ponto adicionado via action:', point)

      // MELHOR ABORDAGEM: Não adicionar manualmente, deixar o PointsService fazer
      // O PointsService já chama this.$refs.pointsManager?.addPoint(newPoint)
      // E o manager emitirá o evento que atualizará tudo automaticamente

      console.log('Ponto será processado pelo PointsService automaticamente')
    },

    selectPoint(point) {
      console.log('Ponto selecionado:', point)
      // Centralizar no mapa se possível
      if (this.$refs.mapView && typeof this.$refs.mapView.centerOnPoint === 'function') {
        this.$refs.mapView.centerOnPoint(point)
      }
    },

    onPointDragged(pointData) {
      console.log('Evento de arrasto recebido:', pointData)

      this.$refs.pointsManager?.updatePointCoordinates(
        pointData.index,
        pointData.lat,
        pointData.lng
      )
    },

    editPoint(point, index) {
      this.editingPoint = {
        name: point.name,
        lat: point.lat || point.latitude,
        lng: point.lng || point.longitude,
        index: index,
        id: point.id
      }
      this.editPointModal = true
    },

    saveEditedPoint() {
      const { index, name, lat, lng } = this.editingPoint

      this.$refs.pointsManager?.updatePoint(index, {
        name,
        lat,
        lng,
        latitude: lat,
        longitude: lng
      })
    },

    confirmDeletePoint(point, index) {
      this.pointToDeleteIndex = index
      this.pointToDelete = point
      this.deleteConfirmModal = true
    },

    deletePoint() {
      if (this.pointToDeleteIndex !== null) {
        this.$refs.pointsManager?.removePoint(this.pointToDeleteIndex)

        this.pointToDeleteIndex = null
        this.pointToDelete = null
      }
    },

    movePointUp(index) {
      this.$refs.pointsManager?.movePoint(index, index - 1)
    },

    movePointDown(index) {
      this.$refs.pointsManager?.movePoint(index, index + 1)
    },

    // ===========================================
    // EVENTOS DE COMPATIBILIDADE (para actions existentes)
    // ===========================================
    // ===========================================
    // EVENTOS DE COMPATIBILIDADE (para actions existentes)
    // ===========================================
    onRouteTraced(data) {
      console.log('Route traced via TraceRouteAction:', data)

      // O cálculo será tratado pelo manager automaticamente
      // Os dados chegaram do TraceRouteAction, vamos processar
      if (data && typeof data === 'object') {
        // Atualizar detalhes se fornecidos
        if (data.totalDistance || data.totalDuration) {
          const updatedDetails = {
            totalDistance: data.totalDistance || this.localRouteDetails.totalDistance,
            totalDuration: data.totalDuration || this.localRouteDetails.totalDuration
          }
          this.localRouteDetails = updatedDetails
          this.$emit('update:route-details', updatedDetails)
        }

        // Atualizar segmentos se fornecidos
        if (data.segments && Array.isArray(data.segments)) {
          console.log('Segmentos recebidos do TraceRouteAction:', data.segments.length)
          this.localRouteDraw = [...data.segments]
          this.$emit('update:route-draw', this.localRouteDraw)
        }

        // Se houver dados de rota completa, atualizar via DataManager
        if (data.route || data.routeData) {
          const routeData = data.route || data.routeData
          if (this.$refs.dataManager) {
            this.$refs.dataManager.setRouteData(routeData)
          }
        }
      }
    },

    onActionUndone() {
      this.$refs.notificationManager?.showInfo('Ação desfeita')
    },

    onRouteSaved(data) {
      this.$refs.notificationManager?.showSuccess('Rota salva com sucesso')
    },

    // ===========================================
    // MÉTODOS PÚBLICOS PARA O ROUTE CREATION PAGE
    // ===========================================

    // Método para salvar dados da rota (exposto para o parent)
    async saveRouteData() {
      try {
        if (this.$refs.dataManager) {
          return await this.$refs.dataManager.saveRouteData(this.routeId)
        }
        throw new Error('DataManager não disponível')
      } catch (error) {
        console.error('Erro ao salvar via manager:', error)
        throw error
      }
    },

    // Método para atualizar informações da rota
    async updateRouteInfo(routeInfo) {
      if (this.routeData) {
        const updatedData = {
          ...this.routeData,
          name: routeInfo.name,
          description: routeInfo.description,
          schedule_data: {
            start_time: routeInfo.startTime,
            end_time: routeInfo.endTime,
            days: this.convertDaysToArray(routeInfo.days)
          },
          permissions: (routeInfo.allowedCards || []).map(card =>
            typeof card === 'string' ? card : card.value
          )
        }

        if (this.$refs.dataManager) {
          this.$refs.dataManager.setRouteData(updatedData)
        }
      }
    },

    convertDaysToArray(days) {
      const result = []
      if (days.mon) result.push(1)
      if (days.tue) result.push(2)
      if (days.wed) result.push(3)
      if (days.thu) result.push(4)
      if (days.fri) result.push(5)
      if (days.sat) result.push(6)
      if (days.sun) result.push(7)
      return result.length > 0 ? result : [1, 2, 3, 4, 5]
    },

    // Método para calcular rota (exposto para o parent)
    async calculateRoute() {
      try {
        if (this.$refs.calculationManager) {
          return await this.$refs.calculationManager.calculateRoute()
        }
        throw new Error('CalculationManager não disponível')
      } catch (error) {
        console.error('Erro ao calcular via manager:', error)
        throw error
      }
    },

    // Método para obter estado atual dos managers
    getManagersState() {
      return {
        dataManager: this.$refs.dataManager?.getCurrentState(),
        pointsManager: this.$refs.pointsManager?.getCurrentState(),
        calculationManager: this.$refs.calculationManager?.getCalculationState(),
        notificationManager: this.$refs.notificationManager?.getCurrentState()
      }
    },

    // Método para validar dados antes de continuar
    validateRouteData() {
      const dataValidation = this.$refs.dataManager?.validateRouteData()
      const pointsValidation = this.$refs.pointsManager?.validatePoints()

      const allErrors = [
        ...(dataValidation?.errors || []),
        ...(pointsValidation?.errors || [])
      ]

      return {
        valid: allErrors.length === 0,
        errors: allErrors
      }
    },

    // ===========================================
    // EVENTOS ADICIONAIS PARA O PARENT
    // ===========================================
    onRouteLoaded(routeData) {
      console.log('Rota carregada pelo manager:', routeData)
      this.routeData = routeData

      if (routeData.points?.length > 0) {
        this.localRoutePoints = [...routeData.points]
        this.$emit('update:route-points', this.localRoutePoints)
      }

      if (routeData.segments?.length > 0) {
        this.localRouteDraw = [...routeData.segments]
        this.$emit('update:route-draw', this.localRouteDraw)
      }

      const updatedDetails = {
        totalDistance: routeData.total_distance || 0,
        totalDuration: routeData.total_duration || 0
      }
      this.localRouteDetails = updatedDetails
      this.$emit('update:route-details', updatedDetails)

      // Emitir evento para o parent (RouteCreationPage)
      this.$emit('route-loaded', routeData)
    },
    formatDuration(seconds) {
      if (!seconds) return '0 min'

      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)

      if (hours > 0) {
        return `${hours}h ${minutes}min`
      }
      return `${minutes}min`
    },

    formatCoords(lat, lng) {
      if (!lat || !lng) return 'Coordenadas não definidas'
      return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
    }
  }
})
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
  background: var(--q-secondary-background);
  border: 1px solid var(--q-accent-4);
  border-color: rgba(255, 99, 0, 0.1);

  .body--dark & {
    background: var(--q-secondary-background);
    border-color: rgba(255, 161, 0, 0.2);
  }
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
  background: var(--q-primary-background);

  .body--dark & {
    background: var(--q-primary-background);
  }
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
  color: var(--q-secondary-text);
  margin-bottom: 2px;
}

.detail-value {
  font-weight: 500;
  color: var(--q-primary-text);
}

.route-point-item {
  border-bottom: 1px solid var(--q-accent-4);
  border-bottom-color: rgba(255, 99, 0, 0.1);

  .body--dark & {
    border-bottom-color: rgba(255, 161, 0, 0.15);
  }
}

.route-point-item:last-child {
  border-bottom: none;
}

.map-wrapper {
  height: 600px;
  width: 100%;
  position: relative;
  border: 1px solid var(--q-accent-4);
  border-color: rgba(255, 99, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;

  .body--dark & {
    border-color: rgba(255, 161, 0, 0.3);
  }
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
