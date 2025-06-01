<template>
  <div class="map-controls">
    <q-btn
      round
      color="primary"
      icon="my_location"
      @click="$emit('center-user-location')"
      :loading="loadingUser"
      class="location-btn"
    />
    <q-btn
      round
      color="secondary"
      icon="route"
      @click="$emit('calculate-route')"
      class="route-btn q-ml-sm"
      v-if="canCalculateRoute"
      :disable="!hasUserInstitution || isCalculating"
      :loading="isCalculating"
    />
    <q-btn
      round
      color="info"
      icon="refresh"
      @click="$emit('refresh-route')"
      class="refresh-btn q-ml-sm"
      v-if="routeId && routeData"
      :disable="isCalculating"
      size="md"
    />
  </div>
</template>

<script>
export default {
  name: 'MapControls',

  props: {
    loadingUser: {
      type: Boolean,
      default: false
    },
    canCalculateRoute: {
      type: Boolean,
      default: false
    },
    hasUserInstitution: {
      type: Boolean,
      default: false
    },
    isCalculating: {
      type: Boolean,
      default: false
    },
    routeId: {
      type: Number,
      default: null
    },
    routeData: {
      type: Object,
      default: null
    }
  },

  emits: [
    'center-user-location',
    'calculate-route',
    'refresh-route'
  ]
};
</script>

<style lang="scss" scoped>
.map-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;

  .location-btn,
  .route-btn,
  .refresh-btn {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .route-btn:disabled {
    opacity: 0.6;
  }

  .refresh-btn {
    background-color: #17a2b8;

    &:hover {
      background-color: #138496;
    }
  }

  @media (max-width: 600px) {
    bottom: 10px;
    right: 10px;
  }
}
</style>
