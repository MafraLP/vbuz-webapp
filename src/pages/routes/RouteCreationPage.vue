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

  data() {
    return {
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
        allowedCards: []
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
        allowedCards: this.parseCardsFromBackend(routeData.permissions || [])
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
        allowedCards: Array.isArray(routeInfo.allowedCards) ? routeInfo.allowedCards : []
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
        // NÃO FAZER: this.router.replace(`/routes/create/${routeData.id}`)
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
        allowedCards: this.parseCardsFromBackend(routeData.permissions || [])
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

    parseCardsFromBackend(permissions) {
      if (!Array.isArray(permissions)) return []

      const cardMap = {
        'student': { label: 'Estudante', value: 'student' },
        'employee': { label: 'Funcionário', value: 'employee' },
        'regular': { label: 'Comum', value: 'regular' },
        'work': { label: 'Vale Transporte', value: 'work' },
        'senior': { label: 'Idoso', value: 'senior' },
        'disability': { label: 'PCD', value: 'disability' }
      }

      return permissions
        .map(p => {
          const permission = typeof p === 'string' ? p : p.value || p.type
          return cardMap[permission] || { label: permission, value: permission }
        })
        .filter(Boolean)
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
// ==========================================
// MÉTODO finalSaveRoute() CORRIGIDO
// Resolve duplicação baseando-se na existência de routeId
// ==========================================

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
      return {
        name: this.sanitizeString(this.routeInfo.name),
        description: this.sanitizeString(this.routeInfo.description),
        institution_id: this.institutionId,
        schedule_type: 'daily',
        schedule_data: {
          start_time: this.routeInfo.startTime,
          end_time: this.routeInfo.endTime,
          days: this.getDaysArray(this.routeInfo.days)
        },
        permissions: (this.routeInfo.allowedCards || []).map(card =>
          typeof card === 'string' ? card : card.value
        ),
        is_public: true,
        points: this.routePoints.map((p, index) => ({
          // 🔥 Para pontos existentes, preservar ID se válido
          id: this.isValidPointId(p.id) ? p.id : undefined,
          name: this.sanitizeString(p.name),
          latitude: Number(p.lat || p.latitude),
          longitude: Number(p.lng || p.longitude),
          sequence: Number(p.sequence !== undefined ? p.sequence : index)
        })),
        segments: this.routeDraw.filter(Boolean)
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

// Método para garantir consistência antes do salvamento
    validateBeforeSave() {
      const errors = []

      // Verificar dados básicos
      if (!this.routeInfo.name?.trim()) {
        errors.push('Nome da rota é obrigatório')
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

      return {
        valid: errors.length === 0,
        errors
      }
    },

// Método para sincronizar estado antes de salvar
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

    // ===========================================
    // MÉTODOS UTILITÁRIOS
    // ===========================================

    // Método para forçar recálculo se necessário
    async forceRecalculation() {
      if (this.$refs.mapStep && this.$refs.mapStep.calculateRoute) {
        try {
          await this.$refs.mapStep.calculateRoute()
        } catch (error) {
          console.error('Erro ao forçar recálculo:', error)
        }
      }
    },

    // Método para obter estado atual completo
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
