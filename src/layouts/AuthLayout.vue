<!-- src/layouts/AuthLayout.vue -->
<template>
  <div class="auth-layout">
    <q-layout view="lHh Lpr lFf">
      <q-page-container>
        <div class="auth-container">
          <div class="auth-logo text-center q-mb-xl">
            <img src="~assets/logo.png" alt="Logo" width="180px" class="q-mb-md" />
            <h4 class="text-primary q-mt-md q-mb-none">vBuz</h4>
            <p class="text-grey-7">Sistema de Gestão de Transporte</p>
          </div>

          <router-view />

          <div class="text-center q-mt-xl">
            <p class="text-grey-7">
              &copy; {{ currentYear }} vBuz - Todos os direitos reservados
            </p>
            <div class="row justify-center q-gutter-sm q-mt-sm">
              <q-btn flat dense round color="grey-7" icon="help" to="/ajuda" />
              <q-btn flat dense round color="grey-7" icon="security" to="/privacidade" />
              <q-btn flat dense round color="grey-7" icon="description" to="/termos" />
            </div>
          </div>
        </div>
      </q-page-container>
    </q-layout>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'AuthLayout',

  setup() {
    const currentYear = computed(() => new Date().getFullYear())

    return {
      currentYear
    }
  }
})
</script>

<style lang="scss">
.auth-layout {
  background: #f5f5f5;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;

  .auth-container {
    width: 100%;
    max-width: 500px;
    padding: 2rem;
    margin: 0 auto;
  }

  .auth-logo {
    margin-bottom: 2rem;
  }
}
</style>
