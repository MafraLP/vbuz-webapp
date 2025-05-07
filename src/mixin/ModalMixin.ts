// src/mixins/ModalMixin.ts
import { PropType } from 'vue';
import { modalService } from 'src/services/ModalService';

export default {
  emits: ['update:modelValue', 'modal:opened', 'modal:closed', 'modal:beforeClose'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    persistent: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    modalId: {
      type: String,
      default() {
        return `modal-${Date.now()}`;
      }
    }
  },
  data() {
    return {
      isSaving: false,
      initialData: null as any
    };
  },
  computed: {
    show: {
      get(): boolean {
        return this.modelValue;
      },
      set(val: boolean): void {
        this.$emit('update:modelValue', val);
        if (val) {
          this.$emit('modal:opened', this.modalId);
        } else {
          this.$emit('modal:closed', this.modalId);
        }
      },
    },
  },
  methods: {
    open(initialData: any = null): void {
      this.initialData = initialData;
      this.show = true;
    },
    close(withPersistData = false): void {
      if (this.persistent && this.loading) {
        return;
      }

      this.$emit('modal:beforeClose', this.modalId);
      this.show = false;
      if(!withPersistData) {
        this.resetData();
      }
    },
    startLoading(): void {
      this.isSaving = true;
    },
    stopLoading(): void {
      this.isSaving = false;
    },
    // Método que pode ser sobrescrito pelos componentes filhos
    resetData(): void {
      this.isSaving = false;
      this.initialData = null;
    },
    cancel(): void {
      this.close();
    }
  },
  watch: {
    modelValue(newVal: boolean): void {
      if (newVal && !this.show) {
        this.show = true;
      } else if (!newVal && this.show) {
        this.show = false;
      }
    }
  },
  mounted() {
    // Registra este modal no serviço
    modalService.registerModal(this.modalId, this);
  },
  beforeUnmount() {
    // Remove o registro quando o componente for destruído
    modalService.unregisterModal(this.modalId);
  }
};
