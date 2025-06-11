<template>
  <div class="route-calculation-manager">
    <!-- Este componente não renderiza UI, apenas gerencia estado -->
  </div>
</template>

<script>
import { routeApiService, routeUtils } from 'src/services/api/route/RouteApiService.js'
import { Notify } from 'quasar'

export default {
  name: 'RouteCalculationManager',

  props: {
    routeId: {
      type: Number,
      default: null
    },
    routePoints: {
      type: Array,
      default: () => []
    },
    autoCalculate: {
      type: Boolean,
      default: false
    },
    institutionId: {
      type: Number,
      required: true
    },
    routeName: {
      type: String,
      default: 'Nova Rota'
    }
  },

  emits: [
    'calculation-started',
    'calculation-progress',
    'calculation-completed',
    'calculation-failed',
    'calculation-cancelled',
    'route-created',
    'route-updated',
    'error',
    'request-action',
  ],

  data() {
    return {
      // Estado do cálculo
      isCalculating: false,
      calculationStatus: null,
      calculationError: null,
      calculationStartTime: null,

      // Controle de polling
      pollingTimeoutId: null,
      pollingCount: 0,
      maxPollingAttempts: 150, // 5 minutos com polling de 2s
      consecutiveErrors: 0,
      maxConsecutiveErrors: 3,
      isPollingActive: false,
      pollingInProgress: false,

      // Cache de dados
      lastKnownRouteData: null
    }
  },

  computed: {
    canCalculateRoute() {
      return this.routePoints.length >= 2 || (this.routeId && this.lastKnownRouteData?.points?.length >= 2)
    },

    canCancelCalculation() {
      return this.isCalculating && this.pollingCount > 3
    },

    estimatedTimeRemaining() {
      return this.calculationStatus?.estimated_remaining_seconds || 0
    },

    calculationProgress() {
      return {
        isCalculating: this.isCalculating,
        status: this.calculationStatus,
        error: this.calculationError,
        canCancel: this.canCancelCalculation,
        estimatedTimeRemaining: this.estimatedTimeRemaining
      }
    }
  },

  watch: {
    routePoints: {
      handler(newPoints) {
        if (this.autoCalculate && newPoints.length >= 2 && !this.routeId && !this.isCalculating) {
          this.autoCalculateRoute()
        }
      },
      deep: true
    },

    calculationStatus: {
      handler(newStatus) {
        if (newStatus?.status === 'completed') {
          this.onCalculationCompleted()
        } else if (newStatus?.status === 'error' || newStatus?.status === 'failed') {
          this.onCalculationFailed(newStatus.error_message)
        }
      },
      deep: true
    }
  },

  beforeUnmount() {
    this.stopCalculationPolling()
  },

  methods: {
    // ===========================================
    // MÉTODOS PÚBLICOS
    // ===========================================
    async calculateRoute() {
      if (!this.canCalculateRoute) {
        console.log('Não é possível calcular rota - condições não atendidas')
        return false
      }

      console.log('=== INICIANDO CÁLCULO DE ROTA VIA PARENT ===')

      try {
        this.clearCalculationError()
        this.isCalculating = true
        this.calculationStartTime = Date.now()

        // ✅ NOVO: Solicitar cálculo ao parent
        const routeData = await this.requestParentAction('calculateRoute')

        if (routeData) {
          console.log('✅ Cálculo concluído via parent:', routeData.id)
          this.lastKnownRouteData = routeData

          // Simular conclusão bem-sucedida
          setTimeout(() => {
            this.onCalculationCompleted()
          }, 100)
        }

        return true

      } catch (error) {
        console.error('Erro ao calcular rota via parent:', error)
        this.handleCalculationError(error)
        return false
      }
    },

    async retryCalculation() {
      this.clearCalculationError()
      return await this.calculateRoute()
    },

    cancelCalculation() {
      this.stopCalculationPolling()
      this.isCalculating = false
      this.calculationStatus = null

      this.$emit('calculation-cancelled')

      Notify.create({
        type: 'info',
        message: 'Cálculo cancelado',
        position: 'top'
      })
    },

    clearCalculationError() {
      this.calculationError = null
    },

    // ===========================================
    // CRIAÇÃO E ATUALIZAÇÃO DE ROTAS
    // ===========================================
    async createNewRoute() {
      if (!this.institutionId) {
        throw new Error('Nenhuma instituição encontrada para o usuário.')
      }

      console.log('Criando nova rota via parent...')

      this.isCalculating = true
      this.calculationStatus = {
        status: 'creating',
        progress_percentage: 0,
        message: 'Criando nova rota...'
      }

      try {
        // ✅ NOVO: Solicitar criação ao parent
        const routeData = await this.requestParentAction('createRoute', {
          name: this.routeName || 'Nova Rota',
          institution_id: this.institutionId,
          points: routeUtils.formatPointsForAPI(this.routePoints)
        })

        if (routeData) {
          this.lastKnownRouteData = routeData
          console.log('✅ Rota criada via parent:', routeData.id)

          // Se precisa calcular segmentos, solicitar cálculo
          if (routeData.points?.length >= 2 && (!routeData.segments || routeData.segments.length === 0)) {
            console.log('🔄 Solicitando cálculo dos segmentos...')
            await this.requestParentAction('calculateRoute')
          } else {
            this.isCalculating = false
            this.$emit('route-updated', this.lastKnownRouteData)
          }
        }

        return this.lastKnownRouteData

      } catch (error) {
        console.error('❌ Erro ao criar rota via parent:', error)
        this.isCalculating = false
        this.calculationStatus = null
        throw error
      }
    },

    async updateRoutePoints(routeId) {
      try {
        console.log('📝 Atualizando pontos via parent:', routeId)

        this.isCalculating = true
        this.calculationStatus = {
          status: 'updating',
          progress_percentage: 0,
          message: 'Atualizando pontos da rota...'
        }

        // ✅ NOVO: Solicitar atualização ao parent
        const updatedRoute = await this.requestParentAction('saveRoute', {
          points: routeUtils.formatPointsForAPI(this.routePoints)
        })

        if (updatedRoute) {
          this.lastKnownRouteData = updatedRoute
          console.log('✅ Pontos atualizados via parent')
        }

        return this.lastKnownRouteData

      } catch (error) {
        console.error('❌ Erro ao atualizar pontos via parent:', error)
        this.isCalculating = false
        this.calculationStatus = null
        throw error
      }
    },

    async requestParentAction(action, ...args) {
      return new Promise((resolve, reject) => {
        // Timeout para evitar travamento
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout na requisição: calculation.${action}`))
        }, 30000) // 30s timeout

        // ✅ NOVO: Emitir evento em vez de callback direto
        this.$emit('request-action', {
          managerType: 'calculation',
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

    onCalculationProgressFromPage(status) {
      console.log('Recebendo progresso do parent:', status)

      this.calculationStatus = status
      this.$emit('calculation-progress', this.calculationStatus)

      // Verificar se terminou
      if (status.status === 'completed') {
        this.onCalculationCompleted()
      } else if (status.status === 'error' || status.status === 'failed') {
        this.onCalculationFailed(status.error_message)
      }
    },

    async checkForRouteChanges(routeId) {
      try {
        console.log('🔍 Verificando mudanças nos pontos da rota:', routeId)

        const response = await routeApiService.getRoute(routeId)
        const backendPoints = response.data.route.points || []
        const frontendPoints = this.routePoints

        console.log('Pontos no backend:', backendPoints.length)
        console.log('Pontos no frontend:', frontendPoints.length)

        // Comparar quantidade
        if (backendPoints.length !== frontendPoints.length) {
          console.log('✅ Mudança detectada: quantidade diferente')
          return true
        }

        // Comparar coordenadas
        for (let i = 0; i < frontendPoints.length; i++) {
          const frontPoint = frontendPoints[i]
          const backPoint = backendPoints[i]

          if (!backPoint) {
            console.log(`✅ Mudança detectada: ponto ${i} não existe no backend`)
            return true
          }

          const frontLat = Number(frontPoint.lat || frontPoint.latitude || 0)
          const frontLng = Number(frontPoint.lng || frontPoint.longitude || 0)
          const backLat = Number(backPoint.latitude || 0)
          const backLng = Number(backPoint.longitude || 0)

          // Verificar diferença significativa (> 0.0001 graus ≈ 11 metros)
          if (Math.abs(frontLat - backLat) > 0.0001 || Math.abs(frontLng - backLng) > 0.0001) {
            console.log(`✅ Mudança detectada: coordenadas do ponto ${i} diferentes`)
            return true
          }
        }

        console.log('❌ Nenhuma mudança detectada')
        return false

      } catch (error) {
        console.error('Erro ao verificar mudanças:', error)
        return true // Em caso de erro, assumir que há mudanças
      }
    },

    async recalculateExistingRoute(routeId) {
      console.log('🔄 Recalculando rota:', routeId)

      this.isCalculating = true
      this.calculationStatus = {
        status: 'calculating',
        progress_percentage: 0,
        message: 'Iniciando recálculo...'
      }

      const response = await routeApiService.calculateRoute(routeId)
      console.log('Resposta do recálculo:', response.data)

      if (response.data.status === 'calculating') {
        console.log('Status: calculating - iniciando polling')
        this.startCalculationPolling(routeId)
        this.$emit('calculation-started', { routeId: routeId })

        Notify.create({
          type: 'info',
          message: 'Recálculo iniciado. Acompanhe o progresso...',
          position: 'top'
        })
      } else if (response.data.status === 'completed') {
        console.log('Status: completed imediatamente')
        await this.fetchCompletedRouteData(routeId)
      }
    },

    async autoCalculateRoute() {
      try {
        console.log('Auto-calculando rota...')
        await this.createNewRoute()
      } catch (error) {
        console.warn('Erro no auto-cálculo:', error)
      }
    },

    correctStatusData(status) {
      const corrected = { ...status }

      const completed = Number(status.calculated_segments || status.completed_segments || 0)
      const total = Number(status.total_segments || 0)

      if (total > 0 && completed >= 0) {
        corrected.progress_percentage = Math.round((completed / total) * 100)
        corrected.progress_percentage = Math.max(0, Math.min(100, corrected.progress_percentage))
      } else {
        corrected.progress_percentage = 0
      }

      if (corrected.progress_percentage >= 100) {
        corrected.estimated_remaining_seconds = 0
      } else if (total > 0 && completed >= 0) {
        const remaining = total - completed
        const avgTimePerSegment = 2
        corrected.estimated_remaining_seconds = remaining * avgTimePerSegment
      } else {
        corrected.estimated_remaining_seconds = Math.max(0, Number(status.estimated_remaining_seconds || 0))
      }

      corrected.calculated_segments = Math.max(0, completed)
      corrected.total_segments = Math.max(0, total)

      return corrected
    },

    getImprovedStatusMessage(status) {
      const completed = status.calculated_segments || 0
      const total = status.total_segments || 0
      const progress = status.progress_percentage || 0
      const remaining = status.estimated_remaining_seconds || 0

      switch (status.status) {
        case 'calculating':
          if (total > 0) {
            const remainingText = remaining > 0 ? ` (~${this.formatTime(remaining)} restantes)` : ''
            return `Calculando segmentos: ${completed}/${total} (${progress}%)${remainingText}`
          } else {
            return 'Iniciando cálculo dos segmentos...'
          }

        case 'updating':
          return 'Atualizando pontos da rota...'

        case 'completed':
          return `✅ Cálculo concluído! ${total} segmentos processados`

        case 'error':
        case 'failed':
          return `❌ Erro: ${status.error_message || 'Falha no cálculo'}`

        default:
          return `Status: ${status.status}`
      }
    },

    async fetchCompletedRouteData(routeId) {
      console.log('🔍 [FETCH] Buscando dados completos da rota:', routeId)

      try {
        const response = await routeApiService.getRoute(routeId)

        console.log('📦 [FETCH] Dados recebidos:', {
          id: response.data.route?.id,
          status: response.data.route?.calculation_status,
          distance: response.data.route?.total_distance,
          duration: response.data.route?.total_duration,
          segments: response.data.route?.segments?.length || 0
        })

        if (response.data.route?.calculation_status === 'completed') {
          console.log('✅ [FETCH] Dados completos recebidos')
          this.lastKnownRouteData = response.data.route
          this.onCalculationCompleted()
        } else {
          console.warn('⚠️ [FETCH] Dados ainda não estão completos, aguardando...')
          setTimeout(async () => {
            await this.fetchCompletedRouteData(routeId)
          }, 1000)
        }

      } catch (error) {
        console.error('❌ [FETCH] Erro ao buscar dados completos:', error)
        this.onCalculationFailed('Erro ao buscar dados da rota calculada')
      }
    },

    // ===========================================
    // EVENTOS DE CONCLUSÃO
    // ===========================================
    onCalculationCompleted() {
      console.log('=== ✅ FINALIZANDO CÁLCULO COMPLETO ===')

      const calculationTime = this.calculationStartTime
        ? Math.round((Date.now() - this.calculationStartTime) / 1000) : 0

      console.log(`⏱️ Cálculo finalizado em ${calculationTime}s`)

      this.isCalculating = false
      this.calculationStatus = null

      this.$emit('calculation-completed', {
        routeId: this.lastKnownRouteData?.id,
        calculationTime,
        routeData: this.lastKnownRouteData
      })

      this.$emit('route-updated', this.lastKnownRouteData)

      // ❌ REMOVER: Notify.create(...) - Deixar para o parent
      console.log('=== ✅ PROCESSO FINALIZADO ===')
    },


    onCalculationFailed(errorMessage) {
      console.log('=== ❌ CÁLCULO FALHOU ===')

      const calculationTime = this.calculationStartTime
        ? Math.round((Date.now() - this.calculationStartTime) / 1000) : 0

      this.isCalculating = false
      this.calculationError = errorMessage || 'Erro desconhecido no cálculo'
      this.calculationStatus = null

      console.log(`❌ Falha após ${calculationTime}s:`, this.calculationError)

      this.$emit('calculation-failed', {
        routeId: this.lastKnownRouteData?.id,
        error: this.calculationError,
        calculationTime
      })

      // ❌ REMOVER: Notify.create(...) - Deixar para o parent
    },

    handleCalculationError(error) {
      let errorMessage = 'Não foi possível calcular a rota'

      if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para calcular esta rota'
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data.message || 'Dados inválidos para cálculo'
      } else if (error.response?.status === 422) {
        errorMessage = error.response.data.message || 'Dados inválidos fornecidos'
      } else if (error.message?.includes('instituição')) {
        errorMessage = error.message
      }

      this.calculationError = errorMessage
      this.isCalculating = false
      this.$emit('error', { type: 'route_calculation', message: errorMessage, error })
    },

    // ===========================================
    // UTILITÁRIOS
    // ===========================================
    formatTime(seconds) {
      if (seconds < 60) {
        return `${Math.round(seconds)}s`
      } else {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = Math.round(seconds % 60)
        return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`
      }
    },

    // Método para obter o estado atual do cálculo
    getCalculationState() {
      return {
        isCalculating: this.isCalculating,
        status: this.calculationStatus,
        error: this.calculationError,
        canCancel: this.canCancelCalculation,
        estimatedTimeRemaining: this.estimatedTimeRemaining,
        routeData: this.lastKnownRouteData
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.route-calculation-manager {
  display: none; // Este componente não renderiza UI
}
</style>
