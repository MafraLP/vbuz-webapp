// src/router/routes.js
import type { RouteRecordRaw } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'rep', component: () => import('pages/RouteEditorPage.vue') },
      // { path: 'institutions', component: () => import('pages/InstitutionsPage.vue') },
      // { path: 'staff', component: () => import('pages/StaffManagementPage.vue') },
      // { path: 'profile', component: () => import('pages/ProfilePage.vue') }
    ]
  },
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: 'login', component: () => import('pages/auth/LoginPage.vue') },
//      { path: 'register', component: () => import('pages/auth/RegisterPage.vue') }
    ]
  },
  // Rota para erros 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
