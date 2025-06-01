<template>
  <div class="route-info-step">
    <q-form @submit.prevent="onNext" class="q-gutter-md">
      <q-input
        v-model="localRouteInfo.name"
        label="Nome do Itinerário"
        :rules="[val => !!val || 'Nome é obrigatório']"
        autofocus
      />

      <q-input
        v-model="localRouteInfo.description"
        label="Descrição"
        type="textarea"
        rows="2"
      />

      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <p class="text-subtitle1 q-mb-sm">Horários</p>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model="localRouteInfo.startTime"
                label="Horário inicial"
                type="time"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="localRouteInfo.endTime"
                label="Horário final"
                type="time"
              />
            </div>
          </div>
        </div>

        <div class="col-12 col-md-6">
          <p class="text-subtitle1 q-mb-sm">Dias da semana</p>
          <div class="row q-gutter-sm wrap">
            <q-checkbox v-model="localRouteInfo.days.mon" label="Seg" />
            <q-checkbox v-model="localRouteInfo.days.tue" label="Ter" />
            <q-checkbox v-model="localRouteInfo.days.wed" label="Qua" />
            <q-checkbox v-model="localRouteInfo.days.thu" label="Qui" />
            <q-checkbox v-model="localRouteInfo.days.fri" label="Sex" />
            <q-checkbox v-model="localRouteInfo.days.sat" label="Sáb" />
            <q-checkbox v-model="localRouteInfo.days.sun" label="Dom" />
          </div>
        </div>
      </div>

      <q-separator />

      <div>
        <p class="text-subtitle1 q-mb-sm">Permissões de Acesso</p>
        <q-select
          v-model="localRouteInfo.allowedCards"
          :options="cardOptions"
          label="Tipos de carteirinhas"
          multiple
          use-chips
          stack-label
        />
      </div>

      <div class="row justify-end q-mt-lg">
        <q-btn
          label="Próximo"
          color="primary"
          type="submit"
          icon-right="arrow_forward"
        />
      </div>
    </q-form>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'RouteInfoStep',

  props: {
    routeInfo: {
      type: Object,
      required: true
    }
  },

  emits: ['update:route-info', 'next'],

  data() {
    return {
      localRouteInfo: { ...this.routeInfo },
      cardOptions: [
        { label: 'Estudante', value: 'student' },
        { label: 'Funcionário', value: 'employee' },
        { label: 'Comum', value: 'regular' },
        { label: 'Vale Transporte', value: 'work' },
        { label: 'Idoso', value: 'senior' },
        { label: 'PCD', value: 'disability' }
      ]
    };
  },

  watch: {
    routeInfo: {
      handler(newValue) {
        this.localRouteInfo = { ...newValue };
      },
      deep: true
    }
  },

  methods: {
    onNext() {
      // Emitir evento para atualizar os dados da rota no componente pai
      this.$emit('update:route-info', { ...this.localRouteInfo });
      // Emitir evento para avançar para o próximo step
      this.$emit('next');
    }
  }
});
</script>

<style scoped>
.route-info-step {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}
</style>
