<template>
  <div class="route-points-manager">
    <!-- Este componente não renderiza UI, apenas gerencia pontos -->
  </div>
</template>

<script>
export default {
  name: 'RoutePointsManager',

  props: {
    points: {
      type: Array,
      default: () => []
    },
    readonly: {
      type: Boolean,
      default: false
    },
    maxPoints: {
      type: Number,
      default: 50
    },
    minPoints: {
      type: Number,
      default: 0
    },
    autoSequence: {
      type: Boolean,
      default: true
    },
    validateCoordinates: {
      type: Boolean,
      default: true
    }
  },

  emits: [
    'points-updated',
    'point-added',
    'point-updated',
    'point-removed',
    'point-moved',
    'points-reordered',
    'validation-error',
    'error',
    'request-action',  // ✅ NOVO
  ],

  data() {
    return {
      internalPoints: [],
      pointIdCounter: 0,
      undoHistory: [],
      maxUndoHistory: 10
    }
  },

  computed: {
    hasPoints() {
      return this.internalPoints.length > 0
    },

    pointsCount() {
      return this.internalPoints.length
    },

    canAddPoints() {
      return !this.readonly && this.internalPoints.length < this.maxPoints
    },

    canRemovePoints() {
      return !this.readonly && this.internalPoints.length > this.minPoints
    },

    isValidPointCount() {
      return this.internalPoints.length >= this.minPoints && this.internalPoints.length <= this.maxPoints
    },

    firstPoint() {
      return this.internalPoints[0] || null
    },

    lastPoint() {
      return this.internalPoints[this.internalPoints.length - 1] || null
    },

    originPoint() {
      return this.internalPoints.find(point => point.type === 'origin') || this.firstPoint
    },

    destinationPoint() {
      return this.internalPoints.find(point => point.type === 'destination') || this.lastPoint
    },

    waypointCount() {
      return this.internalPoints.filter(point =>
        point.type !== 'origin' && point.type !== 'destination'
      ).length
    }
  },

  watch: {
    points: {
      handler(newPoints) {
        console.log('Props points changed:', newPoints.length)
        this.syncWithProps(newPoints)
      },
      deep: true,
      immediate: true
    },

    internalPoints: {
      handler(newPoints) {
        this.$emit('points-updated', [...newPoints])
      },
      deep: true
    }
  },

  methods: {
    async handleManagerRequest(request) {
      console.log('PointsManager: Recebendo requisição:', request)

      const { action, args, callback } = request

      try {
        let result = null

        // PointsManager gerencia apenas estado local
        switch (action) {
          case 'validatePoints':
            result = this.validatePoints()
            break

          case 'addPoint':
            const [pointData] = args
            result = this.addPoint(pointData)
            break

          case 'removePoint':
            const [index] = args
            result = this.removePoint(index)
            break

          case 'updatePoint':
            const [updateIndex, updates] = args
            result = this.updatePoint(updateIndex, updates)
            break

          case 'clearAll':
            this.clearAllPoints()
            result = { success: true }
            break

          case 'optimizeOrder':
            result = this.optimizePointOrder()
            break

          case 'undo':
            result = this.undo()
            break

          default:
            console.log('PointsManager: Ação processada localmente:', action)
            result = { success: true, message: 'Ação processada localmente' }
        }

        // Chamar callback de sucesso
        if (callback) {
          callback(null, result)
        }

        return result

      } catch (error) {
        console.error('PointsManager: Erro ao processar requisição:', error)

        // Chamar callback de erro
        if (callback) {
          callback(error, null)
        }

        throw error
      }
    },

    syncFromParent(points) {
      console.log('PointsManager: Sincronizando pontos do parent:', points?.length || 0)

      if (Array.isArray(points)) {
        // Sincronizar sem emitir eventos para evitar loops
        this.internalPoints = points.map((point, index) => this.normalizePoint(point, index))

        if (this.autoSequence) {
          this.resequencePoints()
        }

        console.log('Pontos sincronizados com sucesso')
        return true
      }

      return false
    },

    // ===========================================
    // SINCRONIZAÇÃO COM PROPS
    // ===========================================
    syncWithProps(newPoints) {
      if (!newPoints || !Array.isArray(newPoints)) {
        this.internalPoints = []
        return
      }

      // Verificar se os pontos realmente mudaram
      if (JSON.stringify(this.internalPoints) === JSON.stringify(newPoints)) {
        return
      }

      console.log('Sincronizando pontos:', newPoints.length)
      this.internalPoints = newPoints.map((point, index) => this.normalizePoint(point, index))

      if (this.autoSequence) {
        this.resequencePoints()
      }
    },

    // ===========================================
    // NORMALIZAÇÃO E VALIDAÇÃO
    // ===========================================
    normalizePoint(point, index = null) {
      if (!point) return null

      const sequence = index !== null ? index : (point.sequence || this.internalPoints.length)

      const normalized = {
        id: point.id || this.generatePointId(),
        name: this.sanitizeString(point.name || `Ponto ${sequence + 1}`),
        lat: Number(point.lat || point.latitude || 0),
        lng: Number(point.lng || point.longitude || 0),
        latitude: Number(point.lat || point.latitude || 0),
        longitude: Number(point.lng || point.longitude || 0),
        sequence: sequence,
        type: point.type || this.determinePointType(sequence),
        description: this.sanitizeString(point.description || ''),
        address: this.sanitizeString(point.address || ''),
        ...point
      }

      // Validar coordenadas se habilitado
      if (this.validateCoordinates && !this.isValidCoordinate(normalized.lat, normalized.lng)) {
        this.$emit('validation-error', {
          type: 'invalid_coordinates',
          point: normalized,
          message: `Coordenadas inválidas para o ponto ${normalized.name}`
        })
      }

      return normalized
    },

    determinePointType(sequence) {
      if (sequence === 0) return 'origin'
      if (sequence === this.internalPoints.length) return 'destination'
      return 'waypoint'
    },

    sanitizeString(str) {
      if (!str || typeof str !== 'string') return ''
      return str
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
        .replace(/["'<>&]/g, '')
        .trim()
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

    generatePointId() {
      return `point_${Date.now()}_${++this.pointIdCounter}`
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - ADIÇÃO
    // ===========================================
    addPoint(pointData, index = null) {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível adicionar pontos em modo readonly' })
        return null
      }

      if (!this.canAddPoints) {
        this.$emit('error', { type: 'max_points', message: `Limite máximo de ${this.maxPoints} pontos atingido` })
        return null
      }

      console.log('Adicionando ponto:', pointData)

      this.saveToHistory()

      const insertIndex = index !== null ? index : this.internalPoints.length
      const newPoint = this.normalizePoint(pointData, insertIndex)

      if (index !== null) {
        this.internalPoints.splice(index, 0, newPoint)
      } else {
        this.internalPoints.push(newPoint)
      }

      if (this.autoSequence) {
        this.resequencePoints()
      }

      this.$emit('point-added', { point: newPoint, index: insertIndex })

      return newPoint
    },

    addPointAtCoordinates(lat, lng, name = null) {
      const pointData = {
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        name: name || `Ponto ${this.internalPoints.length + 1}`
      }

      return this.addPoint(pointData)
    },

    insertPointAt(index, pointData) {
      if (index < 0 || index > this.internalPoints.length) {
        this.$emit('error', { type: 'invalid_index', message: 'Índice inválido para inserção' })
        return null
      }

      return this.addPoint(pointData, index)
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - ATUALIZAÇÃO
    // ===========================================
    updatePoint(index, updates) {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível atualizar pontos em modo readonly' })
        return null
      }

      if (index < 0 || index >= this.internalPoints.length) {
        this.$emit('error', { type: 'invalid_index', message: 'Índice inválido para atualização' })
        return null
      }

      console.log('Atualizando ponto:', index, updates)

      this.saveToHistory()

      const oldPoint = { ...this.internalPoints[index] }
      const updatedPoint = this.normalizePoint({ ...oldPoint, ...updates }, index)

      this.internalPoints[index] = updatedPoint

      this.$emit('point-updated', {
        point: updatedPoint,
        oldPoint,
        index
      })

      return updatedPoint
    },

    updatePointById(id, updates) {
      const index = this.internalPoints.findIndex(point => point.id === id)
      if (index === -1) {
        this.$emit('error', { type: 'point_not_found', message: 'Ponto não encontrado' })
        return null
      }

      return this.updatePoint(index, updates)
    },

    updatePointCoordinates(index, lat, lng) {
      return this.updatePoint(index, { lat, lng, latitude: lat, longitude: lng })
    },

    updatePointName(index, name) {
      return this.updatePoint(index, { name })
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - REMOÇÃO
    // ===========================================
    removePoint(index) {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível remover pontos em modo readonly' })
        return null
      }

      if (!this.canRemovePoints) {
        this.$emit('error', { type: 'min_points', message: `Mínimo de ${this.minPoints} pontos obrigatório` })
        return null
      }

      if (index < 0 || index >= this.internalPoints.length) {
        this.$emit('error', { type: 'invalid_index', message: 'Índice inválido para remoção' })
        return null
      }

      console.log('Removendo ponto:', index)

      this.saveToHistory()

      const removedPoint = this.internalPoints.splice(index, 1)[0]

      if (this.autoSequence) {
        this.resequencePoints()
      }

      this.$emit('point-removed', { point: removedPoint, index })

      return removedPoint
    },

    removePointById(id) {
      const index = this.internalPoints.findIndex(point => point.id === id)
      if (index === -1) {
        this.$emit('error', { type: 'point_not_found', message: 'Ponto não encontrado' })
        return null
      }

      return this.removePoint(index)
    },

    removeLastPoint() {
      if (this.internalPoints.length === 0) return null
      return this.removePoint(this.internalPoints.length - 1)
    },

    clearAllPoints() {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível limpar pontos em modo readonly' })
        return
      }

      console.log('Limpando todos os pontos')

      this.saveToHistory()

      const removedPoints = [...this.internalPoints]
      this.internalPoints = []

      this.$emit('points-updated', [])
      removedPoints.forEach((point, index) => {
        this.$emit('point-removed', { point, index })
      })
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - MOVIMENTAÇÃO E ORDENAÇÃO
    // ===========================================
    movePoint(fromIndex, toIndex) {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível mover pontos em modo readonly' })
        return false
      }

      if (fromIndex < 0 || fromIndex >= this.internalPoints.length ||
        toIndex < 0 || toIndex >= this.internalPoints.length) {
        this.$emit('error', { type: 'invalid_index', message: 'Índices inválidos para movimentação' })
        return false
      }

      if (fromIndex === toIndex) return true

      console.log('Movendo ponto:', fromIndex, '->', toIndex)

      this.saveToHistory()

      const [movedPoint] = this.internalPoints.splice(fromIndex, 1)
      this.internalPoints.splice(toIndex, 0, movedPoint)

      if (this.autoSequence) {
        this.resequencePoints()
      }

      this.$emit('point-moved', {
        point: movedPoint,
        fromIndex,
        toIndex
      })

      this.$emit('points-reordered', [...this.internalPoints])

      return true
    },

    swapPoints(index1, index2) {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível trocar pontos em modo readonly' })
        return false
      }

      if (index1 < 0 || index1 >= this.internalPoints.length ||
        index2 < 0 || index2 >= this.internalPoints.length) {
        this.$emit('error', { type: 'invalid_index', message: 'Índices inválidos para troca' })
        return false
      }

      if (index1 === index2) return true

      console.log('Trocando pontos:', index1, '<->', index2)

      this.saveToHistory()

      const temp = this.internalPoints[index1]
      this.internalPoints[index1] = this.internalPoints[index2]
      this.internalPoints[index2] = temp

      if (this.autoSequence) {
        this.resequencePoints()
      }

      this.$emit('points-reordered', [...this.internalPoints])

      return true
    },

    reorderPoints(newOrder) {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível reordenar pontos em modo readonly' })
        return false
      }

      if (!Array.isArray(newOrder) || newOrder.length !== this.internalPoints.length) {
        this.$emit('error', { type: 'invalid_order', message: 'Nova ordem inválida' })
        return false
      }

      console.log('Reordenando pontos:', newOrder)

      this.saveToHistory()

      const reorderedPoints = newOrder.map(index => {
        if (index < 0 || index >= this.internalPoints.length) {
          throw new Error(`Índice inválido na nova ordem: ${index}`)
        }
        return this.internalPoints[index]
      })

      this.internalPoints = reorderedPoints

      if (this.autoSequence) {
        this.resequencePoints()
      }

      this.$emit('points-reordered', [...this.internalPoints])

      return true
    },

    resequencePoints() {
      console.log('Resequenciando pontos...')

      this.internalPoints.forEach((point, index) => {
        point.sequence = index
        point.type = this.determinePointType(index)
      })
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - BUSCA E CONSULTA
    // ===========================================
    getPoint(index) {
      if (index < 0 || index >= this.internalPoints.length) {
        return null
      }
      return { ...this.internalPoints[index] }
    },

    getPointById(id) {
      const point = this.internalPoints.find(point => point.id === id)
      return point ? { ...point } : null
    },

    findPointIndex(id) {
      return this.internalPoints.findIndex(point => point.id === id)
    },

    getPointsByType(type) {
      return this.internalPoints
        .filter(point => point.type === type)
        .map(point => ({ ...point }))
    },

    getPointsInRadius(centerLat, centerLng, radiusKm) {
      return this.internalPoints.filter(point => {
        const distance = this.calculateDistance(
          centerLat, centerLng,
          point.lat, point.lng
        )
        return distance <= radiusKm
      }).map(point => ({ ...point }))
    },

    getAllPoints() {
      return this.internalPoints.map(point => ({ ...point }))
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - CÁLCULOS E GEOMETRIA
    // ===========================================
    calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371 // Raio da Terra em km
      const dLat = this.toRadians(lat2 - lat1)
      const dLng = this.toRadians(lng2 - lng1)
      const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng/2) * Math.sin(dLng/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    },

    toRadians(degrees) {
      return degrees * (Math.PI/180)
    },

    getTotalDistance() {
      if (this.internalPoints.length < 2) return 0

      let totalDistance = 0
      for (let i = 0; i < this.internalPoints.length - 1; i++) {
        const point1 = this.internalPoints[i]
        const point2 = this.internalPoints[i + 1]
        totalDistance += this.calculateDistance(
          point1.lat, point1.lng,
          point2.lat, point2.lng
        )
      }
      return totalDistance
    },

    getCenter() {
      if (this.internalPoints.length === 0) return null

      const lats = this.internalPoints.map(p => p.lat)
      const lngs = this.internalPoints.map(p => p.lng)

      const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length
      const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length

      return { lat: centerLat, lng: centerLng }
    },

    getBounds() {
      if (this.internalPoints.length === 0) return null

      const lats = this.internalPoints.map(p => p.lat)
      const lngs = this.internalPoints.map(p => p.lng)

      return {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - VALIDAÇÃO
    // ===========================================
    validatePoints() {
      const errors = []

      // Validar quantidade
      if (this.internalPoints.length < this.minPoints) {
        errors.push(`Mínimo de ${this.minPoints} pontos obrigatório`)
      }

      if (this.internalPoints.length > this.maxPoints) {
        errors.push(`Máximo de ${this.maxPoints} pontos permitido`)
      }

      // Validar cada ponto
      this.internalPoints.forEach((point, index) => {
        // Validar coordenadas
        if (!this.isValidCoordinate(point.lat, point.lng)) {
          errors.push(`Ponto ${index + 1}: coordenadas inválidas`)
        }

        // Validar nome
        if (!point.name || point.name.trim().length === 0) {
          errors.push(`Ponto ${index + 1}: nome obrigatório`)
        }

        // Validar sequência
        if (point.sequence !== index) {
          errors.push(`Ponto ${index + 1}: sequência incorreta`)
        }
      })

      // Validar duplicatas por coordenadas
      const duplicates = this.findDuplicatePoints()
      if (duplicates.length > 0) {
        duplicates.forEach(({ index1, index2 }) => {
          errors.push(`Pontos ${index1 + 1} e ${index2 + 1} têm coordenadas muito próximas`)
        })
      }

      return {
        valid: errors.length === 0,
        errors
      }
    },

    findDuplicatePoints(threshold = 0.0001) {
      const duplicates = []

      for (let i = 0; i < this.internalPoints.length; i++) {
        for (let j = i + 1; j < this.internalPoints.length; j++) {
          const point1 = this.internalPoints[i]
          const point2 = this.internalPoints[j]

          const latDiff = Math.abs(point1.lat - point2.lat)
          const lngDiff = Math.abs(point1.lng - point2.lng)

          if (latDiff < threshold && lngDiff < threshold) {
            duplicates.push({ index1: i, index2: j, point1, point2 })
          }
        }
      }

      return duplicates
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - HISTÓRICO (UNDO/REDO)
    // ===========================================
    saveToHistory() {
      const currentState = JSON.stringify(this.internalPoints)

      // Evitar duplicatas
      if (this.undoHistory.length > 0 &&
        this.undoHistory[this.undoHistory.length - 1] === currentState) {
        return
      }

      this.undoHistory.push(currentState)

      // Limitar tamanho do histórico
      if (this.undoHistory.length > this.maxUndoHistory) {
        this.undoHistory.shift()
      }
    },

    undo() {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível desfazer em modo readonly' })
        return false
      }

      if (this.undoHistory.length < 2) {
        return false // Não há o que desfazer
      }

      // Remover estado atual e voltar ao anterior
      this.undoHistory.pop()
      const previousState = this.undoHistory[this.undoHistory.length - 1]

      try {
        this.internalPoints = JSON.parse(previousState)
        console.log('Undo realizado, pontos restaurados:', this.internalPoints.length)
        return true
      } catch (error) {
        console.error('Erro ao desfazer:', error)
        return false
      }
    },

    canUndo() {
      return !this.readonly && this.undoHistory.length > 1
    },

    clearHistory() {
      this.undoHistory = []
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - IMPORT/EXPORT
    // ===========================================
    exportPoints(format = 'json') {
      switch (format.toLowerCase()) {
        case 'json':
          return {
            points: this.internalPoints,
            count: this.internalPoints.length,
            totalDistance: this.getTotalDistance(),
            center: this.getCenter(),
            bounds: this.getBounds(),
            exportedAt: new Date().toISOString()
          }

        case 'geojson':
          return {
            type: 'FeatureCollection',
            features: this.internalPoints.map(point => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [point.lng, point.lat]
              },
              properties: {
                id: point.id,
                name: point.name,
                sequence: point.sequence,
                type: point.type,
                description: point.description,
                address: point.address
              }
            }))
          }

        case 'csv':
          const headers = ['id', 'name', 'lat', 'lng', 'sequence', 'type', 'description', 'address']
          const rows = this.internalPoints.map(point =>
            headers.map(header => point[header] || '').join(',')
          )
          return [headers.join(','), ...rows].join('\n')

        default:
          throw new Error(`Formato de exportação não suportado: ${format}`)
      }
    },

    importPoints(data, format = 'json') {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível importar pontos em modo readonly' })
        return false
      }

      try {
        let importedPoints = []

        switch (format.toLowerCase()) {
          case 'json':
            if (data.points) {
              importedPoints = data.points
            } else if (Array.isArray(data)) {
              importedPoints = data
            } else {
              throw new Error('Formato JSON inválido')
            }
            break

          case 'geojson':
            if (data.features) {
              importedPoints = data.features.map(feature => ({
                id: feature.properties.id,
                name: feature.properties.name,
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0],
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0],
                sequence: feature.properties.sequence,
                type: feature.properties.type,
                description: feature.properties.description,
                address: feature.properties.address
              }))
            } else {
              throw new Error('Formato GeoJSON inválido')
            }
            break

          default:
            throw new Error(`Formato de importação não suportado: ${format}`)
        }

        console.log('Importando pontos:', importedPoints.length)

        this.saveToHistory()
        this.internalPoints = importedPoints.map((point, index) =>
          this.normalizePoint(point, index)
        )

        if (this.autoSequence) {
          this.resequencePoints()
        }

        return true

      } catch (error) {
        console.error('Erro ao importar pontos:', error)
        this.$emit('error', { type: 'import_error', message: error.message })
        return false
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - UTILIDADES
    // ===========================================
    optimizePointOrder() {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível otimizar em modo readonly' })
        return false
      }

      if (this.internalPoints.length < 3) {
        return false // Não há o que otimizar
      }

      console.log('Otimizando ordem dos pontos...')

      this.saveToHistory()

      // Algoritmo simples de vizinho mais próximo
      const origin = this.internalPoints[0]
      const destination = this.internalPoints[this.internalPoints.length - 1]
      const waypoints = this.internalPoints.slice(1, -1)

      if (waypoints.length === 0) {
        return true // Nada a otimizar
      }

      const optimizedWaypoints = []
      let currentPoint = origin
      const remainingPoints = [...waypoints]

      while (remainingPoints.length > 0) {
        let nearestIndex = 0
        let nearestDistance = this.calculateDistance(
          currentPoint.lat, currentPoint.lng,
          remainingPoints[0].lat, remainingPoints[0].lng
        )

        for (let i = 1; i < remainingPoints.length; i++) {
          const distance = this.calculateDistance(
            currentPoint.lat, currentPoint.lng,
            remainingPoints[i].lat, remainingPoints[i].lng
          )

          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestIndex = i
          }
        }

        const nearestPoint = remainingPoints.splice(nearestIndex, 1)[0]
        optimizedWaypoints.push(nearestPoint)
        currentPoint = nearestPoint
      }

      this.internalPoints = [origin, ...optimizedWaypoints, destination]

      if (this.autoSequence) {
        this.resequencePoints()
      }

      this.$emit('points-reordered', [...this.internalPoints])

      return true
    },

    snapToGrid(gridSize = 0.001) {
      if (this.readonly) {
        this.$emit('error', { type: 'readonly', message: 'Não é possível ajustar pontos em modo readonly' })
        return false
      }

      console.log('Ajustando pontos à grade:', gridSize)

      this.saveToHistory()

      this.internalPoints.forEach(point => {
        point.lat = Math.round(point.lat / gridSize) * gridSize
        point.lng = Math.round(point.lng / gridSize) * gridSize
        point.latitude = point.lat
        point.longitude = point.lng
      })

      return true
    },

    // ===========================================
    // MÉTODOS PÚBLICOS - DEBUG E STATUS
    // ===========================================
    getDebugInfo() {
      return {
        pointsCount: this.pointsCount,
        hasPoints: this.hasPoints,
        canAddPoints: this.canAddPoints,
        canRemovePoints: this.canRemovePoints,
        isValidPointCount: this.isValidPointCount,
        totalDistance: this.getTotalDistance(),
        center: this.getCenter(),
        bounds: this.getBounds(),
        validation: this.validatePoints(),
        undoHistorySize: this.undoHistory.length,
        canUndo: this.canUndo(),
        readonly: this.readonly
      }
    },

    getStatistics() {
      return {
        total: this.pointsCount,
        origin: this.getPointsByType('origin').length,
        destination: this.getPointsByType('destination').length,
        waypoints: this.waypointCount,
        totalDistance: this.getTotalDistance(),
        averageDistance: this.pointsCount > 1 ? this.getTotalDistance() / (this.pointsCount - 1) : 0,
        bounds: this.getBounds(),
        center: this.getCenter()
      }
    },

    // Método para obter o estado atual completo
    getCurrentState() {
      return {
        points: this.getAllPoints(),
        count: this.pointsCount,
        hasPoints: this.hasPoints,
        canAddPoints: this.canAddPoints,
        canRemovePoints: this.canRemovePoints,
        isValid: this.isValidPointCount,
        statistics: this.getStatistics(),
        validation: this.validatePoints()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.route-points-manager {
  display: none; // Este componente não renderiza UI
}
</style>
