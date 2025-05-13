<template>
  <div>
    <q-btn
      flat
      icon="save"
      color="positive"
      label="Salvar"
      @click="confirmSave"
      :disable="routePoints.length < 2 || isSaving"
      :loading="isSaving"
    />

    <!-- Modal de confirmação -->
    <q-dialog v-model="showConfirmation" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Salvar Rota</div>
        </q-card-section>

        <q-card-section>
          <p>Deseja salvar esta rota?</p>
          <p>A rota possui {{ routePoints.length }} pontos.</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Salvar" color="positive" @click="saveRoute" :loading="isSaving" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { Notify } from 'quasar';

export default {
  name: "SaveRouteAction",

  props: {
    // Recebe a lista de pontos
    routePoints: {
      type: Array,
      default: () => []
    },

    // Recebe informações da rota
    routeInfo: {
      type: Object,
      default: () => ({})
    },

    // Recebe o serviço de rotas (ou implementação padrão)
    routeService: {
      type: Object,
      default: () => ({
        saveRoute: (points, info) => Promise.resolve({ id: 1 })
      })
    }
  },

  data() {
    return {
      showConfirmation: false,
      isSaving: false
    };
  },

  methods: {
    confirmSave() {
      if (this.routePoints.length < 2) return;
      this.showConfirmation = true;
    },

    async saveRoute() {
      if (this.isSaving) return;

      this.isSaving = true;

      try {
        // Salvar a rota usando o serviço
        const result = await this.routeService.saveRoute(
          this.routePoints,
          this.routeInfo
        );

        Notify.create({
          type: 'positive',
          message: `Rota salva com sucesso! ID: ${result.id}`,
          position: 'top'
        });

        // Fecha o modal de confirmação
        this.showConfirmation = false;

        // Emite evento para atualizar o mapa
        this.$emit('update-map');
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: `Erro ao salvar rota: ${error.message}`,
          position: 'top'
        });
      } finally {
        this.isSaving = false;
      }
    }
  }
}
</script>
