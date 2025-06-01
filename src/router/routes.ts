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
      {
        path: 'rep',
        component: () => import('pages/RouteEditorPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'route-wizard',
        component: () => import('pages/RouteCreationPage.vue'),
        meta: { requiresAuth: true }
      },
      // Rotas comentadas - descomente conforme necessário
      // {
      //   path: 'institutions',
      //   component: () => import('pages/InstitutionsPage.vue'),
      //   meta: { requiresAuth: true, roles: ['admin'] }
      // },
      // {
      //   path: 'staff',
      //   component: () => import('pages/StaffManagementPage.vue'),
      //   meta: { requiresAuth: true, roles: ['admin'] }
      // },
      // {
      //   path: 'profile',
      //   component: () => import('pages/ProfilePage.vue'),
      //   meta: { requiresAuth: true }
      // }
    ]
  },
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { requiresAuth: false },
    children: [
      {
        path: 'login',
        component: () => import('pages/auth/LoginPage.vue'),
        meta: { requiresAuth: false }
      },
      // {
      //   path: 'register',
      //   component: () => import('pages/auth/RegisterPage.vue'),
      //   meta: { requiresAuth: false }
      // }
    ]
  },
  // Rota para erros 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
    meta: { requiresAuth: false }
  },
];

export default routes;
