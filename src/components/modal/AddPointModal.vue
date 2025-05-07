// src/components/modal/AddPointModal.vue
<template>
  <base-modal
    v-model="show"
    title="Adicionar Ponto de Parada"
    :persistent="persistent"
    :loading="isSaving"
    @cancel="onCancel"
    @confirm="addPoint"
    :confirm-button-label="'Adicionar'"
    :disable-confirm="!isValidPoint"
    modalId="add-point-modal"
  >
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
          <q-btn icon="place" label="Apontar no Mapa" color="primary" @click="pointOnMapCoord" />
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
  </base-modal>
</template>

<script>
import { Notify } from 'quasar';
import GeocodingService from 'src/services/GeocodingService';
import BaseModal from 'src/components/modal/BaseModal.vue';
import ModalMixin from "src/mixin/ModalMixin.ts";

export default {
  name: 'AddPointModal',
  components: {
    BaseModal
  },
  mixins: [ModalMixin],
  props: {
    initialCoords: {
      type: Object,
      default: () => null
    }
  },
  emits: ['update:modelValue', 'point-added', 'cancel'],
  data() {
    return {
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
      ],
      waitingMapClick: false,
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
  mounted () {
    if(this.initialCoords) {
      console.log(this.initialCoords)
      this.newPoint.lat = this.initialCoords.lat;
      this.newPoint.lng = this.initialCoords.lng;
    }
  },
  watch: {
    initialData(data) {
      if (data && data.coords) {
        this.newPoint.lat = data.coords.lat;
        this.newPoint.lng = data.coords.lng;
        this.activeTab = 'coordinates';
      }
    }
  },

  methods: {
    resetData() {
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

    onCancel() {
      this.$emit('cancel');
      this.close();
    },

    pointOnMapCoord() {
      this.close(true);

      this.waitingMapClick = true;

      this.enableMapClickListener();
    },

    enableMapClickListener() {
      const handleMalClick = (event) => {
        console.log(event)
        this.newPoint.lat = event.latlng.lat
        this.newPoint.lng = event.latlng.lng
      }
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

    addPoint() {
      if (!this.isValidPoint) return;

      // Criar ponto completo
      const point = {
        id: Date.now(), // Usar timestamp como ID temporário
        name: this.newPoint.name,
        lat: this.newPoint.lat,
        lng: this.newPoint.lng,
        type: this.newPoint.type
      };

      // Emitir evento
      this.$emit('point-added', point);

      // Notificar usuário
      Notify.create({
        type: 'positive',
        message: `Ponto "${point.name}" adicionado com sucesso!`,
        position: 'top'
      });

      // Resetar e fechar
      this.close();
    }
  }
};
</script>
