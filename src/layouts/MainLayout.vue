<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="custom-header">
      <q-toolbar>
        <q-btn
            flat
            dense
            round
            icon="menu"
            aria-label="Menu"
            @click="toggleLeftDrawer"
            class="menu-btn"
        />

        <q-toolbar-title>
          <div class="row items-center q-gutter-sm">
            <q-icon name="directions_bus" size="md" class="brand-icon" />
            <span class="brand-text">vBuz</span>
            <q-separator vertical class="q-mx-sm" />
            <span class="system-text">Sistema de Itinerários</span>
          </div>
        </q-toolbar-title>

        <!-- User menu and info -->
        <div class="row items-center q-gutter-md">
          <!-- Theme Toggle -->
          <q-btn
              @click="toggleTheme"
              :icon="isDarkMode ? 'light_mode' : 'dark_mode'"
              flat
              dense
              round
              class="theme-toggle-btn"
          >
            <q-tooltip>
              {{ isDarkMode ? 'Modo Claro' : 'Modo Escuro' }}
            </q-tooltip>
          </q-btn>

          <!-- Notifications -->
          <q-btn flat dense round icon="notifications" class="notification-btn">
            <q-badge color="negative" floating>2</q-badge>
            <q-menu class="notification-menu">
              <q-list style="min-width: 300px">
                <q-item-label header class="notification-header">
                  Notificações
                </q-item-label>
                <q-item class="notification-item">
                  <q-item-section avatar>
                    <q-icon name="route" color="positive" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Novo itinerário criado</q-item-label>
                    <q-item-label caption>há 5 minutos</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item class="notification-item">
                  <q-item-section avatar>
                    <q-icon name="check_circle" color="info" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Cálculo de rota concluído</q-item-label>
                    <q-item-label caption>há 1 hora</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>

          <!-- User profile -->
          <q-btn flat dense round class="user-profile-btn">
            <q-avatar size="32px" class="user-avatar">
              <q-icon name="account_circle" size="md" />
            </q-avatar>
            <q-menu class="user-menu">
              <q-list style="min-width: 200px">
                <q-item-label header class="user-menu-header">
                  {{ currentUser?.name || 'Usuário' }}
                </q-item-label>

                <q-item clickable v-close-popup @click="goToProfile" class="menu-item">
                  <q-item-section avatar>
                    <q-icon name="account_circle" />
                  </q-item-section>
                  <q-item-section>Meu Perfil</q-item-section>
                </q-item>

                <q-item clickable v-close-popup @click="goToSettings" class="menu-item">
                  <q-item-section avatar>
                    <q-icon name="settings" />
                  </q-item-section>
                  <q-item-section>Configurações</q-item-section>
                </q-item>

                <q-separator class="menu-separator" />

                <q-item clickable v-close-popup @click="logout" class="menu-item logout-item">
                  <q-item-section avatar>
                    <q-icon name="logout" />
                  </q-item-section>
                  <q-item-section>Sair</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>

          <!-- Version -->
          <div class="version-text">v0.1</div>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
        v-model="leftDrawerOpen"
        show-if-above
        bordered
        :width="280"
        :breakpoint="500"
        class="custom-drawer"
    >
      <q-scroll-area class="fit">
        <q-list>
          <!-- User info section -->
          <q-item class="user-info-section">
            <q-item-section avatar>
              <q-avatar size="40px" class="user-info-avatar">
                <q-icon name="account_circle" size="lg" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="user-name">{{ currentUser?.name || 'Usuário' }}</q-item-label>
              <q-item-label caption class="user-role">{{ currentUser?.role || 'Usuário' }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-separator class="drawer-separator" />

          <!-- Main navigation -->
          <q-item-label header class="section-header">
            Menu Principal
          </q-item-label>

          <NavigationItem
              v-for="(item, index) in filteredMainNavigation"
              :key="`main-${index}`"
              :item="item"
              :current-route="$route.path"
          />

          <!-- Routes management section -->
          <q-separator class="section-separator" />

          <q-item-label header class="section-header">
            Itinerários
          </q-item-label>

          <NavigationItem
              v-for="(item, index) in filteredRoutesNavigation"
              :key="`routes-${index}`"
              :item="item"
              :current-route="$route.path"
          />

          <!-- Admin section -->
          <template v-if="isAdmin">
            <q-separator class="section-separator" />

            <q-item-label header class="section-header">
              Administração
            </q-item-label>

            <NavigationItem
                v-for="(item, index) in filteredAdminNavigation"
                :key="`admin-${index}`"
                :item="item"
                :current-route="$route.path"
            />
          </template>

          <!-- Legacy section (temporary) -->
          <q-separator class="section-separator" />

          <q-item-label header class="section-header">
            Ferramentas Legadas
          </q-item-label>

          <NavigationItem
              v-for="(item, index) in legacyNavigation"
              :key="`legacy-${index}`"
              :item="item"
              :current-route="$route.path"
          />

          <!-- Footer info -->
          <q-separator class="footer-separator" />

          <q-item dense class="footer-info">
            <q-item-section>
              <q-item-label caption class="footer-text">
                vBuz - Sistema de Itinerários v0.1
              </q-item-label>
              <q-item-label caption class="footer-copyright">
                © 2024 - Todos os direitos reservados
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { useTheme } from 'src/composables/useTheme'
import NavigationItem from 'src/components/NavigationItem.vue'

// Composables
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { isDarkMode, toggleTheme } = useTheme()

// Reactive data
const leftDrawerOpen = ref(false)

// Computed
const currentUser = computed(() => authStore.user)
const isAdmin = computed(() => authStore.user?.role === 'admin')

// Navigation configuration
const mainNavigation = [
  {
    title: 'Dashboard',
    icon: 'dashboard',
    to: '/dashboard',
    roles: ['admin', 'user']
  }
]

const routesNavigation = [
  {
    title: 'Todos os Itinerários',
    icon: 'route',
    to: '/routes',
    roles: ['admin', 'user'],
    badge: computed(() => authStore.routesCount || null)
  },
  {
    title: 'Criar Itinerário',
    icon: 'add_circle',
    to: '/routes/create',
    roles: ['admin', 'user']
  }
]

const adminNavigation = [
  {
    title: 'Instituições',
    icon: 'business',
    to: '/institutions',
    roles: ['admin']
  },
  {
    title: 'Gestão de Usuários',
    icon: 'people',
    to: '/staff',
    roles: ['admin']
  }
]

const legacyNavigation = [
  {
    title: 'Editor de Rotas (REP)',
    icon: 'edit_road',
    to: '/rep',
    roles: ['admin', 'user'],
    caption: 'Sistema legado'
  }
]

// Filtered navigation based on user roles
const filteredMainNavigation = computed(() => {
  return mainNavigation.filter(item =>
      !item.roles || item.roles.includes(authStore.user?.role || 'user')
  )
})

const filteredRoutesNavigation = computed(() => {
  return routesNavigation.filter(item =>
      !item.roles || item.roles.includes(authStore.user?.role || 'user')
  )
})

const filteredAdminNavigation = computed(() => {
  return adminNavigation.filter(item =>
      !item.roles || item.roles.includes(authStore.user?.role || 'user')
  )
})

// Methods
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function goToProfile() {
  router.push('/profile')
}

function goToSettings() {
  router.push('/settings')
}

async function logout() {
  try {
    await authStore.logout()
    router.push('/auth/login')
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
  }
}
</script>

<style lang="scss" scoped>
// Header customizations
.custom-header {
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-secondary) 100%);

  .q-toolbar {
    .brand-icon {
      color: white;
    }

    .brand-text {
      color: white;
      font-weight: 700;
      font-size: 1.5rem;
    }

    .system-text {
      color: rgba(255, 255, 255, 0.9);
      font-weight: 400;
    }

    .q-separator {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

// Toolbar buttons
.menu-btn,
.theme-toggle-btn,
.notification-btn,
.user-profile-btn {
  color: white;
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
    transform: scale(1.05);
  }
}

.theme-toggle-btn {
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);

    .q-icon {
      color: var(--q-school-bus-yellow) !important;
    }
  }
}

.user-avatar {
  border: 2px solid rgba(255, 255, 255, 0.3);

  .q-icon {
    color: white;
  }
}

.version-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  font-weight: 500;
}

// Drawer customizations
.custom-drawer {
  background: var(--q-secondary-background);
  border-right: 1px solid var(--q-primary);
  border-right-color: rgba(255, 99, 0, 0.2);

  .body--dark & {
    background: var(--q-secondary-background);
    border-right-color: rgba(255, 161, 0, 0.3);
  }
}

.user-info-section {
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-accent-1) 100%);
  color: white;
  padding: 1.5rem 1rem;

  .user-info-avatar {
    border: 2px solid rgba(255, 255, 255, 0.3);

    .q-icon {
      color: white;
    }
  }

  .user-name {
    color: white;
    font-weight: 700;
  }

  .user-role {
    color: rgba(255, 255, 255, 0.8);
  }
}

.drawer-separator,
.section-separator,
.footer-separator {
  background: var(--q-accent-4);
  opacity: 0.3;
  margin: 0.5rem 0;
}

.section-header {
  color: var(--q-primary-text);
  font-weight: 600;
  opacity: 0.8;
  font-size: 0.9rem;
}

.footer-info {
  margin-top: 1rem;

  .footer-text,
  .footer-copyright {
    color: var(--q-secondary-text);
    font-size: 0.75rem;
    text-align: center;
  }
}

// Menu styles
.notification-menu,
.user-menu {
  background: var(--q-secondary-background);
  border: 1px solid var(--q-primary);
  border-color: rgba(255, 99, 0, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

  .body--dark & {
    background: var(--q-secondary-background);
    border-color: rgba(255, 161, 0, 0.3);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
}

.notification-header,
.user-menu-header {
  color: var(--q-primary);
  font-weight: 600;
  background: rgba(255, 99, 0, 0.05);

  .body--dark & {
    color: var(--q-secondary);
    background: rgba(255, 161, 0, 0.1);
  }
}

.notification-item,
.menu-item {
  color: var(--q-primary-text);
  border-radius: 8px;
  margin: 0 0.5rem;

  &:hover {
    background: rgba(255, 99, 0, 0.1);
  }

  .q-icon {
    color: var(--q-primary);
  }

  .body--dark & {
    &:hover {
      background: rgba(255, 161, 0, 0.15);
    }

    .q-icon {
      color: var(--q-secondary);
    }
  }
}

.logout-item {
  &:hover {
    background: rgba(211, 47, 47, 0.1) !important;
    color: var(--q-negative) !important;

    .q-icon {
      color: var(--q-negative) !important;
    }
  }
}

.menu-separator {
  background: var(--q-accent-4);
  opacity: 0.3;
  margin: 0.5rem 0;
}

// Navigation items override
:deep(.q-drawer) {
  .q-item {
    border-radius: 0 25px 25px 0;
    margin-right: 12px;
    color: var(--q-primary-text);
    transition: all 0.3s ease;

    &.q-router-link--active {
      background: linear-gradient(135deg,
          rgba(255, 99, 0, 0.15) 0%,
          rgba(242, 124, 52, 0.15) 100%
      );
      color: var(--q-primary);
      border-right: 3px solid var(--q-primary);

      .q-item__section--avatar .q-icon {
        color: var(--q-primary);
      }

      .body--dark & {
        background: linear-gradient(135deg,
            rgba(255, 161, 0, 0.2) 0%,
            rgba(255, 133, 64, 0.2) 100%
        );
        color: var(--q-secondary);
        border-right-color: var(--q-secondary);

        .q-item__section--avatar .q-icon {
          color: var(--q-secondary);
        }
      }
    }

    &:hover:not(.q-router-link--active) {
      background: rgba(255, 99, 0, 0.08);
      color: var(--q-primary);

      .q-icon {
        color: var(--q-primary);
      }

      .body--dark & {
        background: rgba(255, 161, 0, 0.12);
        color: var(--q-secondary);

        .q-icon {
          color: var(--q-secondary);
        }
      }
    }
  }
}

// Badge styles
:deep(.q-badge) {
  background: var(--q-negative);
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  font-weight: 600;
}

// Responsive adjustments
@media (max-width: 768px) {
  .brand-text {
    font-size: 1.2rem !important;
  }

  .system-text {
    display: none;
  }

  .version-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .custom-header .q-toolbar {
    padding: 0 8px;
  }

  .user-info-section {
    padding: 1rem 0.75rem;
  }

  .q-gutter-md {
    gap: 8px !important;
  }
}
</style>
