<template>
  <q-page class="route-creation-page q-py-md q-px-md">
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h5">{{ isEditing ? 'Editar Itinerário' : 'Criar Novo Itinerário' }}</div>
        <div class="text-caption text-grey">Preencha as informações e defina os pontos no mapa</div>
      </q-card-section>
    </q-card>

    <q-stepper
      v-model="step"
      horizontal
      color="primary"
      animated
      flat
      header-nav
      class="full-width"
    >
      <!-- Step 1: Informações Básicas -->
      <q-step
        :name="1"
        title="Informações Básicas"
        icon="info"
        :done="step > 1"
      >
        <route-info-step
          :route-info="routeInfo"
          @update:route-info="handleRouteInfoUpdate"
          @next="step = 2"
        />
      </q-step>

      <!-- Step 2: Configuração do Mapa e Pontos -->
      <q-step
        :name="2"
        title="Definição de Pontos e Rota"
        icon="map"
        :done="step > 2"
      >
        <route-map-step
          ref="mapStep"
          :route-id="routeId"
          :route-points="routePoints"
          :route-details="routeDetails"
          :route-draw="routeDraw"
          :route-name="routeInfo.name"
          @update:route-draw="handleRouteDrawUpdate"
          @update:route-points="handleRoutePointsUpdate"
          @update:route-details="handleRouteDetailsUpdate"
          @route-created="onRouteCreatedFromMap"
          @route-loaded="onRouteLoadedFromMap"
          @calculation-started="onCalculationStartedFromMap"
          @calculation-completed="onCalculationCompletedFromMap"
          @calculation-failed="onCalculationFailedFromMap"
          @manager-request="handleManagerRequestFromMapStep"
          @next="validateAndContinue"
          @back="step = 1"
        />
      </q-step>

      <!-- Step 3: Resumo e Confirmação -->
      <q-step
        :name="3"
        title="Confirmação"
        icon="check_circle"
      >
        <route-confirmation-step
          :route-info="routeInfo"
          :route-points="routePoints"
          :route-details="routeDetails"
          :route-draw="routeDraw"
          :is-saving="isSaving"
          @save="finalSaveRoute"
          @back="step = 2"
        />
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth.js'

// Componentes de steps
import RouteInfoStep from 'components/routes/creation/RouteInfoStep.vue'
import RouteMapStep from 'components/routes/creation/RouteMapStep.vue'
import RouteConfirmationStep from 'components/routes/creation/RouteConfirmationStep.vue'

// Services
import { routeApiService } from 'src/services/api/route/RouteApiService.ts'

export default defineComponent({
  name: 'RouteCreationPage',

  components: {
    RouteInfoStep,
    RouteMapStep,
    RouteConfirmationStep
  },

  setup() {
    const quasar = useQuasar()
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()

    return {
      quasar,
      route,
      router,
      authStore
    }
  },

  props: {
    // Prop para modo de edição
    editRoute: {
      type: Object,
      default: null
    }
  },
  mounted() {
    // Inicializar routeId baseado na URL
    if (this.route.params.id && this.route.params.id !== 'new') {
      const id = this.route.params.id
      if (this.validateRouteId(id)) {
        this.updateRouteId(parseInt(id))
        this.isEditMode = true
      } else {
        console.warn('Route ID inválido na URL:', id)
        this.updateRouteId(null)
        this.isEditMode = false
      }
    } else {
      // Modo de criação
      this.updateRouteId(null)
      this.isEditMode = false
    }

    // Debug em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      window.debugRouteState = () => this.debugRouteState()
      window.forceCreate = () => this.forceCreateNewRoute()
      console.log('💡 Debug commands available:')
      console.log('  - window.debugRouteState()')
      console.log('  - window.forceCreate()')
    }

    console.log('✅ RouteCreationPage inicializado')
  },
  beforeUnmount() {
    this.cancelPendingRequests()
  },
  data() {
    return {
      pendingRequests: new Map(),
      requestIdCounter: 0,
      isCancelling: false,
      step: 1,
      routeId: null,
      isEditMode: false,

      // Dados da rota
      routeInfo: {
        name: '',
        description: '',
        startTime: '07:00',
        endTime: '19:00',
        days: {
          mon: true,
          tue: true,
          wed: true,
          thu: true,
          fri: true,
          sat: false,
          sun: false
        },
        // Novos campos para sistema de permissões
        accessType: 'public', // 'public' ou 'restricted'
        allowedPermissions: [], // Array de IDs de permissões
        isPublic: true // Se a rota é visível publicamente
      },
      routePoints: [],
      routeDetails: {
        totalDistance: 0,
        totalDuration: 0
      },
      routeDraw: [],

      // Estado de salvamento
      isSaving: false
    }
  },

  watch: {
    editRoute: {
      handler(newRoute) {
        if (newRoute) {
          this.loadRouteForEditing(newRoute)
        }
      },
      immediate: true
    },
    routeId: {
      handler(newId, oldId) {
        console.log('RouteId mudou:', oldId, '->', newId)

        // Validar novo ID
        if (newId && !this.validateRouteId(newId)) {
          console.warn('RouteId inválido detectado:', newId)
          this.routeId = null
        }
      }
    }
  },

  computed: {
    isEditing() {
      return this.isEditMode || !!this.editRoute
    },

    institutionId() {
      return this.authStore.primaryInstitutionId
    },

    pageTitle() {
      return this.isEditing ? 'Editar Itinerário' : 'Criar Novo Itinerário'
    },

    pageSubtitle() {
      if (this.isEditing) {
        return `Editando: ${this.routeInfo.name || 'Itinerário sem nome'}`
      }
      return 'Preencha as informações e defina os pontos no mapa'
    }
  },

  created() {
    // Verificar se estamos editando uma rota existente
    this.initializeComponent()
  },

  methods: {
    getManagerRequestsStatus() {
      return {
        pendingCount: this.pendingRequests.size,
        isCancelling: this.isCancelling,
        pendingRequests: Array.from(this.pendingRequests.entries()).map(([id, req]) => ({
          id,
          ...req,
          duration: Date.now() - req.startTime
        }))
      }
    },
    // 2. ADICIONAR NOVOS HANDLERS DE EVENTOS
    onCalculationStartedFromMap(data) {
      console.log('Cálculo iniciado no mapa:', data)

      this.quasar.notify({
        type: 'info',
        message: 'Calculando rota...',
        timeout: 2000
      })
    },

    onCalculationCompletedFromMap(data) {
      console.log('Cálculo concluído no mapa:', data)

      // Atualizar dados locais se necessário
      if (data.routeData) {
        this.handleRouteDetailsUpdate({
          totalDistance: data.routeData.total_distance || 0,
          totalDuration: data.routeData.total_duration || 0
        })

        if (data.routeData.segments) {
          this.handleRouteDrawUpdate(data.routeData.segments)
        }
      }

      this.quasar.notify({
        type: 'positive',
        message: `Rota calculada em ${data.calculationTime || 0}s!`,
        timeout: 3000
      })
    },

    onCalculationFailedFromMap(data) {
      console.log('Cálculo falhou no mapa:', data.error)

      this.quasar.notify({
        type: 'negative',
        message: `Erro ao calcular rota: ${data.error}`,
        timeout: 5000
      })
    },

    async handleManagerRequestFromMapStep(request) {
      console.log('RouteCreationPage: Recebendo requisição via emit:', request)

      const { managerType, action, args, callback } = request

      try {
        // Usar o método handleManagerRequest existente
        const result = await this.handleManagerRequest(managerType, action, ...args)

        console.log('RouteCreationPage: Requisição processada via emit:', result)

        // Chamar callback de sucesso
        if (callback) {
          callback(null, result)
        }

        return result

      } catch (error) {
        console.error('RouteCreationPage: Erro ao processar requisição via emit:', error)

        // Chamar callback de erro
        if (callback) {
          callback(error, null)
        }

        // Não re-lançar erro aqui para evitar unhandled promise rejection
      }
    },

// 3. ADICIONAR MÉTODO PARA COMUNICAR COM MAPSTEP
    async callMapStepMethod(methodName, ...args) {
      if (this.$refs.mapStep && typeof this.$refs.mapStep[methodName] === 'function') {
        try {
          return await this.$refs.mapStep[methodName](...args)
        } catch (error) {
          console.error(`Erro ao chamar ${methodName} no MapStep:`, error)
          throw error
        }
      } else {
        throw new Error(`Método ${methodName} não encontrado no MapStep`)
      }
    },

// 4. ADICIONAR MÉTODOS PARA NOTIFICAR MAPSTEP
    notifyMapStepRouteLoaded(routeData) {
      console.log('Notificando MapStep sobre rota carregada:', routeData.id)

      if (this.$refs.mapStep && typeof this.$refs.mapStep.onRouteLoadedFromPage === 'function') {
        this.$refs.mapStep.onRouteLoadedFromPage(routeData)
      }
    },

    notifyMapStepCalculationProgress(status) {
      console.log('Notificando MapStep sobre progresso:', status)

      if (this.$refs.mapStep && typeof this.$refs.mapStep.onCalculationProgressFromPage === 'function') {
        this.$refs.mapStep.onCalculationProgressFromPage(status)
      }
    },

    initializeComponent() {
      // Verificar se estamos editando via prop
      if (this.editRoute) {
        this.loadRouteForEditing(this.editRoute)
        return
      }
      // Verificar se estamos editando via URL
      const id = this.route.params.id
      if (id && id !== 'new') {
        this.routeId = parseInt(id)
        this.isEditMode = true
        // O RouteMapStep carregará automaticamente quando montado
      }
    },

    loadRouteForEditing(routeData) {
      console.log('Carregando rota para edição:', routeData)

      this.isEditMode = true
      this.routeId = routeData.id

      // Carregar informações básicas
      this.routeInfo = this.sanitizeRouteInfo({
        name: routeData.name || '',
        description: routeData.description || '',
        startTime: routeData.schedule_data?.start_time || '07:00',
        endTime: routeData.schedule_data?.end_time || '19:00',
        days: this.parseDaysFromBackend(routeData.schedule_data?.days),
        // Novos campos do sistema de permissões
        accessType: this.determineAccessType(routeData),
        allowedPermissions: this.parsePermissionsFromBackend(routeData.permissions || []),
        isPublic: routeData.is_public !== undefined ? routeData.is_public : true
      })

      // Carregar pontos se disponíveis
      if (routeData.points?.length > 0) {
        this.routePoints = [...routeData.points]
      }

      // Carregar detalhes da rota
      this.routeDetails = {
        totalDistance: routeData.total_distance || 0,
        totalDuration: routeData.total_duration || 0
      }

      // Carregar segmentos se disponíveis
      if (routeData.segments?.length > 0) {
        this.routeDraw = [...routeData.segments]
      }

      console.log('Rota carregada para edição:', {
        routeInfo: this.routeInfo,
        points: this.routePoints.length,
        segments: this.routeDraw.length
      })
    },

    // ===========================================
    // MÉTODOS DE SANITIZAÇÃO
    // ===========================================
    sanitizeString(str) {
      if (!str || typeof str !== 'string') return ''
      return str
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
        .replace(/["'<>&]/g, '')
        .trim()
    },

    sanitizeRouteInfo(routeInfo) {
      if (!routeInfo) return routeInfo

      return {
        ...routeInfo,
        name: this.sanitizeString(routeInfo.name || ''),
        description: this.sanitizeString(routeInfo.description || ''),
        startTime: this.sanitizeString(routeInfo.startTime || '07:00'),
        endTime: this.sanitizeString(routeInfo.endTime || '19:00'),
        days: routeInfo.days || {},
        accessType: routeInfo.accessType || 'public',
        allowedPermissions: Array.isArray(routeInfo.allowedPermissions) ? routeInfo.allowedPermissions : [],
        isPublic: routeInfo.isPublic !== undefined ? routeInfo.isPublic : true
      }
    },

    // ===========================================
    // HANDLERS DE EVENTOS DOS STEPS
    // ===========================================
    handleRouteInfoUpdate(routeInfo) {
      console.log('RouteCreationPage: Atualizando route info:', routeInfo)
      this.routeInfo = this.sanitizeRouteInfo(routeInfo)
    },

    handleRoutePointsUpdate(points) {
      console.log('RouteCreationPage: Atualizando pontos:', points?.length || 0)
      if (Array.isArray(points)) {
        this.routePoints = [...points]
      }
    },

    handleRouteDetailsUpdate(details) {
      console.log('RouteCreationPage: Atualizando detalhes:', details)
      if (details && typeof details === 'object') {
        this.routeDetails = {
          totalDistance: Number(details.totalDistance || 0),
          totalDuration: Number(details.totalDuration || 0)
        }
      }
    },

    handleRouteDrawUpdate(segments) {
      console.log('RouteCreationPage: Recebendo segmentos:', segments?.length || 0)
      if (Array.isArray(segments)) {
        this.routeDraw = [...segments]
      } else {
        this.routeDraw = []
      }
    },

    onRouteCreatedFromMap(routeData) {
      console.log('Rota criada no mapa:', routeData)

      // *** ATUALIZAR ID SEM REDIRECIONAR ***
      if (routeData.id && !this.routeId) {
        this.routeId = routeData.id
        console.log('RouteId atualizado para:', this.routeId)

        // *** NÃO REDIRECIONAR - Manter na mesma URL ***
        console.log('Permanecendo na URL atual do wizard')
      }

      this.quasar.notify({
        type: 'positive',
        message: `Rota "${routeData.name}" criada com sucesso!`
      })
    },

    onRouteLoadedFromMap(routeData) {
      console.log('Rota carregada do mapa:', routeData)

      // Preencher as informações da rota
      this.routeInfo = this.sanitizeRouteInfo({
        name: routeData.name || '',
        description: routeData.description || '',
        startTime: routeData.schedule_data?.start_time || '07:00',
        endTime: routeData.schedule_data?.end_time || '19:00',
        days: this.parseDaysFromBackend(routeData.schedule_data?.days),
        accessType: this.determineAccessType(routeData),
        allowedPermissions: this.parsePermissionsFromBackend(routeData.permissions || []),
        isPublic: routeData.is_public !== undefined ? routeData.is_public : true
      })

      // Os pontos, detalhes e segmentos já são gerenciados pelo RouteMapStep
      this.quasar.notify({
        type: 'positive',
        message: 'Rota carregada com sucesso!'
      })
    },

    // ===========================================
    // PARSERS DE DADOS DO BACKEND
    // ===========================================
    parseDaysFromBackend(days) {
      if (!days) return {
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
      }

      // Se já é um objeto, retorna como está
      if (typeof days === 'object' && !Array.isArray(days)) {
        return days
      }

      // Converte array de números para objeto
      if (Array.isArray(days)) {
        return {
          mon: days.includes(1),
          tue: days.includes(2),
          wed: days.includes(3),
          thu: days.includes(4),
          fri: days.includes(5),
          sat: days.includes(6),
          sun: days.includes(7)
        }
      }

      // Fallback padrão
      return {
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
      }
    },

    parsePermissionsFromBackend(permissions) {
      if (!Array.isArray(permissions)) return []

      return permissions
        .map(permission => {
          // Se é um objeto com ID
          if (permission && typeof permission === 'object' && permission.id) {
            return permission.id
          }
          // Se é um número direto
          if (typeof permission === 'number') {
            return permission
          }
          // Se é string que pode ser convertida
          if (typeof permission === 'string' && !isNaN(parseInt(permission))) {
            return parseInt(permission)
          }
          return null
        })
        .filter(id => id !== null && id > 0)
    },

    determineAccessType(routeData) {
      // Se tem permissões definidas, é restrita
      if (routeData.permissions && Array.isArray(routeData.permissions) && routeData.permissions.length > 0) {
        return 'restricted'
      }
      // Caso contrário, é pública
      return 'public'
    },

    // ===========================================
    // VALIDAÇÃO E NAVEGAÇÃO
    // ===========================================
    validateAndContinue() {
      console.log('=== VALIDAÇÃO PARA CONTINUAR ===')
      console.log('Pontos:', this.routePoints.length)
      console.log('Distância:', this.routeDetails.totalDistance)
      console.log('Segmentos:', this.routeDraw.length)

      // Validar pontos
      if (this.routePoints.length < 2) {
        this.quasar.notify({
          type: 'warning',
          message: 'Adicione pelo menos 2 pontos para criar uma rota'
        })
        return
      }

      // Validar distância calculada
      if (!this.routeDetails.totalDistance || this.routeDetails.totalDistance <= 0) {
        this.quasar.notify({
          type: 'warning',
          message: 'Trace a rota antes de continuar'
        })
        return
      }

      // Validar segmentos
      if (!this.routeDraw || this.routeDraw.length === 0) {
        this.quasar.notify({
          type: 'warning',
          message: 'Aguarde o cálculo da rota ser finalizado'
        })
        return
      }

      console.log('Validação passou - avançando para confirmação')
      this.step = 3
    },

    // ===========================================
    // SALVAMENTO FINAL
    // ===========================================
    async finalSaveRoute() {
      if (this.isSaving) return

      this.isSaving = true

      try {
        console.log('=== SALVANDO ROTA FINAL ===')
        console.log('RouteId atual:', this.routeId)
        console.log('IsEditing:', this.isEditing)

        // Verificar se temos instituição
        if (!this.institutionId) {
          throw new Error('Nenhuma instituição encontrada para o usuário.')
        }

        // 🔥 DETERMINAR OPERAÇÃO BASEADA NO ROUTEID
        const hasExistingRoute = !!(this.routeId || this.isEditing)
        const operation = hasExistingRoute ? 'UPDATE' : 'CREATE'

        console.log(`Operação determinada: ${operation}`)

        let savedRoute = null

        // ==========================================
        // ESTRATÉGIA 1: Tentar usar o RouteMapStep Manager
        // ==========================================
        if (this.$refs.mapStep && this.$refs.mapStep.saveRouteData) {
          try {
            console.log(`Tentando ${operation} via RouteMapStep manager...`)

            // Atualizar informações da rota no manager
            await this.$refs.mapStep.updateRouteInfo(this.routeInfo)

            // 🔥 VERIFICAR SE MANAGER TEM ROUTEID ANTES DE SALVAR
            if (hasExistingRoute) {
              // Para rotas existentes, garantir que o manager tem o ID
              if (this.$refs.mapStep.routeId !== this.routeId) {
                console.log('Sincronizando routeId com manager:', this.routeId)
                this.$refs.mapStep.routeId = this.routeId
              }
            }

            // Salvar via manager
            savedRoute = await this.$refs.mapStep.saveRouteData()

            if (savedRoute && savedRoute.id) {
              console.log(`✅ ${operation} via manager bem-sucedido:`, savedRoute.id)
            } else {
              throw new Error('Manager retornou dados inválidos')
            }

          } catch (managerError) {
            console.warn(`❌ Erro no ${operation} via manager:`, managerError.message)
            savedRoute = null
          }
        }

        // ==========================================
        // ESTRATÉGIA 2: API Direta (apenas se manager falhou)
        // ==========================================
        if (!savedRoute) {
          console.log(`Manager não disponível ou falhou, usando API direta para ${operation}...`)

          const routeData = this.prepareRouteDataForAPI()
          console.log('Dados preparados para API:', routeData)

          let response

          if (hasExistingRoute) {
            // 🔥 UPDATE: Rota já existe
            const targetRouteId = this.routeId || this.editRoute?.id
            if (!targetRouteId) {
              throw new Error('ID da rota não encontrado para atualização')
            }

            console.log(`📝 Atualizando rota existente: ${targetRouteId}`)
            response = await routeApiService.updateRoute(targetRouteId, routeData)
            console.log('✅ Rota atualizada via API:', response.data)

          } else {
            // 🔥 CREATE: Nova rota
            console.log('🆕 Criando nova rota via API...')
            response = await routeApiService.createRoute(routeData)
            console.log('✅ Rota criada via API:', response.data)
          }

          savedRoute = response.data.route || response.data
        }

        // ==========================================
        // PROCESSAR RESULTADO
        // ==========================================
        if (!savedRoute || !savedRoute.id) {
          throw new Error('Falha ao salvar: dados inválidos retornados')
        }

        // 🔥 ATUALIZAR ROUTEID APENAS PARA NOVAS ROTAS
        if (!hasExistingRoute && savedRoute.id) {
          console.log('Atualizando routeId para nova rota:', savedRoute.id)
          this.routeId = this.validateRouteId(savedRoute.id)
        }

        // Notificação de sucesso
        const successMessage = hasExistingRoute
          ? 'Itinerário atualizado com sucesso!'
          : 'Itinerário criado com sucesso!'

        this.quasar.notify({
          type: 'positive',
          message: successMessage
        })

        // Redirecionamento
        console.log('Redirecionando após salvamento final...')
        const targetRouteId = savedRoute.id || this.routeId

        if (targetRouteId) {
          this.router.push(`/routes/${targetRouteId}`)
        } else {
          this.router.push('/routes')
        }

      } catch (error) {
        console.error('❌ Erro ao salvar rota:', error)
        this.handleSaveError(error)
      } finally {
        this.isSaving = false
      }
    },

    // ==========================================
    // MÉTODOS AUXILIARES
    // ==========================================
    prepareRouteDataForAPI() {
      const data = {
        name: this.sanitizeString(this.routeInfo.name),
        description: this.sanitizeString(this.routeInfo.description),
        institution_id: this.institutionId,

        schedule_type: this.routeInfo.scheduleType || 'daily',
        schedule_data: this.routeInfo.schedule_data || this.buildScheduleData(),

        // 🎫 CAMPOS DE PERMISSÃO
        permissions: this.routeInfo.accessType === 'restricted'
          ? (this.routeInfo.allowedPermissions || [])
          : [],
        is_public: this.routeInfo.isPublic !== undefined ? this.routeInfo.isPublic : true,

        // 📍 PONTOS DA ROTA - ESTRUTURA CORRIGIDA
        points: this.routePoints.map((p, index) => ({
          name: this.sanitizeString(p.name),
          description: p.description ? this.sanitizeString(p.description) : null,
          latitude: Number(p.lat || p.latitude),
          longitude: Number(p.lng || p.longitude),
          sequence: Number(p.sequence !== undefined ? p.sequence : index),
          // Campos opcionais para o ponto
          type: p.type || 'stop',
          stop_duration: p.stop_duration || null,
          is_optional: p.is_optional || false,
          route_specific_notes: p.route_specific_notes ? this.sanitizeString(p.route_specific_notes) : null,
          arrival_time: p.arrival_time || null,
          departure_time: p.departure_time || null,
          // Características do ponto físico
          has_shelter: p.has_shelter || false,
          is_accessible: p.is_accessible || false,
          has_lighting: p.has_lighting || false,
          has_security: p.has_security || false,
          capacity: p.capacity || null,
          notes: p.notes ? this.sanitizeString(p.notes) : null
        })),

        // 🗺️ SEGMENTOS DA ROTA (se houver)
        segments: this.routeDraw.filter(Boolean).map((segment, index) => ({
          sequence: segment.sequence !== undefined ? segment.sequence : index,
          distance: segment.distance || 0,
          duration: segment.duration || 0,
          geometry: segment.geometry || null,
          profile: segment.profile || 'driving-car'
        }))
      }
      if (this.validateRouteId(this.routeId)) {
        data.route_id = parseInt(this.routeId)
      }
      return data
    },

    determineOperation() {
      // Se temos routeId válido = UPDATE, senão = CREATE
      return this.validateRouteId(this.routeId) ? 'UPDATE' : 'CREATE'
    },


    buildScheduleData() {
      // Se já tem schedule_data estruturado, usar
      if (this.routeInfo.schedule_data && typeof this.routeInfo.schedule_data === 'object') {
        return this.routeInfo.schedule_data
      }

      // Construir baseado no tipo de agendamento
      const scheduleType = this.routeInfo.scheduleType || 'daily'

      switch (scheduleType) {
        case 'daily':
        case 'weekly':
          return {
            start_time: this.routeInfo.startTime || '07:00',
            end_time: this.routeInfo.endTime || '19:00',
            days: this.getDaysArray(this.routeInfo.days)
          }

        case 'custom':
          return {
            description: this.routeInfo.customDescription || 'Horários flexíveis conforme necessidade',
            custom_config: true
          }

        case 'monthly':
          return {
            description: 'Agendamento mensal',
            monthly_config: true
          }

        default:
          // Fallback para daily
          return {
            start_time: '07:00',
            end_time: '19:00',
            days: [1, 2, 3, 4, 5] // Segunda a sexta
          }
      }
    },

    getDaysArray(days) {
      if (!days || typeof days !== 'object') return [1, 2, 3, 4, 5]

      // Converter objeto de dias para array de números (1-7)
      const result = []
      if (days.mon) result.push(1)
      if (days.tue) result.push(2)
      if (days.wed) result.push(3)
      if (days.thu) result.push(4)
      if (days.fri) result.push(5)
      if (days.sat) result.push(6)
      if (days.sun) result.push(7)

      return result.length > 0 ? result : [1, 2, 3, 4, 5] // Fallback para dias úteis
    },

    // Método para inicializar routeInfo com valores padrão corretos
    initializeRouteInfo() {
      if (!this.routeInfo.scheduleType) {
        this.routeInfo.scheduleType = 'daily'
      }
      if (!this.routeInfo.accessType) {
        this.routeInfo.accessType = 'public'
      }
      if (!this.routeInfo.allowedPermissions) {
        this.routeInfo.allowedPermissions = []
      }
      if (this.routeInfo.isPublic === undefined) {
        this.routeInfo.isPublic = true
      }
      if (!this.routeInfo.days) {
        this.routeInfo.days = {
          mon: true, tue: true, wed: true, thu: true,
          fri: true, sat: false, sun: false
        }
      }
      if (!this.routeInfo.startTime) {
        this.routeInfo.startTime = '07:00'
      }
      if (!this.routeInfo.endTime) {
        this.routeInfo.endTime = '19:00'
      }
    },

    isValidPointId(id) {
      return id &&
        !id.toString().startsWith('temp_') &&
        !id.toString().startsWith('point-') &&
        !id.toString().startsWith('new-')
    },

    validateRouteId(id) {
      const numId = parseInt(id)
      return !isNaN(numId) && numId > 0 ? numId : null
    },

    handleSaveError(error) {
      let errorMessage = 'Erro desconhecido'

      if (error.response?.status === 404) {
        errorMessage = 'Rota não encontrada para atualização'
      } else if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para salvar esta rota'
      } else if (error.response?.status === 422) {
        errorMessage = error.response.data?.message || 'Dados da rota são inválidos'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      this.quasar.notify({
        type: 'negative',
        message: `Erro ao salvar o itinerário: ${errorMessage}`
      })
    },

    // ==========================================
    // MÉTODOS DE VERIFICAÇÃO ADICIONAL
    // ==========================================
    validateBeforeSave() {
      const errors = []

      // Verificar dados básicos
      if (!this.routeInfo.name?.trim()) {
        errors.push('Nome da rota é obrigatório')
      }

      // Verificar tipo de agendamento
      if (!this.routeInfo.scheduleType) {
        errors.push('Tipo de agendamento é obrigatório')
      }

      // Verificar schedule_data
      if (this.routeInfo.scheduleType === 'custom' && !this.routeInfo.customDescription?.trim()) {
        errors.push('Descrição é obrigatória para agendamento personalizado')
      }

      if (this.routePoints.length < 2) {
        errors.push('Adicione pelo menos 2 pontos')
      }

      if (!this.institutionId) {
        errors.push('Usuário não associado a uma instituição')
      }

      // Para atualizações, verificar se routeId é válido
      if (this.isEditing && !this.routeId) {
        errors.push('ID da rota não encontrado para atualização')
      }

      // Validar permissões para rotas restritas
      if (this.routeInfo.accessType === 'restricted' && (!this.routeInfo.allowedPermissions || this.routeInfo.allowedPermissions.length === 0)) {
        errors.push('Selecione pelo menos uma permissão para rota restrita')
      }

      return {
        valid: errors.length === 0,
        errors
      }
    },

    async syncStateBeforeSave() {
      console.log('Sincronizando estado antes do salvamento...')

      // Garantir que routePoints estão atualizados
      if (this.$refs.mapStep?.getCurrentPoints) {
        const currentPoints = this.$refs.mapStep.getCurrentPoints()
        if (currentPoints && currentPoints.length > 0) {
          this.routePoints = currentPoints
        }
      }

      // Garantir que routeDraw está atualizado
      if (this.$refs.mapStep?.getCurrentSegments) {
        const currentSegments = this.$refs.mapStep.getCurrentSegments()
        if (currentSegments && currentSegments.length > 0) {
          this.routeDraw = currentSegments
        }
      }

      // Validar antes de prosseguir
      const validation = this.validateBeforeSave()
      if (!validation.valid) {
        throw new Error(`Validação falhou: ${validation.errors.join(', ')}`)
      }
    },

    async forceCreateNewRoute() {
      console.log('🆕 Forçando criação de nova rota...')

      try {
        const routeData = this.prepareRouteDataForAPI()
        const newRoute = await this.apiCreateRoute(routeData)

        this.updateRouteId(newRoute.id)

        this.quasar.notify({
          type: 'positive',
          message: `Nova rota criada: ${newRoute.name}`,
          timeout: 3000
        })

        return newRoute

      } catch (error) {
        console.error('Erro ao forçar criação:', error)
        throw error
      }
    },

    async finalSaveRoute() {
      if (this.isSaving) return

      this.isSaving = true

      try {
        console.log('=== SALVAMENTO FINAL ===')

        // Verificar instituição
        if (!this.institutionId) {
          throw new Error('Nenhuma instituição encontrada para o usuário.')
        }

        // ✅ USAR LÓGICA DE PROTEÇÃO
        const operation = this.determineOperation()
        console.log(`💾 Operação final: ${operation}`)

        let savedRoute = null

        // Tentar usar RouteMapStep manager primeiro
        if (this.$refs.mapStep && this.$refs.mapStep.saveRouteData) {
          try {
            console.log(`Tentando ${operation} via RouteMapStep manager...`)

            // Atualizar informações da rota no manager
            await this.$refs.mapStep.updateRouteInfo(this.routeInfo)

            if (operation === 'UPDATE') {
              // Garantir que manager tem o ID correto
              this.$refs.mapStep.routeId = this.routeId
            }

            // Salvar via manager (ele vai decidir create vs update internamente)
            savedRoute = await this.$refs.mapStep.saveRouteData()

            if (savedRoute && savedRoute.id) {
              console.log(`✅ ${operation} via manager bem-sucedido:`, savedRoute.id)

              // ✅ ATUALIZAR ID SE FOI CREATE
              if (operation === 'CREATE') {
                this.updateRouteId(savedRoute.id)
              }
            } else {
              throw new Error('Manager retornou dados inválidos')
            }

          } catch (managerError) {
            console.warn(`❌ Erro no ${operation} via manager:`, managerError.message)
            savedRoute = null
          }
        }

        // Fallback para API direta
        if (!savedRoute) {
          console.log(`Manager falhou, usando API direta para ${operation}...`)
          savedRoute = await this.saveOrCreate()
        }

        // Validar resultado
        if (!savedRoute || !savedRoute.id) {
          throw new Error('Falha ao salvar: dados inválidos retornados')
        }

        // ✅ GARANTIR QUE ID ESTÁ SINCRONIZADO
        if (operation === 'CREATE' || !this.routeId) {
          this.updateRouteId(savedRoute.id)
        }

        // Notificação de sucesso
        const successMessage = operation === 'UPDATE'
          ? 'Itinerário atualizado com sucesso!'
          : 'Itinerário criado com sucesso!'

        this.quasar.notify({
          type: 'positive',
          message: successMessage
        })

        // Redirecionamento
        console.log('Redirecionando após salvamento...')
        this.router.push(`/routes/${savedRoute.id}`)

      } catch (error) {
        console.error('❌ Erro ao salvar rota:', error)
        this.handleSaveError(error)
      } finally {
        this.isSaving = false
      }
    },

    async saveOrCreate() {
      const operation = this.determineOperation()

      console.log(`💾 saveOrCreate - Operação: ${operation}`)

      if (operation === 'CREATE') {
        return await this.forceCreateNewRoute()
      } else {
        // UPDATE
        const routeData = this.prepareRouteDataForAPI()
        return await this.apiSaveRoute(routeData)
      }
    },



    // ===========================================
    // MÉTODOS UTILITÁRIOS
    // ===========================================
    async forceRecalculation() {
      if (this.$refs.mapStep && this.$refs.mapStep.calculateRoute) {
        try {
          await this.$refs.mapStep.calculateRoute()
        } catch (error) {
          console.error('Erro ao forçar recálculo:', error)
        }
      }
    },

    getCurrentState() {
      return {
        step: this.step,
        routeId: this.routeId,
        routeInfo: this.routeInfo,
        routePoints: this.routePoints,
        routeDetails: this.routeDetails,
        routeDraw: this.routeDraw,
        isSaving: this.isSaving,
        isEditing: this.isEditing
      }
    },

    // Adicionar ao RouteCreationPage.vue na seção methods

// ===========================================
// MÉTODOS DE API CENTRALIZADOS
// ===========================================

    async apiLoadRoute(routeId) {
      console.log('API: Carregando rota:', routeId)

      try {
        const response = await routeApiService.getRoute(routeId)
        const routeData = response.data.route

        // Validar dados recebidos
        if (!routeData || !routeData.id) {
          throw new Error('Dados da rota inválidos')
        }

        console.log('API: Rota carregada com sucesso:', routeData.id)

        // ✅ NOVO: Notificar MapStep sobre dados carregados
        this.notifyMapStepRouteLoaded(routeData)

        return routeData

      } catch (error) {
        console.error('API: Erro ao carregar rota:', error)

        this.quasar.notify({
          type: 'negative',
          message: `Erro ao carregar rota: ${error.response?.data?.message || error.message}`
        })

        throw error
      }
    },

    async apiSaveRoute(routeData) {
      console.log('API: Salvando rota:', routeData)

      try {
        // Validar dados antes do envio
        const validation = this.validateRouteDataForAPI(routeData)
        if (!validation.valid) {
          throw new Error(`Validação falhou: ${validation.errors.join(', ')}`)
        }

        const response = await routeApiService.updateRoute(this.routeId, routeData)
        const savedRoute = response.data.route || response.data

        console.log('API: Rota salva com sucesso:', savedRoute.id)

        this.quasar.notify({
          type: 'positive',
          message: 'Rota salva com sucesso'
        })

        return savedRoute

      } catch (error) {
        console.error('API: Erro ao salvar rota:', error)

        this.quasar.notify({
          type: 'negative',
          message: `Erro ao salvar rota: ${error.response?.data?.message || error.message}`
        })

        throw error
      }
    },

    async apiCreateRoute(routeData) {
      console.log('API: Criando nova rota:', routeData)

      try {
        // Validar dados antes do envio
        const validation = this.validateRouteDataForAPI(routeData)
        if (!validation.valid) {
          throw new Error(`Validação falhou: ${validation.errors.join(', ')}`)
        }

        const response = await routeApiService.createRoute(routeData)
        const newRoute = response.data.route || response.data

        console.log('API: Rota criada com sucesso:', newRoute.id)

        // Atualizar routeId local
        this.routeId = newRoute.id

        this.quasar.notify({
          type: 'positive',
          message: `Rota "${newRoute.name}" criada com sucesso`
        })

        return newRoute

      } catch (error) {
        console.error('API: Erro ao criar rota:', error)

        this.quasar.notify({
          type: 'negative',
          message: `Erro ao criar rota: ${error.response?.data?.message || error.message}`
        })

        throw error
      }
    },

    async apiCalculateRoute(routeId, points) {
      console.log('API: Calculando rota:', routeId, 'com', points?.length, 'pontos')

      try {
        // Validar pontos antes do cálculo
        if (!points || points.length < 2) {
          throw new Error('Pelo menos 2 pontos são necessários para calcular a rota')
        }

        // ✅ CORREÇÃO: Verificar se routeId é válido
        let targetRouteId = routeId

        // Se routeId é inválido, criar rota primeiro
        if (!targetRouteId || targetRouteId === 'undefined' || isNaN(targetRouteId)) {
          console.log('RouteId inválido, criando nova rota primeiro...')
          const routeData = this.prepareRouteDataForAPI()
          const newRoute = await this.apiCreateRoute(routeData)
          targetRouteId = newRoute.id

          // Atualizar routeId local
          this.routeId = targetRouteId
        }

        console.log('Usando routeId:', targetRouteId)

        // Iniciar o cálculo
        const response = await routeApiService.calculateRoute(targetRouteId)
        console.log('API: Cálculo iniciado:', response.data)

        // Se o status é 'calculating', iniciar polling
        if (response.data.status === 'calculating') {
          return await this.apiPollCalculationStatus(targetRouteId)
        } else if (response.data.status === 'completed') {
          // Buscar dados completos da rota
          return await this.apiLoadRoute(targetRouteId)
        } else {
          throw new Error(`Status de cálculo inesperado: ${response.data.status}`)
        }

      } catch (error) {
        console.error('API: Erro ao calcular rota:', error)

        this.quasar.notify({
          type: 'negative',
          message: `Erro ao calcular rota: ${error.response?.data?.message || error.message}`
        })

        throw error
      }
    },


    debugCommunication() {
      console.group('🔄 Debug Comunicação Parent-Child')

      console.log('📤 Métodos disponíveis no MapStep:', {
        mapStepRef: !!this.$refs.mapStep,
        hasCalculateRoute: !!(this.$refs.mapStep?.calculateRoute),
        hasSaveRouteData: !!(this.$refs.mapStep?.saveRouteData),
        hasOnRouteLoadedFromPage: !!(this.$refs.mapStep?.onRouteLoadedFromPage),
        hasOnCalculationProgressFromPage: !!(this.$refs.mapStep?.onCalculationProgressFromPage)
      })

      console.log('📊 Estado das requisições:', this.getManagerRequestsStatus())

      console.log('📋 Estado atual:', {
        step: this.step,
        routeId: this.routeId,
        pointsCount: this.routePoints.length,
        hasSegments: this.routeDraw.length > 0
      })

      console.groupEnd()
    },

    async apiPollCalculationStatus(routeId, maxAttempts = 150) {
      console.log('API: Iniciando polling do cálculo:', routeId)

      let attempts = 0
      let consecutiveErrors = 0
      const maxConsecutiveErrors = 3

      while (attempts < maxAttempts) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2s de intervalo

          const response = await routeApiService.getCalculationStatus(routeId)
          const status = response.data.status || response.data

          console.log(`API: Polling ${attempts + 1}/${maxAttempts} - Status:`, status.status)

          // ✅ NOVO: Notificar MapStep sobre progresso
          this.notifyMapStepCalculationProgress(status)

          // Verificar se terminou
          if (status.status === 'completed') {
            console.log('API: Cálculo concluído!')
            return await this.apiLoadRoute(routeId)
          } else if (status.status === 'error' || status.status === 'failed') {
            throw new Error(status.error_message || 'Cálculo falhou')
          }

          consecutiveErrors = 0
          attempts++

        } catch (error) {
          consecutiveErrors++
          console.error(`API: Erro no polling ${attempts + 1}:`, error.message)

          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Muitos erros consecutivos no polling: ${error.message}`)
          }

          attempts++
        }
      }

      throw new Error('Timeout no cálculo da rota')
    },


    async apiDeleteRoute(routeId) {
      console.log('API: Deletando rota:', routeId)

      try {
        await routeApiService.deleteRoute(routeId)

        console.log('API: Rota deletada com sucesso')

        this.quasar.notify({
          type: 'positive',
          message: 'Rota deletada com sucesso'
        })

        return true

      } catch (error) {
        console.error('API: Erro ao deletar rota:', error)

        this.quasar.notify({
          type: 'negative',
          message: `Erro ao deletar rota: ${error.response?.data?.message || error.message}`
        })

        throw error
      }
    },

// ===========================================
// MÉTODOS DE VALIDAÇÃO CENTRALIZADOS
// ===========================================

    validateRouteDataForAPI(routeData) {
      const errors = []

      // Validar campos obrigatórios
      if (!routeData.name?.trim()) {
        errors.push('Nome da rota é obrigatório')
      }

      if (!routeData.institution_id) {
        errors.push('ID da instituição é obrigatório')
      }

      // Validar pontos
      if (!routeData.points || !Array.isArray(routeData.points) || routeData.points.length < 2) {
        errors.push('Pelo menos 2 pontos são obrigatórios')
      }

      // Validar coordenadas dos pontos
      routeData.points?.forEach((point, index) => {
        if (!this.isValidCoordinate(point.latitude, point.longitude)) {
          errors.push(`Ponto ${index + 1} tem coordenadas inválidas`)
        }
      })

      // Validar schedule_data
      if (!routeData.schedule_data || typeof routeData.schedule_data !== 'object') {
        errors.push('Dados de agendamento são obrigatórios')
      }

      return {
        valid: errors.length === 0,
        errors
      }
    },

    isValidCoordinate(lat, lng) {
      return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      )
    },

// ===========================================
// MÉTODOS DE COMUNICAÇÃO COM MANAGERS
// ===========================================

    emitCalculationProgress(status) {
      // Notificar RouteMapStep sobre o progresso
      if (this.$refs.mapStep) {
        this.$refs.mapStep.onCalculationProgressFromPage?.(status)
      }
    },

    async requestDataManagerAction(action, ...args) {
      console.log('Solicitando ação do DataManager:', action, args)

      switch (action) {
        case 'loadRoute':
          const [routeId] = args
          const loadedRoute = await this.apiLoadRoute(routeId)

          // Atualizar estado local
          this.loadRouteForEditing(loadedRoute)

          // Notificar managers
          if (this.$refs.mapStep) {
            this.$refs.mapStep.onRouteLoadedFromPage?.(loadedRoute)
          }

          return loadedRoute

        case 'saveRoute':
          const [routeData] = args
          return await this.apiSaveRoute(routeData)

        case 'createRoute':
          const [newRouteData] = args
          return await this.apiCreateRoute(newRouteData)

        case 'deleteRoute':
          const [deleteRouteId] = args
          return await this.apiDeleteRoute(deleteRouteId)

        default:
          throw new Error(`Ação desconhecida: ${action}`)
      }
    },

    async requestCalculationManagerAction(action, ...args) {
      console.log('Solicitando ação do CalculationManager:', action, args)

      switch (action) {
        case 'calculateRoute':
          const routeData = this.prepareRouteDataForAPI()
          return await this.apiCalculateRoute(this.routeId, routeData.points)

        case 'cancelCalculation':
          // Para cancelamento, não precisamos de API - só parar o polling
          console.log('Cancelando cálculo...')
          this.isCancelling = true
          return true

        default:
          throw new Error(`Ação desconhecida: ${action}`)
      }
    },
    async handleManagerRequest(managerType, action, ...args) {
      const requestId = ++this.requestIdCounter
      console.log(`[${requestId}] Requisição de ${managerType}:`, action, args)

      try {
        // Adicionar à lista de requisições pendentes
        this.pendingRequests.set(requestId, { managerType, action, startTime: Date.now() })

        let result = null

        switch (managerType) {
          case 'data':
            result = await this.handleDataManagerRequest(action, ...args)
            break

          case 'calculation':
            result = await this.handleCalculationManagerRequest(action, ...args)
            break

          case 'points':
            result = await this.handlePointsManagerRequest(action, ...args)
            break

          case 'notification':
            result = await this.handleNotificationManagerRequest(action, ...args)
            break

          default:
            throw new Error(`Manager desconhecido: ${managerType}`)
        }

        console.log(`[${requestId}] Sucesso:`, result)
        return result

      } catch (error) {
        console.error(`[${requestId}] Erro:`, error)
        throw error
      } finally {
        // Remover da lista de pendentes
        this.pendingRequests.delete(requestId)
      }
    },

    async handleDataManagerRequest(action, ...args) {
      console.log('Processando requisição do DataManager:', action, args)

      switch (action) {
        case 'loadRoute':
          const [routeId] = args
          if (!this.validateRouteId(routeId)) {
            throw new Error('ID de rota inválido para carregamento')
          }
          return await this.apiLoadRoute(routeId)

        case 'saveRoute':
          const [routeData] = args

          // ✅ LÓGICA DE PROTEÇÃO
          const operation = this.determineOperation()
          console.log(`💾 Salvamento - Operação: ${operation}`)

          if (operation === 'CREATE') {
            // Criar nova rota
            console.log('🆕 Criando nova rota...')
            const saveData = {
              ...this.prepareRouteDataForAPI(),
              ...routeData
            }
            const newRoute = await this.apiCreateRoute(saveData)

            this.updateRouteId(newRoute.id)
            console.log('✅ Nova rota criada e ID atualizado:', this.routeId)

            return newRoute
          } else {
            // Atualizar rota existente
            console.log('📝 Atualizando rota existente:', this.routeId)
            const saveData = {
              ...this.prepareRouteDataForAPI(),
              ...routeData
            }
            return await this.apiSaveRoute(saveData)
          }

        case 'createRoute':
          // ✅ SEMPRE CRIAR NOVA
          const [newRouteData] = args
          const createData = {
            ...this.prepareRouteDataForAPI(),
            ...newRouteData
          }
          const route = await this.apiCreateRoute(createData)

          this.updateRouteId(route.id)
          return route

        case 'deleteRoute':
          const [deleteRouteId] = args
          if (!this.validateRouteId(deleteRouteId)) {
            throw new Error('ID de rota inválido para exclusão')
          }
          const result = await this.apiDeleteRoute(deleteRouteId)

          // ✅ LIMPAR routeId após deletar
          this.updateRouteId(null)

          return result

        default:
          throw new Error(`Ação do DataManager desconhecida: ${action}`)
      }
    },

    updateRouteId(newId) {
      const oldId = this.routeId

      // Validar novo ID
      if (newId !== null && !this.validateRouteId(newId)) {
        console.warn('⚠️ Tentativa de definir routeId inválido:', newId)
        return false
      }

      // Atualizar ID
      this.routeId = newId ? parseInt(newId) : null

      console.log(`🔄 RouteId atualizado: ${oldId} → ${this.routeId}`)

      // Sincronizar com URL se necessário (sem redirecionar)
      if (this.routeId && this.route.params.id !== this.routeId.toString()) {
        // Atualizar URL sem navegar
        window.history.replaceState(
          {},
          '',
          `/routes/${this.routeId}/edit`
        )
      }

      // Emitir evento para componentes filhos
      this.$emit('route-id-changed', this.routeId)

      return true
    },


    async handleCalculationManagerRequest(action, ...args) {
      console.log('Processando requisição do CalculationManager:', action, args)

      switch (action) {
        case 'calculateRoute':
          // ✅ LÓGICA DE PROTEÇÃO
          const operation = this.determineOperation()
          console.log(`🔄 Operação determinada: ${operation}`)

          if (operation === 'CREATE') {
            // Criar nova rota primeiro
            console.log('🆕 Criando nova rota antes do cálculo...')
            const routeData = this.prepareRouteDataForAPI()
            const newRoute = await this.apiCreateRoute(routeData)

            // ✅ ATUALIZAR routeId e sincronizar estado
            this.updateRouteId(newRoute.id)
            console.log('✅ Nova rota criada com ID:', this.routeId)

            // Agora calcular usando o novo ID
            return await this.apiCalculateRoute(this.routeId, routeData.points)
          } else {
            // UPDATE - atualizar pontos e calcular
            console.log('📝 Atualizando rota existente:', this.routeId)

            // Primeiro salvar mudanças nos pontos
            const routeData = this.prepareRouteDataForAPI()
            await this.apiSaveRoute(routeData)

            // Depois calcular
            return await this.apiCalculateRoute(this.routeId, routeData.points)
          }

        case 'createRoute':
          // ✅ SEMPRE CRIAR NOVA E ATUALIZAR ID
          const [createData] = args
          const newRouteData = {
            ...this.prepareRouteDataForAPI(),
            ...createData
          }
          const createdRoute = await this.apiCreateRoute(newRouteData)

          this.updateRouteId(createdRoute.id)
          return createdRoute

        case 'cancelCalculation':
          console.log('Cancelando cálculo...')
          this.isCancelling = true
          return true

        default:
          throw new Error(`Ação do CalculationManager desconhecida: ${action}`)
      }
    },


    async handlePointsManagerRequest(action, ...args) {
      console.log('Processando requisição do PointsManager:', action, args)

      // PointsManager gerencia apenas estado local, não precisa de API
      switch (action) {
        case 'validatePoints':
          // Validação local dos pontos
          const validation = this.validateRouteDataForAPI({ points: this.routePoints })
          return validation

        default:
          console.log('PointsManager não requer ações de API')
          return true
      }
    },

    async handleNotificationManagerRequest(action, ...args) {
      console.log('Processando requisição do NotificationManager:', action, args)

      // NotificationManager gerencia apenas notificações, não precisa de API
      switch (action) {
        case 'logError':
          const [errorData] = args
          console.error('Erro reportado pelo NotificationManager:', errorData)
          return true

        default:
          console.log('NotificationManager não requer ações de API')
          return true
      }
    },

// 6. MÉTODO PARA CANCELAR REQUISIÇÕES PENDENTES
    cancelPendingRequests() {
      console.log('Cancelando requisições pendentes:', this.pendingRequests.size)

      this.isCancelling = true
      this.pendingRequests.clear()

      // Resetar flag após um tempo
      setTimeout(() => {
        this.isCancelling = false
      }, 1000)
    },

  }
})
</script>

<style scoped>
.route-creation-page {
  max-width: 1600px;
  margin: 0 auto;
  padding-bottom: 50px;
}

/* Estilos para aumentar o espaço horizontal dos steps */
:deep(.q-stepper__header) {
  width: 100%;
  padding: 0 16px;
}

:deep(.q-stepper__tab) {
  flex: 1;
  min-width: 200px;
  padding: 16px 32px;
}

:deep(.q-stepper__step-content) {
  padding: 24px;
}

/* Em telas menores, usamos configurações mais compactas */
@media (max-width: 768px) {
  :deep(.q-stepper__tab) {
    min-width: auto;
    padding: 8px 16px;
  }

  :deep(.q-stepper__step-content) {
    padding: 16px 8px;
  }
}
</style>
