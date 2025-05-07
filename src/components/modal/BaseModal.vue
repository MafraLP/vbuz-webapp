// src/components/base/BaseModal.vue
<template>
  <q-dialog
    v-model="show"
    :persistent="persistent || isSaving"
    @hide="onHide"
    :maximized="maximized"
    :fullWidth="fullWidth"
    :fullHeight="fullHeight"
    :position="position"
  >
    <q-card :style="cardStyle">
      <q-card-section class="row items-center" v-if="showHeader">
        <div class="text-h6">{{ title }}</div>
        <q-space />
        <q-btn
          v-if="showCloseButton && (!persistent || !isSaving)"
          icon="close"
          flat
          round
          dense
          @click="cancel"
        />
      </q-card-section>

      <q-separator v-if="showHeader" />

      <slot name="before-content"></slot>

      <q-card-section :class="contentClass">
        <slot></slot>
      </q-card-section>

      <slot name="after-content"></slot>

      <q-separator v-if="showFooter" />

      <q-card-actions v-if="showFooter" :align="actionsAlign">
        <slot name="actions">
          <q-btn
            :label="cancelButtonLabel"
            color="negative"
            flat
            v-close-popup
            @click="cancel"
            :disable="isSaving"
          />
          <q-btn
            :label="confirmButtonLabel"
            color="primary"
            flat
            @click="confirm"
            :loading="isSaving"
          />
        </slot>
      </q-card-actions>

      <q-inner-loading :showing="loading">
        <q-spinner size="50px" color="primary" />
      </q-inner-loading>
    </q-card>
  </q-dialog>
</template>

<script>
import ModalMixin from "src/mixin/ModalMixin.ts";
import {modalService} from "src/services/ModalService.js";

export default {
  name: 'BaseModal',
  mixins: [ModalMixin],
  props: {
    title: {
      type: String,
      default: 'Modal'
    },
    showHeader: {
      type: Boolean,
      default: true
    },
    showFooter: {
      type: Boolean,
      default: true
    },
    showCloseButton: {
      type: Boolean,
      default: true
    },
    cancelButtonLabel: {
      type: String,
      default: 'Cancelar'
    },
    confirmButtonLabel: {
      type: String,
      default: 'Confirmar'
    },
    actionsAlign: {
      type: String,
      default: 'right',
      validator: (val) => ['left', 'center', 'right', 'between', 'around', 'evenly'].includes(val)
    },
    width: {
      type: String,
      default: null
    },
    maximized: {
      type: Boolean,
      default: false
    },
    fullWidth: {
      type: Boolean,
      default: false
    },
    fullHeight: {
      type: Boolean,
      default: false
    },
    position: {
      type: String,
      default: 'standard',
      validator: (val) => ['standard', 'top', 'right', 'bottom', 'left'].includes(val)
    },
    contentClass: {
      type: String,
      default: ''
    }
  },
  computed: {
    cardStyle() {
      if (this.width) {
        return { width: this.width };
      }
      return {};
    }
  },
  methods: {
    confirm() {
      this.$emit('confirm');
    },
    cancel() {
      this.$emit('cancel');
      this.close();
    },
    onHide() {
      // Ensure we clean up when the dialog is hidden
      this.resetData();
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
</script>
