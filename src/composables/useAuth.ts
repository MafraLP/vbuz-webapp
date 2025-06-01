// src/composables/useAuth.ts
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { Notify } from 'quasar';

export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();
  const route = useRoute();

  // Getters computados
  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isLoading = computed(() => authStore.loading);
  const userRole = computed(() => authStore.userRole);

  // Verificar se o usuário tem determinada role
  const hasRole = (role: string) => {
    return authStore.userRole === role;
  };

  // Verificar se o usuário tem uma das roles especificadas
  const hasAnyRole = (roles: string[]) => {
    return roles.includes(authStore.userRole);
  };

  // Login
  const login = async (credentials: any) => {
    try {
      const user = await authStore.login(credentials);

      Notify.create({
        type: 'positive',
        message: `Bem-vindo, ${user.name}!`,
        position: 'top'
      });

      // Redirecionar para a página desejada ou dashboard
      const redirectPath = route.query.redirect as string || '/dashboard';
      await router.push(redirectPath);

      return user;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao fazer login';

      Notify.create({
        type: 'negative',
        message,
        position: 'top'
      });

      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authStore.logout();

      Notify.create({
        type: 'info',
        message: 'Logout realizado com sucesso',
        position: 'top'
      });

      await router.push('/auth/login');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  // Verificar se o usuário pode acessar determinada rota
  const canAccess = (requiredRoles?: string[]) => {
    if (!isAuthenticated.value) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return hasAnyRole(requiredRoles);
  };

  return {
    // Estado
    user,
    isAuthenticated,
    isLoading,
    userRole,

    // Métodos
    login,
    logout,
    hasRole,
    hasAnyRole,
    canAccess,

    // Store direto para casos especiais
    authStore
  };
}
