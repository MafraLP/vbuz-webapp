<!-- components/lists/PontoParadaList.vue -->
<template>
  <div>
    <q-card-section>
      <div class="text-subtitle1">Pontos de parada</div>
      <q-list separator>
        <q-item
          v-for="(point, index) in routePoints"
          :key="index"
          clickable
          @click="$emit('point-selected', point)"
        >
          <q-item-section>
            <q-item-label>{{ point.name }}</q-item-label>
            <q-item-label caption>{{ formatCoords(point.lat, point.lng) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat round dense icon="more_vert">
              <q-menu>
                <q-list style="min-width: 100px">
                  <q-item clickable v-close-popup @click="$emit('edit-point', point)">
                    <q-item-section>Editar</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="$emit('remove-point', point)">
                    <q-item-section>Remover</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable v-close-popup @click="$emit('move-point-up', index)" :disable="index === 0">
                    <q-item-section>Mover acima</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="$emit('move-point-down', index)" :disable="index === routePoints.length - 1">
                    <q-item-section>Mover abaixo</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </div>
</template>

<script>
export default {
  name: 'PontoParadaList',

  props: {
    routePoints: {
      type: Array,
      default: () => []
    }
  },

  emits: ['point-selected', 'edit-point', 'remove-point', 'move-point-up', 'move-point-down'],

  methods: {
    formatCoords(lat, lng) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }
}
</script>
