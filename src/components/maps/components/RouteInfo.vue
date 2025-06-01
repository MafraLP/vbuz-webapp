<template>
  <div class="route-info">
    <q-card class="info-card">
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle2 text-primary">
          <q-icon name="route" class="q-mr-xs" />
          {{ routeInfo.name }}
        </div>

        <div class="route-details">
          <div class="detail-item">
            <q-icon name="place" size="xs" class="q-mr-xs text-grey-6" />
            <span class="text-caption text-grey-6">
              {{ routeInfo.points }} {{ routeInfo.points === 1 ? 'ponto' : 'pontos' }}
            </span>
          </div>

          <div class="detail-item" v-if="routeInfo.distance > 0">
            <q-icon name="straighten" size="xs" class="q-mr-xs text-grey-6" />
            <span class="text-caption text-grey-6">
              {{ formatDistance(routeInfo.distance) }}
            </span>
          </div>

          <div class="detail-item" v-if="routeInfo.duration > 0">
            <q-icon name="schedule" size="xs" class="q-mr-xs text-grey-6" />
            <span class="text-caption text-grey-6">
              {{ formatDuration(routeInfo.duration) }}
            </span>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { routeUtils } from 'src/services/api/route/RouteApiService.js';

export default {
  name: 'RouteInfo',

  props: {
    routeInfo: {
      type: Object,
      required: true,
      validator(value) {
        return value &&
          typeof value.name === 'string' &&
          typeof value.points === 'number' &&
          typeof value.distance === 'number' &&
          typeof value.duration === 'number';
      }
    }
  },

  mounted() {
    console.log('RouteInfo montado com dados:', this.routeInfo);
  },

  watch: {
    routeInfo: {
      handler(newInfo) {
        console.log('RouteInfo atualizado:', newInfo);
      },
      deep: true
    }
  },

  methods: {
    formatDistance(distanceInKm) {
      console.log('Formatando distância:', distanceInKm, 'km');
      return routeUtils.formatDistance(distanceInKm);
    },

    formatDuration(durationInMinutes) {
      console.log('Formatando duração:', durationInMinutes, 'minutos');
      return routeUtils.formatDuration(durationInMinutes);
    }
  }
};
</script>

<style lang="scss" scoped>
.route-info {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  max-width: 300px;
  animation: slideInDown 0.3s ease-out;

  .info-card {
    backdrop-filter: blur(10px);
    background-color: rgba(255, 255, 255, 0.95);
    border-left: 4px solid #43A047;

    .q-card-section {
      padding: 12px 16px;
    }

    .text-subtitle2 {
      font-weight: 500;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
    }

    .route-details {
      .detail-item {
        display: flex;
        align-items: center;
        margin-bottom: 4px;

        &:last-child {
          margin-bottom: 0;
        }

        .text-caption {
          font-size: 0.75rem;
        }
      }
    }
  }

  @media (max-width: 600px) {
    left: 10px;
    max-width: calc(100% - 20px);

    .info-card {
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
