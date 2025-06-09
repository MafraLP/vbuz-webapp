<!-- src/layouts/AuthLayout.vue -->
<template>
  <div class="auth-layout">
    <q-layout view="lHh Lpr lFf">
      <!-- Theme Toggle Button - Fixed Position -->
      <div class="theme-toggle">
        <q-btn
          @click="toggleTheme"
          :icon="isDarkMode ? 'light_mode' : 'dark_mode'"
          round
          flat
          :color="isDarkMode ? 'amber' : 'orange'"
          class="theme-btn"
          size="md"
        >
          <q-tooltip>
            {{ isDarkMode ? 'Modo Claro' : 'Modo Escuro' }}
          </q-tooltip>
        </q-btn>
      </div>

      <q-page-container>
        <!-- Main Content Area - Apenas o router-view -->
        <router-view />

        <!-- Footer fixo -->
        <div class="auth-footer">
          <div class="footer-content text-center">
            <p class="copyright-text">
              &copy; {{ currentYear }} vBuz - Todos os direitos reservados
            </p>
            <div class="footer-links q-mt-sm">
              <q-btn
                flat
                dense
                round
                class="footer-btn"
                icon="help_outline"
                to="/ajuda"
                size="sm"
              >
                <q-tooltip>Ajuda</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                class="footer-btn"
                icon="security"
                to="/privacidade"
                size="sm"
              >
                <q-tooltip>Privacidade</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                class="footer-btn"
                icon="description"
                to="/termos"
                size="sm"
              >
                <q-tooltip>Termos de Uso</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
      </q-page-container>
    </q-layout>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useTheme } from 'src/composables/useTheme'

export default defineComponent({
  name: 'AuthLayout',

  setup() {
    const currentYear = computed(() => new Date().getFullYear())

    // Usar o composable de tema
    const {
      isDarkMode,
      toggleTheme,
      initializeTheme,
      watchSystemTheme
    } = useTheme()

    // Inicializar tema quando o layout carrega
    initializeTheme()
    watchSystemTheme()

    return {
      currentYear,
      isDarkMode,
      toggleTheme
    }
  }
})
</script>

<style lang="scss">
.auth-layout {
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
}

// Theme Toggle Button
.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;

  .theme-btn {
    background: var(--q-secondary-background);
    border: 2px solid var(--q-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 99, 0, 0.3);
      background: var(--q-primary);

      .q-icon {
        color: white !important;
      }
    }

    .q-icon {
      color: var(--q-primary);
      transition: color 0.3s ease;
    }

    // Dark mode styles
    .body--dark & {
      border-color: var(--q-secondary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

      &:hover {
        background: var(--q-secondary);
        box-shadow: 0 6px 20px rgba(255, 161, 0, 0.4);
      }

      .q-icon {
        color: var(--q-secondary);
      }
    }
  }
}

// Footer com cores do tema
.auth-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--q-secondary-background);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--q-primary);
  border-top-color: rgba(255, 99, 0, 0.2);
  padding: 1rem 0;
  z-index: 1000;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);

  .body--dark & {
    background: var(--q-secondary-background);
    border-top-color: rgba(255, 161, 0, 0.3);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
  }

  .footer-content {
    max-width: 600px;
    margin: 0 auto;
    padding: 0 1rem;

    .copyright-text {
      font-size: 0.85rem;
      margin: 0;
      opacity: 0.8;
      color: var(--q-secondary-text);
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 0.5rem;

      .footer-btn {
        transition: all 0.3s ease;
        border-radius: 50%;
        color: var(--q-secondary-text);

        &:hover {
          background: var(--q-primary);
          background: rgba(255, 99, 0, 0.1);
          transform: translateY(-1px);
          color: var(--q-primary);

          .body--dark & {
            background: rgba(255, 161, 0, 0.2);
            color: var(--q-secondary);
          }
        }
      }
    }
  }
}

// Adicionar padding bottom ao conteúdo para não sobrepor o footer
.q-page-container {
  padding-bottom: 80px; // Espaço para o footer
}

// Responsividade
@media (max-width: 768px) {
  .theme-toggle {
    top: 15px;
    right: 15px;

    .theme-btn {
      padding: 8px;
    }
  }

  .auth-footer {
    .footer-content {
      .copyright-text {
        font-size: 0.8rem;
      }

      .footer-links {
        gap: 0.25rem;

        .footer-btn {
          padding: 6px;
        }
      }
    }
  }

  .q-page-container {
    padding-bottom: 70px;
  }
}

@media (max-width: 480px) {
  .theme-toggle {
    top: 10px;
    right: 10px;

    .theme-btn {
      padding: 6px;
      width: 40px;
      height: 40px;
    }
  }

  .auth-footer {
    padding: 0.75rem 0;

    .footer-content {
      .copyright-text {
        font-size: 0.75rem;
      }
    }
  }

  .q-page-container {
    padding-bottom: 65px;
  }
}

// Animações para transição de tema
.theme-toggle .theme-btn {
  animation: themeIntro 0.6s ease-out;
}

@keyframes themeIntro {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

// Efeito de pulse sutil no botão de tema
.theme-btn {
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background: var(--q-primary);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
    transition: all 0.3s ease;
  }

  &:active::before {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.2;
  }
}

// Gradiente sutil para o footer
.auth-footer {
  background: linear-gradient(180deg,
    transparent 0%,
    var(--q-secondary-background) 20%,
    var(--q-secondary-background) 100%
  );

  .body--dark & {
    background: linear-gradient(180deg,
      transparent 0%,
      var(--q-secondary-background) 20%,
      var(--q-secondary-background) 100%
    );
  }
}

// Melhorar o contraste dos tooltips
.q-tooltip {
  background: var(--q-primary) !important;
  color: white !important;
  border-radius: 8px !important;
  font-size: 0.8rem !important;

  .body--dark & {
    background: var(--q-secondary) !important;
  }
}
</style>
