// src/router/index.ts
import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes.js';
import { useAuthStore } from 'src/stores/auth';
import { Notify } from 'quasar';

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Guard global para autenticação
  Router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();

    // Verificar se a rota requer autenticação
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false);

    // Se não foi inicializado ainda, tentar inicializar
    if (!authStore.initialized) {
      try {
        await authStore.initAuth();
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        authStore.clearAuth();
      }
    }

    // Se está tentando acessar rota de auth e já está autenticado
    if (to.path.startsWith('/auth') && authStore.isAuthenticated) {
      return next('/dashboard');
    }

    // Se está tentando acessar rota protegida sem estar autenticado
    if (requiresAuth && !authStore.isAuthenticated) {
      // Salvar a rota de destino para redirecionar após login
      const redirectPath = to.fullPath !== '/' ? to.fullPath : '/dashboard';

      return next({
        path: '/auth/login',
        query: { redirect: redirectPath }
      });
    }

    // Verificar roles se especificado na rota
    if (requiresAuth && authStore.isAuthenticated) {
      const requiredRoles = to.matched
        .filter(record => record.meta.roles)
        .flatMap(record => record.meta.roles);

      if (requiredRoles.length > 0 && !requiredRoles.includes(authStore.userRole)) {
        Notify.create({
          type: 'negative',
          message: 'Você não tem permissão para acessar esta página.',
          position: 'top'
        });

        return next('/dashboard');
      }
    }

    // Permitir navegação
    next();
  });

  // Guard para capturar erros de navegação
  Router.onError((error) => {
    console.error('Erro de navegação:', error);

    Notify.create({
      type: 'negative',
      message: 'Erro ao navegar. Tente novamente.',
      position: 'top'
    });
  });

  return Router;
});
