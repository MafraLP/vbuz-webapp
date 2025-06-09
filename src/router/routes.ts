// src/router/routes.ts
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        component: () => import('pages/DashboardPage.vue'),
        meta: { requiresAuth: true }
      },

      // ===========================================
      // ROTAS DE ITINERÁRIOS
      // ===========================================

      // Lista de itinerários
      {
        path: 'routes',
        component: () => import('pages/routes/RoutesListPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Itinerários'
        }
      },

      // Criar novo itinerário
      {
        path: 'routes/create',
        component: () => import('pages/routes/RouteCreationPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Criar Itinerário'
        }
      },

      // Visualizar itinerário específico
      {
        path: 'routes/:id(\\d+)',
        component: () => import('pages/routes/RouteDetailPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Detalhes do Itinerário'
        },
        props: route => ({
          routeId: parseInt(route.params.id as string)
        })
      },

      // Editar itinerário específico
      {
        path: 'routes/:id(\\d+)/edit',
        component: () => import('pages/routes/RouteCreationPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Editar Itinerário'
        },
        props: route => ({
          routeId: parseInt(route.params.id as string),
          isEditing: true
        })
      },

      // ===========================================
      // ROTAS EXISTENTES (mantidas)
      // ===========================================

      // {
      //   path: 'rep',
      //   component: () => import('pages/routes/RouteEditorPage.vue'),
      //   meta: { requiresAuth: true }
      // },

      // Rota wizard (agora aponta para o novo sistema)
      {
        path: 'route-wizard',
        redirect: '/routes/create'
      },

      // ===========================================
      // ROTAS OPCIONAIS (descomente conforme necessário)
      // ===========================================

      // Instituições
      // {
      //   path: 'institutions',
      //   component: () => import('pages/InstitutionsPage.vue'),
      //   meta: {
      //     requiresAuth: true,
      //     roles: ['admin'],
      //     title: 'Instituições'
      //   }
      // },

      // Gestão de usuários
      // {
      //   path: 'staff',
      //   component: () => import('pages/StaffManagementPage.vue'),
      //   meta: {
      //     requiresAuth: true,
      //     roles: ['admin'],
      //     title: 'Gestão de Usuários'
      //   }
      // },

      // Perfil do usuário
      // {
      //   path: 'profile',
      //   component: () => import('pages/ProfilePage.vue'),
      //   meta: {
      //     requiresAuth: true,
      //     title: 'Meu Perfil'
      //   }
      // },

      // Configurações
      // {
      //   path: 'settings',
      //   component: () => import('pages/SettingsPage.vue'),
      //   meta: {
      //     requiresAuth: true,
      //     title: 'Configurações'
      //   }
      // }
    ]
  },

  // ===========================================
  // ROTAS DE AUTENTICAÇÃO
  // ===========================================
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { requiresAuth: false },
    children: [
      {
        path: 'login',
        component: () => import('pages/auth/LoginPage.vue'),
        meta: {
          requiresAuth: false,
          title: 'Login'
        }
      },

      // Registro (descomente se necessário)
      // {
      //   path: 'register',
      //   component: () => import('pages/auth/RegisterPage.vue'),
      //   meta: {
      //     requiresAuth: false,
      //     title: 'Cadastro'
      //   }
      // },

      // Recuperação de senha
      // {
      //   path: 'forgot-password',
      //   component: () => import('pages/auth/ForgotPasswordPage.vue'),
      //   meta: {
      //     requiresAuth: false,
      //     title: 'Recuperar Senha'
      //   }
      // }
    ]
  },

  // ===========================================
  // ROTAS PÚBLICAS (opcionais)
  // ===========================================
  // {
  //   path: '/public',
  //   component: () => import('layouts/PublicLayout.vue'),
  //   meta: { requiresAuth: false },
  //   children: [
  //     // Visualização pública de itinerários
  //     {
  //       path: 'routes/:id(\\d+)',
  //       component: () => import('pages/public/PublicRouteView.vue'),
  //       meta: {
  //         requiresAuth: false,
  //         title: 'Itinerário Público'
  //       },
  //       props: route => ({
  //         routeId: parseInt(route.params.id as string)
  //       })
  //     }
  //   ]
  // },

  // ===========================================
  // ROTA PARA ERROS 404
  // ===========================================
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
    meta: {
      requiresAuth: false,
      title: 'Página não encontrada'
    }
  }
];

export default routes;

// ===========================================
// TIPOS TYPESCRIPT (opcionais)
// ===========================================

export interface RouteMetaCustom {
  requiresAuth: boolean;
  roles?: string[];
  title?: string;
  guest?: boolean;
  requiresRole?: string;
}

// Estender o tipo RouteLocationNormalized para incluir nossa meta customizada
declare module 'vue-router' {
  interface RouteMeta extends RouteMetaCustom {}
}

// ===========================================
// UTILITÁRIOS DE NAVEGAÇÃO (TypeScript)
// ===========================================

export const routeUtils = {
  // Navegação para listagem
  goToRoutesList(router: any) {
    return router.push('/routes')
  },

  // Navegação para criação
  goToCreateRoute(router: any) {
    return router.push('/routes/create')
  },

  // Navegação para visualização
  goToRouteDetail(router: any, routeId: number) {
    return router.push(`/routes/${routeId}`)
  },

  // Navegação para edição
  goToEditRoute(router: any, routeId: number) {
    return router.push(`/routes/${routeId}/edit`)
  },

  // Navegação com query parameters
  goToRoutesListWithFilters(router: any, filters: Record<string, any> = {}) {
    return router.push({
      path: '/routes',
      query: filters
    })
  },

  // Verificar se estamos em uma rota específica
  isRoutesPage(route: any): boolean {
    return route.path?.startsWith('/routes')
  },

  // Obter ID da rota da URL atual
  getCurrentRouteId(route: any): number | null {
    return route.params.id ? parseInt(route.params.id as string) : null
  },

  // Verificar se estamos editando
  isEditingMode(route: any): boolean {
    return route.path?.includes('/edit')
  }
}

// ===========================================
// CONFIGURAÇÕES DE MENU/NAVEGAÇÃO
// ===========================================

export interface NavigationItem {
  title: string;
  icon: string;
  to?: string;
  roles?: string[];
  children?: NavigationItem[];
  separator?: boolean;
}

export const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    icon: 'dashboard',
    to: '/dashboard',
    roles: ['admin', 'user']
  },
  {
    title: 'Itinerários',
    icon: 'route',
    to: '/routes',
    roles: ['admin', 'user']
  },
  {
    title: 'Criar Itinerário',
    icon: 'add_circle',
    to: '/routes/create',
    roles: ['admin', 'user']
  },
  {
    separator: true,
    title: '',
    icon: ''
  },
  {
    title: 'Instituições',
    icon: 'business',
    to: '/institutions',
    roles: ['admin']
  },
  {
    title: 'Usuários',
    icon: 'people',
    to: '/staff',
    roles: ['admin']
  },
  {
    separator: true,
    title: '',
    icon: ''
  },
  {
    title: 'Configurações',
    icon: 'settings',
    to: '/settings',
    roles: ['admin', 'user']
  },
  {
    title: 'Meu Perfil',
    icon: 'account_circle',
    to: '/profile',
    roles: ['admin', 'user']
  }
]
