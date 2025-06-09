<template>
  <div class="map-container">
    <!-- Mapa principal -->
    <div id="map" ref="mapContainer"></div>

    <!-- Slots para componentes externos -->
    <slot
        name="controls"
        :loading-user="locatingUser"
        :can-calculate-route="canCalculateRoute"
        :route-data="routeData"
        @center-user-location="centerOnUserLocation"
    />

    <slot
        name="loading-overlay"
        :loading="loading"
        :loading-message="loadingMessage"
    />

    <slot
        name="calculation-progress"
        :route-data="routeData"
    />

    <slot
        name="notifications"
        :calculation-error="calculationError"
        :route-data="routeData"
        @clear-error="clearCalculationError"
    />

    <slot
        name="route-info"
        :route-info="routeInfo"
    />
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Notify } from 'quasar'
import polyline from '@mapbox/polyline'

// Corrigir ícones do Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

export default {
  name: 'MapView',

  props: {
    routePoints: {
      type: Array,
      default: () => []
    },
    routeSegments: {
      type: Array,
      default: () => []
    },
    routeData: {
      type: Object,
      default: null
    },
    readonly: {
      type: Boolean,
      default: false
    },
    autoFit: {
      type: Boolean,
      default: true
    },
    centerOnLoad: {
      type: Boolean,
      default: true
    },
    showUserLocation: {
      type: Boolean,
      default: true
    },
    mapConfig: {
      type: Object,
      default: () => ({
        lat: -25.4284,
        lng: -49.2733,
        zoom: 13
      })
    }
  },

  emits: [
    'map-clicked',
    'point-clicked',
    'point-dragged',
    'map-ready',
    'user-location-found',
    'user-location-error',
    'error'
  ],

  data() {
    return {
      // Estado do mapa
      map: null,
      loading: false,
      loadingMessage: 'Carregando...',
      locatingUser: false,

      // Elementos do mapa
      markers: [],
      routePolylines: [],
      userLocationMarker: null,
      accuracyCircle: null,

      // Estados para compatibilidade com slots
      calculationError: null,

      // Dados pendentes para processamento após inicialização
      pendingSegments: null,
      pendingPoints: null
    }
  },

  computed: {
    canCalculateRoute() {
      return this.routePoints.length >= 2 || (this.routeData?.points?.length >= 2)
    },

    routeInfo() {
      if (!this.routeData) return null

      return {
        name: this.routeData.name || 'Rota sem nome',
        points: this.routeData.points?.length || this.routePoints.length || 0,
        distance: this.routeData.total_distance || 0,
        duration: this.routeData.total_duration || 0
      }
    },

    defaultPosition() {
      return {
        lat: this.mapConfig.lat || -25.4284,
        lng: this.mapConfig.lng || -49.2733,
        zoom: this.mapConfig.zoom || 13
      }
    }
  },

  watch: {
    routePoints: {
      handler(newPoints, oldPoints) {
        console.log('RoutePoints changed:', newPoints.length, 'points')

        if (!this.map) {
          this.pendingPoints = newPoints
          return
        }

        if (oldPoints && newPoints.length === oldPoints.length) {
          this.updateMarkersOnly()
        } else {
          this.displayRoutePoints()
        }
      },
      deep: true
    },

    routeSegments: {
      handler(newSegments) {
        console.log('RouteSegments changed:', newSegments?.length || 0, 'segments')

        if (!this.map) {
          this.pendingSegments = newSegments
          return
        }

        if (newSegments && newSegments.length > 0) {
          this.displayRouteSegments(newSegments)
        } else {
          this.clearRoutePolylines()
        }
      },
      deep: true
    },

    routeData: {
      handler(newData) {
        if (newData && this.map) {
          this.updateMapVisualization()
        }
      },
      deep: true
    }
  },

  async mounted() {
    await this.initMap()
    this.addCustomStyles()
    this.processPendingData()
    this.$emit('map-ready', this.map)
  },

  beforeUnmount() {
    this.cleanup()
  },

  methods: {
    // ===========================================
    // MÉTODOS DE SANITIZAÇÃO
    // ===========================================
    sanitizeString(str) {
      if (!str || typeof str !== 'string') return ''
      return str
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
          .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
          .replace(/["'<>&]/g, '')
          .trim()
    },

    generateSafeId(id) {
      if (!id) return `icon-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      return String(id)
              .replace(/[^a-zA-Z0-9-_]/g, '')
              .replace(/^[^a-zA-Z_]/, 'id-')
              .substring(0, 50)
          || `fallback-${Date.now()}`
    },

    sanitizePointData(point) {
      if (!point) return null

      const generatePointId = (originalId) => {
        if (originalId && !originalId.toString().includes('temp_')) {
          return this.generateSafeId(`point-${originalId}`)
        }
        return `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      }

      return {
        ...point,
        name: this.sanitizeString(point.name || `Ponto ${point.sequence || 'sem nome'}`),
        id: generatePointId(point.id),
        lat: Number(point.lat || point.latitude || 0),
        lng: Number(point.lng || point.longitude || 0),
        sequence: Number(point.sequence || 0)
      }
    },

    sanitizeSegmentData(segment, index) {
      if (!segment) return null
      return {
        ...segment,
        id: this.generateSafeId(segment.id || `segment-${index}`),
        sequence: Number(segment.sequence || index),
        distance: Number(segment.distance || 0),
        duration: Number(segment.duration || 0),
        geometry: segment.geometry || null
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
    // MÉTODOS DE INICIALIZAÇÃO
    // ===========================================
    async initMap() {
      L.Marker.prototype.options.icon = DefaultIcon

      try {
        this.loading = true
        this.loadingMessage = 'Inicializando mapa...'

        let initialLat = this.defaultPosition.lat
        let initialLng = this.defaultPosition.lng
        let initialZoom = this.defaultPosition.zoom

        // Tentar obter localização do usuário se habilitado
        if (this.showUserLocation && this.centerOnLoad) {
          try {
            this.locatingUser = true
            this.loadingMessage = 'Obtendo sua localização...'
            const position = await this.getUserLocation()
            initialLat = position.coords.latitude
            initialLng = position.coords.longitude
            initialZoom = 16

            this.$emit('user-location-found', {
              lat: initialLat,
              lng: initialLng,
              accuracy: position.coords.accuracy
            })

            if (this.showUserLocation) {
              Notify.create({
                type: 'positive',
                message: 'Localização obtida com sucesso',
                position: 'top',
                timeout: 2000
              })
            }
          } catch (error) {
            console.warn('Usando localização padrão:', error)
            this.$emit('user-location-error', error)
          } finally {
            this.locatingUser = false
          }
        }

        this.loadingMessage = 'Carregando mapa...'

        // Criar mapa
        this.map = L.map(this.$refs.mapContainer).setView([initialLat, initialLng], initialZoom)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(this.map)

        L.control.scale().addTo(this.map)

        // Adicionar marcador de localização se obtida
        if (this.showUserLocation && initialLat !== this.defaultPosition.lat && initialLng !== this.defaultPosition.lng) {
          this.addUserLocationMarker(initialLat, initialLng)
        }

        // Configurar eventos do mapa
        if (!this.readonly) {
          this.map.on('click', this.onMapClick)
        }

        console.log('Mapa inicializado com sucesso')

      } catch (error) {
        console.error('Erro ao inicializar mapa:', error)
        this.handleError('map_init', 'Falha ao inicializar o mapa', error)
      } finally {
        this.loading = false
      }
    },

    addCustomStyles() {
      const style = document.createElement('style')
      style.textContent = `
        .custom-bus-stop-icon { background: none !important; border: none !important; }
        .user-location-marker { background: transparent; }
        .user-marker-inner {
          width: 24px; height: 24px; background-color: #4285F4; border-radius: 50%;
          border: 3px solid white; box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        }
      `
      document.head.appendChild(style)
    },

    cleanup() {
      if (this.map) {
        this.map.remove()
        this.map = null
      }
    },

    processPendingData() {
      console.log('=== PROCESSANDO DADOS PENDENTES ===')

      // Processar segmentos pendentes
      if (this.pendingSegments && this.pendingSegments.length > 0) {
        console.log('Processando segmentos pendentes:', this.pendingSegments.length)
        this.displayRouteSegments(this.pendingSegments)
        this.pendingSegments = null
      } else if (this.routeSegments && this.routeSegments.length > 0) {
        console.log('Processando routeSegments inicial:', this.routeSegments.length)
        this.displayRouteSegments(this.routeSegments)
      }

      // Processar pontos pendentes
      if (this.pendingPoints && this.pendingPoints.length > 0) {
        console.log('Processando pontos pendentes:', this.pendingPoints.length)
        this.displayRoutePoints(this.pendingPoints)
        this.pendingPoints = null
      } else if (this.routePoints && this.routePoints.length > 0) {
        console.log('Processando routePoints inicial:', this.routePoints.length)
        this.displayRoutePoints()
      }

      // Processar routeData se disponível
      if (this.routeData) {
        console.log('Processando routeData inicial')
        this.updateMapVisualization()
      }

      console.log('=== FIM DO PROCESSAMENTO PENDENTE ===')
    },

    onMapClick(e) {
      console.log('Clique no mapa detectado:', e.latlng.lat, e.latlng.lng)
      L.DomEvent.stopPropagation(e)
      this.$emit('map-clicked', { lat: e.latlng.lat, lng: e.latlng.lng })
    },

    // ===========================================
    // MÉTODOS DE VISUALIZAÇÃO
    // ===========================================
    createBusStopIcon(type = 'stop', uniqueId = null) {
      // Cores baseadas no tipo do ponto
      const colors = {
        stop: '#1976D2',
        origin: '#4CAF50',
        destination: '#F44336',
        waypoint: '#FF9800'
      }
      const color = colors[type] || colors.stop
      const safeId = this.generateSafeId(uniqueId)

      const html = `
        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
          <div style="width: 48px; height: 48px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); background-color: ${color};"></div>
        </div>
      `
      return L.divIcon({
        html: html,
        className: `custom-bus-stop-icon icon-${safeId}`,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
        popupAnchor: [0, -30]
      })
    },

    displayRoutePoints(points = null, autoFit = true) {
      console.log('Exibindo pontos no mapa...')

      if (!this.map) {
        console.warn('Tentativa de exibir pontos sem mapa inicializado!')
        return
      }

      this.clearRouteMarkers()
      const routePoints = points || this.routePoints

      if (!routePoints?.length) {
        console.log('Nenhum ponto para exibir')
        return
      }

      console.log('Adicionando', routePoints.length, 'pontos ao mapa')

      this.markers = routePoints
          .map((point, index) => {
            try {
              const sanitizedPoint = this.sanitizePointData(point)
              if (!sanitizedPoint) {
                console.warn(`Ponto ${index} inválido, pulando...`)
                return null
              }

              const latLng = [sanitizedPoint.lat, sanitizedPoint.lng]

              if (!this.isValidCoordinate(latLng[0], latLng[1])) {
                console.warn(`Coordenadas inválidas para ponto ${index}:`, latLng)
                return null
              }

              const name = sanitizedPoint.name
              const pointType = sanitizedPoint.type || 'stop'
              const busStopIcon = this.createBusStopIcon(pointType, `${sanitizedPoint.id}-${index}`)

              if (!this.map) {
                console.error(`Mapa se tornou null durante processamento do ponto ${index}!`)
                return null
              }

              const marker = L.marker(latLng, {
                draggable: !this.readonly,
                icon: busStopIcon,
                title: name
              })

              marker.addTo(this.map)

              const popupContent = `
              <b>${this.sanitizeString(name)}</b><br>
              Ponto #${index + 1}<br>
              Tipo: ${this.sanitizeString(pointType)}<br>
              <small>Lat: ${latLng[0].toFixed(6)}, Lng: ${latLng[1].toFixed(6)}</small>
            `
              marker.bindPopup(popupContent)

              // Eventos do marcador
              marker.on('click', () => {
                console.log('Marcador clicado:', name)
                this.$emit('point-clicked', { ...sanitizedPoint, index })
              })

              if (!this.readonly) {
                marker.on('dragend', (e) => {
                  const newPos = e.target.getLatLng()
                  this.$emit('point-dragged', {
                    id: sanitizedPoint.id,
                    index: index,
                    lat: newPos.lat,
                    lng: newPos.lng,
                    originalPoint: sanitizedPoint
                  })
                })
              }

              return marker
            } catch (error) {
              console.error(`Erro ao criar marcador para ponto ${index}:`, error)
              return null
            }
          })
          .filter(Boolean)

      console.log(`${this.markers.length} marcadores criados`)

      if (autoFit && this.autoFit && this.markers.length > 0) {
        this.fitRouteOnMap()
      }
    },

// Substitua o método parseGeometry no MapView.vue por esta versão corrigida

    parseGeometry(geometry, segmentIndex) {
      console.log(`🔍 [DEBUG] Parseando geometria do segmento ${segmentIndex}:`, {
        type: typeof geometry,
        value: geometry,
        preview: typeof geometry === 'string' ? geometry.substring(0, 100) : geometry
      })

      try {
        if (typeof geometry === 'string') {
          console.log(`📝 Geometria é string, analisando formato...`)

          // Primeiro, verificar se é um JSON escapado (string com aspas)
          let cleanGeometry = geometry

          // Se começa e termina com aspas duplas, é JSON escapado
          if (geometry.startsWith('"') && geometry.endsWith('"')) {
            console.log(`🔧 Detectado JSON escapado, removendo aspas...`)
            cleanGeometry = geometry.slice(1, -1) // Remove aspas do início e fim
            console.log(`✅ String limpa:`, cleanGeometry.substring(0, 100))
          }

          // Agora tentar parsear como JSON (caso seja GeoJSON)
          if (cleanGeometry.startsWith('{') || cleanGeometry.startsWith('[')) {
            console.log(`📦 Tentando parsear como JSON/GeoJSON...`)
            try {
              const geoJson = JSON.parse(cleanGeometry)
              console.log(`✅ JSON parseado com sucesso:`, geoJson)

              if (geoJson.coordinates && Array.isArray(geoJson.coordinates)) {
                console.log(`✅ Coordenadas encontradas no JSON:`, geoJson.coordinates.length, 'pontos')
                return geoJson.coordinates
              } else {
                console.warn(`⚠️ JSON válido mas sem coordenadas válidas`)
              }
            } catch (jsonError) {
              console.log(`❌ Erro ao parsear JSON:`, jsonError.message)
            }
          }

          // Se não é JSON, tentar como polyline encoded
          console.log(`🗺️ Tentando decodificar como polyline encoded...`)
          console.log(`📝 String para decodificar:`, cleanGeometry)

          try {
            const decoded = polyline.decode(cleanGeometry)
            console.log(`✅ Polyline decodificada com sucesso:`, decoded.length, 'pontos')
            console.log(`📍 Primeiro ponto:`, decoded[0])
            console.log(`📍 Último ponto:`, decoded[decoded.length - 1])

            // Polyline retorna [lat, lng], mas precisamos converter para [lng, lat] para o Leaflet
            const coordinates = decoded.map(point => [point[1], point[0]]) // Inverter lat/lng
            console.log(`🔄 Coordenadas convertidas (lng, lat):`, coordinates.length, 'pontos')

            return coordinates
          } catch (polylineError) {
            console.error(`❌ Erro ao decodificar polyline:`, polylineError.message)
            console.log(`🔍 String que falhou:`, cleanGeometry)
            return null
          }

        } else if (geometry && typeof geometry === 'object') {
          console.log(`📦 Geometria é objeto:`, geometry)

          if (geometry.coordinates && Array.isArray(geometry.coordinates)) {
            console.log(`✅ Coordenadas encontradas no objeto:`, geometry.coordinates.length, 'pontos')
            return geometry.coordinates
          } else {
            console.warn(`⚠️ Objeto sem propriedade coordinates válida`)
          }
        } else {
          console.error(`❌ Tipo de geometria não suportado:`, typeof geometry)
        }

        return null
      } catch (error) {
        console.error(`💥 Erro geral ao parsear geometria do segmento ${segmentIndex}:`, error)
        console.log(`🔍 Stack trace:`, error.stack)
        return null
      }
    },

// Também atualize o método displayRouteSegments para melhor handling das coordenadas
    displayRouteSegments(segments) {
      console.log('🗺️ === INICIANDO DISPLAY DE SEGMENTOS ===')
      console.log('📊 Segmentos recebidos:', segments?.length || 0)

      if (!this.map) {
        console.warn('⚠️ Tentativa de exibir segmentos sem mapa inicializado!')
        return
      }

      this.clearRoutePolylines()

      if (!segments?.length) {
        console.log('❌ Nenhum segmento para exibir')
        return
      }

      this.routePolylines = segments
          .map((segment, index) => {
            console.log(`\n🔄 [SEGMENTO ${index}] Processando...`)

            try {
              const sanitizedSegment = this.sanitizeSegmentData(segment, index)
              if (!sanitizedSegment) {
                console.warn(`❌ [SEGMENTO ${index}] Sanitização falhou`)
                return null
              }

              if (!sanitizedSegment.geometry) {
                console.warn(`❌ [SEGMENTO ${index}] Sem geometria`)
                return null
              }

              console.log(`🔍 [SEGMENTO ${index}] Parseando geometria...`)
              let coordinates = this.parseGeometry(sanitizedSegment.geometry, index)

              if (!coordinates?.length) {
                console.warn(`❌ [SEGMENTO ${index}] Parse da geometria falhou ou retornou vazio`)
                return null
              }

              console.log(`✅ [SEGMENTO ${index}] Coordenadas parseadas:`, coordinates.length, 'pontos')

              // Converter coordenadas para LatLng do Leaflet
              // As coordenadas já vêm no formato [lng, lat] do parseGeometry
              const latLngs = coordinates
                  .map((coord, coordIndex) => {
                    if (Array.isArray(coord) && coord.length >= 2) {
                      const lng = Number(coord[0])
                      const lat = Number(coord[1])

                      if (this.isValidCoordinate(lat, lng)) {
                        return L.latLng(lat, lng) // Leaflet espera lat, lng
                      } else {
                        console.warn(`⚠️ [SEGMENTO ${index}] Coordenada inválida ${coordIndex}:`, coord)
                        return null
                      }
                    } else {
                      console.warn(`⚠️ [SEGMENTO ${index}] Formato de coordenada inválido ${coordIndex}:`, coord)
                      return null
                    }
                  })
                  .filter(Boolean)

              if (!latLngs.length) {
                console.warn(`❌ [SEGMENTO ${index}] Nenhuma coordenada válida após conversão`)
                return null
              }

              console.log(`✅ [SEGMENTO ${index}] LatLngs válidos:`, latLngs.length)
              console.log(`📍 [SEGMENTO ${index}] Primeira LatLng:`, latLngs[0])
              console.log(`📍 [SEGMENTO ${index}] Última LatLng:`, latLngs[latLngs.length - 1])

              // Criar polyline
              const routePolyline = L.polyline(latLngs, {
                color: '#1976D2',
                opacity: 0.8,
                weight: 6,
                smoothFactor: 1
              }).addTo(this.map)

              const popupContent = `
          <b>Segmento ${sanitizedSegment.sequence + 1}</b><br>
          Distância: ${this.formatDistance(sanitizedSegment.distance / 1000)}<br>
          Duração: ${this.formatDuration(sanitizedSegment.duration / 60)}<br>
          <small>Pontos: ${latLngs.length}</small>
        `
              routePolyline.bindPopup(popupContent)

              console.log(`✅ [SEGMENTO ${index}] Polyline criada e adicionada ao mapa`)
              return routePolyline

            } catch (error) {
              console.error(`💥 [SEGMENTO ${index}] Erro durante processamento:`, error)
              return null
            }
          })
          .filter(Boolean)

      console.log(`\n📊 === RESULTADO FINAL ===`)
      console.log(`✅ Polylines criadas: ${this.routePolylines.length}`)

      if (this.routePolylines.length > 0 && this.autoFit) {
        console.log(`🎯 Ajustando mapa para mostrar rota...`)
        setTimeout(() => {
          this.fitRouteOnMap()
        }, 100)
      }

      console.log('🗺️ === FIM DO DISPLAY DE SEGMENTOS ===\n')
    },

    updateMapVisualization() {
      if (!this.routeData) {
        console.log('updateMapVisualization: Nenhum dado de rota disponível')
        return
      }

      console.log('=== ATUALIZANDO VISUALIZAÇÃO DO MAPA ===')

      // Atualizar pontos
      if (this.routeData.points?.length > 0) {
        console.log('Atualizando pontos...')
        this.displayRoutePoints(this.routeData.points, false)
      }

      // Atualizar segmentos
      if (this.routeData.segments?.length > 0) {
        console.log('Atualizando segmentos...')
        this.displayRouteSegments(this.routeData.segments)
      }

      // Ajustar visualização
      if (this.autoFit) {
        console.log('Ajustando visualização do mapa...')
        this.fitRouteOnMap()
      }
    },

    updateMarkersOnly() {
      console.log('Atualizando marcadores sem ajustar zoom...')
      this.displayRoutePoints(null, false)
    },

    clearRouteMarkers() {
      this.markers.forEach(marker => {
        if (this.map) this.map.removeLayer(marker)
      })
      this.markers = []
    },

    clearRoutePolylines() {
      this.routePolylines.forEach(polyline => {
        if (this.map && polyline) this.map.removeLayer(polyline)
      })
      this.routePolylines = []
    },

    clearRouteVisualization() {
      this.clearRouteMarkers()
      this.clearRoutePolylines()
    },

    fitRouteOnMap() {
      if (!this.map) return

      let bounds = null

      // Incluir marcadores
      if (this.markers.length > 0) {
        bounds = L.latLngBounds(this.markers.map(marker => marker.getLatLng()))
      }

      // Incluir polylines
      this.routePolylines.forEach(polyline => {
        if (polyline) {
          const polylineBounds = polyline.getBounds()
          if (bounds) {
            bounds.extend(polylineBounds)
          } else {
            bounds = polylineBounds
          }
        }
      })

      if (bounds?.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] })
      }
    },

    // ===========================================
    // MÉTODOS DE GEOLOCALIZAÇÃO
    // ===========================================
    getUserLocation() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalização não suportada pelo navegador'))
          return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      })
    },

    async centerOnUserLocation() {
      if (!this.map) return

      this.locatingUser = true

      try {
        const position = await this.getUserLocation()
        const { latitude, longitude, accuracy } = position.coords

        this.removeUserLocationMarker()
        this.addUserLocationMarker(latitude, longitude, accuracy)
        this.map.setView([latitude, longitude], 16)

        this.$emit('user-location-found', {
          lat: latitude,
          lng: longitude,
          accuracy
        })

        Notify.create({
          type: 'positive',
          message: 'Localização obtida com sucesso',
          position: 'top'
        })
      } catch (error) {
        console.error('Erro ao obter localização:', error)
        this.$emit('user-location-error', error)
        this.handleError('user_location', 'Não foi possível obter sua localização', error)

        this.map.setView(
            [this.defaultPosition.lat, this.defaultPosition.lng],
            this.defaultPosition.zoom
        )
      } finally {
        this.locatingUser = false
      }
    },

    addUserLocationMarker(latitude, longitude, accuracy = 0) {
      this.userLocationMarker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<div class="user-marker-inner"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map)

      this.userLocationMarker.bindPopup('Sua localização atual').openPopup()

      if (accuracy > 0) {
        this.accuracyCircle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#4285F4',
          fillColor: '#4285F4',
          fillOpacity: 0.2,
          weight: 1
        }).addTo(this.map)
      }
    },

    removeUserLocationMarker() {
      if (this.userLocationMarker && this.map) {
        this.map.removeLayer(this.userLocationMarker)
        this.userLocationMarker = null
      }

      if (this.accuracyCircle && this.map) {
        this.map.removeLayer(this.accuracyCircle)
        this.accuracyCircle = null
      }
    },

    // ===========================================
    // MÉTODOS PÚBLICOS PARA CONTROLE EXTERNO
    // ===========================================
    centerOnPoint(point) {
      if (this.map) {
        const lat = point.latitude || point.lat
        const lng = point.longitude || point.lng
        this.map.setView([lat, lng], 15)
      }
    },

    setMapView(lat, lng, zoom = 13) {
      if (this.map) {
        this.map.setView([lat, lng], zoom)
      }
    },

    getMapBounds() {
      return this.map ? this.map.getBounds() : null
    },

    invalidateSize() {
      if (this.map) {
        this.map.invalidateSize()
      }
    },

    // ===========================================
    // MÉTODOS UTILITÁRIOS
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

    clearCalculationError() {
      this.calculationError = null
    },

    handleError(type, message, error) {
      this.$emit('error', { type, message, error })
      Notify.create({
        type: 'negative',
        message,
        position: 'top'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
// Variables
$primary-color: #1976D2;
$success-color: #43A047;
$warning-color: #FF9800;
$error-color: #F44336;
$info-color: #17a2b8;

$shadow-light: 0 2px 5px rgba(0, 0, 0, 0.2);
$shadow-medium: 0 2px 8px rgba(0, 0, 0, 0.4);

$border-radius: 4px;
$z-index-controls: 1000;
$z-index-overlay: 1001;

// Main container
.map-container {
  width: 100%;
  height: 100%;
  position: relative;

  #map {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
}

// Custom marker styles (deep selectors)
:deep(.custom-bus-stop-icon) {
  background: none !important;
  border: none !important;
}

:deep(.user-location-marker) {
  background: transparent;
}

:deep(.user-marker-inner) {
  width: 24px;
  height: 24px;
  background-color: #4285F4;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

// Responsive design
@media (max-width: 600px) {
  .map-container {
    // Mobile specific adjustments can go here
  }
}

// Print styles
@media print {
  .map-container > *:not(#map) {
    display: none;
  }
}

// High contrast mode
@media (prefers-contrast: more) {
  :deep(.custom-bus-stop-icon div) {
    border-width: 3px;
  }
}

// Reduced motion preference
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
