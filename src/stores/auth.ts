import { defineStore } from 'pinia'
import { authService } from 'src/services/api/auth/AuthService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('auth_token'),
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    userRole: (state) => state.user?.role || null
  },

  actions: {
    async login(credentials) {
      this.loading = true
      try {
        const { data } = await authService.login(credentials)

        const { token, user } = data

        this.token = token
        this.user = user

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
      localStorage.removeItem('auth_token')
    },

    async fetchUser() {
      if (!this.token) return
      try {
        const { data } = await authService.me()
        this.user = data
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
        this.clearAuth()
      }
    }
  }
})

export default useAuthStore
