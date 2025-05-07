// src/components/RouteInfoForm.vue
<template>
  <div class="route-form q-pa-md">
    <h5 class="q-mt-none q-mb-md">Informações do Itinerário</h5>

    <q-form @submit="onSubmit" class="q-gutter-md">
      <q-input
        v-model="formData.name"
        label="Nome do Itinerário"
        :rules="[val => !!val || 'Nome é obrigatório']"
        dense
      />

      <q-input
        v-model="formData.description"
        label="Descrição"
        type="textarea"
        rows="2"
      />

      <div class="col-12 col-md-6">
        <p class="text-subtitle1 q-mb-sm">Horários</p>
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-input
              v-model="formData.startTime"
              label="Horário inicial"
              type="time"
              dense
            />
          </div>
          <div class="col-6">
            <q-input
              v-model="formData.endTime"
              label="Horário final"
              type="time"
              dense
            />
          </div>
        </div>

        </div>

        <div class="col-12 col-md-6">
          <p class="text-subtitle1 q-mb-sm">Dias da semana</p>
          <div class="row q-gutter-sm">
            <q-checkbox v-model="formData.days.mon" label="Seg" />
            <q-checkbox v-model="formData.days.tue" label="Ter" />
            <q-checkbox v-model="formData.days.wed" label="Qua" />
            <q-checkbox v-model="formData.days.thu" label="Qui" />
            <q-checkbox v-model="formData.days.fri" label="Sex" />
            <q-checkbox v-model="formData.days.sat" label="Sáb" />
            <q-checkbox v-model="formData.days.sun" label="Dom" />
          </div>
      </div>

      <q-separator />

      <div>
        <p class="text-subtitle1 q-mb-sm">Quem pode utilizar este itinerário</p>
        <q-select
          v-model="formData.allowedCards"
          :options="cardOptions"
          label="Tipos de carteirinhas"
          multiple
          use-chips
          stack-label
          dense
        />
      </div>

      <div class="row justify-end q-mt-md">
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
export default {
  name: 'RouteInfoForm',

  props: {
    initialData: {
      type: Object,
      default: () => ({})
    }
  },

  data() {
    return {
      formData: {
        name: '',
        description: '',
        startTime: '07:00',
        endTime: '19:00',
        frequency: '30 min',
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
      frequencyOptions: [
        '15 min',
        '30 min',
        '1 hora',
        '2 horas',
        'Irregular'
      ],
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

  created() {
    if (this.initialData) {
      Object.keys(this.initialData).forEach(key => {
        if (this.formData[key] !== undefined) {
          this.formData[key] = this.initialData[key];
        }
      });
    }
  },

  methods: {
    onSubmit() {
      this.$emit('submit', { ...this.formData });
    }
  }
};
</script>

<style scoped>
.route-form {
  max-width: 800px;
  margin: 0 auto;
}
</style>
