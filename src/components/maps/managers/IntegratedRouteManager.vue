<template>
  <div class="integrated-route-manager">
    <!-- Gerenciadores invisíveis -->
    <RouteDataManager
      ref="dataManager"
      :route-id="routeId"
      :readonly="readonly"
      :auto-load="enableApiCalls"
      @route-loaded="onRouteLoaded"
      @route-updated="onRouteUpdated"
      @points-updated="onPointsUpdated"
      @segments-updated="onSegmentsUpdated"
      @loading-changed="onLoadingChanged"
      @request-action="handleManagerRequest"
      @error="onDataError"
    />

    <RoutePointsManager
      ref="pointsManager"
      :points="routePoints"
      :readonly="readonly"
      :max-points="50"
      :min-points="0"
      :auto-sequence="true"
      @points-updated="onPointsManagerUpdated"
      @point-added="onPointAdded"
      @point-updated="onPointUpdated"
      @point-removed="onPointRemoved"
      @validation-error="onPointValidationError"
      @error="onPointsError"
    />

    <RouteCalculationManager
      ref="calculationManager"
      :route-id="routeId"
      :route-points="routePoints"
      :auto-calculate="autoCalculate && enableApiCalls"
      :institution-id="institutionId"
      :route-name="routeName"
      @calculation-started="onCalculationStarted"
      @calculation-progress="onCalculationProgress"
      @calculation-completed="onCalculationCompleted"
      @calculation-failed="onCalculationFailed"
      @route-created="onRouteCreated"
      @route-updated="onCalculationRouteUpdated"
      @request-action="handleManagerRequest"
      @error="onCalculationError"
    />

    <RouteNotificationManager
      ref="notificationManager"
      :enable-sound="true"
      :default-timeout="5000"
      :default-position="'top'"
      :auto-close="true"
      :persist-errors="true"
      @notification-shown="onNotificationShown"
      @error-logged="onErrorLogged"
    />

    <!-- Componente de visualização do mapa -->
    <MapView
      :route-points="routePoints"
      :route-segments="routeSegments"
      :route-data="routeData"
      :readonly="readonly"
      :auto-fit="autoFit"
      :center-on-load="centerOnLoad"
      :show-user-location="showUserLocation"
      @map-ready="onMapReady"
      @map-clicked="onMapClicked"
      @point-clicked="onPointClicked"
      @point-dragged="onPointDragged"
      @user-location-found="onUserLocationFound"
      @user-location-error="onUserLocationError"
      @error="onMapError"
    >
      <!-- Slot para controles do mapa -->
      <template #controls="{ loadingUser, canCalculateRoute, routeData }">
        <MapControls
          :loading-user="loadingUser"
          :can-calculate-route="canCalculateRoute"
          :has-user-institution="hasUserInstitution"
          :is-calculating="calculationState.isCalculating"
          :route-id="routeId"
          :route-data="routeData"
          @center-user-location="centerUserLocation"
          @calculate-route="calculateRoute"
          @refresh-route="refreshRoute"
          @save-route="saveRoute"
          @delete-route="deleteRoute"
        />
      </template>

      <!-- Slot para overlay de carregamento -->
      <template #loading-overlay="{ loading, loadingMessage }">
        <LoadingOverlay
          v-if="loading || dataLoading"
          :message="loadingMessage || dataLoadingMessage"
        />
      </template>

      <!-- Slot para progresso do cálculo -->
      <template #calculation-progress="{ routeData }">
        <CalculationProgress
          v-if="calculationState.isCalculating"
          :route-id="routeId || routeData?.id || 0"
          :calculation-status="calculationState.status"
          :estimated-time-remaining="calculationState.estimatedTimeRemaining"
          :can-cancel="calculationState.canCancel"
          @cancel-calculation="cancelCalculation"
        />
      </template>

      <!-- Slot para notificações/banners -->
      <template #notifications="{ calculationError, routeData }">
        <NotificationBanners
          :has-user-institution="hasUserInstitution"
          :calculation-success="calculationSuccess"
          :calculation-error="calculationError || calculationState.error"
          :route-data="routeData"
          :can-retry="canRetryCalculation"
          @close-success="closeSuccessNotification"
          @retry-calculation="retryCalculation"
          @clear-error="clearCalculationError"
        />
      </template>

      <!-- Slot para informações da rota -->
      <template #route-info="{ routeInfo }">
        <RouteInfo
          v-if="routeInfo && (routeInfo.distance > 0 || routeInfo.points > 0)"
          :route-info="routeInfo"
          @edit-route="editRoute"
          @share-route="shareRoute"
        />
      </template>
    </MapView>

    <!-- Painel de debug (apenas em desenvolvimento) -->
    <div v-if="showDebugPanel" class="debug-panel">
      <h4>Debug Panel</h4>
      <div class="debug-section">
        <h5>Route Data</h5>
        <pre>{{ debugInfo.dataManager }}</pre>
      </div>
      <div class="debug-section">
        <h5>Points Manager</h5>
        <pre>{{ debugInfo.pointsManager }}</pre>
      </div>
      <div class="debug-section">
        <h5>Calculation Manager</h5>
        <pre>{{ debugInfo.calculationManager }}</pre>
      </div>
      <div class="debug-section">
        <h5>Notifications</h5>
        <pre>{{ debugInfo.notificationManager }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from 'src/stores/auth'

// Componentes gerenciadores
import RouteDataManager from './RouteDataManager.vue'
import RoutePointsManager from './RoutePointsManager.vue'
import RouteCalculationManager from './RouteCalculationManager.vue'
import RouteNotificationManager from './RouteNotificationManager.vue'

// Componentes de UI
import MapView from './MapView.vue'
import MapControls from './components/MapControls.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import CalculationProgress from './components/CalculationProgress.vue'
import NotificationBanners from './components/NotificationBanners.vue'
import RouteInfo from './components/RouteInfo.vue'

export default {
  name: 'IntegratedRouteManager',

  components: {
    RouteDataManager,
    RoutePointsManager,
    RouteCalculationManager,
    RouteNotificationManager,
    MapView,
    MapControls,
    LoadingOverlay,
    CalculationProgress,
    NotificationBanners,
    RouteInfo
  },
  emits: [
    'map-ready',
    'route-loaded',
    'route-updated',
    'route-created',
    'route-deleted',
    'calculation-started',
    'calculation-completed',
    'calculation-failed',
    'point-selected',
    'edit-route-requested',
    'share-route-requested',
    'route-id-changed',
    'route-comparison-ready',
    'user-location-found',
    'user-location-error',
    'manager-request'  // ✅ NOVO
  ],
  props: {
    routeId: {
      type: Number,
      default: null
    },
    readonly: {
      type: Boolean,
      default: false
    },
    autoCalculate: {
      type: Boolean,
      default: false
    },
    autoFit: {
      type: Boolean,
      default: true
    },
    centerOnLoad: {
      type: Boolean,
      default: true
    },
    showUserLocation: {
      type: Boolean,
      default: true
    },
    routeName: {
      type: String,
      default: 'Nova Rota'
    },
    showDebugPanel: {
      type: Boolean,
      default: false
    },
    // ✅ NOVO: Controlar se deve fazer chamadas de API
    enableApiCalls: {
      type: Boolean,
      default: true
    },
    // ✅ NOVO: Função para requisições de API (injetada pelo parent)
    apiHandler: {
      type: Function,
      default: null
    }
  },

  data() {
    return {
      authStore: useAuthStore(),

      // Estado dos dados
      routeData: null,
      routePoints: [],
      routeSegments: [],

      // Estado de loading
      dataLoading: false,
      dataLoadingMessage: '',

      // Estado do cálculo
      calculationState: {
        isCalculating: false,
        status: null,
        error: null,
        canCancel: false,
        estimatedTimeRemaining: 0
      },

      // Estado das notificações
      calculationSuccess: false,

      // Controle interno
      map: null,
      unsavedChanges: false
    }
  },

  computed: {
    hasUserInstitution() {
      return this.authStore.hasUserInstitution
    },

    institutionId() {
      return this.authStore.primaryInstitutionId
    },

    canRetryCalculation() {
      return this.routeId || this.routePoints.length >= 2
    },

    debugInfo() {
      if (!this.showDebugPanel) return {}

      return {
        dataManager: this.$refs.dataManager?.getDebugInfo() || {},
        pointsManager: this.$refs.pointsManager?.getDebugInfo() || {},
        calculationManager: this.$refs.calculationManager?.getCalculationState() || {},
        notificationManager: this.$refs.notificationManager?.getDebugInfo() || {}
      }
    }
  },


  watch: {
    routeId: {
      handler(newId) {
        console.log('Route ID changed:', newId)
        // O RouteDataManager vai reagir automaticamente
      }
    },

    unsavedChanges(hasChanges) {
      if (hasChanges && !this.readonly) {
        this.$refs.notificationManager?.showUnsavedChanges()
      }
    }
  },

  mounted() {
    this.checkUserInstitutions()
  },

  beforeUnmount() {
    this.cleanup()
  },

  methods: {
    async handleManagerRequest(request) {
      console.log('IntegratedRouteManager: Recebendo requisição:', request)

      const { managerType, action, args, callback } = request

      try {
        let result = null

        if (this.enableApiCalls && this.apiHandler) {
          // Usar handler injetado pelo parent
          result = await this.apiHandler(managerType, action, ...args)
        } else if (this.enableApiCalls) {
          // Emitir evento para o parent
          result = await this.emitManagerRequest(managerType, action, ...args)
        } else {
          // Modo sem API - apenas simular sucesso
          console.log('Modo sem API ativo - simulando sucesso')
          result = { success: true, message: 'Operação simulada' }
        }

        // Chamar callback de sucesso
        if (callback) {
          callback(null, result)
        }

        return result

      } catch (error) {
        console.error('IntegratedRouteManager: Erro ao processar requisição:', error)

        // Chamar callback de erro
        if (callback) {
          callback(error, null)
        }

        // Re-lançar erro
        throw error
      }
    },

// 4. MÉTODO PARA EMITIR REQUISIÇÃO PARA PARENT
    async emitManagerRequest(managerType, action, ...args) {
      return new Promise((resolve, reject) => {
        // Emitir evento para o parent com timeout
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout na requisição: ${managerType}.${action}`))
        }, 30000) // 30s timeout

        this.$emit('manager-request', {
          managerType,
          action,
          args,
          callback: (error, result) => {
            clearTimeout(timeout)

            if (error) {
              reject(error)
            } else {
              resolve(result)
            }
          }
        })
      })
    },
    // ===========================================
    // EVENTOS DO MAPA
    // ===========================================
    onMapReady(mapInstance) {
      console.log('Mapa pronto:', mapInstance)
      this.map = mapInstance
      this.$emit('map-ready', mapInstance)
    },

    onMapClicked(coordinates) {
      if (!this.readonly) {
        console.log('Mapa clicado:', coordinates)
        this.$refs.pointsManager?.addPointAtCoordinates(
          coordinates.lat,
          coordinates.lng
        )
      }
    },

    onPointClicked(pointData) {
      console.log('Ponto clicado:', pointData)
      this.$emit('point-selected', pointData)
    },

    onPointDragged(dragData) {
      console.log('Ponto arrastado:', dragData)
      this.$refs.pointsManager?.updatePointCoordinates(
        dragData.index,
        dragData.lat,
        dragData.lng
      )
      this.unsavedChanges = true
    },

    onUserLocationFound(location) {
      console.log('Localização encontrada:', location)
      this.$refs.notificationManager?.showLocationFound()
      this.$emit('user-location-found', location)
    },

    onUserLocationError(error) {
      console.warn('Erro de localização:', error)
      this.$refs.notificationManager?.showLocationError(error)
      this.$emit('user-location-error', error)
    },

    onMapError(errorData) {
      console.error('Erro no mapa:', errorData)
      this.$refs.notificationManager?.showError(errorData.message)
    },

    // ===========================================
    // EVENTOS DO GERENCIADOR DE DADOS
    // ===========================================
    onRouteLoaded(routeData) {
      console.log('Rota carregada:', routeData.id)
      this.routeData = routeData
      this.unsavedChanges = false
      this.$emit('route-loaded', routeData)
    },

    onRouteUpdated(routeData) {
      console.log('Rota atualizada:', routeData.id)
      this.routeData = routeData
      this.$emit('route-updated', routeData)
    },

    onPointsUpdated(points) {
      console.log('Pontos atualizados:', points.length)
      this.routePoints = points
      this.unsavedChanges = true
    },

    onSegmentsUpdated(segments) {
      console.log('Segmentos atualizados:', segments.length)
      this.routeSegments = segments
    },

    onLoadingChanged(loading) {
      this.dataLoading = loading
    },

    onDataError(errorData) {
      console.error('Erro nos dados:', errorData)
      this.$refs.notificationManager?.showError(errorData.message)
    },

    // ===========================================
    // EVENTOS DO GERENCIADOR DE PONTOS
    // ===========================================
    onPointsManagerUpdated(points) {
      // Sincronizar com o gerenciador de dados
      this.$refs.dataManager?.updateRoutePoints(points)
    },

    onPointAdded(data) {
      console.log('Ponto adicionado:', data.point.name)
      this.$refs.notificationManager?.showPointAdded(data.point.name)
      this.unsavedChanges = true
    },

    onPointUpdated(data) {
      console.log('Ponto atualizado:', data.point.name)
      this.unsavedChanges = true
    },

    onPointRemoved(data) {
      console.log('Ponto removido:', data.point.name)
      this.$refs.notificationManager?.showTemplateNotification(
        'pointRemoved',
        data.point.name
      )
      this.unsavedChanges = true
    },

    onPointValidationError(errorData) {
      console.warn('Erro de validação:', errorData)
      this.$refs.notificationManager?.showError(errorData.message)
    },

    onPointsError(errorData) {
      console.error('Erro nos pontos:', errorData)
      this.$refs.notificationManager?.showError(errorData.message)
    },

    // ===========================================
    // EVENTOS DO GERENCIADOR DE CÁLCULO
    // ===========================================
    onCalculationStarted(data) {
      console.log('Cálculo iniciado:', data.routeId)
      this.calculationState.isCalculating = true
      this.$refs.notificationManager?.showCalculationStarted()
      this.$emit('calculation-started', data)
    },

    onCalculationProgress(status) {
      console.log('Progresso do cálculo:', status)
      this.calculationState.status = status
      this.calculationState.canCancel = status?.progress_percentage > 20
      this.calculationState.estimatedTimeRemaining = status?.estimated_remaining_seconds || 0
    },

    onCalculationCompleted(data) {
      console.log('Cálculo concluído:', data)
      this.calculationState.isCalculating = false
      this.calculationState.status = null
      this.calculationState.error = null
      this.calculationSuccess = true

      // Atualizar dados da rota
      if (data.routeData) {
        this.$refs.dataManager?.setRouteData(data.routeData)
      }

      this.$refs.notificationManager?.showCalculationCompleted(
        data.calculationTime,
        data.routeData?.total_distance / 1000 || 0
      )

      // Limpar sucesso após 5 segundos
      setTimeout(() => {
        this.calculationSuccess = false
      }, 5000)

      this.$emit('calculation-completed', data)
    },

    onCalculationFailed(data) {
      console.log('Cálculo falhou:', data.error)
      this.calculationState.isCalculating = false
      this.calculationState.status = null
      this.calculationState.error = data.error

      this.$refs.notificationManager?.showCalculationError(data.error)
      this.$emit('calculation-failed', data)
    },

    onRouteCreated(routeData) {
      console.log('Nova rota criada:', routeData.id)
      this.routeData = routeData
      this.unsavedChanges = false

      this.$refs.notificationManager?.showRouteCreated(
        routeData.name,
        routeData.id
      )

      this.$emit('route-created', routeData)
      this.$emit('route-id-changed', routeData.id)
    },

    onCalculationRouteUpdated(routeData) {
      // Atualizar dados quando o cálculo modifica a rota
      this.$refs.dataManager?.setRouteData(routeData)
    },

    onCalculationError(errorData) {
      console.error('Erro no cálculo:', errorData)
      this.$refs.notificationManager?.showError(errorData.message)
    },

    // ===========================================
    // EVENTOS DE NOTIFICAÇÃO
    // ===========================================
    onNotificationShown(data) {
      console.log('Notificação exibida:', data.id, data.type)
    },

    onErrorLogged(errorEntry) {
      console.log('Erro registrado:', errorEntry.id)
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - CONTROLES
    // ===========================================
    async calculateRoute() {
      try {
        if (!this.enableApiCalls) {
          console.log('API desabilitada - simulando cálculo')
          this.$refs.notificationManager?.showInfo('Modo simulação - cálculo não executado')
          return false
        }

        console.log('Calculando rota via nova arquitetura...')

        if (this.apiHandler) {
          // Usar handler direto
          const result = await this.apiHandler('calculation', 'calculateRoute')
          console.log('Cálculo via handler:', result)
          return true
        } else {
          // Usar manager tradicional (fallback)
          const success = await this.$refs.calculationManager?.calculateRoute()
          return success
        }

      } catch (error) {
        console.error('Erro ao calcular rota:', error)
        this.$refs.notificationManager?.showError(error.message)
        return false
      }
    },
    async retryCalculation() {
      this.clearCalculationError()
      await this.calculateRoute()
    },

    cancelCalculation() {
      this.$refs.calculationManager?.cancelCalculation()
      this.calculationState.isCalculating = false
      this.calculationState.status = null
    },

    clearCalculationError() {
      this.calculationState.error = null
      this.$refs.calculationManager?.clearCalculationError()
    },

    setApiHandler(handler) {
      console.log('Configurando handler de API:', typeof handler)
      this.apiHandler = handler
    },

    setApiEnabled(enabled) {
      console.log('Configurando API habilitada:', enabled)
      this.enableApiCalls = enabled

      // Notificar managers sobre mudança
      if (this.$refs.dataManager) {
        this.$refs.dataManager.autoLoad = enabled
      }

      if (this.$refs.calculationManager) {
        this.$refs.calculationManager.autoCalculate = this.autoCalculate && enabled
      }
    },

    async refreshRoute() {
      try {
        if (!this.enableApiCalls) {
          console.log('API desabilitada - não é possível atualizar')
          this.$refs.notificationManager?.showInfo('Modo simulação - atualização não disponível')
          return null
        }

        const targetRouteId = this.routeId || this.routeData?.id

        if (!targetRouteId) {
          console.warn('Nenhuma rota para atualizar')
          return null
        }

        console.log('Atualizando rota via nova arquitetura...')

        if (this.apiHandler) {
          // Usar handler direto
          const result = await this.apiHandler('data', 'loadRoute', targetRouteId)
          console.log('Atualização via handler:', result)
          return result
        } else {
          // Usar manager tradicional (fallback)
          return await this.$refs.dataManager?.refreshRoute(targetRouteId)
        }

      } catch (error) {
        console.error('Erro ao atualizar rota:', error)
        this.$refs.notificationManager?.showError(error.message)
        return null
      }
    },

    async saveRoute() {
      try {
        if (!this.enableApiCalls) {
          console.log('API desabilitada - simulando salvamento')
          this.$refs.notificationManager?.showInfo('Modo simulação - salvamento não executado')
          return null
        }

        console.log('Salvando rota via nova arquitetura...')

        if (this.apiHandler) {
          // Usar handler direto
          const result = await this.apiHandler('data', 'saveRoute', {
            name: this.routeData?.name,
            points: this.routePoints
          })

          console.log('Salvamento via handler:', result)

          this.unsavedChanges = false
          this.$refs.notificationManager?.showTemplateNotification(
            'routeUpdated',
            result.name || this.routeData?.name
          )

          return result
        } else {
          // Usar manager tradicional (fallback)
          const savedRoute = await this.$refs.dataManager?.saveRouteData()

          if (savedRoute) {
            this.unsavedChanges = false
            this.$refs.notificationManager?.showTemplateNotification(
              'routeUpdated',
              savedRoute.name
            )
          }

          return savedRoute
        }

      } catch (error) {
        console.error('Erro ao salvar rota:', error)
        this.$refs.notificationManager?.showError(error.message)
        throw error
      }
    },

    async deleteRoute() {
      if (!this.routeData) return

      this.$refs.notificationManager?.showDeleteConfirmation(
        this.routeData.name,
        async () => {
          try {
            await this.$refs.dataManager?.deleteRoute()
            this.$emit('route-deleted', this.routeData.id)
          } catch (error) {
            console.error('Erro ao deletar rota:', error)
          }
        }
      )
    },

    centerUserLocation() {
      // Delegado para o MapView através do slot
    },

    closeSuccessNotification() {
      this.calculationSuccess = false
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - PONTOS
    // ===========================================
    addPoint(pointData) {
      return this.$refs.pointsManager?.addPoint(pointData)
    },

    removePoint(index) {
      return this.$refs.pointsManager?.removePoint(index)
    },

    updatePoint(index, updates) {
      return this.$refs.pointsManager?.updatePoint(index, updates)
    },

    clearAllPoints() {
      this.$refs.pointsManager?.clearAllPoints()
      this.unsavedChanges = true
    },

    optimizeRoute() {
      const success = this.$refs.pointsManager?.optimizePointOrder()
      if (success) {
        this.unsavedChanges = true
        this.$refs.notificationManager?.showInfo('Ordem dos pontos otimizada')
      }
    },

    undoLastChange() {
      const success = this.$refs.pointsManager?.undo()
      if (success) {
        this.$refs.notificationManager?.showInfo('Alteração desfeita')
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - VALIDAÇÃO
    // ===========================================
    validateRoute() {
      const dataValidation = this.$refs.dataManager?.validateRouteData()
      const pointsValidation = this.$refs.pointsManager?.validatePoints()

      const allErrors = [
        ...(dataValidation?.errors || []),
        ...(pointsValidation?.errors || [])
      ]

      if (allErrors.length > 0) {
        this.$refs.notificationManager?.showValidationErrors(allErrors)
        return { valid: false, errors: allErrors }
      }

      return { valid: true, errors: [] }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - EXPORT/IMPORT
    // ===========================================
    exportRouteData(format = 'json') {
      try {
        const routeData = this.$refs.dataManager?.exportRouteData()
        const pointsData = this.$refs.pointsManager?.exportPoints(format)

        return {
          route: routeData,
          points: pointsData,
          format,
          exportedAt: new Date().toISOString()
        }
      } catch (error) {
        console.error('Erro ao exportar:', error)
        this.$refs.notificationManager?.showError('Erro ao exportar dados da rota')
        return null
      }
    },

    importRouteData(data, format = 'json') {
      try {
        if (data.route) {
          this.$refs.dataManager?.importRouteData(data.route)
        }

        if (data.points) {
          this.$refs.pointsManager?.importPoints(data.points, format)
        }

        this.unsavedChanges = true
        this.$refs.notificationManager?.showSuccess('Dados importados com sucesso')
        return true

      } catch (error) {
        console.error('Erro ao importar:', error)
        this.$refs.notificationManager?.showError('Erro ao importar dados da rota')
        return false
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - UI ACTIONS
    // ===========================================
    editRoute() {
      this.$emit('edit-route-requested', this.routeData)
    },

    shareRoute() {
      this.$emit('share-route-requested', this.routeData)
    },

    // ===========================================
    // MÉTODOS PRIVADOS - UTILIDADES
    // ===========================================
    checkUserInstitutions() {
      if (!this.hasUserInstitution) {
        this.$refs.notificationManager?.showInstitutionWarning()
      }
    },

    cleanup() {
      console.log('Limpando integrated route manager...')

      // Limpar notificações ativas
      this.$refs.notificationManager?.cleanup()

      // Parar cálculos em andamento
      if (this.calculationState.isCalculating) {
        this.$refs.calculationManager?.cancelCalculation()
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - ESTADO E DEBUG
    // ===========================================
    getCurrentState() {
      return {
        routeData: this.routeData,
        routePoints: this.routePoints,
        routeSegments: this.routeSegments,
        calculationState: this.calculationState,
        unsavedChanges: this.unsavedChanges,
        dataLoading: this.dataLoading,
        hasUserInstitution: this.hasUserInstitution,
        institutionId: this.institutionId,
        managers: {
          data: this.$refs.dataManager?.getCurrentState(),
          points: this.$refs.pointsManager?.getCurrentState(),
          calculation: this.$refs.calculationManager?.getCalculationState(),
          notifications: this.$refs.notificationManager?.getCurrentState()
        }
      }
    },

    getStatistics() {
      return {
        route: {
          id: this.routeData?.id,
          name: this.routeData?.name,
          distance: this.routeData?.total_distance || 0,
          duration: this.routeData?.total_duration || 0,
          status: this.routeData?.calculation_status
        },
        points: this.$refs.pointsManager?.getStatistics() || {},
        notifications: this.$refs.notificationManager?.getStatistics() || {}
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - EVENTOS EXTERNOS
    // ===========================================

    // Método para ser chamado quando os dados mudam externamente
    onExternalDataChange(newData) {
      console.log('Dados externos alterados:', newData)

      if (newData.route) {
        this.$refs.dataManager?.setRouteData(newData.route)
      }

      if (newData.points) {
        this.$refs.pointsManager?.importPoints(newData.points)
      }
    },

    // Método para sincronizar com estado externo
    syncWithExternalState(externalState) {
      console.log('Sincronizando com estado externo...')

      if (externalState.routeId !== this.routeId) {
        this.$emit('route-id-sync-needed', externalState.routeId)
      }

      if (externalState.readonly !== this.readonly) {
        this.$emit('readonly-sync-needed', externalState.readonly)
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - AÇÕES AVANÇADAS
    // ===========================================

    async duplicateRoute() {
      try {
        if (!this.routeData) {
          throw new Error('Nenhuma rota para duplicar')
        }

        const duplicatedData = {
          ...this.routeData,
          name: `${this.routeData.name} (Cópia)`,
          id: null // Remover ID para criar nova rota
        }

        const result = await this.$refs.dataManager?.importRouteData({
          route: duplicatedData
        })

        if (result) {
          this.$refs.notificationManager?.showSuccess(
            `Rota "${duplicatedData.name}" duplicada com sucesso`
          )
          return result
        }

      } catch (error) {
        console.error('Erro ao duplicar rota:', error)
        this.$refs.notificationManager?.showError('Erro ao duplicar rota')
        return null
      }
    },

    async compareWithRoute(otherRouteId) {
      try {
        // Carregar dados da outra rota para comparação
        const otherRouteData = await this.$refs.dataManager?.loadRoute(otherRouteId)

        if (otherRouteData && this.routeData) {
          const comparison = {
            route1: {
              id: this.routeData.id,
              name: this.routeData.name,
              points: this.routePoints.length,
              distance: this.routeData.total_distance || 0,
              duration: this.routeData.total_duration || 0
            },
            route2: {
              id: otherRouteData.id,
              name: otherRouteData.name,
              points: otherRouteData.points?.length || 0,
              distance: otherRouteData.total_distance || 0,
              duration: otherRouteData.total_duration || 0
            }
          }

          this.$emit('route-comparison-ready', comparison)
          return comparison
        }

      } catch (error) {
        console.error('Erro ao comparar rotas:', error)
        this.$refs.notificationManager?.showError('Erro ao comparar rotas')
        return null
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - CONFIGURAÇÃO
    // ===========================================

    setNotificationSettings(settings) {
      const notificationManager = this.$refs.notificationManager

      if (settings.defaultPosition) {
        notificationManager?.setDefaultPosition(settings.defaultPosition)
      }

      if (settings.defaultTimeout !== undefined) {
        notificationManager?.setDefaultTimeout(settings.defaultTimeout)
      }

      if (settings.autoClose !== undefined) {
        notificationManager?.enableAutoClose(settings.autoClose)
      }

      if (settings.persistErrors !== undefined) {
        notificationManager?.enableErrorPersistence(settings.persistErrors)
      }
    },

    setPointsSettings(settings) {
      // As configurações de pontos são passadas via props
      // Este método pode ser usado para validar ou processar configurações dinâmicas

      if (settings.maxPoints && settings.maxPoints !== this.$refs.pointsManager?.maxPoints) {
        console.warn('Mudança de maxPoints requer reinicialização do componente')
      }

      if (settings.autoSequence !== undefined) {
        this.$refs.pointsManager?.autoSequence = settings.autoSequence
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - RELATÓRIOS
    // ===========================================

    generateReport() {
      const state = this.getCurrentState()
      const statistics = this.getStatistics()
      const validation = this.validateRoute()

      return {
        timestamp: new Date().toISOString(),
        route: {
          id: this.routeData?.id,
          name: this.routeData?.name,
          created: this.routeData?.created_at,
          updated: this.routeData?.updated_at,
          status: this.routeData?.calculation_status
        },
        metrics: {
          points: statistics.points,
          distance: statistics.route.distance,
          duration: statistics.route.duration,
          calculationTime: this.calculationState.lastCalculationTime || 0
        },
        validation: validation,
        state: {
          hasUnsavedChanges: this.unsavedChanges,
          isCalculating: this.calculationState.isCalculating,
          hasErrors: validation.errors.length > 0
        },
        managers: state.managers
      }
    },

    exportReport(format = 'json') {
      const report = this.generateReport()

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(report, null, 2)

        case 'csv':
          // Formato simplificado para CSV
          const csvData = [
            ['Campo', 'Valor'],
            ['ID da Rota', report.route.id || 'N/A'],
            ['Nome da Rota', report.route.name || 'N/A'],
            ['Número de Pontos', report.metrics.points.total || 0],
            ['Distância Total (km)', (report.metrics.distance / 1000).toFixed(2)],
            ['Duração Total (min)', (report.metrics.duration / 60).toFixed(0)],
            ['Status', report.route.status || 'N/A'],
            ['Alterações Não Salvas', report.state.hasUnsavedChanges ? 'Sim' : 'Não'],
            ['Calculando', report.state.isCalculating ? 'Sim' : 'Não'],
            ['Erros de Validação', report.validation.errors.length]
          ]

          return csvData.map(row => row.join(',')).join('\n')

        default:
          throw new Error(`Formato não suportado: ${format}`)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.integrated-route-manager {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.debug-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 400px;
  max-height: 80vh;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px;
  border-radius: 8px;
  overflow-y: auto;
  z-index: 9999;
  font-family: 'Courier New', monospace;
  font-size: 12px;

  h4 {
    margin: 0 0 16px 0;
    color: #4CAF50;
    border-bottom: 1px solid #333;
    padding-bottom: 8px;
  }

  h5 {
    margin: 16px 0 8px 0;
    color: #2196F3;
    font-size: 14px;
  }

  .debug-section {
    margin-bottom: 16px;

    pre {
      background: rgba(255, 255, 255, 0.1);
      padding: 8px;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      font-size: 10px;
      line-height: 1.4;
      margin: 0;
    }
  }
}

// Responsividade para o painel de debug
@media (max-width: 768px) {
  .debug-panel {
    width: calc(100vw - 20px);
    right: 10px;
    left: 10px;
    max-height: 50vh;
  }
}
</style>
