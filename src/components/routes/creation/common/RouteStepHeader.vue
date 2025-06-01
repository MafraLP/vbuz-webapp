<template>
  <div class="route-step-header q-mb-md">
    <div class="text-h6">{{ title }}</div>
    <div class="text-caption" v-if="subtitle">{{ subtitle }}</div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'RouteStepHeader',

  props: {
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: ''
    }
  }
});
</script>

<style scoped>
.route-step-header {
  padding: 0 16px;
}
</style>
