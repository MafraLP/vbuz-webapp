<template>
  <q-page class="route-detail-page">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-hourglass size="50px" color="primary" />
      <div class="q-ml-md text-h6">Carregando itinerário...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-center q-pa-xl">
      <q-card flat bordered class="error-card q-pa-lg text-center">
        <q-icon name="error_outline" size="4rem" color="negative" />
        <div class="text-h6 q-mt-md">{{ error }}</div>
        <q-btn
          color="primary"
          label="Tentar Novamente"
          @click="loadRoute"
          class="q-mt-md"
          outline
        />
        <q-btn
          flat
          label="Voltar"
          @click="goBack"
          class="q-mt-md q-ml-sm"
        />
      </q-card>
    </div>

    <!-- Content -->
    <div v-else-if="routeData" class="route-content">
      <!-- Header -->
      <div class="page-header q-pa-md">
        <div class="row items-center justify-between">
          <div class="col-auto">
            <div class="row items-center q-gutter-md">
              <q-btn
                round
                flat
                icon="arrow_back"
                @click="goBack"
                size="md"
              />
              <div>
                <div class="text-h4 route-title">{{ routeData.name || 'Sem nome' }}</div>
                <div class="text-body1 route-description">{{ routeData.description || 'Sem descrição' }}</div>
              </div>
            </div>
          </div>

          <div class="col-auto">
            <div class="row q-gutter-sm">
              <q-btn
                :color="statusConfig.color"
                :icon="statusConfig.icon"
                :label="statusConfig.label"
                :disable="loading"
                @click="toggleStatus"
                unelevated
              />
              <q-btn
                color="primary"
                icon="edit"
                label="Editar"
                @click="editRoute"
                unelevated
              />
              <q-btn-dropdown color="grey-7" icon="more_vert" dense>
                <q-list>
                  <q-item clickable v-close-popup @click="duplicateRoute">
                    <q-item-section avatar>
                      <q-icon name="content_copy" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Duplicar</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable v-close-popup @click="confirmDelete">
                    <q-item-section avatar>
                      <q-icon name="delete" color="negative" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-negative">Excluir</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="q-pa-md">
        <div class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="stats-card text-center q-pa-md">
              <div class="text-h4 stats-value">{{ pointsCount }}</div>
              <div class="text-body2 stats-label">Pontos</div>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="stats-card text-center q-pa-md">
              <div class="text-h4 stats-value">{{ formattedDistance }}</div>
              <div class="text-body2 stats-label">Distância</div>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="stats-card text-center q-pa-md">
              <div class="text-h4 stats-value">{{ formattedDuration }}</div>
              <div class="text-body2 stats-label">Duração</div>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="stats-card text-center q-pa-md">
              <div class="text-h4 stats-value">{{ permissionsCount }}</div>
              <div class="text-body2 stats-label">Carteirinhas</div>
            </q-card>
          </div>
        </div>

        <!-- Tabs Structure -->
        <q-tabs
          v-model="activeTab"
          align="left"
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
        >
          <q-tab name="overview" icon="info" label="Visão Geral" />
          <q-tab name="points" icon="place" label="Pontos" />
          <q-tab name="map" icon="map" label="Mapa" />
          <q-tab name="permissions" icon="badge" label="Carteirinhas" />
          <q-tab name="analytics" icon="analytics" label="Análises" />
        </q-tabs>

        <q-separator />

        <!-- Tab Panels Container -->
        <q-tab-panels v-model="activeTab" animated class="tab-panels">
          <!-- Overview Tab -->
          <q-tab-panel name="overview" class="q-pa-md">
            <div class="row q-col-gutter-md">
              <!-- Informações Gerais -->
              <div class="col-12 col-md-6">
                <q-card flat bordered class="content-card">
                  <q-card-section>
                    <div class="text-h6 section-title q-mb-md">
                      <q-icon name="info" class="q-mr-sm section-icon" />
                      Informações Gerais
                    </div>

                    <q-list separator class="info-list">
                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="business" class="info-icon" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="info-label">Instituição</q-item-label>
                          <q-item-label caption class="info-value">{{ getInstitutionName() }}</q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="schedule" class="info-icon" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="info-label">Tipo de Agendamento</q-item-label>
                          <q-item-label caption class="info-value">{{ routeData.schedule_type || 'Não definido' }}</q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="visibility" class="info-icon" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="info-label">Visibilidade</q-item-label>
                          <q-item-label caption class="info-value">
                            {{ routeData.is_public ? 'Pública' : 'Privada' }}
                          </q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="event" class="info-icon" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="info-label">Data de Criação</q-item-label>
                          <q-item-label caption class="info-value">{{ formatDate(routeData.created_at) }}</q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item v-if="hasUpdatedDate">
                        <q-item-section avatar>
                          <q-icon name="update" class="info-icon" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="info-label">Última Atualização</q-item-label>
                          <q-item-label caption class="info-value">{{ formatDate(routeData.updated_at) }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card-section>
                </q-card>
              </div>

              <!-- Horários -->
              <div class="col-12 col-md-6">
                <q-card flat bordered class="content-card">
                  <q-card-section>
                    <div class="text-h6 section-title q-mb-md">
                      <q-icon name="access_time" class="q-mr-sm section-icon" />
                      Horários de Funcionamento
                    </div>

                    <div class="schedule-info">
                      <div class="schedule-item">
                        <q-icon name="schedule" class="q-mr-sm schedule-icon" />
                        <span class="schedule-text">{{ formattedSchedule }}</span>
                      </div>
                      <div class="schedule-item">
                        <q-icon name="calendar_today" class="q-mr-sm schedule-icon" />
                        <span class="schedule-text">{{ formattedDays }}</span>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <!-- Controle de Acesso -->
              <div class="col-12 col-md-6">
                <q-card flat bordered class="content-card">
                  <q-card-section>
                    <div class="text-h6 section-title q-mb-md">
                      <q-icon name="badge" class="q-mr-sm section-icon" />
                      Controle de Acesso
                    </div>

                    <div v-if="hasAccessPermissions">
                      <div class="access-chips">
                        <q-chip
                          v-for="permission in routePermissions"
                          :key="permission.id"
                          :color="permission.color || 'primary'"
                          text-color="white"
                          :icon="permission.icon || 'card_membership'"
                          size="md"
                        >
                          {{ permission.name }}
                        </q-chip>
                      </div>
                      <div class="text-caption text-grey-6 q-mt-sm">
                        {{ routePermissions.length }} carteirinha(s) necessária(s) para acesso
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

          <!-- Points Tab -->
          <q-tab-panel name="points" class="q-pa-md">
            <q-card flat bordered class="content-card">
              <q-card-section>
                <div class="text-h6 section-title q-mb-md">
                  <q-icon name="place" class="q-mr-sm section-icon" />
                  Pontos da Rota ({{ pointsCount }})
                </div>

                <div v-if="hasRoutePoints">
                  <q-list separator class="points-list">
                    <q-item
                      v-for="(point, index) in safeRoutePoints"
                      :key="point.id || index"
                      class="point-item"
                    >
                      <q-item-section avatar>
                        <q-avatar
                          :color="getPointColor(index)"
                          text-color="white"
                          size="md"
                        >
                          {{ index + 1 }}
                        </q-avatar>
                      </q-item-section>

                      <q-item-section>
                        <q-item-label class="point-name">{{ point.name || 'Sem nome' }}</q-item-label>
                        <q-item-label caption class="point-coords">
                          {{ formatCoordinates(point.latitude, point.longitude) }}
                        </q-item-label>
                      </q-item-section>

                      <q-item-section side>
                        <q-chip
                          :color="getPointTypeColor(index)"
                          text-color="white"
                          size="sm"
                        >
                          {{ getPointTypeLabel(index) }}
                        </q-chip>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>

                <div v-else class="text-center q-py-xl empty-state">
                  <q-icon name="place_disabled" size="4rem" class="empty-icon" />
                  <div class="text-h6 q-mt-md">Nenhum ponto definido</div>
                  <div class="text-body2 empty-text">Esta rota ainda não possui pontos configurados</div>
                </div>
              </q-card-section>
            </q-card>
          </q-tab-panel>

          <!-- Map Tab -->
          <q-tab-panel name="map" class="q-pa-md">
            <q-card flat bordered class="content-card">
              <q-card-section>
                <div class="text-h6 section-title q-mb-md">
                  <q-icon name="map" class="q-mr-sm section-icon" />
                  Visualização no Mapa
                </div>

                <div v-if="hasMapData" class="map-container">
                  <MapView
                    :points="safeRoutePoints"
                    :segments="safeRouteSegments"
                    :loading="loadingMap"
                    @map-ready="onMapReady"
                    @error="onMapError"
                  />
                </div>

                <div v-else class="map-empty-state">
                  <div class="text-center">
                    <q-icon name="map_disabled" size="4rem" class="empty-icon" />
                    <div class="text-h6 q-mt-md">Mapa não disponível</div>
                    <div class="text-body2 empty-text">
                      Não há dados suficientes para exibir o mapa
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-tab-panel>

          <!-- Permissions Tab -->
          <q-tab-panel name="permissions" class="q-pa-md">
            <div class="row q-col-gutter-md">
              <!-- Permissões Atuais -->
              <div class="col-12 col-lg-8">
                <q-card flat bordered class="content-card">
                  <q-card-section>
                    <div class="row items-center justify-between q-mb-md">
                      <div class="text-h6 section-title">
                        <q-icon name="badge" class="q-mr-sm section-icon" />
                        Carteirinhas com Acesso
                      </div>
                      <q-btn
                        color="primary"
                        icon="add"
                        label="Gerenciar"
                        size="sm"
                        @click="managePermissions"
                        unelevated
                      />
                    </div>

                    <div v-if="hasAccessPermissions">
                      <q-list separator class="permissions-list">
                        <q-item
                          v-for="permission in routePermissions"
                          :key="permission.id"
                          dense
                          class="permission-item"
                        >
                          <q-item-section avatar>
                            <q-icon
                              :name="permission.icon || 'card_membership'"
                              :color="permission.color || 'primary'"
                              size="md"
                            />
                          </q-item-section>

                          <q-item-section>
                            <q-item-label class="permission-name">{{ permission.name }}</q-item-label>
                            <q-item-label caption class="permission-description">
                              {{ permission.description || 'Sem descrição' }}
                            </q-item-label>
                          </q-item-section>

                          <q-item-section side>
                            <div class="row items-center q-gutter-xs">
                              <q-chip
                                :color="permission.color || 'primary'"
                                text-color="white"
                                size="sm"
                                :label="permission.code"
                              />
                              <q-btn
                                flat
                                round
                                icon="remove"
                                size="sm"
                                color="negative"
                                @click="removePermissionFromRoute(permission.id)"
                              />
                            </div>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </div>

                    <div v-else class="empty-permissions">
                      <div class="text-center q-py-xl">
                        <q-icon name="public" size="4rem" class="empty-icon" />
                        <div class="text-h6 q-mt-md">Acesso Público</div>
                        <div class="text-body2 text-grey-6">
                          Esta rota não requer carteirinhas específicas
                        </div>
                        <q-btn
                          color="primary"
                          label="Adicionar Restrições"
                          class="q-mt-md"
                          @click="managePermissions"
                          outline
                        />
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <!-- Estatísticas de Acesso -->
              <div class="col-12 col-lg-4">
                <q-card flat bordered class="content-card">
                  <q-card-section>
                    <div class="text-h6 section-title q-mb-md">
                      <q-icon name="analytics" class="q-mr-sm section-icon" />
                      Estatísticas de Acesso
                    </div>

                    <div class="access-stats">
                      <div class="stat-item">
                        <div class="stat-value">{{ permissionsCount }}</div>
                        <div class="stat-label">Carteirinhas Necessárias</div>
                      </div>

                      <q-separator class="q-my-md" />

                      <div class="stat-item">
                        <div class="stat-value">{{ routeData.is_public ? 'Sim' : 'Não' }}</div>
                        <div class="stat-label">Visível Publicamente</div>
                      </div>

                      <q-separator class="q-my-md" />

                      <div class="stat-item">
                        <div class="stat-value">{{ accessConfig.label }}</div>
                        <div class="stat-label">Tipo de Acesso</div>
                      </div>
                    </div>

                    <!-- Ações Rápidas -->
                    <div class="quick-actions q-mt-lg">
                      <q-btn
                        :color="routeData.is_public ? 'negative' : 'positive'"
                        :icon="routeData.is_public ? 'public_off' : 'public'"
                        :label="routeData.is_public ? 'Tornar Privada' : 'Tornar Pública'"
                        @click="togglePublicVisibility"
                        class="full-width q-mb-sm"
                        outline
                      />

                      <q-btn
                        color="primary"
                        icon="badge"
                        label="Gerenciar Carteirinhas"
                        @click="managePermissions"
                        class="full-width"
                        outline
                      />
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
            color="negative"
            class="delete-btn"
            @click="deleteRoute"
            :loading="deleting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Permission Management Dialog -->
    <q-dialog v-model="permissionDialog" persistent class="permission-dialog">
      <q-card style="min-width: 500px; max-width: 700px" class="permission-card">
        <q-card-section class="row items-center permission-header">
          <q-avatar icon="badge" color="primary" text-color="white" />
          <span class="q-ml-sm text-h6">Gerenciar Carteirinhas</span>
        </q-card-section>

        <q-card-section class="permission-content">
          <div class="text-body1 q-mb-md">
            Selecione as carteirinhas que terão acesso a esta rota:
          </div>

          <q-list separator v-if="availablePermissions.length > 0">
            <q-item
              v-for="permission in availablePermissions"
              :key="permission.id"
              dense
              class="permission-option"
            >
              <q-item-section avatar>
                <q-icon
                  :name="permission.icon || 'card_membership'"
                  :color="permission.color || 'primary'"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ permission.name }}</q-item-label>
                <q-item-label caption>{{ permission.description }}</q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-checkbox
                  :model-value="isPermissionSelected(permission.id)"
                  @update:model-value="togglePermissionSelection(permission.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>

          <div v-else class="text-center q-py-md">
            <q-icon name="info" size="2rem" color="grey" />
            <div class="text-body2 text-grey q-mt-sm">
              Nenhuma carteirinha disponível
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="permission-actions">
          <q-btn flat label="Cancelar" @click="cancelPermissionManagement" />
          <q-btn
            unelevated
            label="Salvar"
            color="primary"
            @click="savePermissions"
            :loading="savingPermissions"
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
import {permissionApiService} from "src/services/api/permissions/PermissionApiService.js";
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
      routeData: null,
      deleting: false,

      // UI state
      activeTab: 'overview',
      deleteDialog: false,

      // Estados para gerenciamento de permissões
      permissionDialog: false,
      availablePermissions: [],
      selectedPermissions: [],
      savingPermissions: false,
      loadingPermissions: false
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

    // Configuração de acesso
    accessConfig() {
      if (!this.routeData) {
        return { label: 'Carregando...', icon: 'hourglass_empty', color: 'grey' }
      }

      const hasPermissions = this.hasAccessPermissions
      const isPublic = this.routeData.is_public

      if (!hasPermissions) {
        return {
          label: 'Público',
          icon: 'public',
          color: 'positive',
          description: 'Acesso livre para todos'
        }
      }

      return {
        label: isPublic ? 'Restrito Público' : 'Restrito Privado',
        icon: 'security',
        color: 'warning',
        description: `Requer carteirinha específica${isPublic ? ' (visível publicamente)' : ' (acesso limitado)'}`
      }
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

    // Computed properties para permissões
    routePermissions() {
      return this.routeData?.permissions || []
    },

    hasAccessPermissions() {
      return this.routePermissions.length > 0
    },

    permissionsCount() {
      return this.routePermissions.length
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

    hasUpdatedDate() {
      return this.routeData?.updated_at &&
        this.routeData.updated_at !== this.routeData.created_at
    }
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
          permissions: this.routeData.permissions?.map(p => p.id) || [],
          is_public: this.routeData.is_public,
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

    // Toggle de visibilidade pública
    async togglePublicVisibility() {
      if (!this.routeData) return

      try {
        const newVisibility = !this.routeData.is_public

        await routeApiService.updateRoute(this.routeData.id, {
          is_public: newVisibility
        })

        this.routeData.is_public = newVisibility

        this.quasar.notify({
          type: 'positive',
          message: `Rota agora é ${newVisibility ? 'pública' : 'privada'}`
        })

      } catch (error) {
        console.error('Erro ao alterar visibilidade:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao alterar visibilidade da rota'
        })
      }
    },

    // Gerenciar permissões
    async managePermissions() {
      await this.loadAvailablePermissions()
      this.selectedPermissions = [...this.routePermissions.map(p => p.id)]
      this.permissionDialog = true
    },

    async loadAvailablePermissions() {
      if (!this.routeData?.institution_id) return

      this.loadingPermissions = true

      try {
        const response = await permissionApiService.getInstitutionPermissions(this.routeData.institution_id)

        if (response.data?.success && response.data.permissions) {
          this.availablePermissions = response.data.permissions.data || response.data.permissions
        } else {
          this.availablePermissions = []
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error)
        this.quasar.notify({
          type: 'warning',
          message: 'Erro ao carregar carteirinhas disponíveis'
        })
        this.availablePermissions = []
      } finally {
        this.loadingPermissions = false
      }
    },

    isPermissionSelected(permissionId) {
      return this.selectedPermissions.includes(permissionId)
    },

    togglePermissionSelection(permissionId) {
      const index = this.selectedPermissions.indexOf(permissionId)
      if (index > -1) {
        this.selectedPermissions.splice(index, 1)
      } else {
        this.selectedPermissions.push(permissionId)
      }
    },

    async removePermissionFromRoute(permissionId) {
      try {
        const updatedPermissions = this.routePermissions
          .filter(p => p.id !== permissionId)
          .map(p => p.id)

        await routeApiService.updateRoute(this.routeData.id, {
          permissions: updatedPermissions
        })

        // Atualizar dados locais
        this.routeData.permissions = this.routeData.permissions.filter(p => p.id !== permissionId)

        this.quasar.notify({
          type: 'positive',
          message: 'Carteirinha removida da rota'
        })

      } catch (error) {
        console.error('Erro ao remover permissão:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao remover carteirinha'
        })
      }
    },

    async savePermissions() {
      this.savingPermissions = true

      try {
        await routeApiService.updateRoute(this.routeData.id, {
          permissions: this.selectedPermissions
        })

        // Recarregar dados da rota para obter permissões atualizadas
        await this.loadRoute()

        this.permissionDialog = false

        this.quasar.notify({
          type: 'positive',
          message: 'Carteirinhas atualizadas com sucesso'
        })

      } catch (error) {
        console.error('Erro ao salvar permissões:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao salvar carteirinhas'
        })
      } finally {
        this.savingPermissions = false
      }
    },

    cancelPermissionManagement() {
      this.permissionDialog = false
      this.selectedPermissions = []
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
    },

    // Map event handlers
    onMapReady() {
      this.loadingMap = false
      console.log('Mapa carregado com sucesso')
    },

    onMapError(error) {
      this.loadingMap = false
      console.error('Erro no mapa:', error)
      this.quasar.notify({
        type: 'warning',
        message: 'Erro ao carregar o mapa'
      })
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

.permissions-list {
  .permission-item {
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

.permission-name {
  color: var(--q-primary-text);
  font-weight: 600;
}

.permission-description {
  color: var(--q-secondary-text);
}

.empty-permissions {
  text-align: center;
  padding: 2rem;

  .empty-icon {
    color: var(--q-positive);
    opacity: 0.6;
  }
}

.access-stats {
  .stat-item {
    text-align: center;
    padding: 1rem 0;

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--q-primary-text);
    }

    .stat-label {
      font-size: 0.9rem;
      color: var(--q-secondary-text);
      margin-top: 0.25rem;
    }
  }
}

.quick-actions {
  .q-btn {
    font-weight: 500;
  }
}

.permission-dialog {
  .permission-card {
    background: var(--q-secondary-background);
    border: 1px solid rgba(255, 99, 0, 0.1);

    .body--dark & {
      background: var(--q-secondary-background);
      border-color: rgba(255, 161, 0, 0.2);
    }
  }

  .permission-header {
    background: rgba(25, 118, 210, 0.05);
    border-bottom: 1px solid rgba(25, 118, 210, 0.1);

    .body--dark & {
      background: rgba(25, 118, 210, 0.1);
      border-bottom-color: rgba(25, 118, 210, 0.2);
    }
  }

  .permission-content {
    max-height: 400px;
    overflow-y: auto;
  }

  .permission-option {
    border-radius: 6px;
    margin: 2px 0;

    &:hover {
      background: rgba(25, 118, 210, 0.05);
    }

    .body--dark & {
      &:hover {
        background: rgba(25, 118, 210, 0.1);
      }
    }
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

.error-card {
  background: var(--q-secondary-background);
  border: 1px solid rgba(211, 47, 47, 0.2);
  max-width: 500px;

  .body--dark & {
    background: var(--q-secondary-background);
    border-color: rgba(213, 53, 0, 0.3);
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

  .access-chips {
    gap: 6px;
  }

  .quick-actions {
    .q-btn {
      margin-bottom: 8px;
    }
  }
}

@media (max-width: 480px) {
  .map-container,
  .map-empty-state {
    height: 300px;
  }

  .access-chips {
    gap: 4px;
  }

  .analytics-placeholder {
    padding: 2rem 1rem;
  }

  .access-stats {
    .stat-item {
      padding: 0.75rem 0;
    }
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

.access-chips .q-chip {
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

.permission-actions {
  border-top: 1px solid rgba(255, 99, 0, 0.1);

  .body--dark & {
    border-top-color: rgba(255, 161, 0, 0.2);
  }
}

.permission-content {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--q-primary-background);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--q-accent-2);
    border-radius: 3px;

    &:hover {
      background: var(--q-accent-1);
    }
  }
}
</style>
