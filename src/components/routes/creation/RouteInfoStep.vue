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

      <!-- Configuração de Agendamento -->
      <div>
        <p class="text-subtitle1 q-mb-sm">
          <q-icon name="schedule" class="q-mr-sm" />
          Configuração de Horários
        </p>

        <div class="schedule-config q-gutter-md">
          <!-- Tipo de Agendamento -->
          <q-select
              v-model="localRouteInfo.scheduleType"
              :options="scheduleTypeOptions"
              label="Tipo de Agendamento"
              emit-value
              map-options
          />

          <!-- Horários (apenas para daily/weekly) -->
          <div v-if="showTimeFields" class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                  v-model="localRouteInfo.startTime"
                  label="Horário inicial"
                  type="time"
                  :rules="[val => !!val || 'Horário inicial é obrigatório']"
              />
            </div>
            <div class="col-6">
              <q-input
                  v-model="localRouteInfo.endTime"
                  label="Horário final"
                  type="time"
                  :rules="[val => !!val || 'Horário final é obrigatório']"
              />
            </div>
          </div>

          <!-- Dias da semana (apenas para daily/weekly) -->
          <div v-if="showDaysFields">
            <p class="text-body2 q-mb-sm">Dias da semana</p>
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

          <!-- Configuração customizada -->
          <div v-if="localRouteInfo.scheduleType === 'custom'">
            <q-input
                v-model="localRouteInfo.customDescription"
                label="Descrição da configuração personalizada"
                type="textarea"
                rows="2"
                hint="Descreva os horários e condições especiais desta rota"
            />
          </div>
        </div>
      </div>

      <q-separator />

      <!-- Configurações de Acesso -->
      <div>
        <p class="text-subtitle1 q-mb-sm">
          <q-icon name="security" class="q-mr-sm" />
          Controle de Acesso
        </p>

        <div class="access-config q-gutter-md">
          <!-- Tipo de Acesso -->
          <q-radio
              v-model="localRouteInfo.accessType"
              val="public"
              label="Rota Pública (acesso livre)"
              @update:model-value="onAccessTypeChange"
          />
          <q-radio
              v-model="localRouteInfo.accessType"
              val="restricted"
              label="Rota Restrita (requer carteirinhas específicas)"
              @update:model-value="onAccessTypeChange"
          />

          <!-- Seleção de Carteirinhas (apenas se for restrita) -->
          <div v-if="localRouteInfo.accessType === 'restricted'" class="q-mt-md">
            <q-select
                v-model="localRouteInfo.allowedPermissions"
                :options="permissionOptions"
                label="Carteirinhas permitidas"
                multiple
                use-chips
                stack-label
                :loading="loadingPermissions"
                option-label="name"
                option-value="id"
                emit-value
                map-options
                hint="Selecione as carteirinhas que terão acesso a esta rota"
            >
              <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                <q-item v-bind="itemProps">
                  <q-item-section avatar>
                    <q-icon
                        :name="opt.icon || 'card_membership'"
                        :color="opt.color || 'primary'"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ opt.name }}</q-item-label>
                    <q-item-label caption>{{ opt.description }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-checkbox :model-value="selected" @update:model-value="toggleOption" />
                  </q-item-section>
                </q-item>
              </template>

              <template v-slot:selected-item="{ opt }">
                <q-chip
                    removable
                    @remove="removePermission(opt.id)"
                    :color="opt.color || 'primary'"
                    text-color="white"
                    :icon="opt.icon || 'card_membership'"
                    size="sm"
                >
                  {{ opt.name }}
                </q-chip>
              </template>

              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    {{ loadingPermissions ? 'Carregando carteirinhas...' : 'Nenhuma carteirinha disponível' }}
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <!-- Resumo das permissões selecionadas -->
            <div v-if="selectedPermissionsCount > 0" class="permissions-summary q-mt-sm">
              <div class="text-caption text-grey-6">
                {{ selectedPermissionsCount }} carteirinha(s) selecionada(s)
              </div>
            </div>
          </div>

          <!-- Status da Rota -->
          <div class="q-mt-md">
            <q-checkbox
                v-model="localRouteInfo.isPublic"
                label="Rota visível publicamente"
                :disable="localRouteInfo.accessType === 'public'"
                hint="Se marcada, a rota aparecerá nas listagens públicas"
            />
            <div class="text-caption text-grey-6 q-mt-xs">
              {{ getAccessSummary() }}
            </div>
          </div>
        </div>
      </div>

      <div class="row justify-end q-mt-lg">
        <q-btn
            label="Próximo"
            color="primary"
            type="submit"
            icon-right="arrow_forward"
            :loading="submitting"
        />
      </div>
    </q-form>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { useQuasar } from 'quasar'
import {permissionApiService} from "src/services/api/permissions/PermissionApiService.js";
import { useAuthStore } from 'stores/auth'

export default defineComponent({
  name: 'RouteInfoStep',

  props: {
    routeInfo: {
      type: Object,
      required: true
    }
  },

  emits: ['update:route-info', 'next'],

  setup() {
    const quasar = useQuasar()
    const authStore = useAuthStore()

    return {
      quasar,
      authStore
    }
  },

  data() {
    return {
      localRouteInfo: { ...this.routeInfo },
      permissionOptions: [],
      loadingPermissions: false,
      submitting: false,

      // Opções de tipo de agendamento
      scheduleTypeOptions: [
        { label: 'Diário', value: 'daily' },
        { label: 'Semanal', value: 'weekly' },
        { label: 'Mensal', value: 'monthly' },
        { label: 'Personalizado', value: 'custom' }
      ]
    }
  },

  computed: {
    selectedPermissionsCount() {
      return this.localRouteInfo.allowedPermissions?.length || 0
    },

    institutionId() {
      return this.authStore.primaryInstitutionId
    },

    showTimeFields() {
      return ['daily', 'weekly'].includes(this.localRouteInfo.scheduleType)
    },

    showDaysFields() {
      return ['daily', 'weekly'].includes(this.localRouteInfo.scheduleType)
    }
  },

  watch: {
    routeInfo: {
      handler(newValue) {
        this.localRouteInfo = { ...newValue }
      },
      deep: true
    },

    'localRouteInfo.scheduleType'(newType) {
      // Limpar campos dependentes quando o tipo muda
      if (!this.showTimeFields) {
        this.localRouteInfo.startTime = ''
        this.localRouteInfo.endTime = ''
      }
      if (!this.showDaysFields) {
        this.localRouteInfo.days = {
          mon: false, tue: false, wed: false, thu: false,
          fri: false, sat: false, sun: false
        }
      }
      if (newType !== 'custom') {
        this.localRouteInfo.customDescription = ''
      }
    }
  },

  async mounted() {
    await this.loadPermissions()
    this.initializeRouteInfo()
  },

  methods: {
    initializeRouteInfo() {
      // Garantir que os campos necessários existam
      if (!this.localRouteInfo.scheduleType) {
        this.localRouteInfo.scheduleType = 'daily'
      }
      if (!this.localRouteInfo.accessType) {
        this.localRouteInfo.accessType = 'public'
      }
      if (!this.localRouteInfo.allowedPermissions) {
        this.localRouteInfo.allowedPermissions = []
      }
      if (this.localRouteInfo.isPublic === undefined) {
        this.localRouteInfo.isPublic = true
      }
      if (!this.localRouteInfo.days) {
        this.localRouteInfo.days = {
          mon: true, tue: true, wed: true, thu: true,
          fri: true, sat: false, sun: false
        }
      }
      if (!this.localRouteInfo.startTime) {
        this.localRouteInfo.startTime = '07:00'
      }
      if (!this.localRouteInfo.endTime) {
        this.localRouteInfo.endTime = '19:00'
      }
      if (!this.localRouteInfo.customDescription) {
        this.localRouteInfo.customDescription = ''
      }
    },

    async loadPermissions() {
      if (!this.institutionId) {
        console.warn('Nenhuma instituição encontrada para carregar permissões')
        return
      }

      this.loadingPermissions = true

      try {
        const response = await permissionApiService.getInstitutionPermissions(this.institutionId)

        if (response.data?.success && response.data.permissions) {
          this.permissionOptions = response.data.permissions.data || response.data.permissions
          console.log('Permissões carregadas:', this.permissionOptions.length)
        } else {
          console.warn('Resposta de permissões inválida:', response.data)
          this.permissionOptions = []
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error)
        this.quasar.notify({
          type: 'warning',
          message: 'Erro ao carregar carteirinhas. Usando acesso público.',
          position: 'top'
        })
        this.permissionOptions = []
        // Forçar modo público se não conseguir carregar permissões
        this.localRouteInfo.accessType = 'public'
      } finally {
        this.loadingPermissions = false
      }
    },

    onAccessTypeChange(newType) {
      console.log('Tipo de acesso alterado para:', newType)

      if (newType === 'public') {
        // Limpar permissões e forçar como pública
        this.localRouteInfo.allowedPermissions = []
        this.localRouteInfo.isPublic = true
      } else if (newType === 'restricted') {
        // Manter permissões selecionadas, mas permitir escolha de visibilidade
        this.localRouteInfo.isPublic = false
      }
    },

    removePermission(permissionId) {
      const index = this.localRouteInfo.allowedPermissions.indexOf(permissionId)
      if (index > -1) {
        this.localRouteInfo.allowedPermissions.splice(index, 1)
      }
    },

    getAccessSummary() {
      if (this.localRouteInfo.accessType === 'public') {
        return 'Acesso livre para todos os usuários'
      }

      if (this.selectedPermissionsCount === 0) {
        return 'Selecione pelo menos uma carteirinha para acesso restrito'
      }

      const visibility = this.localRouteInfo.isPublic ? 'pública' : 'privada'
      return `Rota ${visibility} com acesso restrito a ${this.selectedPermissionsCount} tipo(s) de carteirinha`
    },

    validateForm() {
      // Validação básica
      if (!this.localRouteInfo.name?.trim()) {
        this.quasar.notify({
          type: 'negative',
          message: 'Nome do itinerário é obrigatório'
        })
        return false
      }

      // Validação de tipo de agendamento
      if (!this.localRouteInfo.scheduleType) {
        this.quasar.notify({
          type: 'negative',
          message: 'Tipo de agendamento é obrigatório'
        })
        return false
      }

      // Validação de horários para tipos daily/weekly
      if (this.showTimeFields) {
        if (!this.localRouteInfo.startTime || !this.localRouteInfo.endTime) {
          this.quasar.notify({
            type: 'negative',
            message: 'Horários de início e fim são obrigatórios'
          })
          return false
        }

        // Validar se horário de fim é após o de início
        if (this.localRouteInfo.startTime >= this.localRouteInfo.endTime) {
          this.quasar.notify({
            type: 'negative',
            message: 'Horário de fim deve ser posterior ao horário de início'
          })
          return false
        }
      }

      // Validação de dias para tipos daily/weekly
      if (this.showDaysFields) {
        const hasAnyDay = Object.values(this.localRouteInfo.days).some(day => day)
        if (!hasAnyDay) {
          this.quasar.notify({
            type: 'negative',
            message: 'Selecione pelo menos um dia da semana'
          })
          return false
        }
      }

      // Validação de descrição personalizada para tipo custom
      if (this.localRouteInfo.scheduleType === 'custom' && !this.localRouteInfo.customDescription?.trim()) {
        this.quasar.notify({
          type: 'negative',
          message: 'Descrição é obrigatória para agendamento personalizado'
        })
        return false
      }

      // Validação de permissões para rotas restritas
      if (this.localRouteInfo.accessType === 'restricted' && this.selectedPermissionsCount === 0) {
        this.quasar.notify({
          type: 'warning',
          message: 'Selecione pelo menos uma carteirinha para rota restrita ou altere para acesso público'
        })
        return false
      }

      return true
    },

    prepareScheduleData() {
      const scheduleData = {
        type: this.localRouteInfo.scheduleType
      }

      switch (this.localRouteInfo.scheduleType) {
        case 'daily':
        case 'weekly':
          scheduleData.start_time = this.localRouteInfo.startTime
          scheduleData.end_time = this.localRouteInfo.endTime
          scheduleData.days = this.getDaysArray(this.localRouteInfo.days)
          break

        case 'custom':
          scheduleData.description = this.localRouteInfo.customDescription
          scheduleData.custom_config = true
          break

        case 'monthly':
          scheduleData.description = 'Agendamento mensal'
          break
      }

      return scheduleData
    },

    getDaysArray(days) {
      if (!days || typeof days !== 'object') return []

      const result = []
      if (days.mon) result.push(1)
      if (days.tue) result.push(2)
      if (days.wed) result.push(3)
      if (days.thu) result.push(4)
      if (days.fri) result.push(5)
      if (days.sat) result.push(6)
      if (days.sun) result.push(7)

      return result
    },

    async onNext() {
      if (!this.validateForm()) {
        return
      }

      this.submitting = true

      try {
        // Preparar dados finais com schedule_data estruturado
        const finalRouteInfo = {
          ...this.localRouteInfo,
          // Estruturar dados de agendamento conforme esperado pelo backend
          schedule_data: this.prepareScheduleData(),
          // Garantir consistência dos dados de acesso
          allowedPermissions: this.localRouteInfo.accessType === 'public'
              ? []
              : (this.localRouteInfo.allowedPermissions || []),
          isPublic: this.localRouteInfo.accessType === 'public'
              ? true
              : this.localRouteInfo.isPublic
        }

        console.log('Dados da rota preparados:', finalRouteInfo)

        // Emitir evento para atualizar os dados da rota no componente pai
        this.$emit('update:route-info', finalRouteInfo)

        // Emitir evento para avançar para o próximo step
        this.$emit('next')

      } catch (error) {
        console.error('Erro ao processar dados da rota:', error)
        this.quasar.notify({
          type: 'negative',
          message: 'Erro ao processar dados da rota'
        })
      } finally {
        this.submitting = false
      }
    }
  }
})
</script>

<style scoped>
.route-info-step {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}

.schedule-config {
  background: rgba(0, 0, 0, 0.02);
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid var(--q-secondary);
}

.access-config {
  background: rgba(0, 0, 0, 0.02);
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid var(--q-primary);
}

.permissions-summary {
  background: rgba(25, 118, 210, 0.1);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--q-primary);
}

.body--dark .schedule-config,
.body--dark .access-config {
  background: rgba(255, 255, 255, 0.05);
}

.body--dark .permissions-summary {
  background: rgba(25, 118, 210, 0.2);
}
</style>
