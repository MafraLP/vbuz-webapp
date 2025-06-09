// src/boot/theme.js - Versão simplificada
import { boot } from 'quasar/wrappers'

export default boot(({ app }) => {
  // Inicializar tema de forma simples sem dependências do Quasar ainda
  const initSimpleTheme = () => {
    const savedTheme = localStorage.getItem('vbuz-theme')
    let isDark = false

    if (savedTheme !== null) {
      isDark = savedTheme === 'dark'
    } else {
      // Usar preferência do sistema
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    // Aplicar classe CSS diretamente no body
    if (isDark) {
      document.body.classList.add('body--dark')
    } else {
      document.body.classList.remove('body--dark')
    }

    return isDark
  }

  // Observar mudanças na preferência do sistema
  const watchSystemTheme = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      // Só aplicar se não houver preferência salva
      if (!localStorage.getItem('vbuz-theme')) {
        if (e.matches) {
          document.body.classList.add('body--dark')
        } else {
          document.body.classList.remove('body--dark')
        }
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
    }
  }

  // Executar inicialização
  try {
    const isDark = initSimpleTheme()
    watchSystemTheme()

    // Disponibilizar função global simples para toggle
    app.config.globalProperties.$toggleTheme = () => {
      const isDarkNow = document.body.classList.contains('body--dark')
      const newTheme = !isDarkNow

      if (newTheme) {
        document.body.classList.add('body--dark')
      } else {
        document.body.classList.remove('body--dark')
      }

      localStorage.setItem('vbuz-theme', newTheme ? 'dark' : 'light')

      // Emitir evento para componentes que precisam reagir
      window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { isDark: newTheme }
      }))
    }

    console.log('✅ Tema inicializado:', isDark ? 'dark' : 'light')
  } catch (error) {
    console.warn('⚠️ Erro ao inicializar tema:', error)
  }
})
