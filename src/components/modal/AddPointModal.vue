<template>
  <q-btn
    flat
    icon="add_location"
    color="primary"
    label="Adicionar ponto"
    @click="onAddPoint"
  />
</template>

<script>
export default {
  name: "AddPointAction",

  methods: {
    onAddPoint() {
      // Emite um evento para informar o RouteEditorPage para abrir o modal
      this.$emit('update', {
        action: 'open-add-point-modal',
        data: null
      });
    }
  }
}
</script>
