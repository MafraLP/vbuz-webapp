<template>
  <div>
    <q-btn
      flat
      icon="add_location"
      color="primary"
      label="Adicionar ponto"
      @click="openModal()"
    />

    <!-- Modal para adicionar ponto -->
    <q-dialog v-model="showModal" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Adicionar Ponto de Parada</div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <q-input
            v-model="newPoint.name"
            label="Nome do ponto"
            autofocus
            :rules="[val => !!val || 'Nome é obrigatório']"
          />

          <div class="row q-col-gutter-md q-mt-md">
            <div class="col-6">
              <q-input
                v-model.number="newPoint.lat"
                label="Latitude"
                type="number"
                readonly
                :disable="coordinatesLocked"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="newPoint.lng"
                label="Longitude"
                type="number"
                readonly
                :disable="coordinatesLocked"
              />
            </div>
          </div>

          <q-select
            v-model="newPoint.type"
            :options="pointTypes"
            label="Tipo de ponto"
            class="q-mt-md"
          />
        </q-card-section>

        <!-- Visualização do mapa do ponto -->
        <q-card-section v-if="isValidPoint" class="q-pt-none">
          <div class="text-subtitle2 q-mb-sm">Localização do ponto</div>
          <div class="point-preview-map" style="height: 200px; border-radius: 8px; overflow: hidden;">
            <iframe
              :src="`https://www.openstreetmap.org/export/embed.html?bbox=${newPoint.lng-0.005},${newPoint.lat-0.005},${newPoint.lng+0.005},${newPoint.lat+0.005}&marker=${newPoint.lat},${newPoint.lng}`"
              style="width:100%; height:100%; border:none;"
            ></iframe>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup @click="closeModal" />
          <q-btn flat label="Adicionar" color="primary" @click="addPoint" :disable="!isValidPoint" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { Notify } from 'quasar';

export default {
  name: "AddPointAction",

  props: {
    routePoints: {
      type: Array,
      default: () => []
    },

    pointsService: {
      type: Object,
      default: () => ({
        addPoint: (point) => Promise.resolve(point)
      })
    }
  },

  data() {
    return {
      showModal: false,
      coordinatesLocked: false,
      newPoint: {
        name: '',
        lat: 0,
        lng: 0,
        type: 'stop'
      },
      pointTypes: [
        { label: 'Parada', value: 'stop' },
        { label: 'Terminal', value: 'terminal' },
        { label: 'Ponto de Referência', value: 'landmark' },
        { label: 'Conexão', value: 'connection' }
      ]
    };
  },

  computed: {
    isValidPoint() {
      return (
        this.newPoint.name &&
        this.newPoint.name.trim() !== '' &&
        this.newPoint.lat !== 0 &&
        this.newPoint.lng !== 0 &&
        this.newPoint.type
      );
    }
  },

  methods: {
    openModal(coords = null) {
      // Resetar o formulário
      this.resetForm();

      // Se recebeu coordenadas do clique no mapa, preencher e bloquear
      if (coords && coords.lat && coords.lng) {
        this.newPoint.lat = coords.lat;
        this.newPoint.lng = coords.lng;
        this.coordinatesLocked = true; // Bloqueia a edição das coordenadas

        // Sugerir um nome baseado na sequência
        this.newPoint.name = `Ponto ${this.routePoints.length + 1}`;
      } else {
        this.coordinatesLocked = false;
      }

      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
      this.resetForm();
    },

    resetForm() {
      this.newPoint = {
        name: '',
        lat: 0,
        lng: 0,
        type: 'stop'
      };
      this.coordinatesLocked = false;
    },

    async addPoint() {
      if (!this.isValidPoint) return;

      try {
        // Gerar ID único para o novo ponto
        const newId = Math.max(0, ...this.routePoints.map(p => p.id || 0)) + 1;

        // Criar ponto completo
        const point = {
          id: newId,
          name: this.newPoint.name,
          lat: this.newPoint.lat,
          lng: this.newPoint.lng,
          type: this.newPoint.type
        };

        // Salvar o ponto usando o serviço
        await this.pointsService.addPoint(point);

        // Notificar usuário
        Notify.create({
          type: 'positive',
          message: `Ponto "${point.name}" adicionado com sucesso!`,
          position: 'top'
        });

        // Emite evento para atualizar o mapa
        this.$emit('update-map', point);

        // Fecha o modal
        this.showModal = false;
        this.resetForm();
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: `Erro ao adicionar ponto: ${error.message || 'Erro desconhecido'}`,
          position: 'top'
        });
      }
    }
  }
}
</script>

<style scoped>
.point-preview-map {
  border: 1px solid #ddd;
}
</style>
