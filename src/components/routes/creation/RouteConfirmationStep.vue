<template>
  <div class="route-confirmation-step">
    <div class="text-h5 q-mb-lg text-center">
      <q-icon name="check_circle" color="positive" size="md" class="q-mr-sm" />
      Confirmar Criação do Itinerário
    </div>

    <!-- Resumo das informações básicas -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          <q-icon name="info" color="primary" class="q-mr-xs" />
          Informações Gerais
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-list dense>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="route" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Nome do Itinerário</q-item-label>
                  <q-item-label caption class="text-weight-medium text-body2">
                    {{ routeInfo.name || 'Não informado' }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="routeInfo.description">
                <q-item-section avatar>
                  <q-icon name="description" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Descrição</q-item-label>
                  <q-item-label caption class="text-weight-medium text-body2">
                    {{ routeInfo.description }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="schedule" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Horário de Operação</q-item-label>
                  <q-item-label caption class="text-weight-medium text-body2">
                    {{ formatTimeRange }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <div class="col-12 col-md-6">
            <q-list dense>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="calendar_today" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Dias de Operação</q-item-label>
                  <q-item-label caption class="text-weight-medium text-body2">
                    {{ formatSelectedDays }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="badge" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Tipos de Acesso</q-item-label>
                  <q-item-label caption>
                    <div v-if="hasSelectedCards" class="q-gutter-xs q-mt-xs">
                      <q-chip
                        v-for="card in selectedCardChips"
                        :key="card.value"
                        :color="card.color"
                        text-color="white"
                        :icon="card.icon"
                        size="sm"
                        dense
                      >
                        {{ card.label }}
                      </q-chip>
                    </div>
                    <div v-else class="text-grey-6 text-body2">
                      <q-icon name="public" size="xs" class="q-mr-xs" />
                      Acesso livre (todos os tipos)
                    </div>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Estatísticas da rota -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          <q-icon name="analytics" color="primary" class="q-mr-xs" />
          Estatísticas da Rota
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-3">
            <div class="stat-card stat-points">
              <div class="stat-icon">
                <q-icon name="place" size="md" />
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ routePoints.length }}</div>
                <div class="stat-label">Pontos de Parada</div>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-3">
            <div class="stat-card stat-distance">
              <div class="stat-icon">
                <q-icon name="straighten" size="md" />
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ formatDistance(routeDetails.totalDistance) }}</div>
                <div class="stat-label">Distância Total</div>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-3">
            <div class="stat-card stat-duration">
              <div class="stat-icon">
                <q-icon name="schedule" size="md" />
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ formatDuration(routeDetails.totalDuration) }}</div>
                <div class="stat-label">Tempo Estimado</div>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-3">
            <div class="stat-card stat-segments">
              <div class="stat-icon">
                <q-icon name="timeline" size="md" />
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ routeDraw.length }}</div>
                <div class="stat-label">Segmentos</div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Mapa da Rota -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          <q-icon name="map" color="primary" class="q-mr-xs" />
          Visualização da Rota
        </div>

        <div class="map-container">
          <MapView
            ref="mapView"
            :route-points="routePoints"
            :route-segments="routeDraw"
            :route-data="null"
            :readonly="true"
            :auto-fit="true"
            :center-on-load="true"
            :show-user-location="false"
            class="confirmation-map"
          />
        </div>

        <!-- Legenda do mapa -->
        <div class="map-legend q-mt-md">
          <div class="row q-gutter-md items-center">
            <div class="col-auto">
              <div class="legend-item">
                <q-avatar size="sm" color="green" text-color="white">1</q-avatar>
                <span class="q-ml-xs text-caption">Origem</span>
              </div>
            </div>
            <div class="col-auto" v-if="routePoints.length > 2">
              <div class="legend-item">
                <q-avatar size="sm" color="blue" text-color="white">•</q-avatar>
                <span class="q-ml-xs text-caption">Paradas</span>
              </div>
            </div>
            <div class="col-auto">
              <div class="legend-item">
                <q-avatar size="sm" color="red" text-color="white">{{ routePoints.length }}</q-avatar>
                <span class="q-ml-xs text-caption">Destino</span>
              </div>
            </div>
            <div class="col-auto">
              <div class="legend-item">
                <div class="route-line"></div>
                <span class="q-ml-xs text-caption">Rota calculada</span>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card><abdei></abdei>

    <!-- Detalhes dos pontos de parada -->
    <q-card flat bordered class="q-mb-md" v-if="routePoints.length > 0">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          <q-icon name="place" color="primary" class="q-mr-xs" />
          Pontos de Parada ({{ routePoints.length }})
        </div>

        <q-list bordered separator class="rounded-borders">
          <q-item
            v-for="(point, index) in routePoints"
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
              <q-item-label class="text-weight-medium">
                {{ point.name }}
              </q-item-label>
              <q-item-label caption>
                <div class="text-grey-7">
                  <q-icon name="location_on" size="xs" class="q-mr-xs" />
                  {{ formatCoordinates(point.lat || point.latitude, point.lng || point.longitude) }}
                </div>
              </q-item-label>
              <q-item-label caption v-if="point.address">
                <div class="text-grey-6 q-mt-xs">
                  <q-icon name="home" size="xs" class="q-mr-xs" />
                  {{ point.address }}
                </div>
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <div class="column items-end">
                <q-chip
                  :label="getPointTypeLabel(index)"
                  size="sm"
                  :color="getPointTypeColor(index)"
                  text-color="white"
                  class="q-mb-xs"
                />
                <div class="text-caption text-grey-6">
                  Seq. {{ point.sequence !== undefined ? point.sequence + 1 : index + 1 }}
                </div>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Detalhes dos segmentos da rota -->
    <q-card flat bordered class="q-mb-md" v-if="routeDraw.length > 0">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          <q-icon name="timeline" color="primary" class="q-mr-xs" />
          Segmentos da Rota ({{ routeDraw.length }})
        </div>

        <q-list bordered separator class="rounded-borders">
          <q-item
            v-for="(segment, index) in routeDraw"
            :key="segment.id || index"
            class="segment-item"
          >
            <q-item-section avatar>
              <q-icon
                name="timeline"
                :color="getSegmentColor(index)"
                size="md"
              />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-weight-medium">
                Segmento {{ segment.sequence !== undefined ? segment.sequence + 1 : index + 1 }}
              </q-item-label>
              <q-item-label caption>
                <div class="row q-gutter-md q-mt-xs">
                  <div class="col-auto">
                    <div class="text-caption text-grey-7">DISTÂNCIA</div>
                    <div class="text-body2 text-weight-medium">
                      {{ formatDistance(segment.distance || 0) }}
                    </div>
                  </div>
                  <div class="col-auto">
                    <div class="text-caption text-grey-7">DURAÇÃO</div>
                    <div class="text-body2 text-weight-medium">
                      {{ formatDuration(segment.duration || 0) }}
                    </div>
                  </div>
                  <div class="col-auto" v-if="segment.profile">
                    <div class="text-caption text-grey-7">PERFIL</div>
                    <div class="text-body2 text-weight-medium">
                      {{ formatProfile(segment.profile) }}
                    </div>
                  </div>
                </div>
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <div class="column items-end">
                <q-chip
                  :label="getSegmentStatusLabel(segment)"
                  size="sm"
                  :color="getSegmentStatusColor(segment)"
                  text-color="white"
                  class="q-mb-xs"
                />
                <div class="text-caption text-grey-6" v-if="segment.geometry">
                  <q-icon name="route" size="xs" class="q-mr-xs" />
                  Geometria: {{ getGeometryInfo(segment.geometry) }}
                </div>
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Resumo dos segmentos -->
        <div class="row q-col-gutter-md q-mt-md">
          <div class="col-12 col-md-4">
            <q-card flat class="stats-card distance-card">
              <q-card-section class="text-center">
                <div class="stats-value distance-value">{{ formatDistance(totalSegmentsDistance) }}</div>
                <div class="stats-label distance-label">Distância Total dos Segmentos</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
            <q-card flat class="stats-card duration-card">
              <q-card-section class="text-center">
                <div class="stats-value duration-value">{{ formatDuration(totalSegmentsDuration) }}</div>
                <div class="stats-label duration-label">Duração Total dos Segmentos</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
            <q-card flat class="stats-card speed-card">
              <q-card-section class="text-center">
                <div class="stats-value speed-value">{{ averageSpeed }}</div>
                <div class="stats-label speed-label">Velocidade Média</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Aviso sobre o processo -->
    <q-banner v-if="!isSaving" class="info-banner q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="info" class="banner-icon" />
      </template>
      <div class="text-body2 banner-text">
        <strong>Importante:</strong> Após confirmar, o itinerário será criado com
        {{ routePoints.length }} pontos de parada e {{ routeDraw.length }} segmentos calculados.
        Você poderá editá-lo posteriormente na lista de itinerários.
      </div>
    </q-banner>

    <!-- Status de salvamento -->
    <q-banner v-if="isSaving" class="saving-banner q-mb-md" rounded>
      <template v-slot:avatar>
        <q-spinner class="saving-spinner" size="md" />
      </template>
      <div class="text-body2 banner-text">
        <strong>Salvando itinerário...</strong> Por favor, aguarde enquanto o itinerário
        com {{ routePoints.length }} pontos e {{ routeDraw.length }} segmentos é salvo no sistema.
      </div>
    </q-banner>

    <!-- Validações de erro -->
    <q-card v-if="validationErrors.length > 0" flat bordered class="error-card q-mb-md">
      <q-card-section>
        <div class="text-h6 error-title q-mb-md">
          <q-icon name="warning" class="q-mr-xs error-icon" />
          Problemas Encontrados
        </div>
        <q-list dense>
          <q-item v-for="(error, index) in validationErrors" :key="index" class="error-item">
            <q-item-section avatar>
              <q-icon name="error" class="error-item-icon" size="sm" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="error-text">{{ error }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Botões de ação -->
    <div class="row justify-between q-mt-lg">
      <q-btn
        label="Voltar"
        color="grey"
        flat
        icon="arrow_back"
        @click="$emit('back')"
        :disable="isSaving"
      />

      <q-btn
        label="Criar Itinerário"
        color="positive"
        icon="save"
        @click="onSave"
        :loading="isSaving"
        :disable="!canSave || isSaving"
        unelevated
        size="lg"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import MapView from 'src/components/maps/MapView.vue'

export default defineComponent({
  name: 'RouteConfirmationStep',

  components: {
    MapView
  },

  props: {
    routeInfo: {
      type: Object,
      required: true
    },
    routePoints: {
      type: Array,
      required: true
    },
    routeDetails: {
      type: Object,
      required: true
    },
    routeDraw: {
      type: Array,
      default: () => []
    },
    isSaving: {
      type: Boolean,
      default: false
    }
  },

  emits: ['save', 'back'],

  data() {
    return {
      cardOptions: [
        { label: 'Estudante', value: 'student', icon: 'school', color: 'blue' },
        { label: 'Funcionário', value: 'employee', icon: 'work', color: 'green' },
        { label: 'Comum', value: 'regular', icon: 'person', color: 'grey' },
        { label: 'Vale Transporte', value: 'work', icon: 'commute', color: 'orange' },
        { label: 'Idoso', value: 'senior', icon: 'elderly', color: 'purple' },
        { label: 'PCD', value: 'disability', icon: 'accessibility', color: 'teal' }
      ]
    }
  },

  computed: {
    canSave() {
      return this.validationErrors.length === 0 &&
        this.routePoints.length >= 2 &&
        this.routeDetails.totalDistance > 0
    },

    validationErrors() {
      const errors = []

      // Validar informações básicas
      if (!this.routeInfo.name?.trim()) {
        errors.push('Nome do itinerário é obrigatório')
      }

      if (!this.routeInfo.startTime) {
        errors.push('Horário de início é obrigatório')
      }

      if (!this.routeInfo.endTime) {
        errors.push('Horário de fim é obrigatório')
      }

      if (!this.hasSelectedDays) {
        errors.push('Selecione pelo menos um dia de operação')
      }

      // Carteirinhas não são obrigatórias - remoção da validação

      // Validar rota
      if (this.routePoints.length < 2) {
        errors.push('A rota deve ter pelo menos 2 pontos')
      }

      if (this.routeDetails.totalDistance <= 0) {
        errors.push('A rota deve ter sido calculada')
      }

      if (this.routeDraw.length === 0) {
        errors.push('Nenhum segmento de rota encontrado')
      }

      // Validar consistência entre pontos e segmentos
      if (this.routePoints.length > 1 && this.routeDraw.length !== this.routePoints.length - 1) {
        errors.push('Número de segmentos inconsistente com o número de pontos')
      }

      return errors
    },

    hasSelectedDays() {
      return Object.values(this.routeInfo.days || {}).some(day => day)
    },

    hasSelectedCards() {
      return this.routeInfo.allowedCards && this.routeInfo.allowedCards.length > 0
    },

    formatTimeRange() {
      if (!this.routeInfo.startTime || !this.routeInfo.endTime) {
        return 'Não definido'
      }
      return `${this.routeInfo.startTime} às ${this.routeInfo.endTime}`
    },

    formatSelectedDays() {
      if (!this.hasSelectedDays) return 'Nenhum dia selecionado'

      const days = []
      const dayNames = {
        mon: 'Segunda', tue: 'Terça', wed: 'Quarta',
        thu: 'Quinta', fri: 'Sexta', sat: 'Sábado', sun: 'Domingo'
      }

      Object.entries(this.routeInfo.days || {}).forEach(([key, selected]) => {
        if (selected) days.push(dayNames[key])
      })

      // Verificar se são dias úteis
      const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri']
      const selectedWeekdays = weekdays.filter(day => this.routeInfo.days?.[day])

      if (selectedWeekdays.length === 5 && !this.routeInfo.days?.sat && !this.routeInfo.days?.sun) {
        return 'Dias úteis (Segunda a Sexta)'
      }

      if (days.length === 7) {
        return 'Todos os dias da semana'
      }

      return days.join(', ')
    },

    selectedCardChips() {
      if (!this.hasSelectedCards) return []

      return this.routeInfo.allowedCards.map(cardValue => {
        const card = this.cardOptions.find(opt => opt.value === cardValue)
        return card || {
          label: cardValue,
          value: cardValue,
          icon: 'card_membership',
          color: 'grey'
        }
      })
    },

    totalSegmentsDistance() {
      return this.routeDraw.reduce((total, segment) => {
        return total + (segment.distance || 0)
      }, 0)
    },

    totalSegmentsDuration() {
      return this.routeDraw.reduce((total, segment) => {
        return total + (segment.duration || 0)
      }, 0)
    },

    averageSpeed() {
      if (this.totalSegmentsDuration === 0 || this.totalSegmentsDistance === 0) {
        return '0 km/h'
      }

      const speedKmh = (this.totalSegmentsDistance / 1000) / (this.totalSegmentsDuration / 3600)
      return `${speedKmh.toFixed(1)} km/h`
    }
  },

  methods: {
    onSave() {
      if (this.canSave && !this.isSaving) {
        this.$emit('save')
      }
    },

    formatDistance(distanceInMeters) {
      if (!distanceInMeters || distanceInMeters === 0) return '0 km'

      const distanceInKm = distanceInMeters / 1000
      if (distanceInKm < 1) {
        return `${Math.round(distanceInMeters)} m`
      }
      return `${distanceInKm.toFixed(1)} km`
    },

    formatDuration(durationInSeconds) {
      if (!durationInSeconds || durationInSeconds === 0) return '0 min'

      const durationInMinutes = durationInSeconds / 60
      if (durationInMinutes < 60) {
        return `${Math.round(durationInMinutes)} min`
      }

      const hours = Math.floor(durationInMinutes / 60)
      const minutes = Math.round(durationInMinutes % 60)
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`
    },

    formatCoordinates(lat, lng) {
      if (!lat || !lng) return 'Coordenadas não definidas'
      return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
    },

    formatProfile(profile) {
      const profiles = {
        'driving-car': 'Carro',
        'driving-hgv': 'Caminhão',
        'cycling-regular': 'Bicicleta',
        'foot-walking': 'Caminhada'
      }
      return profiles[profile] || profile
    },

    getPointColor(index) {
      if (index === 0) return 'green' // Origem
      if (index === this.routePoints.length - 1) return 'red' // Destino
      return 'blue' // Pontos intermediários
    },

    getPointTypeLabel(index) {
      if (index === 0) return 'Origem'
      if (index === this.routePoints.length - 1) return 'Destino'
      return 'Parada'
    },

    getPointTypeColor(index) {
      if (index === 0) return 'positive'
      if (index === this.routePoints.length - 1) return 'negative'
      return 'primary'
    },

    getSegmentColor(index) {
      const colors = ['blue', 'teal', 'purple', 'orange', 'indigo']
      return colors[index % colors.length]
    },

    getSegmentStatusLabel(segment) {
      if (segment.geometry) return 'Calculado'
      return 'Pendente'
    },

    getSegmentStatusColor(segment) {
      if (segment.geometry) return 'positive'
      return 'warning'
    },

    getGeometryInfo(geometry) {
      if (!geometry) return 'Não disponível'

      if (typeof geometry === 'string') {
        if (geometry.startsWith('{')) {
          return 'GeoJSON'
        } else {
          return `Polyline (${geometry.length} chars)`
        }
      }

      if (typeof geometry === 'object' && geometry.coordinates) {
        return `GeoJSON (${geometry.coordinates.length} pontos)`
      }

      return 'Formato desconhecido'
    }
  }
})
</script>

<style lang="scss" scoped>
.route-confirmation-step {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

// Estilo para o mapa
.map-container {
  width: 100%;
  height: 400px;
  border: 1px solid var(--q-accent-4);
  border-color: rgba(255, 99, 0, 0.2);
  border-radius: 8px;
  overflow: hidden;
  position: relative;

  .confirmation-map {
    width: 100%;
    height: 100%;
  }

  .body--dark & {
    border-color: rgba(255, 161, 0, 0.3);
  }
}

.map-legend {
  padding: 12px;
  background: var(--q-primary-background);
  border-radius: 4px;
  border: 1px solid var(--q-accent-4);
  border-color: rgba(255, 99, 0, 0.1);

  .legend-item {
    display: flex;
    align-items: center;
  }

  .route-line {
    width: 20px;
    height: 3px;
    background: var(--q-primary);
    border-radius: 2px;
  }

  .body--dark & {
    background: var(--q-primary-background);
    border-color: rgba(255, 161, 0, 0.2);
  }
}

// Estilo para as estatísticas
.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background: var(--q-secondary-background);
  border: 1px solid var(--q-accent-4);
  border-color: rgba(255, 99, 0, 0.1);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 99, 0, 0.1);
  }

  .stat-icon {
    margin-right: 16px;
    opacity: 0.8;
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--q-secondary-text);
    opacity: 0.7;
    margin-top: 4px;
  }

  &.stat-points {
    border-left: 4px solid var(--q-info);
    .stat-icon { color: var(--q-info); }
    .stat-value { color: var(--q-info); }
  }

  &.stat-distance {
    border-left: 4px solid var(--q-positive);
    .stat-icon { color: var(--q-positive); }
    .stat-value { color: var(--q-positive); }
  }

  &.stat-duration {
    border-left: 4px solid var(--q-warning);
    .stat-icon { color: var(--q-warning); }
    .stat-value { color: var(--q-warning); }
  }

  &.stat-segments {
    border-left: 4px solid var(--q-accent-2);
    .stat-icon { color: var(--q-accent-2); }
    .stat-value { color: var(--q-accent-2); }
  }

  .body--dark & {
    background: var(--q-secondary-background);
    border-color: rgba(255, 161, 0, 0.2);

    &:hover {
      box-shadow: 0 4px 12px rgba(255, 161, 0, 0.15);
    }
  }
}

// Estilo para os items de ponto e segmento
.point-item, .segment-item {
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 99, 0, 0.05);
  }

  .body--dark & {
    &:hover {
      background-color: rgba(255, 161, 0, 0.1);
    }
  }
}

// Estilo para os cards
:deep(.q-card) {
  border: 1px solid var(--q-accent-4);
  border-color: rgba(255, 99, 0, 0.1);
  background: var(--q-secondary-background);

  .text-h6 {
    color: var(--q-primary);
    font-weight: 500;
  }

  .body--dark & {
    border-color: rgba(255, 161, 0, 0.2);
    background: var(--q-secondary-background);

    .text-h6 {
      color: var(--q-secondary);
    }
  }
}

// Estilo para os chips
:deep(.q-chip) {
  margin: 2px 4px 2px 0;
}

// Responsividade
@media (max-width: 768px) {
  .route-confirmation-step {
    padding: 8px;
  }

  .map-container {
    height: 300px;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;

    .stat-icon {
      margin-right: 0;
      margin-bottom: 8px;
    }
  }

  .map-legend {
    .row {
      flex-direction: column;
      gap: 8px;
    }
  }
}

@media (max-width: 600px) {
  .stat-card {
    .stat-value {
      font-size: 1.25rem;
    }
  }
}

// Animação para o ícone de carregamento
.q-spinner {
  animation: spin 1s linear infinite;
  color: var(--q-primary);

  .body--dark & {
    color: var(--q-secondary);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.stats-card {
  background: var(--q-secondary-background);
  border: 1px solid transparent;
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  }

  .body--dark & {
    background: var(--q-secondary-background);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

    &:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
  }
}

.stats-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 0.875rem;
  opacity: 0.8;
  font-weight: 500;
}

// Distance Card (Info color)
.distance-card {
  background: rgba(25, 118, 210, 0.05);
  border-color: rgba(25, 118, 210, 0.2);

  .distance-value {
    color: var(--q-info);
  }

  .distance-label {
    color: var(--q-info);
  }

  &:hover {
    border-color: var(--q-info);
    box-shadow: 0 6px 20px rgba(25, 118, 210, 0.15);
  }

  .body--dark & {
    background: rgba(100, 181, 246, 0.1);
    border-color: rgba(100, 181, 246, 0.3);

    .distance-value {
      color: var(--q-info);
    }

    .distance-label {
      color: var(--q-info);
    }

    &:hover {
      border-color: var(--q-info);
      box-shadow: 0 6px 20px rgba(100, 181, 246, 0.2);
    }
  }
}

// Duration Card (Positive color)
.duration-card {
  background: rgba(40, 167, 69, 0.05);
  border-color: rgba(40, 167, 69, 0.2);

  .duration-value {
    color: var(--q-positive);
  }

  .duration-label {
    color: var(--q-positive);
  }

  &:hover {
    border-color: var(--q-positive);
    box-shadow: 0 6px 20px rgba(40, 167, 69, 0.15);
  }

  .body--dark & {
    background: rgba(0, 184, 83, 0.1);
    border-color: rgba(0, 184, 83, 0.3);

    .duration-value {
      color: var(--q-positive);
    }

    .duration-label {
      color: var(--q-positive);
    }

    &:hover {
      border-color: var(--q-positive);
      box-shadow: 0 6px 20px rgba(0, 184, 83, 0.2);
    }
  }
}

// Speed Card (Primary/Warning color)
.speed-card {
  background: rgba(255, 99, 0, 0.05);
  border-color: rgba(255, 99, 0, 0.2);

  .speed-value {
    color: var(--q-primary);
  }

  .speed-label {
    color: var(--q-primary);
  }

  &:hover {
    border-color: var(--q-primary);
    box-shadow: 0 6px 20px rgba(255, 99, 0, 0.15);
  }

  .body--dark & {
    background: rgba(255, 161, 0, 0.1);
    border-color: rgba(255, 161, 0, 0.3);

    .speed-value {
      color: var(--q-secondary);
    }

    .speed-label {
      color: var(--q-secondary);
    }

    &:hover {
      border-color: var(--q-secondary);
      box-shadow: 0 6px 20px rgba(255, 161, 0, 0.2);
    }
  }
}

// Responsividade
@media (max-width: 768px) {
  .stats-value {
    font-size: 1.25rem;
  }

  .stats-label {
    font-size: 0.8rem;
  }

  .stats-card {
    margin-bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .stats-value {
    font-size: 1.1rem;
  }

  .stats-label {
    font-size: 0.75rem;
  }
}

// Animação de entrada
@keyframes statsCardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stats-card {
  animation: statsCardFadeIn 0.6s ease-out;

  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.3s; }
}
// Banner informativo (Info)
.info-banner {
  background: rgba(25, 118, 210, 0.1);
  border: 1px solid rgba(25, 118, 210, 0.2);
  border-radius: 12px;

  .banner-icon {
    color: var(--q-info);
  }

  .banner-text {
    color: var(--q-info);

    strong {
      color: var(--q-info);
      font-weight: 700;
    }
  }

  .body--dark & {
    background: rgba(100, 181, 246, 0.15);
    border-color: rgba(100, 181, 246, 0.3);

    .banner-icon,
    .banner-text,
    .banner-text strong {
      color: var(--q-info);
    }
  }
}

// Banner de salvamento (Warning/Primary)
.saving-banner {
  background: rgba(255, 99, 0, 0.1);
  border: 1px solid rgba(255, 99, 0, 0.2);
  border-radius: 12px;

  .saving-spinner {
    color: var(--q-primary);
  }

  .banner-text {
    color: var(--q-primary);

    strong {
      color: var(--q-primary);
      font-weight: 700;
    }
  }

  .body--dark & {
    background: rgba(255, 161, 0, 0.15);
    border-color: rgba(255, 161, 0, 0.3);

    .saving-spinner {
      color: var(--q-secondary);
    }

    .banner-text,
    .banner-text strong {
      color: var(--q-secondary);
    }
  }
}

// Card de erro (Negative)
.error-card {
  background: rgba(211, 47, 47, 0.1);
  border: 1px solid rgba(211, 47, 47, 0.2);
  border-radius: 12px;

  .error-title {
    color: var(--q-negative);
    font-weight: 700;
    display: flex;
    align-items: center;
  }

  .error-icon {
    color: var(--q-negative);
  }

  .error-item {
    border-radius: 8px;
    margin: 0.25rem 0;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(211, 47, 47, 0.05);
    }
  }

  .error-item-icon {
    color: var(--q-negative);
  }

  .error-text {
    color: var(--q-negative);
    font-weight: 500;
  }

  .body--dark & {
    background: rgba(213, 53, 0, 0.15);
    border-color: rgba(213, 53, 0, 0.3);

    .error-title,
    .error-icon,
    .error-item-icon,
    .error-text {
      color: var(--q-negative);
    }

    .error-item:hover {
      background: rgba(213, 53, 0, 0.1);
    }
  }
}

// Animações
@keyframes bannerFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.info-banner,
.saving-banner {
  animation: bannerFadeIn 0.5s ease-out;
}

.error-card {
  animation: bannerFadeIn 0.5s ease-out, errorShake 0.5s ease-out 0.2s;
}

// Spinner animação customizada
.saving-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Responsividade
@media (max-width: 768px) {
  .info-banner,
  .saving-banner,
  .error-card {
    border-radius: 8px;
  }

  .banner-text {
    font-size: 0.9rem;
  }

  .error-title {
    font-size: 1.1rem;
  }

  .error-text {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .banner-text {
    font-size: 0.85rem;
  }

  .error-title {
    font-size: 1rem;
  }

  .error-item {
    padding: 8px 12px;
  }
}

// Estados de hover melhorados
.info-banner,
.saving-banner {
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.error-card {
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(211, 47, 47, 0.15);
  }

  .body--dark &:hover {
    box-shadow: 0 4px 16px rgba(213, 53, 0, 0.2);
  }
}

</style>
