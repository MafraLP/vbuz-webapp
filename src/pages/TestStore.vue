<template>
  <q-page padding>
    <div class="q-pa-md">
      <h1>Teste da Store</h1>

      <div class="q-mt-md">
        <p>Contador: {{ count }}</p>

        <q-btn color="primary" label="Incrementar" @click="incrementCounter" class="q-mr-sm" />
        <q-btn color="secondary" label="Decrementar" @click="decrementCounter" />
      </div>
    </div>
  </q-page>
</template>

<script>
import { useCounterStore } from 'src/stores/counter'

export default {
  name: 'TestStorePage',

  computed: {
    count() {
      const counterStore = useCounterStore()
      return counterStore.count
    }
  },

  methods: {
    incrementCounter() {
      const counterStore = useCounterStore()
      counterStore.increment()
    },

    decrementCounter() {
      const counterStore = useCounterStore()
      counterStore.decrement()
    }
  }
}
</script>
