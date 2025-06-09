// src/composables/useTheme.js - Versão corrigida
import { ref, computed, onMounted } from 'vue'
import { Dark } from 'quasar'

// Estado global do tema
const isDarkMode = ref(false)
const isInitialized = ref(false)

// Cores do tema (para uso em JavaScript quando necessário)
const themeColors = {
  light: {
    // Brand Colors
    primary: '#ff6300',
    secondary: '#ffa100',
    tertiary: '#f4d508',
    alternate: '#f2ef12',

    // Utility Colors
    primaryText: '#0c0f0a',
    secondaryText: '#575757',
    primaryBackground: '#fffdf6',
    secondaryBackground: '#ffffff',

    // Accent Colors
    accent1: '#f27c34',
    accent2: '#ff4f78',
    accent3: '#f9b42f',
    accent4: '#e8eec3',

    // Semantic Colors
    positive: '#28a745',
    negative: '#d32f2f',
    warning: '#ff9a25',
    info: '#1976d2',

    // Custom Colors
    orangePantone: '#ff6300',
    night: '#0c0f0a',
    orangePeel: '#ffa100',
    schoolBusYellow: '#f4d508',
    aureolin: '#f2ef12'
  },

  dark: {
    // Brand Colors
    primary: '#ff6300',
    secondary: '#ffa100',
    tertiary: '#f4d508',
    alternate: '#f2ef12',

    // Utility Colors
    primaryText: '#ffffff',
    secondaryText: '#d9d9d9',
    primaryBackground: '#0c0f0a',
    secondaryBackground: '#1a1a1a',

    // Accent Colors
    accent1: '#ff8540',
    accent2: '#ffd47d',
    accent3: '#f5b42f',
    accent4: '#706c42',

    // Semantic Colors
    positive: '#00b853',
    negative: '#d53500',
    warning: '#ffb300',
    info: '#64b5f6',

    // Custom Colors
    orangePantone: '#ff6300',
    night: '#0c0f0a',
    orangePeel: '#ffa100',
    schoolBusYellow: '#f4d508',
    aureolin: '#f2ef12'
  }
}

export function useTheme() {
  // Inicializar tema baseado na preferência salva ou preferência do sistema
  const initializeTheme = () => {
    if (typeof window === 'undefined') return

    try {
      const savedTheme = localStorage.getItem('vbuz-theme')
      if (savedTheme !== null) {
        isDarkMode.value = savedTheme === 'dark'
      } else {
        // Usar preferência do sistema
        isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }

      // Aplicar tema usando Quasar Dark plugin
      Dark.set(isDarkMode.value)
      isInitialized.value = true

    } catch (error) {
      console.warn('Erro ao inicializar tema:', error)
      isDarkMode.value = false
      Dark.set(false)
    }
  }

  // Alternar tema
  const toggleTheme = () => {
    try {
      isDarkMode.value = !isDarkMode.value
      Dark.set(isDarkMode.value)
      localStorage.setItem('vbuz-theme', isDarkMode.value ? 'dark' : 'light')

      // Emitir evento para outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme-changed', {
          detail: {
            isDark: isDarkMode.value,
            colors: currentColors.value
          }
        }))
      }
    } catch (error) {
      console.warn('Erro ao alternar tema:', error)
    }
  }

  // Definir tema específico
  const setTheme = (theme) => {
    try {
      isDarkMode.value = theme === 'dark'
      Dark.set(isDarkMode.value)
      localStorage.setItem('vbuz-theme', theme)
    } catch (error) {
      console.warn('Erro ao definir tema:', error)
    }
  }

  // Cores atuais baseadas no tema
  const currentColors = computed(() => {
    return isDarkMode.value ? themeColors.dark : themeColors.light
  })

  // Obter cor CSS custom property
  const getCSSColor = (colorName) => {
    return `var(--q-${colorName})`
  }

  // Obter cor do tema atual
  const getThemeColor = (colorName) => {
    return currentColors.value[colorName] || '#000000'
  }

  // Verificar se uma cor é clara ou escura (para contraste)
  const isColorLight = (color) => {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return brightness > 155
  }

  // Obter cor de contraste
  const getContrastColor = (backgroundColor) => {
    return isColorLight(backgroundColor) ? currentColors.value.primaryText : currentColors.value.primaryText
  }

  // Observar mudanças na preferência do sistema
  const watchSystemTheme = () => {
    if (typeof window === 'undefined') return

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e) => {
        // Só aplicar se não houver preferência salva
        if (!localStorage.getItem('vbuz-theme')) {
          isDarkMode.value = e.matches
          Dark.set(isDarkMode.value)
        }
      }

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else {
        mediaQuery.addListener(handleChange)
      }
    } catch (error) {
      console.warn('Erro ao observar mudanças do sistema:', error)
    }
  }

  // Auto-inicializar quando usado em componentes
  onMounted(() => {
    if (!isInitialized.value) {
      initializeTheme()
      watchSystemTheme()
    }
  })

  return {
    // Estado
    isDarkMode: computed(() => isDarkMode.value),
    currentColors,
    themeColors,
    isInitialized: computed(() => isInitialized.value),

    // Métodos
    initializeTheme,
    toggleTheme,
    setTheme,
    getCSSColor,
    getThemeColor,
    isColorLight,
    getContrastColor,
    watchSystemTheme,

    // Computed helpers
    themeName: computed(() => isDarkMode.value ? 'dark' : 'light'),
    isLight: computed(() => !isDarkMode.value),
    isDark: computed(() => isDarkMode.value)
  }
}
