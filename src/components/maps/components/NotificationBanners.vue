<template>
  <div class="notification-banners">
    <!-- Banner de aviso se não há instituição -->
    <div v-if="!hasUserInstitution" class="institution-warning">
      <q-banner class="bg-warning text-dark">
        <template v-slot:avatar>
          <q-icon name="warning" />
        </template>
        Você não está associado a nenhuma instituição. Entre em contato com o administrador.
      </q-banner>
    </div>

    <!-- Banner de erro de cálculo -->
    <div v-if="calculationError" class="calculation-error">
      <q-banner class="bg-negative text-white">
        <template v-slot:avatar>
          <q-icon name="error" />
        </template>
        {{ calculationError }}
        <template v-slot:action>
          <q-btn
            flat
            color="white"
            label="Tentar Novamente"
            @click="$emit('retry-calculation')"
            v-if="canRetry"
            class="q-mr-sm"
          />
          <q-btn flat color="white" icon="close" @click="$emit('clear-error')" />
        </template>
      </q-banner>
    </div>
  </div>
</template>

<script>
import { routeUtils } from 'src/services/api/route/RouteApiService.js';

export default {
  name: 'NotificationBanners',

  props: {
    hasUserInstitution: {
      type: Boolean,
      default: false
    },
    calculationError: {
      type: String,
      default: null
    },
    routeData: {
      type: Object,
      default: null
    },
    canRetry: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'retry-calculation',
    'clear-error'
  ],

  methods: {
    formatDistance(distanceInKm) {
      return routeUtils.formatDistance(distanceInKm);
    },

    formatDuration(durationInMinutes) {
      return routeUtils.formatDuration(durationInMinutes);
    }
  }
};
</script>

<style lang="scss" scoped>
.notification-banners {
  position: absolute;
  z-index: 1000;

  .institution-warning,
  .calculation-error {
    position: absolute;
    left: 20px;
    right: 20px;
    animation: slideInDown 0.3s ease-out;
  }

  .institution-warning {
    top: 20px;
  }

  .calculation-error {
    top: 80px;
  }

  @media (max-width: 600px) {
    .institution-warning,
    .calculation-error {
      left: 10px;
      right: 10px;
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
