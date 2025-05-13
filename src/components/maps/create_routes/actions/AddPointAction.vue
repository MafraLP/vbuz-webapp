<template>
  <q-btn
    flat
    icon="add_location"
    color="primary"
    label="Adicionar ponto"
    @click="openModal"
  />

  <!-- Modal integrado no componente -->
  <q-dialog v-model="showModal" persistent>
    <q-card style="min-width: 350px; max-width: 90vw;">
      <q-card-section>
        <div class="text-h6">Adicionar Ponto de Parada</div>
      </q-card-section>

      <q-separator />

      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="coordinates" label="Coordenadas" icon="location_on" />
        <q-tab name="search" label="Buscar Endereço" icon="search" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel name="coordinates">
          <q-input v-model="newPoint.name" label="Nome do ponto" class="q-mb-md" />
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input v-model.number="newPoint.lat" label="Latitude" type="number" />
            </div>
            <div class="col-6">
              <q-input v-model.number="newPoint.lng" label="Longitude" type="number" />
            </div>
          </div>
          <q-select
            v-model="newPoint.type"
            :options="pointTypes"
            label="Tipo de ponto"
            class="q-mt-md"
          />
        </q-tab-panel>

        <q-tab-panel name="search">
          <q-input
            v-model="searchAddress"
            label="Buscar endereço ou local"
            class="q-mb-md"
            @keyup.enter="searchLocation"
          >
            <template v-slot:append>
              <q-btn round dense flat icon="search" @click="searchLocation" />
            </template>
          </q-input>

          <div v-if="searchResults.length > 0" class="q-mb-md">
            <q-list bordered separator>
              <q-item
                v-for="(result, index) in searchResults"
                :key="index"
                clickable
                @click="selectSearchResult(result)"
              >
                <q-item-section>
                  <q-item-label>{{ result.name }}</q-item-label>
                  <q-item-label caption>{{ result.address }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <div v-if="searchError" class="text-negative q-mb-sm">
            {{ searchError }}
          </div>

          <div v-if="selectedLocation" class="q-mt-md">
            <q-input v-model="newPoint.name" label="Nome do ponto" />
            <q-select
              v-model="newPoint.type"
              :options="pointTypes"
              label="Tipo de ponto"
              class="q-mt-md"
            />
          </div>
        </q-tab-panel>
      </q-tab-panels>

      <q-card-actions align="right">
        <q-btn flat label="Cancelar" color="grey" v-close-popup />
        <q-btn flat label="Adicionar" color="primary" @click="addPoint" :disable="!isValidPoint" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { Notify } from 'quasar';
import GeocodingService from 'src/services/GeocodingService';

export default {
  name: "AddPointAction",

  props: {
    // Recebe a lista de pontos existentes para adicionar um novo
    routePoints: {
      type: Array,
      default: () => []
    },

    // Recebe o serviço de pontos (ou implementação padrão)
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
      activeTab: 'coordinates',
      searchAddress: '',
      searchResults: [],
      searchError: '',
      selectedLocation: null,
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
    openModal() {
      this.resetForm();
      this.showModal = true;
    },

    resetForm() {
      this.newPoint = {
        name: '',
        lat: 0,
        lng: 0,
        type: 'stop'
      };
      this.searchAddress = '';
      this.searchResults = [];
      this.searchError = '';
      this.selectedLocation = null;
      this.activeTab = 'coordinates';
    },

    async searchLocation() {
      if (!this.searchAddress.trim()) {
        this.searchError = 'Digite um endereço para buscar';
        return;
      }

      this.searchError = '';

      try {
        const results = await GeocodingService.searchAddress(this.searchAddress);

        if (results.length === 0) {
          this.searchError = 'Nenhum resultado encontrado para este endereço';
          this.searchResults = [];
          return;
        }

        this.searchResults = results;
      } catch (error) {
        console.error('Erro na busca:', error);
        this.searchError = 'Erro ao buscar endereço. Tente novamente.';
      }
    },

    selectSearchResult(result) {
      this.selectedLocation = result;
      this.newPoint.name = result.name;
      this.newPoint.lat = result.lat;
      this.newPoint.lng = result.lng;
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

        // Salvar o ponto usando o serviço (pode ser passado como prop ou usar o padrão)
        await this.pointsService.addPoint(point);

        // Notificar usuário
        Notify.create({
          type: 'positive',
          message: `Ponto "${point.name}" adicionado com sucesso!`,
          position: 'top'
        });

        // Emite evento para recarregar o mapa
        this.$emit('update-map');

        // Fecha o modal
        this.showModal = false;
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: `Erro ao adicionar ponto: ${error.message}`,
          position: 'top'
        });
      }
    }
  }
}
</script>
