<template>
  <q-page class="routes-list-page">
    <!-- Cabeçalho da página -->
    <div class="page-header q-pa-md">
      <div class="row items-center justify-between">
        <div class="col-auto">
          <div class="text-h4 text-weight-bold">Itinerários</div>
          <div class="text-subtitle1 text-grey-6">
            Gerencie todos os itinerários do sistema
          </div>
        </div>
        <div class="col-auto">
          <q-btn
            color="primary"
            icon="add"
            label="Novo Itinerário"
            unelevated
            @click="createNewRoute"
            class="q-px-lg"
          />
        </div>
      </div>
    </div>
    <!-- Filtros e busca -->
    <q-card flat class="q-ma-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <!-- Busca -->
          <div class="col-12 col-md-4">
            <q-input
              v-model="searchQuery"
              outlined
              dense
              placeholder="Buscar itinerários..."
              clearable
              debounce="300"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>

          <!-- Filtro por status -->
          <div class="col-12 col-md-3">
            <q-select
              v-model="statusFilter"
              :options="statusOptions"
              outlined
              dense
              label="Status"
              clearable
              emit-value
              map-options
            />
          </div>

          <!-- Filtro por instituição -->
          <div class="col-12 col-md-3" v-if="isAdmin">
            <q-select
              v-model="institutionFilter"
              :options="institutionOptions"
              outlined
              dense
              label="Instituição"
              clearable
              emit-value
              map-options
              :loading="loadingInstitutions"
            />
          </div>

          <!-- Botões de ação -->
          <div class="col-12 col-md-2">
            <div class="row q-gutter-sm">
              <q-btn
                flat
                dense
                round
                icon="refresh"
                @click="refreshRoutes"
                :loading="loading"
              >
                <q-tooltip>Atualizar lista</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="tune"
                @click="showAdvancedFilters = !showAdvancedFilters"
              >
                <q-tooltip>Filtros avançados</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>

        <!-- Filtros avançados (expansível) -->
        <q-slide-transition>
          <div v-show="showAdvancedFilters" class="q-mt-md q-pt-md border-top">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-3">
                <q-input
                  v-model="filters.minDistance"
                  type="number"
                  outlined
                  dense
                  label="Distância mínima (km)"
                  suffix="km"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-input
                  v-model="filters.maxDistance"
                  type="number"
                  outlined
                  dense
                  label="Distância máxima (km)"
                  suffix="km"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-input
                  v-model="filters.minPoints"
                  type="number"
                  outlined
                  dense
                  label="Pontos mínimos"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-select
                  v-model="filters.days"
                  :options="dayOptions"
                  outlined
                  dense
                  label="Dias de operação"
                  multiple
                  use-chips
                  emit-value
                  map-options
                />
              </div>
            </div>
          </div>
        </q-slide-transition>
      </q-card-section>
    </q-card>

    <!-- Lista de itinerários -->
    <div class="routes-container q-pa-md">
      <!-- Loading -->
      <div v-if="loading && routes.length === 0" class="flex flex-center q-py-xl">
        <div class="text-center">
          <q-spinner size="xl" color="primary" />
          <div class="text-subtitle1 q-mt-md">Carregando itinerários...</div>
        </div>
      </div>

      <!-- Lista vazia -->
      <div v-else-if="!loading && filteredRoutes.length === 0" class="flex flex-center q-py-xl">
        <div class="text-center">
          <q-icon name="route" size="4rem" color="grey-4" />
          <div class="text-h6 q-mt-md text-grey-6">
            {{ hasFilters ? 'Nenhum itinerário encontrado' : 'Nenhum itinerário cadastrado' }}
          </div>
          <div class="text-body2 text-grey-5 q-mt-sm">
            {{ hasFilters ? 'Tente ajustar os filtros de busca' : 'Clique em "Novo Itinerário" para começar' }}
          </div>
          <q-btn
            v-if="!hasFilters"
            color="primary"
            label="Criar Primeiro Itinerário"
            unelevated
            @click="createNewRoute"
            class="q-mt-md"
          />
        </div>
      </div>

      <!-- Cards de itinerários -->
      <div v-else class="row q-col-gutter-md">
        <div
          v-for="route in paginatedRoutes"
          :key="route.id"
          class="col-12 col-md-6 col-lg-4"
        >
          <RouteCard
            :route="route"
            @view="viewRoute"
            @edit="editRoute"
            @duplicate="duplicateRoute"
            @delete="confirmDeleteRoute"
            @toggle-status="toggleRouteStatus"
          />
        </div>
      </div>

      <!-- Paginação -->
      <div v-if="totalPages > 1" class="flex flex-center q-mt-lg">
        <q-pagination
          v-model="currentPage"
          :max="totalPages"
          :max-pages="7"
          boundary-numbers
          direction-links
          outline
          color="primary"
          size="md"
        />
      </div>

      <!-- Informações da paginação -->
      <div class="text-center q-mt-md text-caption text-grey-6">
        Mostrando {{ paginationInfo.from }} - {{ paginationInfo.to }} de {{ filteredRoutes.length }} itinerários
      </div>
    </div>

    <!-- Dialog de confirmação de exclusão -->
    <q-dialog v-model="deleteDialog.show" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">Confirmar Exclusão</span>
        </q-card-section>

        <q-card-section>
          <div class="text-body1">
            Tem certeza que deseja excluir o itinerário
            <strong>"{{ deleteDialog.route?.name }}"</strong>?
          </div>
          <div class="text-body2 text-negative q-mt-sm">
            <q-icon name="warning" class="q-mr-xs" />
            Esta ação não pode ser desfeita.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            unelevated
            label="Excluir"
            color="negative"
            @click="deleteRoute"
            :loading="deleteDialog.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth.js'
import RouteCard from 'src/components/routes/RouteCard.vue'
import { routeApiService } from 'src/services/api/route/RouteApiService.ts'

export default defineComponent({
  name: 'RoutesListPage',

  components: {
    RouteCard
  },
  setup() {
    const quasar = useQuasar()
    const router = useRouter()
    const authStore = useAuthStore()

    return {
      quasar,
      router,
      authStore
    }
  },

  data() {
    return {
      // Estado da lista
      routes: [],
      loading: false,
      loadingInstitutions: false,

      // Filtros
      searchQuery: '',
      statusFilter: null,
      institutionFilter: null,
      showAdvancedFilters: false,
      filters: {
        minDistance: null,
        maxDistance: null,
        minPoints: null,
        days: []
      },

      // Paginação
      currentPage: 1,
      itemsPerPage: 12,

      // Instituições (para admins)
      institutions: [],

      // Dialog de exclusão
      deleteDialog: {
        show: false,
        route: null,
        loading: false
      },

      // Opções dos filtros
      statusOptions: [
        { label: 'Ativo', value: 'active' },
        { label: 'Inativo', value: 'inactive' },
        { label: 'Rascunho', value: 'draft' },
        { label: 'Calculando', value: 'calculating' },
        { label: 'Erro', value: 'error' }
      ],

      dayOptions: [
        { label: 'Segunda', value: 1 },
        { label: 'Terça', value: 2 },
        { label: 'Quarta', value: 3 },
        { label: 'Quinta', value: 4 },
        { label: 'Sexta', value: 5 },
        { label: 'Sábado', value: 6 },
        { label: 'Domingo', value: 7 }
      ]
    }
  },

  computed: {
    isAdmin() {
      return this.authStore.user?.role === 'admin'
    },

    institutionOptions() {
      return this.institutions.map(inst => ({
        label: inst.name,
        value: inst.id
      }))
    },

    hasFilters() {
      return !!(
        this.searchQuery ||
        this.statusFilter ||
        this.institutionFilter ||
        this.filters.minDistance ||
        this.filters.maxDistance ||
        this.filters.minPoints ||
        this.filters.days.length > 0
      )
    },

    filteredRoutes() {
      let filtered = [...this.routes]

      // Filtro de busca por texto
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(route =>
          route.name.toLowerCase().includes(query) ||
          (route.description && route.description.toLowerCase().includes(query))
        )
      }

      // Filtro por status
      if (this.statusFilter) {
        filtered = filtered.filter(route => this.getRouteStatus(route) === this.statusFilter)
      }

      // Filtro por instituição
      if (this.institutionFilter) {
        filtered = filtered.filter(route => route.institution_id === this.institutionFilter)
      }

      // Filtros avançados
      if (this.filters.minDistance) {
        filtered = filtered.filter(route => {
          const distance = (route.total_distance || 0) / 1000
          return distance >= this.filters.minDistance
        })
      }

      if (this.filters.maxDistance) {
        filtered = filtered.filter(route => {
          const distance = (route.total_distance || 0) / 1000
          return distance <= this.filters.maxDistance
        })
      }

      if (this.filters.minPoints) {
        filtered = filtered.filter(route => {
          const points = route.points?.length || 0
          return points >= this.filters.minPoints
        })
      }

      if (this.filters.days.length > 0) {
        filtered = filtered.filter(route => {
          const routeDays = route.schedule_data?.days || []
          return this.filters.days.some(day => routeDays.includes(day))
        })
      }

      return filtered
    },

    totalPages() {
      return Math.ceil(this.filteredRoutes.length / this.itemsPerPage)
    },

    paginatedRoutes() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.filteredRoutes.slice(start, end)
    },

    paginationInfo() {
      const start = (this.currentPage - 1) * this.itemsPerPage + 1
      const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredRoutes.length)
      return { from: start, to: end }
    }
  },

  watch: {
    // Reset pagination when filters change
    searchQuery() { this.currentPage = 1 },
    statusFilter() { this.currentPage = 1 },
    institutionFilter() { this.currentPage = 1 },
    filters: {
      handler() { this.currentPage = 1 },
      deep: true
    }
  },

  async mounted() {
    await this.loadRoutes()
    if (this.isAdmin) {
      await this.loadInstitutions()
    }
  },

  methods: {
    // Carregamento de dados
    async loadRoutes() {
      this.loading = true
      try {
        const response = await routeApiService.getRoutes()
        this.routes = response.data.routes || response.data || []

        console.log('Rotas carregadas:', this.routes.length)
      } catch (error) {
        console.error('Erro ao carregar rotas:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao carregar itinerários'
        })
      } finally {
        this.loading = false
      }
    },

    async loadInstitutions() {
      this.loadingInstitutions = true
      try {
        // Substitua pela chamada correta da API de instituições
        // const response = await institutionApiService.getInstitutions()
        // this.institutions = response.data
        this.institutions = [] // Placeholder
      } catch (error) {
        console.error('Erro ao carregar instituições:', error)
      } finally {
        this.loadingInstitutions = false
      }
    },

    async refreshRoutes() {
      await this.loadRoutes()
      this.quasar.notify({
        type: 'positive',
        message: 'Lista atualizada',
        timeout: 1500
      })
    },

    // Navegação
    createNewRoute() {
      this.router.push('/routes/create')
    },

    viewRoute(route) {
      this.router.push(`/routes/${route.id}`)
    },

    editRoute(route) {
      this.router.push(`/routes/${route.id}/edit`)
    },

    // Ações de rota
    async duplicateRoute(route) {
      try {
        const duplicatedData = {
          name: `${route.name} (Cópia)`,
          description: route.description,
          institution_id: route.institution_id,
          points: route.points?.map(point => ({
            name: point.name,
            latitude: point.latitude,
            longitude: point.longitude,
            sequence: point.sequence
          })) || []
        }

        const response = await routeApiService.createRoute(duplicatedData)

        this.quasar.notify({
          type: 'positive',
          message: `Itinerário "${duplicatedData.name}" duplicado com sucesso`
        })

        await this.loadRoutes()

        // Navegar para edição da nova rota
        this.router.push(`/routes/${response.data.route.id}/edit`)

      } catch (error) {
        console.error('Erro ao duplicar rota:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao duplicar itinerário'
        })
      }
    },

    confirmDeleteRoute(route) {
      this.deleteDialog.route = route
      this.deleteDialog.show = true
    },

    async deleteRoute() {
      const route = this.deleteDialog.route
      this.deleteDialog.loading = true

      try {
        await routeApiService.deleteRoute(route.id)

        this.quasar.notify({
          type: 'positive',
          message: `Itinerário "${route.name}" excluído com sucesso`
        })

        this.deleteDialog.show = false
        await this.loadRoutes()

      } catch (error) {
        console.error('Erro ao excluir rota:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao excluir itinerário'
        })
      } finally {
        this.deleteDialog.loading = false
      }
    },

    async toggleRouteStatus(route) {
      try {
        const newStatus = route.is_published ? false : true

        await routeApiService.updateRoute(route.id, {
          is_published: newStatus
        })

        this.quasar.notify({
          type: 'positive',
          message: `Itinerário ${newStatus ? 'ativado' : 'desativado'}`
        })

        await this.loadRoutes()

      } catch (error) {
        console.error('Erro ao alterar status:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao alterar status do itinerário'
        })
      }
    },

    // Utilitários
    getRouteStatus(route) {
      if (route.calculation_status === 'calculating') return 'calculating'
      if (route.calculation_status === 'error' || route.calculation_status === 'failed') return 'error'
      if (!route.is_published) return 'draft'
      return route.is_published ? 'active' : 'inactive'
    }
  }
})
</script>

<style lang="scss" scoped>
.routes-list-page {
  background: var(--q-primary-background);
  min-height: 100vh;

  .body--dark & {
    background: var(--q-primary-background);
  }
}

.page-header {
  background: var(--q-secondary-background);
  border-bottom: 1px solid var(--q-primary);
  border-bottom-color: rgba(255, 99, 0, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .body--dark & {
    background: var(--q-secondary-background);
    border-bottom-color: rgba(255, 161, 0, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

.routes-container {
  max-width: 1400px;
  margin: 0 auto;
}

.border-top {
  border-top: 1px solid var(--q-accent-4);
  border-top-color: rgba(255, 99, 0, 0.15);

  .body--dark & {
    border-top-color: rgba(255, 161, 0, 0.2);
  }
}

// Melhorar elementos de texto e botões
.page-title {
  color: var(--q-primary-text);

  .body--dark & {
    color: var(--q-primary-text);
  }
}

.page-subtitle {
  color: var(--q-secondary-text);
}

// Estilos para cards/items de rotas
.route-card {
  background: var(--q-secondary-background);
  border: 1px solid rgba(255, 99, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--q-primary);
    box-shadow: 0 4px 12px rgba(255, 99, 0, 0.15);
    transform: translateY(-2px);
  }

  .body--dark & {
    background: var(--q-secondary-background);
    border-color: rgba(255, 161, 0, 0.2);

    &:hover {
      border-color: var(--q-secondary);
      box-shadow: 0 4px 12px rgba(255, 161, 0, 0.2);
    }
  }
}

// Estilos para botões de ação
.action-btn {
  &.primary {
    background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-accent-1) 100%);
    color: white;

    &:hover {
      background: linear-gradient(135deg, var(--q-accent-1) 0%, var(--q-secondary) 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 99, 0, 0.3);
    }
  }

  &.secondary {
    border: 2px solid var(--q-secondary);
    color: var(--q-secondary);

    &:hover {
      background: var(--q-secondary);
      color: white;
    }
  }
}

// Estilos para inputs e filtros
.filter-input {
  .q-field__control {
    background: var(--q-secondary-background);
    border: 1px solid rgba(255, 99, 0, 0.2);
    border-radius: 8px;
  }

  .q-field--focused .q-field__control {
    border-color: var(--q-primary);
    box-shadow: 0 0 0 2px rgba(255, 99, 0, 0.1);
  }

  .body--dark & {
    .q-field__control {
      background: var(--q-secondary-background);
      border-color: rgba(255, 161, 0, 0.3);
    }
  }
}

// Estilos para badges/chips de status
.status-chip {
  &.active {
    background: var(--q-positive);
    color: white;
  }

  &.inactive {
    background: var(--q-negative);
    color: white;
  }

  &.pending {
    background: var(--q-warning);
    color: var(--q-night);
  }

  &.info {
    background: var(--q-info);
    color: white;
  }
}

// Estilos para tabelas
.routes-table {
  background: var(--q-secondary-background);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

  .q-table__top {
    background: linear-gradient(135deg,
      rgba(255, 99, 0, 0.05) 0%,
      rgba(255, 161, 0, 0.05) 100%
    );
    border-bottom: 1px solid rgba(255, 99, 0, 0.1);
  }

  .q-table thead th {
    background: var(--q-primary-background);
    color: var(--q-primary-text);
    font-weight: 600;
    border-bottom: 2px solid var(--q-primary);
  }

  .q-table tbody tr {
    &:nth-child(even) {
      background: rgba(255, 99, 0, 0.02);
    }

    &:hover {
      background: rgba(255, 99, 0, 0.05);
    }
  }

  .body--dark & {
    background: var(--q-secondary-background);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);

    .q-table__top {
      background: linear-gradient(135deg,
        rgba(255, 161, 0, 0.1) 0%,
        rgba(245, 180, 47, 0.1) 100%
      );
      border-bottom-color: rgba(255, 161, 0, 0.2);
    }

    .q-table thead th {
      background: var(--q-primary-background);
      color: var(--q-primary-text);
      border-bottom-color: var(--q-secondary);
    }

    .q-table tbody tr {
      &:nth-child(even) {
        background: rgba(255, 161, 0, 0.05);
      }

      &:hover {
        background: rgba(255, 161, 0, 0.1);
      }
    }
  }
}

// Estilos para loading e estados vazios
.loading-container {
  background: var(--q-secondary-background);
  border: 2px dashed var(--q-accent-4);
  border-radius: 12px;

  .loading-text {
    color: var(--q-secondary-text);
  }

  .q-spinner {
    color: var(--q-primary);
  }
}

.empty-state {
  background: var(--q-secondary-background);
  border: 2px dashed var(--q-accent-4);
  border-radius: 12px;

  .empty-icon {
    color: var(--q-accent-3);
  }

  .empty-text {
    color: var(--q-secondary-text);
  }

  .empty-action {
    background: var(--q-primary);
    color: white;

    &:hover {
      background: var(--q-accent-1);
    }
  }
}

// Responsividade
@media (max-width: 768px) {
  .page-header {
    .row {
      flex-direction: column;
      gap: 16px;
    }

    padding: 1rem;
  }

  .routes-container {
    padding: 0 1rem;
  }

  .routes-table {
    .q-table__container {
      .q-table {
        font-size: 0.9rem;
      }
    }
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 0.75rem;
  }

  .routes-container {
    padding: 0 0.5rem;
  }

  .action-btn {
    padding: 8px 16px;
    font-size: 0.9rem;
  }

  .filter-input {
    .q-field__control {
      font-size: 0.9rem;
    }
  }
}

// Animações
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.route-card,
.routes-table {
  animation: fadeInUp 0.6s ease-out;
}

// Scrollbar customizada
.routes-container {
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--q-primary-background);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--q-primary);
    border-radius: 4px;

    &:hover {
      background: var(--q-accent-1);
    }
  }
}
</style>
