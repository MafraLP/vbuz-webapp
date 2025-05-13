<template>
  <div>
    <q-table
      :rows="staff"
      :columns="columns"
      row-key="id"
      :loading="loading"
      :filter="filter"
      :pagination.sync="pagination"
    >
      <template v-slot:top>
        <div class="row full-width">
          <div class="col-6">
            <q-input
              dense
              debounce="300"
              v-model="filter"
              placeholder="Buscar"
            >
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
        </div>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td key="name" :props="props">
            {{ props.row.name }}
          </q-td>

          <q-td key="email" :props="props">
            {{ props.row.email }}
          </q-td>

          <q-td key="phone" :props="props">
            {{ props.row.phone || 'Não informado' }}
          </q-td>

          <q-td key="status" :props="props">
            <q-badge :color="getStatusColor(props.row)" text-color="white">
              {{ getStatusLabel(props.row) }}
            </q-badge>
          </q-td>

          <q-td key="institutions" :props="props">
            <div class="institutions-list">
              <q-chip
                v-for="(inst, idx) in getInstitutions(props.row)"
                :key="idx"
                size="sm"
                outline
                color="primary"
                class="q-mr-xs"
              >
                {{ inst.name }}
              </q-chip>

              <q-chip
                v-if="getInstitutions(props.row).length === 0"
                size="sm"
                outline
                color="grey"
              >
                Nenhuma instituição
              </q-chip>
            </div>
          </q-td>

          <q-td key="actions" :props="props">
            <div class="row no-wrap">
              <q-btn
                flat
                round
                size="sm"
                color="info"
                icon="visibility"
                @click="$emit('view', props.row)"
              >
                <q-tooltip>Ver detalhes</q-tooltip>
              </q-btn>

              <q-btn
                flat
                round
                size="sm"
                color="primary"
                icon="edit"
                @click="$emit('edit', props.row)"
              >
                <q-tooltip>Editar</q-tooltip>
              </q-btn>

              <q-btn
                flat
                round
                size="sm"
                color="secondary"
                icon="business"
                @click="$emit('assign', props.row)"
              >
                <q-tooltip>Atribuir Instituições</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-lg">
          <q-icon name="people" size="2rem" color="grey-5" />
          <span class="text-grey-5 q-ml-sm">
            Nenhum {{ getRoleLabel() }} encontrado
          </span>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script>
export default {
  name: 'StaffTable',

  props: {
    staff: {
      type: Array,
      required: true
    },
    role: {
      type: String,
      required: true,
      validator: value => ['manager', 'driver', 'monitor'].includes(value)
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['edit', 'view', 'assign'],

  data() {
    return {
      filter: '',
      pagination: {
        rowsPerPage: 10
      },
      columns: [
        {
          name: 'name',
          label: 'Nome',
          align: 'left',
          field: 'name',
          sortable: true
        },
        {
          name: 'email',
          label: 'E-mail',
          align: 'left',
          field: 'email',
          sortable: true
        },
        {
          name: 'phone',
          label: 'Telefone',
          align: 'left',
          field: 'phone',
          sortable: false
        },
        {
          name: 'status',
          label: 'Status',
          align: 'left',
          sortable: false
        },
        {
          name: 'institutions',
          label: 'Instituições',
          align: 'left',
          sortable: false
        },
        {
          name: 'actions',
          label: 'Ações',
          align: 'center',
          sortable: false
        }
      ]
    }
  },

  methods: {
    getInstitutions(staff) {
      switch (this.role) {
        case 'manager':
          return staff.managerProfile?.institutions || []
        case 'driver':
          return staff.driverProfile?.institutions || []
        case 'monitor':
          return staff.monitorProfile?.institutions || []
        default:
          return []
      }
    },

    getStatusLabel(staff) {
      switch (this.role) {
        case 'manager':
          return 'Ativo'
        case 'driver':
          return staff.driverProfile?.status === 'active' ? 'Ativo' :
            staff.driverProfile?.status === 'inactive' ? 'Inativo' :
              staff.driverProfile?.status === 'on_leave' ? 'Afastado' : 'Desconhecido'
        case 'monitor':
          return staff.monitorProfile?.status === 'active' ? 'Ativo' :
            staff.monitorProfile?.status === 'inactive' ? 'Inativo' :
              staff.monitorProfile?.status === 'on_leave' ? 'Afastado' : 'Desconhecido'
        default:
          return 'Desconhecido'
      }
    },

    getStatusColor(staff) {
      const status = this.getStatusLabel(staff)

      switch (status) {
        case 'Ativo':
          return 'positive'
        case 'Inativo':
          return 'grey'
        case 'Afastado':
          return 'orange'
        default:
          return 'grey'
      }
    },

    getRoleLabel() {
      switch (this.role) {
        case 'manager':
          return 'gerente'
        case 'driver':
          return 'motorista'
        case 'monitor':
          return 'monitor'
        default:
          return 'funcionário'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.institutions-list {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
