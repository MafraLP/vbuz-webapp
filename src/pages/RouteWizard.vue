// src/pages/RouteWizard.vue
<template>
  <q-page>
    <div class="q-pa-md">
      <q-stepper
        v-model="step"
        ref="stepper"
        color="primary"
        animated
        flat
      >
        <q-step
          :name="1"
          title="Informações do Itinerário"
          icon="info"
          :done="step > 1"
        >
          <route-info-form
            :initial-data="routeData"
            @submit="onInfoSubmit"
          />
        </q-step>

        <q-step
          :name="2"
          title="Definir Pontos e Trajeto"
          icon="map"
          :done="step > 2"
        >
          <!-- Aqui substituímos o conteúdo anterior pelo RouteEditorPage -->
          <route-editor-page
            ref="routeEditor"
            :initial-route-data="routeData"
            @points-updated="updateRoutePoints"
          />

          <div class="row q-mt-md justify-between">
            <q-btn
              flat
              color="secondary"
              label="Voltar"
              icon="arrow_back"
              @click="step = 1"
            />
            <q-btn
              color="primary"
              label="Finalizar"
              icon-right="check"
              @click="saveRoute"
              :disable="routePoints.length < 2"
            />
          </div>
        </q-step>

        <q-step
          :name="3"
          title="Resumo"
          icon="done_all"
        >
          <div class="q-pa-md text-center">
            <q-icon name="check_circle" color="positive" size="5rem" />
            <h4 class="q-mt-md q-mb-xs">Itinerário Criado com Sucesso!</h4>
            <p class="q-ma-none">O itinerário "{{ routeData.name }}" foi salvo com {{ routePoints.length }} pontos.</p>

            <div class="row justify-center q-gutter-md q-mt-lg">
              <q-btn color="primary" label="Ver Todos os Itinerários" icon="list" to="/routes" />
              <q-btn color="secondary" label="Criar Novo Itinerário" icon="add" @click="resetWizard" />
            </div>
          </div>
        </q-step>
      </q-stepper>
    </div>
  </q-page>
</template>

<script>
import { Notify } from 'quasar';
import RouteInfoForm from 'components/maps/create_routes/RouteInfoForm.vue';
import RouteEditorPage from 'src/pages/RouteEditorPage.vue';

export default {
  name: 'RouteWizard',

  components: {
    RouteInfoForm,
    RouteEditorPage
  },

  data() {
    return {
      step: 1,
      routeData: {
        name: '',
        description: '',
        startTime: '',
        endTime: '',
        frequency: '',
        days: {
          mon: false,
          tue: false,
          wed: false,
          thu: false,
          fri: false,
          sat: false,
          sun: false
        },
        allowedCards: []
      },
      routePoints: []
    };
  },

  methods: {
    // Formulário de informações do itinerário
    onInfoSubmit(data) {
      this.routeData = data;
      this.step = 2;
    },

    // Método para receber pontos atualizados do RouteEditorPage
    updateRoutePoints(points) {
      this.routePoints = points;
    },

    // Retorna informações de programação formatadas
    getRouteSchedule() {
      const days = this.getDaysString();
      return `${days}, ${this.routeData.startTime} - ${this.routeData.endTime}, ${this.routeData.frequency}`;
    },

    // Formata os dias da semana em texto
    getDaysString() {
      const days = this.routeData.days;
      const dayMap = {
        mon: 'Seg',
        tue: 'Ter',
        wed: 'Qua',
        thu: 'Qui',
        fri: 'Sex',
        sat: 'Sáb',
        sun: 'Dom'
      };

      const activeDays = Object.keys(days)
        .filter(day => days[day])
        .map(day => dayMap[day]);

      if (activeDays.length === 7) return 'Todos os dias';
      if (activeDays.length === 5 &&
        days.mon && days.tue && days.wed && days.thu && days.fri) {
        return 'Segunda a Sexta';
      }
      if (activeDays.length === 2 && days.sat && days.sun) {
        return 'Fim de semana';
      }

      return activeDays.join(', ');
    },

    // Finalização
    saveRoute() {
      // Obter os pontos mais atualizados do RouteEditorPage
      if (this.$refs.routeEditor) {
        this.routePoints = this.$refs.routeEditor.getRoutePoints();
      }

      // Aqui você implementaria a lógica para salvar o itinerário no backend
      console.log('Salvando itinerário:', {
        ...this.routeData,
        points: this.routePoints
      });

      // Simular sucesso
      Notify.create({
        type: 'positive',
        message: 'Itinerário salvo com sucesso!',
        position: 'top'
      });

      // Avançar para o próximo passo
      this.step = 3;
    },

    resetWizard() {
      this.routeData = {
        name: '',
        description: '',
        startTime: '',
        endTime: '',
        frequency: '',
        days: {
          mon: false,
          tue: false,
          wed: false,
          thu: false,
          fri: false,
          sat: false,
          sun: false
        },
        allowedCards: []
      };
      this.routePoints = [];
      this.step = 1;
    }
  }
};
</script>
