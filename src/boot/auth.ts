// src/boot/auth.ts
import { boot } from 'quasar/wrappers'
import { useAuthStore } from 'src/stores/auth'
import { api } from 'src/boot/axios'

export default boot(async ({ app, router }) => {
  // Inicializar o store de autenticação
  const authStore = useAuthStore()

  try {
    // Inicializar autenticação antes de qualquer navegação
    await authStore.initAuth()
  } catch (error) {
    console.error('Erro ao inicializar autenticação:', error)
  }

  api.interceptors.request.use((config) => {
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        authStore.clearAuth()
        router.push('/auth/login')
      }
      return Promise.reject(error)
    }
  )
})
