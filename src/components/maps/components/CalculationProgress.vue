<template>
  <div class="calculation-progress">
    <q-card class="progress-card">
      <q-card-section class="q-pb-none">
        <div class="text-h6 text-primary">
          <q-icon name="route" class="q-mr-sm" />
          Calculando Rota #{{ routeId }}
        </div>
        <div class="text-caption text-grey-6">
          {{ calculationMessage }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-linear-progress
          :value="calculationProgressValue"
          color="primary"
          class="q-mb-sm"
          :indeterminate="calculationProgressValue === 0"
        />
        <div class="row justify-between text-caption">
          <span>
            {{ calculationStatus?.calculated_segments || 0 }}/{{ calculationStatus?.total_segments || 0 }} segmentos
          </span>
          <span>{{ Math.round(calculationStatus?.progress_percentage || 0) }}%</span>
        </div>
        <div v-if="estimatedTimeRemaining > 0" class="text-caption text-grey-6 q-mt-xs">
          Tempo restante: ~{{ formatTime(estimatedTimeRemaining) }}
        </div>
        <div class="text-caption text-grey-7 q-mt-xs">
          Provider: {{ calculationStatus?.provider || 'N/A' }}
        </div>
      </q-card-section>

      <q-card-actions v-if="canCancel">
        <q-btn
          flat
          color="negative"
          label="Cancelar"
          @click="$emit('cancel-calculation')"
          size="sm"
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script>
import { routeUtils } from 'src/services/api/route/RouteApiService.js';

export default {
  name: 'CalculationProgress',

  props: {
    routeId: {
      type: Number,
      required: true
    },
    calculationStatus: {
      type: Object,
      required: true
    },
    estimatedTimeRemaining: {
      type: Number,
      default: 0
    },
    canCancel: {
      type: Boolean,
      default: false
    }
  },

  emits: ['cancel-calculation'],

  computed: {
    calculationProgressValue() {
      return (this.calculationStatus?.progress_percentage || 0) / 100;
    },

    calculationMessage() {
      if (!this.calculationStatus) return 'Iniciando...';
      return routeUtils.getStatusMessage(
        this.calculationStatus.status,
        this.calculationStatus
      );
    }
  },

  methods: {
    formatTime(seconds) {
      return routeUtils.formatTime(seconds);
    }
  }
};
</script>

<style lang="scss" scoped>
.calculation-progress {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  z-index: 1000;
  animation: slideInDown 0.3s ease-out;

  .progress-card {
    backdrop-filter: blur(10px);
    background-color: rgba(255, 255, 255, 0.95);
    border-left: 4px solid #1976D2;
  }

  @media (max-width: 600px) {
    left: 10px;
    right: 10px;

    .progress-card {
      font-size: 0.9em;
    }
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
