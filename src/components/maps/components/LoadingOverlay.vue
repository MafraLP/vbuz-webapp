<template>
  <div class="loading-overlay flex flex-center">
    <q-spinner color="primary" size="3em" />
    <span class="q-ml-sm">{{ message }}</span>
  </div>
</template>

<script>
export default {
  name: 'LoadingOverlay',

  props: {
    message: {
      type: String,
      default: 'Carregando...'
    }
  }
};
</script>

<style lang="scss" scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .q-spinner {
    margin-bottom: 16px;
  }
}
</style>
