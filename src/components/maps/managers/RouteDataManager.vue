<template>
  <div class="route-data-manager">
    <!-- Este componente não renderiza UI, apenas gerencia dados -->
  </div>
</template>

<script>
import { routeApiService, routeUtils } from 'src/services/api/route/RouteApiService.js'
import { Notify } from 'quasar'

export default {
  name: 'RouteDataManager',

  props: {
    routeId: {
      type: Number,
      default: null
    },
    readonly: {
      type: Boolean,
      default: false
    },
    autoLoad: {
      type: Boolean,
      default: true
    }
  },

  emits: [
    'route-loaded',
    'route-updated',
    'route-cleared',
    'points-updated',
    'segments-updated',
    'loading-changed',
    'error'
  ],

  data() {
    return {
      // Estado dos dados
      routeData: null,
      routePoints: [],
      routeSegments: [],

      // Estado de carregamento
      loading: false,
      loadingMessage: 'Carregando...',

      // Cache e controle
      lastLoadedRouteId: null,
      dataCache: new Map()
    }
  },

  computed: {
    routeInfo() {
      if (!this.routeData) return null

      return {
        id: this.routeData.id,
        name: this.routeData.name || 'Rota sem nome',
        points: this.routeData.points?.length || this.routePoints.length || 0,
        distance: this.routeData.total_distance || 0,
        duration: this.routeData.total_duration || 0,
        calculationStatus: this.routeData.calculation_status,
        institutionId: this.routeData.institution_id,
        createdAt: this.routeData.created_at,
        updatedAt: this.routeData.updated_at
      }
    },

    hasValidRoute() {
      return !!this.routeData && !!this.routeData.id
    },

    hasPoints() {
      return this.routePoints.length > 0 || (this.routeData?.points?.length || 0) > 0
    },

    hasSegments() {
      return this.routeSegments.length > 0 || (this.routeData?.segments?.length || 0) > 0
    },

    isCalculated() {
      return this.routeData?.calculation_status === 'completed' && this.hasSegments
    }
  },

  watch: {
    routeId: {
      handler(newId, oldId) {
        console.log('RouteId changed:', oldId, '->', newId)

        if (newId && newId !== oldId && this.autoLoad) {
          this.loadRoute(newId)
        } else if (!newId) {
          this.clearRoute()
        }
      },
      immediate: true
    },

    loading(newValue) {
      this.$emit('loading-changed', newValue)
    }
  },

  methods: {
    // ===========================================
    // MÉTODOS PÚBLICOS - CARREGAMENTO
    // ===========================================
    async loadRoute(routeId) {
      if (!routeId) {
        console.warn('Tentativa de carregar rota sem ID')
        return null
      }

      try {
        this.setLoading(true, `Carregando rota #${routeId}...`)

        // Verificar cache primeiro
        const cachedData = this.dataCache.get(routeId)
        if (cachedData && Date.now() - cachedData.timestamp < 30000) { // Cache de 30s
          console.log('Usando dados do cache para rota:', routeId)
          this.setRouteData(cachedData.data)
          this.setLoading(false)
          return this.routeData
        }

        console.log('Carregando rota do servidor:', routeId)

        const response = this.readonly
          ? await routeApiService.getPublicRoute(routeId)
          : await routeApiService.getRoute(routeId)

        const routeData = response.data.route
        this.setRouteData(routeData)

        // Adicionar ao cache
        this.dataCache.set(routeId, {
          data: routeData,
          timestamp: Date.now()
        })

        this.lastLoadedRouteId = routeId
        this.$emit('route-loaded', this.routeData)

        console.log('Rota carregada com sucesso:', {
          id: this.routeData.id,
          name: this.routeData.name,
          points: this.routePoints.length,
          segments: this.routeSegments.length,
          status: this.routeData.calculation_status
        })

        return this.routeData

      } catch (error) {
        console.error('Erro ao carregar rota:', error)
        this.handleError('route_load', 'Não foi possível carregar a rota', error)
        return null
      } finally {
        this.setLoading(false)
      }
    },

    async refreshRoute(routeId = null) {
      const targetRouteId = routeId || this.routeId || this.routeData?.id

      if (!targetRouteId) {
        console.warn('Nenhuma rota para atualizar')
        return null
      }

      // Limpar cache para forçar recarregamento
      this.dataCache.delete(targetRouteId)

      return await this.loadRoute(targetRouteId)
    },

    clearRoute() {
      console.log('Limpando dados da rota')

      this.routeData = null
      this.routePoints = []
      this.routeSegments = []
      this.lastLoadedRouteId = null

      this.$emit('route-cleared')
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - MANIPULAÇÃO DE DADOS
    // ===========================================
    setRouteData(routeData) {
      if (!routeData) {
        this.clearRoute()
        return
      }

      console.log('Definindo dados da rota:', routeData.id)

      this.routeData = { ...routeData }

      // Atualizar pontos
      const newPoints = routeData.points || []
      if (JSON.stringify(this.routePoints) !== JSON.stringify(newPoints)) {
        this.routePoints = [...newPoints]
        this.$emit('points-updated', this.routePoints)
      }

      // Atualizar segmentos
      const newSegments = routeData.segments || []
      if (JSON.stringify(this.routeSegments) !== JSON.stringify(newSegments)) {
        this.routeSegments = [...newSegments]
        this.$emit('segments-updated', this.routeSegments)
      }

      this.$emit('route-updated', this.routeData)
    },

    updateRoutePoints(points) {
      console.log('Atualizando pontos localmente:', points.length)

      this.routePoints = [...points]

      if (this.routeData) {
        this.routeData = {
          ...this.routeData,
          points: [...points]
        }
      }

      this.$emit('points-updated', this.routePoints)
      this.$emit('route-updated', this.routeData)
    },

    updateRouteSegments(segments) {
      console.log('Atualizando segmentos localmente:', segments.length)

      this.routeSegments = [...segments]

      if (this.routeData) {
        this.routeData = {
          ...this.routeData,
          segments: [...segments]
        }
      }

      this.$emit('segments-updated', this.routeSegments)
      this.$emit('route-updated', this.routeData)
    },

    addPoint(point) {
      const newPoint = {
        id: point.id || `temp_${Date.now()}`,
        name: point.name || `Ponto ${this.routePoints.length + 1}`,
        lat: point.lat || point.latitude,
        lng: point.lng || point.longitude,
        latitude: point.lat || point.latitude,
        longitude: point.lng || point.longitude,
        sequence: this.routePoints.length,
        type: point.type || (this.routePoints.length === 0 ? 'origin' : 'stop'),
        ...point
      }

      this.routePoints.push(newPoint)
      this.updateRoutePoints(this.routePoints)

      return newPoint
    },

    updatePoint(index, pointData) {
      if (index >= 0 && index < this.routePoints.length) {
        this.routePoints[index] = {
          ...this.routePoints[index],
          ...pointData
        }
        this.updateRoutePoints(this.routePoints)
        return this.routePoints[index]
      }
      return null
    },

    removePoint(index) {
      if (index >= 0 && index < this.routePoints.length) {
        const removedPoint = this.routePoints.splice(index, 1)[0]

        // Reordenar sequences
        this.routePoints.forEach((point, idx) => {
          point.sequence = idx
        })

        this.updateRoutePoints(this.routePoints)
        return removedPoint
      }
      return null
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - PERSISTÊNCIA
    // ===========================================
    async saveRouteData(routeId = null) {
      const targetRouteId = routeId || this.routeId || this.routeData?.id

      if (!targetRouteId) {
        throw new Error('Nenhuma rota para salvar')
      }

      try {
        this.setLoading(true, 'Salvando dados da rota...')

        const updateData = {
          name: this.routeData?.name,
          points: routeUtils.formatPointsForAPI(this.routePoints)
        }

        console.log('Salvando dados da rota:', targetRouteId, updateData)

        const response = await routeApiService.updateRoute(targetRouteId, updateData)
        const updatedRoute = response.data.route || response.data

        this.setRouteData(updatedRoute)

        // Atualizar cache
        this.dataCache.set(targetRouteId, {
          data: updatedRoute,
          timestamp: Date.now()
        })

        Notify.create({
          type: 'positive',
          message: 'Rota salva com sucesso',
          position: 'top',
          timeout: 2000
        })

        return updatedRoute

      } catch (error) {
        console.error('Erro ao salvar rota:', error)
        this.handleError('route_save', 'Não foi possível salvar a rota', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    async deleteRoute(routeId = null) {
      const targetRouteId = routeId || this.routeId || this.routeData?.id

      if (!targetRouteId) {
        throw new Error('Nenhuma rota para deletar')
      }

      try {
        this.setLoading(true, 'Deletando rota...')

        await routeApiService.deleteRoute(targetRouteId)

        // Limpar cache
        this.dataCache.delete(targetRouteId)

        // Limpar dados locais
        this.clearRoute()

        Notify.create({
          type: 'positive',
          message: 'Rota deletada com sucesso',
          position: 'top',
          timeout: 2000
        })

        return true

      } catch (error) {
        console.error('Erro ao deletar rota:', error)
        this.handleError('route_delete', 'Não foi possível deletar a rota', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - VALIDAÇÃO
    // ===========================================
    validateRouteData() {
      const errors = []

      if (!this.routeData) {
        errors.push('Nenhum dado de rota disponível')
        return { valid: false, errors }
      }

      if (!this.routeData.name || this.routeData.name.trim().length === 0) {
        errors.push('Nome da rota é obrigatório')
      }

      if (this.routePoints.length < 2) {
        errors.push('Rota deve ter pelo menos 2 pontos')
      }

      // Validar coordenadas dos pontos
      this.routePoints.forEach((point, index) => {
        const lat = Number(point.lat || point.latitude || 0)
        const lng = Number(point.lng || point.longitude || 0)

        if (!this.isValidCoordinate(lat, lng)) {
          errors.push(`Ponto ${index + 1} tem coordenadas inválidas`)
        }
      })

      return {
        valid: errors.length === 0,
        errors
      }
    },

    isValidCoordinate(lat, lng) {
      return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      )
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - UTILIDADES
    // ===========================================
    getRouteDistance() {
      return this.routeData?.total_distance || 0
    },

    getRouteDuration() {
      return this.routeData?.total_duration || 0
    },

    getFormattedDistance() {
      const distance = this.getRouteDistance()
      return this.formatDistance(distance / 1000) // Converter para km
    },

    getFormattedDuration() {
      const duration = this.getRouteDuration()
      return this.formatDuration(duration / 60) // Converter para minutos
    },

    getPointByIndex(index) {
      return this.routePoints[index] || null
    },

    getPointById(id) {
      return this.routePoints.find(point => point.id === id) || null
    },

    getSegmentByIndex(index) {
      return this.routeSegments[index] || null
    },

    getRouteCenter() {
      if (this.routePoints.length === 0) return null

      const lats = this.routePoints.map(p => Number(p.lat || p.latitude || 0))
      const lngs = this.routePoints.map(p => Number(p.lng || p.longitude || 0))

      const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length
      const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length

      return { lat: centerLat, lng: centerLng }
    },

    getRouteBounds() {
      if (this.routePoints.length === 0) return null

      const lats = this.routePoints.map(p => Number(p.lat || p.latitude || 0))
      const lngs = this.routePoints.map(p => Number(p.lng || p.longitude || 0))

      return {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - EXPORT/IMPORT
    // ===========================================
    exportRouteData() {
      return {
        route: this.routeData,
        points: this.routePoints,
        segments: this.routeSegments,
        exportedAt: new Date().toISOString()
      }
    },

    importRouteData(data) {
      if (!data || !data.route) {
        throw new Error('Dados de importação inválidos')
      }

      console.log('Importando dados da rota:', data.route.id)

      this.setRouteData(data.route)

      if (data.points) {
        this.updateRoutePoints(data.points)
      }

      if (data.segments) {
        this.updateRouteSegments(data.segments)
      }

      return this.routeData
    },

    // ===========================================
    // MÉTODOS PRIVADOS
    // ===========================================
    setLoading(loading, message = 'Carregando...') {
      this.loading = loading
      this.loadingMessage = message
    },

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

    handleError(type, message, error) {
      console.error(`[${type}] ${message}:`, error)

      this.$emit('error', { type, message, error })

      Notify.create({
        type: 'negative',
        message,
        position: 'top',
        timeout: 5000
      })
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - DEBUG
    // ===========================================
    getDebugInfo() {
      return {
        routeData: this.routeData,
        routePoints: this.routePoints,
        routeSegments: this.routeSegments,
        loading: this.loading,
        lastLoadedRouteId: this.lastLoadedRouteId,
        cacheSize: this.dataCache.size,
        hasValidRoute: this.hasValidRoute,
        hasPoints: this.hasPoints,
        hasSegments: this.hasSegments,
        isCalculated: this.isCalculated
      }
    },

    clearCache() {
      console.log('Limpando cache de dados')
      this.dataCache.clear()
    },

    // Método para obter o estado atual
    getCurrentState() {
      return {
        routeData: this.routeData,
        routePoints: this.routePoints,
        routeSegments: this.routeSegments,
        routeInfo: this.routeInfo,
        loading: this.loading,
        hasValidRoute: this.hasValidRoute,
        hasPoints: this.hasPoints,
        hasSegments: this.hasSegments,
        isCalculated: this.isCalculated
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.route-data-manager {
  display: none; // Este componente não renderiza UI
}
</style>
