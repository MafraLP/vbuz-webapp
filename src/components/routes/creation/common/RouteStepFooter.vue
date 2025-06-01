<template>
  <div class="route-step-footer q-mt-lg row justify-between">
    <q-btn
      v-if="showBack"
      :label="backLabel"
      color="grey"
      flat
      icon="arrow_back"
      @click="$emit('back')"
    />
    <div v-else></div>

    <q-btn
      :label="nextLabel"
      :color="color"
      :icon-right="icon"
      @click="$emit('next')"
      :disable="disable"
      :loading="loading"
    />
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'RouteStepFooter',

  props: {
    showBack: {
      type: Boolean,
      default: true
    },
    backLabel: {
      type: String,
      default: 'Voltar'
    },
    nextLabel: {
      type: String,
      default: 'Próximo'
    },
    color: {
      type: String,
      default: 'primary'
    },
    icon: {
      type: String,
      default: 'arrow_forward'
    },
    disable: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['next', 'back']
});
</script>

<style scoped>
.route-step-footer {
  padding: 0 16px;
}
</style>
