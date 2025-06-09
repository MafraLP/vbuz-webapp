import { defineStore } from 'pinia'
import { authService } from 'src/services/api/auth/AuthService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('auth_token'),
    selectedInstitutionId: localStorage.getItem('selected_institution_id'),
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

    // Getter para a instituição selecionada
    selectedInstitution: (state) => {
      if (!state.selectedInstitutionId) return null

      const institutions = state.user?.accessible_institutions
      if (Array.isArray(institutions) && institutions.length > 0) {
        return institutions.find(inst => inst.id === parseInt(state.selectedInstitutionId)) || null
      }
      return null
    },

    // Getter para ID da instituição (prioriza selecionada, depois primeira disponível)
    primaryInstitutionId: (state) => {
      // Se há uma instituição selecionada, usar ela
      if (state.selectedInstitutionId) {
        return parseInt(state.selectedInstitutionId)
      }

      // Senão, usar a primeira disponível
      const institutions = state.user?.accessible_institutions
      if (Array.isArray(institutions) && institutions.length > 0) {
        return institutions[0].id
      }
      return null
    },

    // Getter para nome da instituição (prioriza selecionada, depois primeira disponível)
    primaryInstitutionName: (state) => {
      // Se há uma instituição selecionada, usar ela
      if (state.selectedInstitutionId) {
        const institutions = state.user?.accessible_institutions
        if (Array.isArray(institutions) && institutions.length > 0) {
          const selected = institutions.find(inst => inst.id === parseInt(state.selectedInstitutionId))
          if (selected) return selected.name
        }
      }

      // Senão, usar a primeira disponível
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

        // Auto-selecionar a primeira instituição se não há uma selecionada
        if (!this.selectedInstitutionId && user?.accessible_institutions?.length > 0) {
          this.setSelectedInstitution(user.accessible_institutions[0].id)
        }

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
      this.selectedInstitutionId = null
      this.initialized = true // Marcar como inicializado mesmo ao limpar
      localStorage.removeItem('auth_token')
      localStorage.removeItem('selected_institution_id')
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

        // Validar se a instituição selecionada ainda é válida
        this.validateSelectedInstitution()
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

    // Método para definir a instituição selecionada
    setSelectedInstitution(institutionId) {
      if (institutionId) {
        this.selectedInstitutionId = institutionId.toString()
        localStorage.setItem('selected_institution_id', institutionId.toString())
      } else {
        this.selectedInstitutionId = null
        localStorage.removeItem('selected_institution_id')
      }
    },

    // Método para validar se a instituição selecionada ainda é válida
    validateSelectedInstitution() {
      if (!this.selectedInstitutionId || !this.user?.accessible_institutions) {
        return
      }

      const isValid = this.user.accessible_institutions.some(
          inst => inst.id === parseInt(this.selectedInstitutionId)
      )

      if (!isValid) {
        // Se a instituição selecionada não é mais válida, limpar e selecionar a primeira disponível
        if (this.user.accessible_institutions.length > 0) {
          this.setSelectedInstitution(this.user.accessible_institutions[0].id)
        } else {
          this.setSelectedInstitution(null)
        }
      }
    },

    // Método auxiliar para compatibilidade
    getUserInstitutionId() {
      return this.primaryInstitutionId
    }
  }
})

export default useAuthStore
