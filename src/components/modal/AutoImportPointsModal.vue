<template>
  <q-dialog v-model="showModal" persistent maximized>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">Auto-importação de Pontos</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section v-if="!loading && !pointsFound">
        <div class="text-h6 q-mb-md">Importar pontos principais para {{ currentInstitution.name }}</div>
        <p class="text-body1">
          Esta ferramenta irá buscar os principais pontos de interesse na região da sua cidade.
        </p>
        <p class="text-body1">
          Você pode escolher quais tipos de pontos deseja importar:
        </p>

        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-4" v-for="(category, index) in categories" :key="index">
            <q-checkbox v-model="category.selected" :label="category.label" />
          </div>
        </div>

        <q-input
          v-model="cityName"
          label="Nome da cidade *"
          outlined
          class="q-mb-md"
          :rules="[val => !!val || 'Nome da cidade é obrigatório']"
        />

        <div class="row q-col-gutter-md">
          <div class="col-6">
            <q-input
              v-model.number="searchRadius"
              label="Raio de busca (km)"
              outlined
              type="number"
              min="1"
              max="50"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="maxPointsPerCategory"
              label="Pontos por categoria"
              outlined
              type="number"
              min="1"
              max="20"
            />
          </div>
        </div>
      </q-card-section>

      <!-- Carregando -->
      <q-card-section v-if="loading" class="column items-center justify-center" style="min-height: 300px;">
        <q-spinner color="primary" size="3em" />
        <div class="text-subtitle1 q-mt-md">Buscando pontos principais na região...</div>
        <div class="text-caption q-mt-sm">{{ loadingStatus }}</div>
      </q-card-section>

      <!-- Resultados da busca -->
      <q-card-section v-if="!loading && pointsFound">
        <div class="text-h6 q-mb-md">Pontos encontrados</div>
        <p class="text-body1">
          Selecione os pontos que deseja importar ou use os botões abaixo para selecionar/desmarcar todos.
        </p>

        <div class="row q-mb-md">
          <q-btn color="primary" label="Selecionar todos" icon="check_box" flat @click="selectAllPoints" />
          <q-btn color="primary" label="Desmarcar todos" icon="check_box_outline_blank" flat @click="deselectAllPoints" />
        </div>

        <q-table
          :rows="foundPoints"
          :columns="columns"
          row-key="id"
          selection="multiple"
          v-model:selected="selectedPoints"
          :filter="filter"
          :pagination="{ rowsPerPage: 10 }"
        >
          <!-- Pesquisa -->
          <template v-slot:top-right>
            <q-input
              v-model="filter"
              outlined
              dense
              placeholder="Buscar pontos"
              class="q-mb-sm"
            >
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </template>

          <!-- Coluna de tipo -->
          <template v-slot:body-cell-type="props">
            <q-td :props="props">
              <q-chip :color="getPointTypeColor(props.row.type)" text-color="white" size="sm">
                {{ getPointTypeLabel(props.row.type) }}
              </q-chip>
            </q-td>
          </template>

          <!-- Coluna de ações -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                size="sm"
                icon="visibility"
                flat
                dense
                color="primary"
                @click="previewPoint(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>

      <!-- Mapa de preview -->
      <q-dialog v-model="showPreviewMap">
        <q-card style="width: 800px; max-width: 95vw;">
          <q-card-section class="row items-center">
            <div class="text-h6">Visualizar Ponto</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section>
            <div v-if="previewingPoint">
              <p class="text-subtitle1">{{ previewingPoint.name }}</p>
              <p class="text-caption">{{ previewingPoint.address }}</p>
            </div>
          </q-card-section>

          <q-card-section style="height: 400px; padding: 0;">
            <div id="preview-map" ref="previewMapContainer" style="width: 100%; height: 100%;"></div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <q-separator />

      <q-card-actions align="right">
        <q-btn
          flat
          label="Cancelar"
          color="grey-7"
          v-close-popup
          :disable="loading"
        />

        <q-btn
          v-if="!loading && !pointsFound"
          label="Buscar Pontos"
          color="primary"
          @click="searchPoints"
          :disable="!isFormValid"
        />

        <q-btn
          v-if="!loading && pointsFound"
          label="Voltar à busca"
          outline
          color="grey-7"
          @click="resetSearch"
        />

        <q-btn
          v-if="!loading && pointsFound"
          label="Importar Selecionados"
          color="primary"
          @click="importSelectedPoints"
          :disable="selectedPoints.length === 0"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Notify } from 'quasar';
import GeocodingService from 'src/services/GeocodingService';
import { pointsService } from 'src/services/api/points/PointsService.js'

// Corrigir problema de ícones no Leaflet (se necessário)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default {
  name: 'AutoImportPointsModal',

  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    currentInstitution: {
      type: Object,
      required: true
    },
    userLocation: {
      type: Object,
      default: null
    }
  },

  emits: ['update:modelValue', 'points-imported'],

  data() {
    return {
      // Campos de formulário
      cityName: '',
      searchRadius: 10, // km
      maxPointsPerCategory: 5,

      // Controle de estado
      loading: false,
      loadingStatus: '',
      pointsFound: false,
      filter: '',

      // Preview de ponto
      showPreviewMap: false,
      previewingPoint: null,
      previewMap: null,

      // Dados
      foundPoints: [],
      selectedPoints: [],

      // Categorias de pontos para importar
      categories: [
        { key: 'school', label: 'Escolas', selected: true, query: 'school' },
        { key: 'hospital', label: 'Hospitais', selected: true, query: 'hospital' },
        { key: 'bus_station', label: 'Terminais de ônibus', selected: true, query: 'bus station' },
        { key: 'townhall', label: 'Prefeitura', selected: true, query: 'townhall' },
        { key: 'police', label: 'Delegacias', selected: true, query: 'police' },
        { key: 'park', label: 'Parques', selected: false, query: 'park' },
        { key: 'post_office', label: 'Correios', selected: false, query: 'post office' },
        { key: 'library', label: 'Bibliotecas', selected: false, query: 'library' },
        { key: 'university', label: 'Universidades', selected: false, query: 'university' }
      ],

      // Configuração da tabela
      columns: [
        {
          name: 'name',
          required: true,
          label: 'Nome',
          align: 'left',
          field: 'name',
          sortable: true
        },
        {
          name: 'type',
          required: true,
          label: 'Tipo',
          align: 'left',
          field: 'type',
          sortable: true
        },
        {
          name: 'address',
          required: true,
          label: 'Endereço',
          align: 'left',
          field: 'address',
          sortable: true
        },
        {
          name: 'actions',
          required: true,
          label: 'Ações',
          align: 'center',
          field: 'actions'
        }
      ]
    }
  },

  computed: {
    showModal: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      }
    },
    isFormValid() {
      return !!this.cityName &&
        this.categories.some(cat => cat.selected) &&
        this.searchRadius > 0 &&
        this.maxPointsPerCategory > 0;
    }
  },

  watch: {
    showModal(isOpen) {
      if (!isOpen) {
        this.resetAll();
      } else {
        // Preencher o nome da cidade com base na instituição atual, se disponível
        if (this.currentInstitution && this.currentInstitution.city) {
          this.cityName = this.currentInstitution.city;
        }
      }
    },
    showPreviewMap(isOpen) {
      if (isOpen && this.previewingPoint) {
        this.$nextTick(() => {
          this.initPreviewMap();
        });
      }
    }
  },

  methods: {
    resetAll() {
      this.cityName = '';
      this.searchRadius = 10;
      this.maxPointsPerCategory = 5;
      this.loading = false;
      this.pointsFound = false;
      this.foundPoints = [];
      this.selectedPoints = [];
      this.categories.forEach(cat => {
        cat.selected = ['school', 'hospital', 'bus_station', 'townhall', 'police'].includes(cat.key);
      });
    },

    resetSearch() {
      this.pointsFound = false;
      this.foundPoints = [];
      this.selectedPoints = [];
    },

    async searchPoints() {
      this.loading = true;
      this.loadingStatus = 'Iniciando busca...';
      this.foundPoints = [];

      try {
        // Primeiro, obter coordenadas da cidade
        this.loadingStatus = `Buscando coordenadas para ${this.cityName}...`;
        const cityResults = await GeocodingService.searchAddress(this.cityName, 1);

        if (cityResults.length === 0) {
          throw new Error(`Não foi possível encontrar a cidade: ${this.cityName}`);
        }

        const cityLocation = {
          lat: cityResults[0].lat,
          lng: cityResults[0].lng
        };

        // Para cada categoria selecionada, buscar pontos
        const selectedCategories = this.categories.filter(cat => cat.selected);
        const totalCategories = selectedCategories.length;

        let pointId = 1;

        for (let i = 0; i < totalCategories; i++) {
          const category = selectedCategories[i];
          this.loadingStatus = `Buscando ${category.label} (${i+1}/${totalCategories})...`;

          // Montar query para a categoria
          const query = `${category.query} in ${this.cityName}`;

          // Buscar pontos para esta categoria
          const results = await GeocodingService.searchAddress(
            query,
            this.maxPointsPerCategory,
            cityLocation
          );

          // Converter para o formato dos pontos e adicionar à lista
          const categoryPoints = results.map(result => ({
            id: `import_${pointId++}`,
            name: result.name,
            type: this.mapCategoryToPointType(category.key),
            address: result.address,
            latitude: result.lat,
            longitude: result.lng,
            category: category.key
          }));

          this.foundPoints = [...this.foundPoints, ...categoryPoints];
        }

        // Marcar que pontos foram encontrados
        this.pointsFound = true;

        // Se não encontrou nenhum ponto
        if (this.foundPoints.length === 0) {
          Notify.create({
            type: 'warning',
            message: 'Nenhum ponto foi encontrado com os critérios selecionados.',
            position: 'top'
          });
        } else {
          // Selecionar todos por padrão
          this.selectedPoints = [...this.foundPoints];
        }
      } catch (error) {
        console.error('Erro ao buscar pontos:', error);
        Notify.create({
          type: 'negative',
          message: `Erro ao buscar pontos: ${error.message}`,
          position: 'top'
        });
      } finally {
        this.loading = false;
        this.loadingStatus = '';
      }
    },

    mapCategoryToPointType(category) {
      const typeMap = {
        'school': 'stop',
        'hospital': 'landmark',
        'bus_station': 'terminal',
        'townhall': 'landmark',
        'police': 'landmark',
        'park': 'landmark',
        'post_office': 'stop',
        'library': 'stop',
        'university': 'landmark'
      };

      return typeMap[category] || 'stop';
    },

    getPointTypeLabel(type) {
      const types = {
        'stop': 'Parada',
        'terminal': 'Terminal',
        'landmark': 'Ponto de Referência',
        'connection': 'Conexão'
      };

      return types[type] || type;
    },

    getPointTypeColor(type) {
      const colors = {
        'stop': 'blue',
        'terminal': 'green',
        'landmark': 'orange',
        'connection': 'purple'
      };

      return colors[type] || 'grey';
    },

    selectAllPoints() {
      this.selectedPoints = [...this.foundPoints];
    },

    deselectAllPoints() {
      this.selectedPoints = [];
    },

    previewPoint(point) {
      this.previewingPoint = point;
      this.showPreviewMap = true;
    },

    initPreviewMap() {
      if (this.previewMap) {
        this.previewMap.remove();
      }

      if (!this.$refs.previewMapContainer) return;

      // Inicializar mapa
      this.previewMap = L.map(this.$refs.previewMapContainer).setView(
        [this.previewingPoint.latitude, this.previewingPoint.longitude],
        16
      );

      // Adicionar camada de mapa base (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.previewMap);

      // Adicionar marcador para o ponto
      L.marker([this.previewingPoint.latitude, this.previewingPoint.longitude])
        .addTo(this.previewMap)
        .bindPopup(`<b>${this.previewingPoint.name}</b><br>${this.previewingPoint.address}`)
        .openPopup();
    },

    async importSelectedPoints() {
      if (this.selectedPoints.length === 0) return;

      this.loading = true;
      this.loadingStatus = 'Importando pontos selecionados...';

      try {
        // Preparar pontos para importação (formatação para API)
        const pointsToImport = this.selectedPoints.map(point => ({
          name: point.name,
          type: point.type,
          description: point.address,
          latitude: point.latitude,
          longitude: point.longitude,
          institution_id: this.currentInstitution.id,
          is_active: true
        }));

        // Importar cada ponto (um por um para melhor controle de erros)
        const importedPoints = [];

        for (let i = 0; i < pointsToImport.length; i++) {
          this.loadingStatus = `Importando ponto ${i+1} de ${pointsToImport.length}...`;
          try {
            const point = pointsToImport[i];
            const savedPoint = await PointsService.createPoint(point);
            importedPoints.push(savedPoint);
          } catch (error) {
            console.error(`Erro ao importar ponto ${i+1}:`, error);
            // Continuar com o próximo ponto
          }
        }

        // Notificar sucesso
        Notify.create({
          type: 'positive',
          message: `${importedPoints.length} pontos importados com sucesso!`,
          position: 'top'
        });

        // Emitir evento com os pontos importados
        this.$emit('points-imported', importedPoints);

        // Fechar o modal
        this.showModal = false;
      } catch (error) {
        console.error('Erro ao importar pontos:', error);
        Notify.create({
          type: 'negative',
          message: `Erro ao importar pontos: ${error.message}`,
          position: 'top'
        });
      } finally {
        this.loading = false;
        this.loadingStatus = '';
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.category-chip {
  margin-right: 8px;
  margin-bottom: 8px;
}
</style>
