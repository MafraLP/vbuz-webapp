import type { RouteRecordRaw } from 'vue-router';


const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'route-editor', component: () => import('pages/RouteEditorPage.vue') },
      { path: 'route-wizard', component: () => import('pages/RouteWizard.vue') }
    ]
  },

  // Rota para erros 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
