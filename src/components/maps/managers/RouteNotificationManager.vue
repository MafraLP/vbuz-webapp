<template>
  <div class="route-notification-manager">
    <!-- Este componente não renderiza UI, apenas gerencia notificações -->
  </div>
</template>

<script>
import { Notify } from 'quasar'

export default {
  name: 'RouteNotificationManager',

  props: {
    enableSound: {
      type: Boolean,
      default: true
    },
    defaultTimeout: {
      type: Number,
      default: 5000
    },
    defaultPosition: {
      type: String,
      default: 'top',
      validator: (value) => ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].includes(value)
    },
    autoClose: {
      type: Boolean,
      default: true
    },
    persistErrors: {
      type: Boolean,
      default: true
    }
  },

  emits: [
    'notification-shown',
    'notification-dismissed',
    'error-logged'
  ],

  data() {
    return {
      activeNotifications: new Map(),
      notificationHistory: [],
      maxHistorySize: 100,
      errorLog: [],
      maxErrorLogSize: 50
    }
  },

  methods: {
    // ===========================================
    // MÉTODOS PÚBLICOS - NOTIFICAÇÕES GERAIS
    // ===========================================
    showNotification(message, type = 'info', options = {}) {
      const config = {
        type: type,
        message: message,
        position: options.position || this.defaultPosition,
        timeout: options.timeout !== undefined ? options.timeout : this.defaultTimeout,
        actions: options.actions || [],
        html: options.html || false,
        icon: options.icon,
        color: options.color,
        textColor: options.textColor,
        multiLine: options.multiLine || false,
        ...options
      }

      if (!this.autoClose || options.persistent) {
        config.timeout = 0
      }

      const notificationId = Date.now().toString()

      try {
        const notification = Notify.create(config)

        this.activeNotifications.set(notificationId, {
          id: notificationId,
          notification,
          config,
          createdAt: new Date(),
          dismissed: false
        })

        this.addToHistory(type, message, config)
        this.$emit('notification-shown', { id: notificationId, type, message, config })

        return notificationId

      } catch (error) {
        console.error('Erro ao exibir notificação:', error)
        return null
      }
    },

    dismissNotification(notificationId) {
      const notificationData = this.activeNotifications.get(notificationId)

      if (notificationData && !notificationData.dismissed) {
        try {
          if (notificationData.notification && typeof notificationData.notification === 'function') {
            notificationData.notification()
          }

          notificationData.dismissed = true
          this.activeNotifications.delete(notificationId)

          this.$emit('notification-dismissed', { id: notificationId })

          return true
        } catch (error) {
          console.error('Erro ao dispensar notificação:', error)
          return false
        }
      }

      return false
    },

    dismissAllNotifications() {
      const dismissed = []

      this.activeNotifications.forEach((notificationData, id) => {
        if (this.dismissNotification(id)) {
          dismissed.push(id)
        }
      })

      return dismissed
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - NOTIFICAÇÕES DE SUCESSO
    // ===========================================
    showSuccess(message, options = {}) {
      return this.showNotification(message, 'positive', {
        icon: 'check_circle',
        timeout: 3000,
        ...options
      })
    },

    showRouteCreated(routeName, routeId) {
      return this.showSuccess(`Rota "${routeName}" criada com sucesso`, {
        actions: [
          {
            label: 'Ver Detalhes',
            color: 'white',
            handler: () => {
              this.$emit('route-details-requested', { routeId, routeName })
            }
          }
        ]
      })
    },

    showCalculationCompleted(duration, distance) {
      const formattedDuration = this.formatDuration(duration)
      const formattedDistance = this.formatDistance(distance)

      return this.showSuccess(
        `Rota calculada com sucesso! Distância: ${formattedDistance}, Tempo: ${formattedDuration}`,
        {
          timeout: 5000,
          multiLine: true
        }
      )
    },

    showPointAdded(pointName) {
      return this.showSuccess(`Ponto "${pointName}" adicionado`, {
        timeout: 2000
      })
    },

    showLocationFound() {
      return this.showSuccess('Localização obtida com sucesso', {
        timeout: 2000,
        icon: 'location_on'
      })
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - NOTIFICAÇÕES DE ERRO
    // ===========================================
    showError(message, options = {}) {
      const errorId = this.logError('user_error', message, null)

      return this.showNotification(message, 'negative', {
        icon: 'error',
        timeout: this.persistErrors ? 0 : 6000,
        actions: [
          {
            label: 'Fechar',
            color: 'white',
            handler: () => {}
          }
        ],
        ...options,
        errorId
      })
    },

    showCalculationError(error) {
      let message = 'Erro ao calcular rota'

      if (typeof error === 'string') {
        message = error
      } else if (error?.message) {
        message = error.message
      } else if (error?.response?.data?.message) {
        message = error.response.data.message
      }

      return this.showError(message, {
        actions: [
          {
            label: 'Tentar Novamente',
            color: 'white',
            handler: () => {
              this.$emit('calculation-retry-requested')
            }
          },
          {
            label: 'Fechar',
            color: 'white',
            handler: () => {}
          }
        ]
      })
    },

    showLocationError(error) {
      let message = 'Não foi possível obter sua localização'

      if (error?.code === 1) {
        message = 'Acesso à localização negado. Verifique as permissões do navegador.'
      } else if (error?.code === 2) {
        message = 'Localização indisponível. Verifique sua conexão.'
      } else if (error?.code === 3) {
        message = 'Timeout ao obter localização. Tente novamente.'
      }

      return this.showError(message, {
        icon: 'location_off',
        actions: [
          {
            label: 'Tentar Novamente',
            color: 'white',
            handler: () => {
              this.$emit('location-retry-requested')
            }
          }
        ]
      })
    },

    showNetworkError() {
      return this.showError('Erro de conexão. Verifique sua internet e tente novamente.', {
        icon: 'wifi_off',
        actions: [
          {
            label: 'Tentar Novamente',
            color: 'white',
            handler: () => {
              this.$emit('network-retry-requested')
            }
          }
        ]
      })
    },

    showPermissionError(action) {
      return this.showError(`Você não tem permissão para ${action}`, {
        icon: 'lock',
        timeout: 6000
      })
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - NOTIFICAÇÕES DE AVISO
    // ===========================================
    showWarning(message, options = {}) {
      return this.showNotification(message, 'warning', {
        icon: 'warning',
        timeout: 4000,
        ...options
      })
    },

    showInstitutionWarning() {
      return this.showWarning(
        'Você não está associado a nenhuma instituição. Contate o administrador.',
        {
          timeout: 8000,
          actions: [
            {
              label: 'Entendi',
              color: 'white',
              handler: () => {}
            }
          ]
        }
      )
    },

    showUnsavedChanges() {
      return this.showWarning('Você tem alterações não salvas', {
        timeout: 0,
        actions: [
          {
            label: 'Salvar',
            color: 'white',
            handler: () => {
              this.$emit('save-requested')
            }
          },
          {
            label: 'Descartar',
            color: 'white',
            handler: () => {
              this.$emit('discard-requested')
            }
          }
        ]
      })
    },

    showMaxPointsWarning(maxPoints) {
      return this.showWarning(`Máximo de ${maxPoints} pontos atingido`, {
        timeout: 3000,
        icon: 'info'
      })
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - NOTIFICAÇÕES DE INFO
    // ===========================================
    showInfo(message, options = {}) {
      return this.showNotification(message, 'info', {
        icon: 'info',
        timeout: 4000,
        ...options
      })
    },

    showCalculationStarted() {
      return this.showInfo('Cálculo da rota iniciado. Acompanhe o progresso...', {
        timeout: 3000,
        icon: 'calculate'
      })
    },

    showCalculationCancelled() {
      return this.showInfo('Cálculo cancelado', {
        timeout: 2000,
        icon: 'cancel'
      })
    },

    showAutoSaveInfo() {
      return this.showInfo('Alterações salvas automaticamente', {
        timeout: 2000,
        icon: 'save'
      })
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - NOTIFICAÇÕES DE PROGRESSO
    // ===========================================
    showProgress(message, progress = 0, options = {}) {
      const progressMessage = progress > 0 ? `${message} (${progress}%)` : message

      return this.showNotification(progressMessage, 'ongoing', {
        icon: 'hourglass_empty',
        timeout: 0,
        spinner: true,
        ...options
      })
    },

    updateProgress(notificationId, progress, message = null) {
      const notificationData = this.activeNotifications.get(notificationId)

      if (notificationData && !notificationData.dismissed) {
        // Quasar não suporta atualização de notificações, então criamos uma nova
        this.dismissNotification(notificationId)

        const newMessage = message || notificationData.config.message
        const progressMessage = `${newMessage} (${progress}%)`

        return this.showProgress(progressMessage, progress, {
          ...notificationData.config,
          message: progressMessage
        })
      }

      return null
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - LOG DE ERROS
    // ===========================================
    logError(type, message, error = null) {
      const errorEntry = {
        id: Date.now().toString(),
        type,
        message,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : null,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      this.errorLog.push(errorEntry)

      // Limitar tamanho do log
      if (this.errorLog.length > this.maxErrorLogSize) {
        this.errorLog.shift()
      }

      console.error(`[${type}] ${message}`, error)
      this.$emit('error-logged', errorEntry)

      return errorEntry.id
    },

    getErrorLog() {
      return [...this.errorLog]
    },

    clearErrorLog() {
      this.errorLog = []
    },

    exportErrorLog() {
      return {
        errors: this.errorLog,
        exportedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - HISTÓRICO
    // ===========================================
    addToHistory(type, message, config) {
      const historyEntry = {
        id: Date.now().toString(),
        type,
        message,
        config,
        timestamp: new Date()
      }

      this.notificationHistory.push(historyEntry)

      // Limitar tamanho do histórico
      if (this.notificationHistory.length > this.maxHistorySize) {
        this.notificationHistory.shift()
      }
    },

    getNotificationHistory() {
      return [...this.notificationHistory]
    },

    clearNotificationHistory() {
      this.notificationHistory = []
    },

    getHistoryByType(type) {
      return this.notificationHistory.filter(entry => entry.type === type)
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - CONFIGURAÇÃO
    // ===========================================
    setDefaultPosition(position) {
      if (['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].includes(position)) {
        this.defaultPosition = position
        return true
      }
      return false
    },

    setDefaultTimeout(timeout) {
      if (typeof timeout === 'number' && timeout >= 0) {
        this.defaultTimeout = timeout
        return true
      }
      return false
    },

    enableAutoClose(enable = true) {
      this.autoClose = enable
    },

    enableErrorPersistence(enable = true) {
      this.persistErrors = enable
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - BATCH NOTIFICATIONS
    // ===========================================
    showBatchNotifications(notifications) {
      const results = []

      notifications.forEach((notification, index) => {
        // Pequeno delay entre notificações para evitar sobreposição
        setTimeout(() => {
          const id = this.showNotification(
            notification.message,
            notification.type || 'info',
            notification.options || {}
          )
          results.push({ index, id, notification })
        }, index * 100)
      })

      return results
    },

    showValidationErrors(errors) {
      if (!Array.isArray(errors) || errors.length === 0) {
        return []
      }

      const notifications = errors.map((error, index) => ({
        message: `Erro ${index + 1}: ${error}`,
        type: 'negative',
        options: {
          timeout: 0,
          actions: [
            {
              label: 'Fechar',
              color: 'white',
              handler: () => {}
            }
          ]
        }
      }))

      return this.showBatchNotifications(notifications)
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - DIALOGS E CONFIRMAÇÕES
    // ===========================================
    showConfirmation(message, options = {}) {
      return this.showNotification(message, 'warning', {
        timeout: 0,
        icon: 'help',
        actions: [
          {
            label: options.confirmLabel || 'Confirmar',
            color: 'white',
            handler: () => {
              if (options.onConfirm) options.onConfirm()
            }
          },
          {
            label: options.cancelLabel || 'Cancelar',
            color: 'white',
            handler: () => {
              if (options.onCancel) options.onCancel()
            }
          }
        ],
        ...options
      })
    },

    showDeleteConfirmation(itemName, onConfirm, onCancel) {
      return this.showConfirmation(
        `Tem certeza que deseja deletar "${itemName}"? Esta ação não pode ser desfeita.`,
        {
          confirmLabel: 'Deletar',
          cancelLabel: 'Cancelar',
          onConfirm,
          onCancel,
          icon: 'delete'
        }
      )
    },

    showUnsavedChangesConfirmation(onSave, onDiscard, onCancel) {
      return this.showNotification(
        'Você tem alterações não salvas. O que deseja fazer?',
        'warning',
        {
          timeout: 0,
          icon: 'save',
          actions: [
            {
              label: 'Salvar',
              color: 'white',
              handler: onSave || (() => {})
            },
            {
              label: 'Descartar',
              color: 'white',
              handler: onDiscard || (() => {})
            },
            {
              label: 'Cancelar',
              color: 'white',
              handler: onCancel || (() => {})
            }
          ]
        }
      )
    },

    // ===========================================
    // MÉTODOS PRIVADOS - FORMATAÇÃO
    // ===========================================
    formatDistance(distanceInKm) {
      if (distanceInKm < 1) {
        return `${Math.round(distanceInKm * 1000)}m`
      }
      return `${distanceInKm.toFixed(1)}km`
    },

    formatDuration(durationInMinutes) {
      if (durationInMinutes < 60) {
        return `${Math.round(durationInMinutes)}min`
      }
      const hours = Math.floor(durationInMinutes / 60)
      const minutes = Math.round(durationInMinutes % 60)
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`
    },

    formatTime(seconds) {
      if (seconds < 60) {
        return `${Math.round(seconds)}s`
      } else {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = Math.round(seconds % 60)
        return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - TEMPLATES
    // ===========================================
    getNotificationTemplates() {
      return {
        routeCreated: (routeName) => ({
          message: `Rota "${routeName}" criada com sucesso`,
          type: 'positive',
          options: { icon: 'add_circle', timeout: 3000 }
        }),

        routeUpdated: (routeName) => ({
          message: `Rota "${routeName}" atualizada`,
          type: 'positive',
          options: { icon: 'edit', timeout: 2000 }
        }),

        routeDeleted: (routeName) => ({
          message: `Rota "${routeName}" deletada`,
          type: 'positive',
          options: { icon: 'delete', timeout: 2000 }
        }),

        calculationStarted: () => ({
          message: 'Cálculo da rota iniciado',
          type: 'info',
          options: { icon: 'calculate', timeout: 3000 }
        }),

        calculationCompleted: (time) => ({
          message: `Rota calculada em ${this.formatTime(time)}`,
          type: 'positive',
          options: { icon: 'check_circle', timeout: 4000 }
        }),

        pointAdded: (pointName) => ({
          message: `Ponto "${pointName}" adicionado`,
          type: 'positive',
          options: { icon: 'place', timeout: 2000 }
        }),

        pointRemoved: (pointName) => ({
          message: `Ponto "${pointName}" removido`,
          type: 'info',
          options: { icon: 'remove_circle', timeout: 2000 }
        }),

        locationFound: () => ({
          message: 'Localização obtida com sucesso',
          type: 'positive',
          options: { icon: 'location_on', timeout: 2000 }
        }),

        networkError: () => ({
          message: 'Erro de conexão. Verifique sua internet.',
          type: 'negative',
          options: { icon: 'wifi_off', timeout: 6000 }
        }),

        permissionDenied: (action) => ({
          message: `Permissão negada para ${action}`,
          type: 'negative',
          options: { icon: 'lock', timeout: 5000 }
        })
      }
    },

    showTemplateNotification(templateName, ...args) {
      const templates = this.getNotificationTemplates()
      const template = templates[templateName]

      if (!template) {
        console.warn(`Template de notificação não encontrado: ${templateName}`)
        return null
      }

      const notification = template(...args)
      return this.showNotification(
        notification.message,
        notification.type,
        notification.options
      )
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - ESTATÍSTICAS
    // ===========================================
    getStatistics() {
      const now = Date.now()
      const last24h = now - (24 * 60 * 60 * 1000)
      const lastHour = now - (60 * 60 * 1000)

      const recent24h = this.notificationHistory.filter(
        entry => entry.timestamp.getTime() > last24h
      )

      const recentHour = this.notificationHistory.filter(
        entry => entry.timestamp.getTime() > lastHour
      )

      const byType = this.notificationHistory.reduce((acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1
        return acc
      }, {})

      return {
        total: this.notificationHistory.length,
        last24h: recent24h.length,
        lastHour: recentHour.length,
        byType,
        errors: this.errorLog.length,
        activeNotifications: this.activeNotifications.size
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - DEBUG
    // ===========================================
    getDebugInfo() {
      return {
        activeNotifications: Array.from(this.activeNotifications.values()).map(n => ({
          id: n.id,
          type: n.config.type,
          message: n.config.message,
          createdAt: n.createdAt,
          dismissed: n.dismissed
        })),
        historySize: this.notificationHistory.length,
        errorLogSize: this.errorLog.length,
        settings: {
          enableSound: this.enableSound,
          defaultTimeout: this.defaultTimeout,
          defaultPosition: this.defaultPosition,
          autoClose: this.autoClose,
          persistErrors: this.persistErrors
        },
        statistics: this.getStatistics()
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - LIMPEZA
    // ===========================================
    cleanup() {
      console.log('Limpando notificações ativas...')

      this.dismissAllNotifications()
      this.activeNotifications.clear()
    },

    reset() {
      console.log('Resetando notification manager...')

      this.cleanup()
      this.clearNotificationHistory()
      this.clearErrorLog()
    },

    // Método para obter o estado atual
    getCurrentState() {
      return {
        activeCount: this.activeNotifications.size,
        historyCount: this.notificationHistory.length,
        errorCount: this.errorLog.length,
        settings: {
          enableSound: this.enableSound,
          defaultTimeout: this.defaultTimeout,
          defaultPosition: this.defaultPosition,
          autoClose: this.autoClose,
          persistErrors: this.persistErrors
        },
        statistics: this.getStatistics()
      }
    }
  },

  // ===========================================
  // LIFECYCLE
  // ===========================================
  beforeUnmount() {
    this.cleanup()
  }
}
</script>

<style lang="scss" scoped>
.route-notification-manager {
  display: none; // Este componente não renderiza UI
}
</style>
