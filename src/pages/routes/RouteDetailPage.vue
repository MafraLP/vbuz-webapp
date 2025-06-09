<template>
  <q-page class="route-detail-page">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-center q-py-xl">
      <div class="text-center">
        <q-spinner size="xl" color="primary" />
        <div class="text-subtitle1 q-mt-md">Carregando itinerário...</div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-center q-py-xl">
      <div class="text-center">
        <q-icon name="error" size="4rem" color="negative" />
        <div class="text-h6 q-mt-md text-negative">Erro ao carregar itinerário</div>
        <div class="text-body2 text-grey-6 q-mt-sm">{{ error }}</div>
        <q-btn
          color="primary"
          label="Tentar Novamente"
          @click="loadRoute"
          class="q-mt-md"
        />
      </div>
    </div>

    <!-- Content - Only show when routeData is fully loaded -->
    <div v-else-if="routeData && !loading" class="route-content">
      <!-- Header -->
      <div class="page-header q-pa-md">
        <div class="row items-center justify-between">
          <div class="col">
            <div class="row items-center q-gutter-md">
              <q-btn
                flat
                round
                icon="arrow_back"
                @click="goBack"
                size="md"
              />
              <div>
                <div class="row items-center q-gutter-sm">
                  <div class="text-h4 text-weight-bold route-title">{{ routeData.name || 'Sem nome' }}</div>
                  <q-chip
                    :color="statusConfig.color"
                    text-color="white"
                    :icon="statusConfig.icon"
                    size="md"
                  >
                    {{ statusConfig.label }}
                  </q-chip>
                </div>
                <div v-if="routeData.description" class="text-subtitle1 route-description q-mt-xs">
                  {{ routeData.description }}
                </div>
              </div>
            </div>
          </div>
          <div class="col-auto">
            <div class="row q-gutter-sm">
              <q-btn
                color="primary"
                icon="edit"
                label="Editar"
                @click="editRoute"
                unelevated
                :disabled="!routeData"
              />
              <q-btn
                flat
                icon="more_vert"
                round
                :disabled="!routeData"
              >
                <q-menu>
                  <q-list style="min-width: 150px">
                    <q-item clickable v-close-popup @click="duplicateRoute">
                      <q-item-section avatar>
                        <q-icon name="content_copy" size="xs" />
                      </q-item-section>
                      <q-item-section>Duplicar</q-item-section>
                    </q-item>

                    <q-item clickable v-close-popup @click="toggleStatus">
                      <q-item-section avatar>
                        <q-icon :name="routeData.is_published ? 'visibility_off' : 'visibility'" size="xs" />
                      </q-item-section>
                      <q-item-section>{{ routeData.is_published ? 'Desativar' : 'Ativar' }}</q-item-section>
                    </q-item>

                    <q-separator />

                    <q-item clickable v-close-popup @click="confirmDelete" class="text-negative">
                      <q-item-section avatar>
                        <q-icon name="delete" size="xs" />
                      </q-item-section>
                      <q-item-section>Excluir</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Content tabs -->
      <q-tabs
        v-model="activeTab"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="overview" icon="dashboard" label="Visão Geral" />
        <q-tab name="map" icon="map" label="Mapa" />
        <q-tab name="schedule" icon="schedule" label="Programação" />
        <q-tab name="analytics" icon="analytics" label="Análises" />
      </q-tabs>

      <q-tab-panels v-model="activeTab" animated class="tab-panels">
        <!-- Overview Tab -->
        <q-tab-panel name="overview" class="q-pa-md">
          <div class="row q-col-gutter-md">
            <!-- Stats Cards -->
            <div class="col-12">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-3">
                  <q-card flat bordered class="stats-card">
                    <q-card-section class="text-center">
                      <q-icon name="place" color="primary" size="xl" />
                      <div class="text-h4 text-weight-bold stats-value q-mt-md">{{ pointsCount }}</div>
                      <div class="text-subtitle2 stats-label">Pontos de Parada</div>
                    </q-card-section>
                  </q-card>
                </div>

                <div class="col-12 col-md-3">
                  <q-card flat bordered class="stats-card">
                    <q-card-section class="text-center">
                      <q-icon name="straighten" color="positive" size="xl" />
                      <div class="text-h4 text-weight-bold stats-value q-mt-md">{{ formattedDistance }}</div>
                      <div class="text-subtitle2 stats-label">Distância Total</div>
                    </q-card-section>
                  </q-card>
                </div>

                <div class="col-12 col-md-3">
                  <q-card flat bordered class="stats-card">
                    <q-card-section class="text-center">
                      <q-icon name="schedule" color="warning" size="xl" />
                      <div class="text-h4 text-weight-bold stats-value q-mt-md">{{ formattedDuration }}</div>
                      <div class="text-subtitle2 stats-label">Tempo Estimado</div>
                    </q-card-section>
                  </q-card>
                </div>

                <div class="col-12 col-md-3">
                  <q-card flat bordered class="stats-card">
                    <q-card-section class="text-center">
                      <q-icon name="timeline" color="info" size="xl" />
                      <div class="text-h4 text-weight-bold stats-value q-mt-md">{{ segmentsCount }}</div>
                      <div class="text-subtitle2 stats-label">Segmentos</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </div>

            <!-- Route Points -->
            <div class="col-12 col-lg-6">
              <q-card flat bordered class="content-card">
                <q-card-section>
                  <div class="text-h6 section-title q-mb-md">
                    <q-icon name="place" class="q-mr-sm section-icon" />
                    Pontos de Parada
                  </div>

                  <q-list separator v-if="hasRoutePoints" class="points-list">
                    <q-item
                      v-for="(point, index) in safeRoutePoints"
                      :key="point.id || index"
                      dense
                      class="point-item"
                    >
                      <q-item-section avatar>
                        <q-avatar
                          :color="getPointColor(index)"
                          text-color="white"
                          size="sm"
                        >
                          {{ index + 1 }}
                        </q-avatar>
                      </q-item-section>

                      <q-item-section>
                        <q-item-label class="point-name">{{ point.name || `Ponto ${index + 1}` }}</q-item-label>
                        <q-item-label caption class="point-coords">
                          {{ formatCoordinates(point.latitude, point.longitude) }}
                        </q-item-label>
                      </q-item-section>

                      <q-item-section side>
                        <q-chip
                          :label="getPointTypeLabel(index)"
                          size="sm"
                          :color="getPointTypeColor(index)"
                          text-color="white"
                        />
                      </q-item-section>
                    </q-item>
                  </q-list>

                  <div v-else class="text-center empty-state q-py-md">
                    <q-icon name="place_off" size="3rem" class="empty-icon" />
                    <div class="empty-text q-mt-sm">Nenhum ponto definido</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Route Info -->
            <div class="col-12 col-lg-6">
              <q-card flat bordered class="content-card">
                <q-card-section>
                  <div class="text-h6 section-title q-mb-md">
                    <q-icon name="info" class="q-mr-sm section-icon" />
                    Informações da Rota
                  </div>

                  <q-list class="info-list">
                    <q-item class="info-item">
                      <q-item-section avatar>
                        <q-icon name="business" class="info-icon" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="info-label">Instituição</q-item-label>
                        <q-item-label caption class="info-value">{{ getInstitutionName() }}</q-item-label>
                      </q-item-section>
                    </q-item>

                    <q-item class="info-item">
                      <q-item-section avatar>
                        <q-icon name="calendar_today" class="info-icon" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="info-label">Criado em</q-item-label>
                        <q-item-label caption class="info-value">{{ formatDate(routeData.created_at) }}</q-item-label>
                      </q-item-section>
                    </q-item>

                    <q-item v-if="hasUpdatedDate" class="info-item">
                      <q-item-section avatar>
                        <q-icon name="update" class="info-icon" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="info-label">Última atualização</q-item-label>
                        <q-item-label caption class="info-value">{{ formatDate(routeData.updated_at) }}</q-item-label>
                      </q-item-section>
                    </q-item>

                    <q-item v-if="routeData.calculation_completed_at" class="info-item">
                      <q-item-section avatar>
                        <q-icon name="calculate" class="info-icon" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="info-label">Última calculação</q-item-label>
                        <q-item-label caption class="info-value">{{ formatDate(routeData.calculation_completed_at) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- Map Tab -->
        <q-tab-panel name="map" class="q-pa-md">
          <q-card flat bordered class="content-card">
            <q-card-section>
              <div class="text-h6 section-title q-mb-md">
                <q-icon name="map" class="q-mr-sm section-icon" />
                Visualização da Rota
              </div>

              <!-- Map Content -->
              <div class="map-container">
                <MapView
                  v-if="hasMapData"
                  :route-points="safeRoutePoints"
                  :route-segments="safeRouteSegments"
                  :route-data="routeData"
                  :readonly="true"
                  :auto-fit="true"
                  :center-on-load="true"
                  :show-user-location="false"
                />
                <div v-else class="map-empty-state">
                  <div class="text-center q-py-xl">
                    <q-icon name="map_off" size="4rem" class="empty-icon" />
                    <div class="text-h6 q-mt-md">Sem dados do mapa</div>
                    <div class="text-body2 text-grey-6">Adicione pontos à rota para visualizar o mapa</div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-tab-panel>

        <!-- Schedule Tab -->
        <q-tab-panel name="schedule" class="q-pa-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-card flat bordered class="content-card">
                <q-card-section>
                  <div class="text-h6 section-title q-mb-md">
                    <q-icon name="schedule" class="q-mr-sm section-icon" />
                    Horários de Operação
                  </div>

                  <div class="schedule-info">
                    <div class="schedule-item">
                      <q-icon name="access_time" class="q-mr-sm schedule-icon" />
                      <span class="schedule-text">{{ formattedSchedule }}</span>
                    </div>
                    <div class="schedule-item q-mt-sm">
                      <q-icon name="calendar_today" class="q-mr-sm schedule-icon" />
                      <span class="schedule-text">{{ formattedDays }}</span>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered class="content-card">
                <q-card-section>
                  <div class="text-h6 section-title q-mb-md">
                    <q-icon name="badge" class="q-mr-sm section-icon" />
                    Controle de Acesso
                  </div>

                  <div v-if="hasAccessTypes">
                    <div class="access-chips">
                      <q-chip
                        v-for="access in accessTypes"
                        :key="access.value || access.label"
                        :color="access.color"
                        text-color="white"
                        :icon="access.icon"
                        size="md"
                      >
                        {{ access.label }}
                      </q-chip>
                    </div>
                  </div>
                  <div v-else class="access-free">
                    <q-icon name="public" class="q-mr-xs access-free-icon" />
                    <span class="access-free-text">Acesso livre (todos os tipos)</span>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- Analytics Tab -->
        <q-tab-panel name="analytics" class="q-pa-md">
          <q-card flat bordered class="content-card">
            <q-card-section>
              <div class="text-h6 section-title q-mb-md">
                <q-icon name="analytics" class="q-mr-sm section-icon" />
                Análises da Rota
              </div>

              <div class="text-center analytics-placeholder q-py-xl">
                <q-icon name="construction" size="4rem" class="placeholder-icon" />
                <div class="text-h6 placeholder-title q-mt-md">Em desenvolvimento</div>
                <div class="text-body2 placeholder-subtitle">Análises e estatísticas estarão disponíveis em breve</div>
              </div>
            </q-card-section>
          </q-card>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Delete confirmation dialog -->
    <q-dialog v-model="deleteDialog" persistent class="delete-dialog">
      <q-card style="min-width: 350px" class="delete-card">
        <q-card-section class="row items-center delete-header">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6 delete-title">Confirmar Exclusão</span>
        </q-card-section>

        <q-card-section class="delete-content">
          <div class="text-body1 delete-message">
            Tem certeza que deseja excluir o itinerário
            <strong class="delete-route-name">"{{ routeData?.name || 'Sem nome' }}"</strong>?
          </div>
          <div class="text-body2 delete-warning q-mt-sm">
            <q-icon name="warning" class="q-mr-xs delete-warning-icon" />
            <span class="delete-warning-text">Esta ação não pode ser desfeita.</span>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="delete-actions">
          <q-btn flat label="Cancelar" class="cancel-btn" v-close-popup />
          <q-btn
            unelevated
            label="Excluir"
            class="delete-btn"
            @click="deleteRoute"
            :loading="deleting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import MapView from 'components/maps/MapView.vue'
import { routeApiService } from 'src/services/api/route/RouteApiService.ts'

export default defineComponent({
  name: 'RouteDetailPage',

  components: {
    MapView
  },

  setup() {
    const quasar = useQuasar()
    const currentRoute = useRoute()
    const router = useRouter()

    return {
      quasar,
      currentRoute,
      router
    }
  },

  data() {
    return {
      // Estado da página
      loading: false,
      loadingMap: false,
      error: null,
      route: null,
      deleting: false,

      // UI state
      activeTab: 'overview',
      deleteDialog: false,

      // Access types mapping
      accessTypeMap: {
        student: { label: 'Estudante', icon: 'school', color: 'blue' },
        employee: { label: 'Funcionário', icon: 'work', color: 'green' },
        regular: { label: 'Comum', icon: 'person', color: 'grey' },
        work: { label: 'Vale Transporte', icon: 'commute', color: 'orange' },
        senior: { label: 'Idoso', icon: 'elderly', color: 'purple' },
        disability: { label: 'PCD', icon: 'accessibility', color: 'teal' }
      }
    }
  },

  computed: {
    routeId() {
      return parseInt(this.currentRoute.params.id)
    },

    statusConfig() {
      if (!this.routeData) {
        return { label: 'Carregando...', icon: 'hourglass_empty', color: 'grey' }
      }

      const status = this.getRouteStatus()

      const configs = {
        active: { label: 'Ativo', icon: 'check_circle', color: 'positive' },
        inactive: { label: 'Inativo', icon: 'cancel', color: 'negative' },
        draft: { label: 'Rascunho', icon: 'edit', color: 'grey' },
        calculating: { label: 'Calculando', icon: 'hourglass_empty', color: 'warning' },
        error: { label: 'Erro', icon: 'error', color: 'negative' }
      }

      return configs[status] || configs.draft
    },

    // Safe computed properties that handle null/undefined routeData
    safeRoutePoints() {
      return this.routeData?.points || []
    },

    safeRouteSegments() {
      return this.routeData?.segments || []
    },

    hasRoutePoints() {
      return this.safeRoutePoints.length > 0
    },

    hasMapData() {
      return this.hasRoutePoints || this.safeRouteSegments.length > 0
    },

    pointsCount() {
      return this.safeRoutePoints.length
    },

    segmentsCount() {
      return this.safeRouteSegments.length
    },

    formattedDistance() {
      const distance = this.routeData?.total_distance || 0

      if (distance === 0) {
        return 'N/A'
      }

      const km = distance / 1000

      if (km < 1) {
        return `${Math.round(distance)} m`
      }
      return `${km.toFixed(1)} km`
    },

    formattedDuration() {
      const duration = this.routeData?.total_duration || 0

      if (duration === 0) {
        return 'N/A'
      }

      const minutes = duration / 60

      if (minutes < 60) {
        return `${Math.round(minutes)} min`
      }

      const hours = Math.floor(minutes / 60)
      const remainingMinutes = Math.round(minutes % 60)

      if (remainingMinutes === 0) {
        return `${hours}h`
      }

      return `${hours}h ${remainingMinutes}min`
    },

    formattedSchedule() {
      const schedule = this.routeData?.schedule_data
      if (!schedule?.start_time || !schedule?.end_time) {
        return 'Horário não definido'
      }
      return `${schedule.start_time} - ${schedule.end_time}`
    },

    formattedDays() {
      const schedule = this.routeData?.schedule_data
      if (!schedule?.days || !Array.isArray(schedule.days) || schedule.days.length === 0) {
        return 'Dias não definidos'
      }

      const dayNames = {
        1: 'Segunda', 2: 'Terça', 3: 'Quarta',
        4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 7: 'Domingo'
      }

      const days = schedule.days
        .map(day => dayNames[day])
        .filter(Boolean)

      if (days.length === 0) {
        return 'Dias não definidos'
      }

      // Verificar se são dias úteis
      const weekdays = [1, 2, 3, 4, 5]
      const isWeekdays = weekdays.every(day => schedule.days.includes(day)) &&
        !schedule.days.includes(6) && !schedule.days.includes(7)

      if (isWeekdays) {
        return 'Segunda a Sexta'
      }

      if (days.length === 7) {
        return 'Todos os dias'
      }

      return days.join(', ')
    },

    accessTypes() {
      const permissions = this.routeData?.permissions || []
      return permissions
        .map(permission => {
          const type = typeof permission === 'string' ? permission : permission.type || permission.value
          return this.accessTypeMap[type] || {
            label: type,
            icon: 'card_membership',
            color: 'grey',
            value: type
          }
        })
        .filter(access => access.label) // Remove invalid entries
    },

    hasAccessTypes() {
      return this.accessTypes.length > 0
    },

    hasUpdatedDate() {
      return this.routeData?.updated_at &&
        this.routeData.updated_at !== this.routeData.created_at
    }
  },

  watch: {
    // No need to watch activeTab for map loading anymore
  },

  async mounted() {
    await this.loadRoute()
  },

  methods: {
    async loadRoute() {
      this.loading = true
      this.error = null
      this.routeData = null // Reset route data

      try {
        const response = await routeApiService.getRoute(this.routeId)

        // Ensure we have a valid response
        if (!response?.data?.route) {
          throw new Error('Dados da rota inválidos')
        }

        this.routeData = response.data.route

        console.log('Rota carregada:', this.routeData)
      } catch (error) {
        console.error('Erro ao carregar rota:', error)

        this.routeData = null // Ensure routeData is null on error

        if (error.response?.status === 404) {
          this.error = 'Itinerário não encontrado'
        } else if (error.response?.status === 403) {
          this.error = 'Você não tem permissão para visualizar este itinerário'
        } else {
          this.error = 'Erro ao carregar o itinerário'
        }
      } finally {
        this.loading = false
      }
    },

    goBack() {
      this.router.push('/routes')
    },

    editRoute() {
      if (!this.routeData?.id) return
      this.router.push(`/routes/${this.routeData.id}/edit`)
    },

    async duplicateRoute() {
      if (!this.routeData) return

      try {
        const duplicatedData = {
          name: `${this.routeData.name || 'Rota'} (Cópia)`,
          description: this.routeData.description || '',
          institution_id: this.routeData.institution_id,
          points: this.safeRoutePoints.map(point => ({
            name: point.name || '',
            latitude: point.latitude,
            longitude: point.longitude,
            sequence: point.sequence
          }))
        }

        const response = await routeApiService.createRoute(duplicatedData)

        this.quasar.notify({
          type: 'positive',
          message: `Itinerário "${duplicatedData.name}" duplicado com sucesso`
        })

        // Navegar para edição da nova rota
        if (response?.data?.route?.id) {
          this.router.push(`/routes/${response.data.route.id}/edit`)
        }

      } catch (error) {
        console.error('Erro ao duplicar rota:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao duplicar itinerário'
        })
      }
    },

    async toggleStatus() {
      if (!this.routeData) return

      try {
        const newStatus = !this.routeData.is_published

        await routeApiService.updateRoute(this.routeData.id, {
          is_published: newStatus
        })

        this.routeData.is_published = newStatus

        this.quasar.notify({
          type: 'positive',
          message: `Itinerário ${newStatus ? 'ativado' : 'desativado'} com sucesso`
        })

      } catch (error) {
        console.error('Erro ao alterar status:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao alterar status do itinerário'
        })
      }
    },

    confirmDelete() {
      this.deleteDialog = true
    },

    async deleteRoute() {
      if (!this.routeData?.id) return

      this.deleting = true

      try {
        await routeApiService.deleteRoute(this.routeData.id)

        this.quasar.notify({
          type: 'positive',
          message: `Itinerário "${this.routeData.name || 'Sem nome'}" excluído com sucesso`
        })

        this.router.push('/routes')

      } catch (error) {
        console.error('Erro ao excluir rota:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao excluir itinerário'
        })
      } finally {
        this.deleting = false
        this.deleteDialog = false
      }
    },

    // Utility methods with null safety
    getRouteStatus() {
      if (!this.routeData) return 'draft'

      if (this.routeData.calculation_status === 'calculating') return 'calculating'
      if (this.routeData.calculation_status === 'error' || this.routeData.calculation_status === 'failed') return 'error'
      if (!this.routeData.is_published) return 'draft'
      return this.routeData.is_published ? 'active' : 'inactive'
    },

    getInstitutionName() {
      return this.routeData?.institution?.name || 'Não informado'
    },

    formatDate(dateString) {
      if (!dateString) return 'Não informado'

      try {
        const date = new Date(dateString)

        // Check if date is valid
        if (isNaN(date.getTime())) {
          return 'Data inválida'
        }

        return date.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (error) {
        console.error('Erro ao formatar data:', error)
        return 'Data inválida'
      }
    },

    formatCoordinates(lat, lng) {
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return 'Coordenadas não definidas'
      }

      try {
        return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
      } catch (error) {
        return 'Coordenadas inválidas'
      }
    },

    getPointColor(index) {
      if (!this.hasRoutePoints) return 'grey'

      if (index === 0) return 'green' // Origem
      if (index === this.safeRoutePoints.length - 1) return 'red' // Destino
      return 'blue' // Pontos intermediários
    },

    getPointTypeLabel(index) {
      if (!this.hasRoutePoints) return 'Ponto'

      if (index === 0) return 'Origem'
      if (index === this.safeRoutePoints.length - 1) return 'Destino'
      return 'Parada'
    },

    getPointTypeColor(index) {
      if (!this.hasRoutePoints) return 'grey'

      if (index === 0) return 'positive'
      if (index === this.safeRoutePoints.length - 1) return 'negative'
      return 'primary'
    }
  }
})
</script>

<style lang="scss" scoped>
.route-detail-page {
  background: var(--q-primary-background);
  min-height: 100vh;

  .body--dark & {
    background: var(--q-primary-background);
  }
}

.page-header {
  background: var(--q-secondary-background);
  border-bottom: 1px solid rgba(255, 99, 0, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .body--dark & {
    background: var(--q-secondary-background);
    border-bottom-color: rgba(255, 161, 0, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

.route-content {
  max-width: 1400px;
  margin: 0 auto;
}

.route-title {
  color: var(--q-primary-text);

  .body--dark & {
    color: var(--q-primary-text);
  }
}

.route-description {
  color: var(--q-secondary-text);
}

.tab-panels {
  background: var(--q-primary-background);

  .body--dark & {
    background: var(--q-primary-background);
  }
}

.stats-card,
.content-card {
  background: var(--q-secondary-background);
  border: 1px solid rgba(255, 99, 0, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 99, 0, 0.1);
    border-color: var(--q-primary);
  }

  .body--dark & {
    background: var(--q-secondary-background);
    border-color: rgba(255, 161, 0, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

    &:hover {
      box-shadow: 0 4px 12px rgba(255, 161, 0, 0.15);
      border-color: var(--q-secondary);
    }
  }
}

.stats-value {
  color: var(--q-primary-text);

  .body--dark & {
    color: var(--q-primary-text);
  }
}

.stats-label {
  color: var(--q-secondary-text);
}

.section-title {
  color: var(--q-primary-text);
  display: flex;
  align-items: center;

  .body--dark & {
    color: var(--q-primary-text);
  }
}

.section-icon {
  color: var(--q-accent-1);

  .body--dark & {
    color: var(--q-accent-3);
  }
}

.points-list {
  .point-item {
    border-radius: 8px;
    margin: 0.25rem 0;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(255, 99, 0, 0.05);
    }

    .body--dark & {
      &:hover {
        background: rgba(255, 161, 0, 0.1);
      }
    }
  }
}

.point-name {
  color: var(--q-primary-text);
  font-weight: 600;
}

.point-coords {
  color: var(--q-secondary-text);
}

.info-list {
  .info-item {
    border-radius: 8px;
    margin: 0.25rem 0;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(255, 99, 0, 0.05);
    }

    .body--dark & {
      &:hover {
        background: rgba(255, 161, 0, 0.1);
      }
    }
  }
}

.info-icon {
  color: var(--q-accent-1);

  .body--dark & {
    color: var(--q-accent-3);
  }
}

.info-label {
  color: var(--q-primary-text);
  font-weight: 500;
}

.info-value {
  color: var(--q-secondary-text);
}

.map-container {
  width: 100%;
  height: 500px;
  border: 1px solid rgba(255, 99, 0, 0.2);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .body--dark & {
    border-color: rgba(255, 161, 0, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

.map-empty-state {
  width: 100%;
  height: 400px;
  border: 1px solid rgba(255, 99, 0, 0.2);
  border-radius: 8px;
  background: var(--q-primary-background);
  display: flex;
  align-items: center;
  justify-content: center;

  .body--dark & {
    border-color: rgba(255, 161, 0, 0.3);
    background: var(--q-primary-background);
  }
}

.schedule-info {
  .schedule-item {
    display: flex;
    align-items: center;
    font-size: 1.1rem;
    margin: 8px 0;
    color: var(--q-primary-text);

    .body--dark & {
      color: var(--q-primary-text);
    }
  }
}

.schedule-icon {
  color: var(--q-accent-1);

  .body--dark & {
    color: var(--q-accent-3);
  }
}

.schedule-text {
  color: var(--q-primary-text);
}

.access-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.access-free {
  color: var(--q-secondary-text);
  display: flex;
  align-items: center;

  .access-free-icon {
    color: var(--q-positive);
  }

  .access-free-text {
    color: var(--q-secondary-text);
  }
}

.analytics-placeholder {
  text-align: center;
  padding: 4rem 2rem;

  .placeholder-icon {
    color: var(--q-accent-3);
    opacity: 0.6;
  }

  .placeholder-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--q-primary-text);
    margin-top: 1rem;
  }

  .placeholder-subtitle {
    color: var(--q-secondary-text);
    margin-top: 0.5rem;
  }
}

.empty-state {
  .empty-icon {
    color: var(--q-accent-3);
    opacity: 0.6;
  }

  .empty-text {
    color: var(--q-secondary-text);
    margin-top: 1rem;
  }
}

.delete-dialog {
  .delete-card {
    background: var(--q-secondary-background);
    border: 1px solid rgba(211, 47, 47, 0.2);

    .body--dark & {
      background: var(--q-secondary-background);
      border-color: rgba(213, 53, 0, 0.3);
    }
  }

  .delete-header {
    background: rgba(211, 47, 47, 0.05);

    .body--dark & {
      background: rgba(213, 53, 0, 0.1);
    }
  }

  .delete-title {
    color: var(--q-primary-text);
  }

  .delete-content {
    .delete-message {
      color: var(--q-primary-text);

      .delete-route-name {
        color: var(--q-primary);
      }
    }

    .delete-warning {
      display: flex;
      align-items: center;

      .delete-warning-icon,
      .delete-warning-text {
        color: var(--q-negative);
      }
    }
  }

  .delete-actions {
    .cancel-btn {
      color: var(--q-secondary-text);

      &:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .body--dark & {
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }

    .delete-btn {
      background: var(--q-negative);
      color: white;

      &:hover {
        background: #c62828;
      }
    }
  }
}

// Responsividade
@media (max-width: 768px) {
  .page-header {
    .row {
      flex-direction: column;
      gap: 16px;

      .col-auto {
        width: 100%;

        .row {
          justify-content: center;
        }
      }
    }
  }

  .map-container,
  .map-empty-state {
    height: 350px;
  }
}

@media (max-width: 480px) {
  .map-container,
  .map-empty-state {
    height: 300px;
  }

  .access-chips {
    gap: 6px;
  }

  .analytics-placeholder {
    padding: 2rem 1rem;
  }
}

// Animações
@keyframes pageLoad {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.route-detail-page {
  animation: pageLoad 0.6s ease-out;
}

.stats-card {
  animation: pageLoad 0.6s ease-out;

  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.3s; }
  &:nth-child(4) { animation-delay: 0.4s; }
}

// Loading states
.q-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Skeleton loading for future improvements
.skeleton {
  background: linear-gradient(90deg,
    var(--q-accent-3) 25%,
    transparent 37%,
    var(--q-accent-3) 63%);
  background-size: 400% 100%;
  animation: skeleton 1.4s ease-in-out infinite;
}

@keyframes skeleton {
  0% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
