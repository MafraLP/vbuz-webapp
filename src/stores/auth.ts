import { defineStore } from 'pinia'
import { authService } from 'src/services/api/auth/AuthService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('auth_token'),
    loading: false,
    initialized: false // Flag para saber se já tentou carregar o usuário
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    userRole: (state) => state.user?.role || null,

    userInstitutions: (state) => {
      const institutions = state.user?.accessible_institutions
      return Array.isArray(institutions) ? institutions : []
    },

    hasUserInstitution: (state) => {
      const institutions = state.user?.accessible_institutions
      return Array.isArray(institutions) && institutions.length > 0
    },

    primaryInstitutionId: (state) => {
      const institutions = state.user?.accessible_institutions
      if (Array.isArray(institutions) && institutions.length > 0) {
        return institutions[0].id
      }
      return null
    },

    primaryInstitutionName: (state) => {
      const institutions = state.user?.accessible_institutions
      if (Array.isArray(institutions) && institutions.length > 0) {
        return institutions[0].name
      }
      return 'Nenhuma instituição'
    }
  },

  actions: {
    async login(credentials) {
      this.loading = true
      try {
        const { data } = await authService.login(credentials)

        const { token, user } = data

        this.token = token
        this.user = user
        this.initialized = true

        localStorage.setItem('auth_token', token)
        return user
      } catch (error) {
        this.clearAuth()
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        if (this.token) {
          await authService.logout()
        }
      } catch (error) {
        console.error('Erro ao fazer logout:', error)
      } finally {
        this.clearAuth()
      }
    },

    clearAuth() {
      this.user = null
      this.token = null
      this.initialized = true // Marcar como inicializado mesmo ao limpar
      localStorage.removeItem('auth_token')
    },

    async fetchUser() {
      if (!this.token) {
        this.initialized = true
        return
      }

      try {
        const { data } = await authService.me()
        this.user = data.user || data // Compatibilidade com diferentes formatos
        this.initialized = true
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
        this.clearAuth()
        throw error
      }
    },

    // Método para inicializar a autenticação na inicialização da app
    async initAuth() {
      if (this.initialized) return

      if (this.token && !this.user) {
        await this.fetchUser()
      } else {
        this.initialized = true
      }
    },

    // Método auxiliar para compatibilidade
    getUserInstitutionId() {
      return this.primaryInstitutionId
    }
  }
})

export default useAuthStore
