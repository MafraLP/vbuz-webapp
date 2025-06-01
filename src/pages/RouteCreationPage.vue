<template>
  <q-page class="route-creation-page q-py-md q-px-md">
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h5">{{ isEditing ? 'Editar Itinerário' : 'Criar Novo Itinerário' }}</div>
        <div class="text-caption text-grey">Preencha as informações e defina os pontos no mapa</div>
      </q-card-section>
    </q-card>

    <q-stepper
      v-model="step"
      horizontal
      color="primary"
      animated
      flat
      header-nav
      class="full-width"
    >
      <!-- Step 1: Informações Básicas -->
      <q-step
        :name="1"
        title="Informações Básicas"
        icon="info"
        :done="step > 1"
      >
        <route-info-step
          :route-info="routeInfo"
          @update:route-info="handleRouteInfoUpdate"
          @next="step = 2"
        />
      </q-step>

      <!-- Step 2: Configuração do Mapa e Pontos -->
      <q-step
        :name="2"
        title="Definição de Pontos e Rota"
        icon="map"
        :done="step > 2"
      >
        <route-map-step
          ref="mapStep"
          :route-id="routeId"
          :route-points="routePoints"
          :route-details="routeDetails"
          :route-draw="routeDraw"
          @update:route-draw="handleRouteDrawUpdate"
          @update:route-points="handleRoutePointsUpdate"
          @update:route-details="handleRouteDetailsUpdate"
          @next="validateAndContinue"
          @back="step = 1"
        />
      </q-step>

      <!-- Step 3: Resumo e Confirmação -->
      <q-step
        :name="3"
        title="Confirmação"
        icon="check_circle"
      >
        <route-confirmation-step
          :route-info="routeInfo"
          :route-points="routePoints"
          :route-details="routeDetails"
          :route-draw="routeDraw"
          :is-saving="isSaving"
          @save="finalSaveRoute"
          @back="step = 2"
        />
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import RouteInfoStep from 'src/components/routes/creation/RouteInfoStep.vue';
import RouteMapStep from 'src/components/routes/creation/RouteMapStep.vue';
import RouteConfirmationStep from 'src/components/routes/creation/RouteConfirmationStep.vue';
import { routeApiService } from 'src/services/api/route/RouteApiService.js';

export default defineComponent({
  name: 'RouteCreationPage',

  components: {
    RouteInfoStep,
    RouteMapStep,
    RouteConfirmationStep
  },

  setup() {
    const quasar = useQuasar();
    const route = useRoute();
    const router = useRouter();

    return {
      quasar,
      route,
      router
    };
  },

  data() {
    return {
      step: 1,
      routeId: null,
      routeInfo: {
        name: '',
        description: '',
        startTime: '07:00',
        endTime: '19:00',
        days: {
          mon: true,
          tue: true,
          wed: true,
          thu: true,
          fri: true,
          sat: false,
          sun: false
        },
        allowedCards: []
      },
      routePoints: [],
      routeDetails: {
        totalDistance: 0,
        totalDuration: 0
      },
      routeDraw: [],
      isSaving: false
    };
  },

  computed: {
    isEditing() {
      return !!this.routeId;
    }
  },

  created() {
    // Verificar se estamos editando uma rota existente
    const id = this.route.params.id;
    if (id && id !== 'new') {
      this.routeId = parseInt(id);
      this.loadExistingRoute();
    }
  },

  methods: {
    // ===========================================
    // MÉTODOS DE SANITIZAÇÃO E VALIDAÇÃO
    // ===========================================
    sanitizeString(str) {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove caracteres de controle
        .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove caracteres não imprimíveis
        .replace(/["'<>&]/g, '') // Remove caracteres problemáticos
        .trim();
    },

    sanitizeRouteInfo(routeInfo) {
      if (!routeInfo) return routeInfo;

      return {
        ...routeInfo,
        name: this.sanitizeString(routeInfo.name || ''),
        description: this.sanitizeString(routeInfo.description || ''),
        startTime: this.sanitizeString(routeInfo.startTime || '07:00'),
        endTime: this.sanitizeString(routeInfo.endTime || '19:00'),
        days: routeInfo.days || {},
        allowedCards: Array.isArray(routeInfo.allowedCards) ? routeInfo.allowedCards : []
      };
    },

    validateRouteId(id) {
      const numId = parseInt(id);
      return !isNaN(numId) && numId > 0 ? numId : null;
    },

    // ===========================================
    // HANDLERS DE EVENTOS
    // ===========================================
    handleRouteInfoUpdate(routeInfo) {
      console.log('RouteCreationPage: Atualizando route info:', routeInfo);
      this.routeInfo = this.sanitizeRouteInfo(routeInfo);
    },

    handleRoutePointsUpdate(points) {
      console.log('RouteCreationPage: Atualizando pontos:', points?.length || 0);
      if (Array.isArray(points)) {
        this.routePoints = points.map((point, index) => this.sanitizePointData(point, index));
      }
    },

    handleRouteDetailsUpdate(details) {
      console.log('RouteCreationPage: Atualizando detalhes:', details);
      if (details && typeof details === 'object') {
        this.routeDetails = {
          totalDistance: Number(details.totalDistance || 0),
          totalDuration: Number(details.totalDuration || 0)
        };
      }
    },

    handleRouteDrawUpdate(segments) {
      console.log('RouteCreationPage: Recebendo segmentos:', segments?.length || 0);
      console.log('Segmentos detalhados:', segments);

      if (Array.isArray(segments)) {
        this.routeDraw = segments.map((segment, index) => this.sanitizeSegmentData(segment, index));
      } else {
        this.routeDraw = [];
      }
    },

    // ===========================================
    // MÉTODOS DE SANITIZAÇÃO DE DADOS
    // ===========================================
    sanitizePointData(point, index) {
      if (!point || typeof point !== 'object') return null;

      // Gerar ID seguro se necessário
      let safeId = point.id;
      if (!safeId || (typeof safeId === 'string' && safeId.includes('temp_'))) {
        safeId = `point-${Date.now()}-${index}`;
      }

      return {
        id: safeId,
        name: this.sanitizeString(point.name || `Ponto ${index + 1}`),
        lat: Number(point.lat || point.latitude || 0),
        lng: Number(point.lng || point.longitude || 0),
        latitude: Number(point.lat || point.latitude || 0),
        longitude: Number(point.lng || point.longitude || 0),
        sequence: Number(point.sequence || index),
        route_id: this.routeId
      };
    },

    sanitizeSegmentData(segment, index) {
      if (!segment || typeof segment !== 'object') return null;

      return {
        id: segment.id || `segment-${index}`,
        sequence: Number(segment.sequence || index),
        distance: Number(segment.distance || 0),
        duration: Number(segment.duration || 0),
        geometry: segment.geometry || null,
        start_point_id: segment.start_point_id || null,
        end_point_id: segment.end_point_id || null
      };
    },

    // ===========================================
    // CARREGAMENTO DE ROTA EXISTENTE
    // ===========================================
    async loadExistingRoute() {
      try {
        console.log('Carregando rota existente:', this.routeId);

        const { data } = await routeApiService.getRoute(this.routeId);
        console.log('Dados da rota carregados:', data);

        // Preencher as informações da rota
        this.routeInfo = this.sanitizeRouteInfo({
          name: data.route?.name || data.name || '',
          description: data.route?.description || data.description || '',
          startTime: data.route?.schedule_data?.start_time || data.schedule_data?.start_time || '07:00',
          endTime: data.route?.schedule_data?.end_time || data.schedule_data?.end_time || '19:00',
          days: this.parseDaysFromBackend(data.route?.schedule_data?.days || data.schedule_data?.days),
          allowedCards: this.parseCardsFromBackend(data.route?.permissions || data.permissions || [])
        });

        // Preencher os pontos da rota
        const points = data.route?.points || data.points || [];
        if (points.length > 0) {
          this.routePoints = points.map((p, index) => this.sanitizePointData({
            id: p.id,
            name: p.name,
            lat: p.latitude,
            lng: p.longitude,
            latitude: p.latitude,
            longitude: p.longitude,
            sequence: p.sequence,
            route_id: this.routeId
          }, index)).filter(Boolean);
        }

        // Preencher os detalhes da rota
        const routeData = data.route || data;
        this.routeDetails = {
          totalDistance: Number(routeData.total_distance || 0),
          totalDuration: Number(routeData.total_duration || 0)
        };

        // Preencher os segmentos da rota
        const segments = routeData.segments || [];
        if (segments.length > 0) {
          console.log('Carregando segmentos existentes:', segments.length);
          this.routeDraw = segments.map((segment, index) =>
            this.sanitizeSegmentData(segment, index)
          ).filter(Boolean);
        }

        this.quasar.notify({
          type: 'positive',
          message: 'Rota carregada com sucesso!'
        });

        console.log('Estado final após carregamento:', {
          routeInfo: this.routeInfo,
          routePoints: this.routePoints.length,
          routeDetails: this.routeDetails,
          routeDraw: this.routeDraw.length
        });

      } catch (error) {
        console.error('Erro ao carregar rota:', error);
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao carregar dados da rota'
        });
      }
    },

    parseDaysFromBackend(days) {
      if (!days) return {
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
      };

      // Se já é um objeto, retorna como está
      if (typeof days === 'object' && !Array.isArray(days)) {
        return days;
      }

      // Converte array de números para objeto
      if (Array.isArray(days)) {
        return {
          mon: days.includes(1),
          tue: days.includes(2),
          wed: days.includes(3),
          thu: days.includes(4),
          fri: days.includes(5),
          sat: days.includes(6),
          sun: days.includes(7)
        };
      }

      // Fallback padrão
      return {
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false
      };
    },

    parseCardsFromBackend(permissions) {
      if (!Array.isArray(permissions)) return [];

      const cardMap = {
        'student': { label: 'Estudante', value: 'student' },
        'employee': { label: 'Funcionário', value: 'employee' },
        'regular': { label: 'Comum', value: 'regular' },
        'work': { label: 'Vale Transporte', value: 'work' },
        'senior': { label: 'Idoso', value: 'senior' },
        'disability': { label: 'PCD', value: 'disability' }
      };

      return permissions
        .map(p => {
          const permission = typeof p === 'string' ? p : p.value || p.type;
          return cardMap[permission] || { label: permission, value: permission };
        })
        .filter(Boolean);
    },

    // ===========================================
    // VALIDAÇÃO E NAVEGAÇÃO
    // ===========================================
    validateAndContinue() {
      console.log('=== VALIDAÇÃO PARA CONTINUAR ===');
      console.log('Pontos:', this.routePoints.length);
      console.log('Distância:', this.routeDetails.totalDistance);
      console.log('Segmentos:', this.routeDraw.length);

      // Validar pontos
      if (this.routePoints.length < 2) {
        this.quasar.notify({
          type: 'warning',
          message: 'Adicione pelo menos 2 pontos para criar uma rota'
        });
        return;
      }

      // Validar distância calculada
      if (!this.routeDetails.totalDistance || this.routeDetails.totalDistance <= 0) {
        this.quasar.notify({
          type: 'warning',
          message: 'Trace a rota antes de continuar'
        });
        return;
      }

      // Validar segmentos
      if (!this.routeDraw || this.routeDraw.length === 0) {
        console.warn('routeDraw está vazio:', this.routeDraw);
        this.quasar.notify({
          type: 'warning',
          message: 'Aguarde o cálculo da rota ser finalizado'
        });
        return;
      }

      console.log('Validação passou - avançando para confirmação');
      this.step = 3;
    },

    // ===========================================
    // SALVAMENTO FINAL
    // ===========================================
    async finalSaveRoute() {
      if (this.isSaving) return;

      this.isSaving = true;

      try {
        console.log('=== SALVANDO ROTA FINAL ===');
        console.log('Dados a serem salvos:', {
          routeInfo: this.routeInfo,
          routePoints: this.routePoints.length,
          routeDetails: this.routeDetails,
          routeDraw: this.routeDraw.length
        });

        // Preparar dados para o backend
        const routeData = {
          name: this.sanitizeString(this.routeInfo.name),
          description: this.sanitizeString(this.routeInfo.description),
          schedule_type: 'daily',
          schedule_data: {
            start_time: this.routeInfo.startTime,
            end_time: this.routeInfo.endTime,
            days: this.getDaysArray(this.routeInfo.days)
          },
          permissions: (this.routeInfo.allowedCards || []).map(card =>
            typeof card === 'string' ? card : card.value
          ),
          is_public: true,
          points: this.routePoints.map(p => ({
            id: p.id && !p.id.toString().startsWith('temp_') && !p.id.toString().startsWith('point-')
              ? p.id : undefined,
            name: this.sanitizeString(p.name),
            latitude: Number(p.lat || p.latitude),
            longitude: Number(p.lng || p.longitude),
            sequence: Number(p.sequence)
          })),
          segments: this.routeDraw.filter(Boolean)
        };

        console.log('Dados preparados para envio:', routeData);

        let response;

        if (this.isEditing) {
          response = await routeApiService.updateRoute(this.routeId, routeData);
          console.log('Rota atualizada:', response.data);
        } else {
          response = await routeApiService.createRoute(routeData);
          console.log('Rota criada:', response.data);
        }

        // Atualizar ID da rota se for uma nova rota
        if (!this.isEditing && response.data) {
          const newId = response.data.id || response.data.route?.id;
          if (newId) {
            this.routeId = this.validateRouteId(newId);
          }
        }

        this.quasar.notify({
          type: 'positive',
          message: this.isEditing ? 'Itinerário atualizado com sucesso!' : 'Itinerário criado com sucesso!'
        });

        // Redirecionar para a página de detalhes da rota
        if (this.routeId) {
          this.router.push(`/routes/${this.routeId}`);
        } else {
          this.router.push('/routes');
        }

      } catch (error) {
        console.error('Erro ao salvar rota:', error);
        this.quasar.notify({
          type: 'negative',
          message: `Erro ao salvar o itinerário: ${error.message || 'Erro desconhecido'}`
        });
      } finally {
        this.isSaving = false;
      }
    },

    getDaysArray(days) {
      if (!days || typeof days !== 'object') return [1, 2, 3, 4, 5];

      // Converter objeto de dias para array de números (1-7)
      const result = [];
      if (days.mon) result.push(1);
      if (days.tue) result.push(2);
      if (days.wed) result.push(3);
      if (days.thu) result.push(4);
      if (days.fri) result.push(5);
      if (days.sat) result.push(6);
      if (days.sun) result.push(7);

      return result.length > 0 ? result : [1, 2, 3, 4, 5]; // Fallback para dias úteis
    }
  }
});
</script>

<style scoped>
.route-creation-page {
  max-width: 1600px;
  margin: 0 auto;
  padding-bottom: 50px;
}

/* Estilos para aumentar o espaço horizontal dos steps */
:deep(.q-stepper__header) {
  width: 100%;
  padding: 0 16px;
}

:deep(.q-stepper__tab) {
  flex: 1;
  min-width: 200px;
  padding: 16px 32px;
}

:deep(.q-stepper__step-content) {
  padding: 24px;
}

/* Em telas menores, usamos configurações mais compactas */
@media (max-width: 768px) {
  :deep(.q-stepper__tab) {
    min-width: auto;
    padding: 8px 16px;
  }

  :deep(.q-stepper__step-content) {
    padding: 16px 8px;
  }
}
</style>
