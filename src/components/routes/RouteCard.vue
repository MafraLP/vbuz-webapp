<template>
  <q-card
    class="route-card"
    :class="{ 'route-card--inactive': !route.is_published }"
    clickable
    @click="$emit('view', route)"
  >
    <!-- Status badge -->
    <div class="route-status-badge">
      <q-chip
        :color="statusConfig.color"
        text-color="white"
        :icon="statusConfig.icon"
        size="sm"
        dense
      >
        {{ statusConfig.label }}
      </q-chip>
    </div>

    <!-- Card header -->
    <q-card-section class="card-header">
      <div class="route-title">
        <div class="text-h6 text-weight-medium ellipsis">
          {{ route.name }}
        </div>
        <div v-if="route.description" class="text-caption text-grey-6 q-mt-xs ellipsis-2-lines">
          {{ route.description }}
        </div>
      </div>
    </q-card-section>

    <!-- Card content -->
    <q-card-section class="card-content">
      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-item">
          <q-icon name="place" color="primary" size="sm" />
          <span class="stat-value">{{ pointsCount }}</span>
          <span class="stat-label">pontos</span>
        </div>

        <div class="stat-item">
          <q-icon name="straighten" color="positive" size="sm" />
          <span class="stat-value">{{ formattedDistance }}</span>
          <span class="stat-label">{{ distanceUnit }}</span>
        </div>

        <div class="stat-item">
          <q-icon name="schedule" color="warning" size="sm" />
          <span class="stat-value">{{ formattedDuration }}</span>
          <span class="stat-label">{{ durationUnit }}</span>
        </div>
      </div>

      <!-- Schedule info -->
      <div class="schedule-info q-mt-md">
        <div class="schedule-item">
          <q-icon name="access_time" size="xs" class="q-mr-xs" />
          <span class="text-caption">{{ formattedSchedule }}</span>
        </div>
        <div class="schedule-item q-mt-xs">
          <q-icon name="calendar_today" size="xs" class="q-mr-xs" />
          <span class="text-caption">{{ formattedDays }}</span>
        </div>
      </div>

      <!-- Access types -->
      <div v-if="accessTypes.length > 0" class="access-types q-mt-md">
        <div class="text-caption text-grey-6 q-mb-xs">Tipos de acesso:</div>
        <div class="access-chips">
          <q-chip
            v-for="access in visibleAccessTypes"
            :key="access.value"
            :color="access.color"
            text-color="white"
            :icon="access.icon"
            size="xs"
            dense
          >
            {{ access.label }}
          </q-chip>
          <q-chip
            v-if="hiddenAccessCount > 0"
            color="grey"
            text-color="white"
            size="xs"
            dense
          >
            +{{ hiddenAccessCount }}
          </q-chip>
        </div>
      </div>
    </q-card-section>

    <!-- Card actions -->
    <q-card-actions align="between" class="card-actions">
      <div class="left-actions">
        <q-btn
          flat
          round
          dense
          :icon="route.is_published ? 'visibility' : 'visibility_off'"
          :color="route.is_published ? 'positive' : 'grey'"
          size="sm"
          @click.stop="$emit('toggle-status', route)"
        >
          <q-tooltip>{{ route.is_published ? 'Desativar' : 'Ativar' }}</q-tooltip>
        </q-btn>
      </div>

      <div class="right-actions">
        <q-btn
          flat
          round
          dense
          icon="content_copy"
          color="primary"
          size="sm"
          @click.stop="$emit('duplicate', route)"
        >
          <q-tooltip>Duplicar</q-tooltip>
        </q-btn>

        <q-btn
          flat
          round
          dense
          icon="edit"
          color="primary"
          size="sm"
          @click.stop="$emit('edit', route)"
        >
          <q-tooltip>Editar</q-tooltip>
        </q-btn>

        <q-btn
          flat
          round
          dense
          icon="more_vert"
          color="grey"
          size="sm"
          @click.stop
        >
          <q-menu>
            <q-list style="min-width: 120px">
              <q-item clickable v-close-popup @click="$emit('view', route)">
                <q-item-section avatar>
                  <q-icon name="visibility" size="xs" />
                </q-item-section>
                <q-item-section>Ver detalhes</q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="$emit('duplicate', route)">
                <q-item-section avatar>
                  <q-icon name="content_copy" size="xs" />
                </q-item-section>
                <q-item-section>Duplicar</q-item-section>
              </q-item>

              <q-separator />

              <q-item
                clickable
                v-close-popup
                @click="$emit('delete', route)"
                class="text-negative"
              >
                <q-item-section avatar>
                  <q-icon name="delete" size="xs" />
                </q-item-section>
                <q-item-section>Excluir</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </q-card-actions>

    <!-- Loading overlay for status changes -->
    <q-inner-loading :showing="loading">
      <q-spinner size="sm" color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'RouteCard',

  props: {
    route: {
      type: Object,
      required: true
    }
  },

  emits: ['view', 'edit', 'duplicate', 'delete', 'toggle-status'],

  data() {
    return {
      loading: false,

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
    statusConfig() {
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

    pointsCount() {
      return this.route.points?.length || 0
    },

    formattedDistance() {
      const distance = this.route.total_distance || 0
      const km = distance / 1000

      if (km < 1) {
        return Math.round(distance).toString()
      }
      return km.toFixed(1)
    },

    distanceUnit() {
      const distance = this.route.total_distance || 0
      return distance < 1000 ? 'm' : 'km'
    },

    formattedDuration() {
      const duration = this.route.total_duration || 0
      const minutes = duration / 60

      if (minutes < 60) {
        return Math.round(minutes).toString()
      }

      const hours = Math.floor(minutes / 60)
      const remainingMinutes = Math.round(minutes % 60)

      if (remainingMinutes === 0) {
        return hours.toString()
      }

      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`
    },

    durationUnit() {
      const duration = this.route.total_duration || 0
      const minutes = duration / 60

      return minutes < 60 ? 'min' : 'h'
    },

    formattedSchedule() {
      const schedule = this.route.schedule_data
      if (!schedule?.start_time || !schedule?.end_time) {
        return 'Horário não definido'
      }
      return `${schedule.start_time} - ${schedule.end_time}`
    },

    formattedDays() {
      const schedule = this.route.schedule_data
      if (!schedule?.days || schedule.days.length === 0) {
        return 'Dias não definidos'
      }

      const dayNames = {
        1: 'Seg', 2: 'Ter', 3: 'Qua',
        4: 'Qui', 5: 'Sex', 6: 'Sáb', 7: 'Dom'
      }

      const days = schedule.days.map(day => dayNames[day]).filter(Boolean)

      // Verificar se são dias úteis
      const weekdays = [1, 2, 3, 4, 5]
      const isWeekdays = weekdays.every(day => schedule.days.includes(day)) &&
        !schedule.days.includes(6) && !schedule.days.includes(7)

      if (isWeekdays) {
        return 'Seg - Sex'
      }

      if (days.length === 7) {
        return 'Todos os dias'
      }

      return days.join(', ')
    },

    accessTypes() {
      const permissions = this.route.permissions || []
      return permissions.map(permission => {
        const type = typeof permission === 'string' ? permission : permission.type || permission.value
        return this.accessTypeMap[type] || {
          label: type,
          icon: 'card_membership',
          color: 'grey',
          value: type
        }
      })
    },

    visibleAccessTypes() {
      return this.accessTypes.slice(0, 2)
    },

    hiddenAccessCount() {
      return Math.max(0, this.accessTypes.length - 2)
    }
  },

  methods: {
    getRouteStatus() {
      if (this.route.calculation_status === 'calculating') return 'calculating'
      if (this.route.calculation_status === 'error' || this.route.calculation_status === 'failed') return 'error'
      if (!this.route.is_published) return 'draft'
      return this.route.is_published ? 'active' : 'inactive'
    }
  }
})
</script>

<style lang="scss" scoped>
.route-card {
  position: relative;
  border: 1px solid var(--q-accent-4);
  border-color: rgba(255, 99, 0, 0.15);
  background: var(--q-secondary-background);
  transition: all 0.2s ease;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    border-color: var(--q-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 99, 0, 0.15);
  }

  &--inactive {
    opacity: 0.7;

    .card-header .route-title {
      opacity: 0.8;
    }
  }

  .body--dark & {
    border-color: rgba(255, 161, 0, 0.2);
    background: var(--q-secondary-background);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

    &:hover {
      border-color: var(--q-secondary);
      box-shadow: 0 4px 12px rgba(255, 161, 0, 0.2);
    }
  }
}

.route-status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}

.card-header {
  padding-bottom: 8px;
  background: var(--q-secondary-background);

  .route-title {
    padding-right: 80px; // Space for status badge
    color: var(--q-primary-text);

    .ellipsis {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ellipsis-2-lines {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.3;
      max-height: 2.6em;
    }
  }

  .body--dark & {
    background: var(--q-secondary-background);

    .route-title {
      color: var(--q-primary-text);
    }
  }
}

.card-content {
  padding-top: 8px;
  background: var(--q-secondary-background);

  .body--dark & {
    background: var(--q-secondary-background);
  }
}

.stats-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;

  .stat-value {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 4px 0 2px 0;
    color: var(--q-primary);

    .body--dark & {
      color: var(--q-secondary);
    }
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--q-secondary-text);
    text-align: center;
  }
}

.schedule-info {
  .schedule-item {
    display: flex;
    align-items: center;
    color: var(--q-secondary-text);

    .q-icon {
      opacity: 0.7;
      color: var(--q-accent-1);

      .body--dark & {
        color: var(--q-accent-3);
      }
    }
  }
}

.access-types {
  .access-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
}

.card-actions {
  border-top: 1px solid var(--q-accent-4);
  border-top-color: rgba(255, 99, 0, 0.1);
  padding: 8px 16px;
  background: var(--q-primary-background);

  .left-actions,
  .right-actions {
    display: flex;
    gap: 4px;
  }

  .body--dark & {
    border-top-color: rgba(255, 161, 0, 0.15);
    background: var(--q-primary-background);
  }
}

// Estilos específicos para elementos internos
.route-id {
  color: var(--q-accent-3);
  font-weight: 500;
}

.route-description {
  color: var(--q-secondary-text);
}

.route-metric {
  &.points {
    color: var(--q-info);
  }

  &.distance {
    color: var(--q-positive);
  }

  &.duration {
    color: var(--q-warning);
  }

  &.segments {
    color: var(--q-accent-2);
  }
}

// Chips de acesso customizados
.access-chip {
  &.read-only {
    background: rgba(25, 118, 210, 0.1);
    color: var(--q-info);
    border: 1px solid rgba(25, 118, 210, 0.2);
  }

  &.read-write {
    background: rgba(40, 167, 69, 0.1);
    color: var(--q-positive);
    border: 1px solid rgba(40, 167, 69, 0.2);
  }

  &.admin {
    background: rgba(255, 99, 0, 0.1);
    color: var(--q-primary);
    border: 1px solid rgba(255, 99, 0, 0.2);
  }

  .body--dark & {
    &.read-only {
      background: rgba(100, 181, 246, 0.15);
      border-color: rgba(100, 181, 246, 0.3);
    }

    &.read-write {
      background: rgba(0, 184, 83, 0.15);
      border-color: rgba(0, 184, 83, 0.3);
    }

    &.admin {
      background: rgba(255, 161, 0, 0.15);
      color: var(--q-secondary);
      border-color: rgba(255, 161, 0, 0.3);
    }
  }
}

// Botões de ação customizados
.action-btn {
  &.primary {
    background: var(--q-primary);
    color: white;

    &:hover {
      background: var(--q-accent-1);
    }
  }

  &.secondary {
    border: 1px solid var(--q-secondary);
    color: var(--q-secondary);

    &:hover {
      background: var(--q-secondary);
      color: white;
    }
  }

  &.danger {
    border: 1px solid var(--q-negative);
    color: var(--q-negative);

    &:hover {
      background: var(--q-negative);
      color: white;
    }
  }

  .body--dark & {
    &.primary {
      background: var(--q-secondary);
      color: var(--q-night);

      &:hover {
        background: var(--q-accent-3);
      }
    }
  }
}

// Responsividade
@media (max-width: 600px) {
  .stats-row {
    gap: 8px;
  }

  .stat-item {
    .stat-value {
      font-size: 1rem;
    }

    .stat-label {
      font-size: 0.65rem;
    }
  }

  .route-status-badge {
    top: 8px;
    right: 8px;
  }

  .card-header .route-title {
    padding-right: 70px;
  }

  .route-card {
    border-radius: 8px;
  }
}

@media (max-width: 480px) {
  .route-card {
    border-radius: 6px;
  }

  .stats-row {
    gap: 6px;
  }

  .stat-item {
    .stat-value {
      font-size: 0.95rem;
    }

    .stat-label {
      font-size: 0.6rem;
    }
  }

  .card-actions {
    padding: 6px 12px;
  }
}

// Animações
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.route-card {
  animation: cardFadeIn 0.5s ease-out;
}

// Estados especiais
.route-card {
  &.featured {
    border-color: var(--q-primary);
    background: linear-gradient(135deg,
        rgba(255, 99, 0, 0.02) 0%,
        rgba(255, 161, 0, 0.02) 100%
    );

    .body--dark & {
      border-color: var(--q-secondary);
      background: linear-gradient(135deg,
          rgba(255, 161, 0, 0.05) 0%,
          rgba(245, 180, 47, 0.05) 100%
      );
    }
  }

  &.draft {
    border-style: dashed;
    opacity: 0.8;
  }

  &.archived {
    filter: grayscale(0.3);
    opacity: 0.6;
  }
}

// Tooltip customizado
.route-tooltip {
  background: var(--q-primary) !important;
  color: white !important;

  .body--dark & {
    background: var(--q-secondary) !important;
    color: var(--q-night) !important;
  }
}
</style>
