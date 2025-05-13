<template>
  <q-btn
    flat
    icon="undo"
    color="accent"
    label="Desfazer"
    @click="undo"
    :disable="isLoading"
  />
</template>

<script>
import { Notify } from 'quasar';

export default {
  name: "UndoAction",

  props: {
    // Recebe o serviço de histórico (ou implementação padrão)
    historyService: {
      type: Object,
      default: () => ({
        undo: () => Promise.resolve(true)
      })
    }
  },

  data() {
    return {
      isLoading: false
    };
  },

  methods: {
    async undo() {
      this.isLoading = true;

      try {
        // Realiza a operação de desfazer
        await this.historyService.undo();

        Notify.create({
          type: 'positive',
          message: 'Ação desfeita com sucesso',
          position: 'top'
        });

        // Emite evento para atualizar o mapa
        this.$emit('update-map');
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: `Erro ao desfazer: ${error.message}`,
          position: 'top'
        });
      } finally {
        this.isLoading = false;
      }
    }
  }
}
</script>
