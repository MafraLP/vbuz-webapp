<template>
  <div class="map-container">
    <div id="map" ref="mapContainer"></div>

    <!-- Controles do Mapa -->
    <MapControls
        :loading-user="locatingUser"
        :can-calculate-route="canCalculateRoute"
        :has-user-institution="authStore.hasUserInstitution"
        :is-calculating="isCalculating"
        :route-id="routeId"
        :route-data="routeData"
        @center-user-location="centerOnUserLocation"
        @calculate-route="calculateRoute"
        @refresh-route="refreshRoute"
    />

    <!-- Indicador de carregamento -->
    <LoadingOverlay
        v-if="loading"
        :message="loadingMessage"
    />

    <!-- Progresso do cálculo -->
    <CalculationProgress
        v-if="isCalculating"
        :route-id="(routeData && routeData.id) || routeId || 0"
        :calculation-status="calculationStatus"
        :estimated-time-remaining="estimatedTimeRemaining"
        :can-cancel="canCancelCalculation"
        @cancel-calculation="cancelCalculation"
    />

    <!-- Notificações/Banners -->
    <NotificationBanners
        :has-user-institution="authStore.hasUserInstitution"
        :calculation-success="false"
        :calculation-error="calculationError"
        :route-data="routeData"
        :can-retry="canRetryCalculation"
        @close-success="() => {}"
        @retry-calculation="retryCalculation"
        @clear-error="clearCalculationError"
    />

    <!-- Info da rota -->
    <RouteInfo
        v-if="routeInfo && (routeInfo.distance > 0 || routeInfo.points > 0)"
        :route-info="routeInfo"
    />
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Notify } from 'quasar';
import { routeApiService, routeUtils } from 'src/services/api/route/RouteApiService.js';
import { useAuthStore } from 'src/stores/auth';
import polyline from '@mapbox/polyline';

// Componentes
import MapControls from 'src/components/maps/components/MapControls.vue';
import LoadingOverlay from 'src/components/maps/components/LoadingOverlay.vue';
import CalculationProgress from 'src/components/maps/components/CalculationProgress.vue';
import NotificationBanners from 'src/components/maps/components/NotificationBanners.vue';
import RouteInfo from 'src/components/maps/components/RouteInfo.vue';

// Corrigir problema de ícones no Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default {
  name: 'MapView',

  components: {
    MapControls,
    LoadingOverlay,
    CalculationProgress,
    NotificationBanners,
    RouteInfo
  },

  props: {
    routeId: {
      type: Number,
      default: null
    },
    routePoints: {
      type: Array,
      default: () => []
    },
    readonly: {
      type: Boolean,
      default: false
    },
    routeName: {
      type: String,
      default: 'Nova Rota'
    },
    autoCalculate: {
      type: Boolean,
      default: false
    },
    routeDraw: {
      type: Array,
      default: () => []
    }
  },

  emits: [
    'map-clicked',
    'point-clicked',
    'point-dragged',
    'route-updated',
    'route-created',
    'route-loaded',
    'calculation-started',
    'calculation-completed',
    'calculation-failed',
    'error'
  ],

  data() {
    return {
      authStore: useAuthStore(),
      map: null,
      userLocationMarker: null,
      accuracyCircle: null,
      locatingUser: false,
      loading: false,
      loadingMessage: 'Carregando...',

      pendingSegments: null,

      // Sistema de cálculo assíncrono
      isCalculating: false,
      calculationStatus: null,
      calculationError: null,
      calculationPollingInterval: null,
      calculationStartTime: null,
      pollingCount: 0,
      maxPollingAttempts: 150, // 5 minutos com polling de 2s

      defaultPosition: {
        lat: -25.4284,
        lng: -49.2733,
        zoom: 13
      },
      markers: [],
      routePolylines: [],
      routeData: null,
    };
  },

  computed: {
    canCalculateRoute() {
      return this.routePoints.length >= 2 || (this.routeId && this.routeData?.points?.length >= 2);
    },

    canRetryCalculation() {
      return this.routeId || this.routePoints.length >= 2;
    },

    canCancelCalculation() {
      return this.isCalculating && this.pollingCount > 3;
    },

    showCalculationProgress() {
      return this.isCalculating && this.calculationStatus;
    },

    calculationProgressValue() {
      return (this.calculationStatus?.progress_percentage || 0) / 100;
    },

    calculationMessage() {
      if (!this.calculationStatus) return 'Iniciando...';
      return routeUtils.getStatusMessage(
          this.calculationStatus.status,
          this.calculationStatus
      );
    },

    estimatedTimeRemaining() {
      return this.calculationStatus?.estimated_remaining_seconds || 0;
    },

    routeInfo() {
      if (!this.routeData) return null;

      console.log('Calculando routeInfo com routeData:', this.routeData);
      console.log('total_distance:', this.routeData.total_distance);
      console.log('total_duration:', this.routeData.total_duration);

      return {
        name: this.routeData.name || 'Rota sem nome',
        points: this.routeData.points?.length || 0,
        distance: this.routeData.total_distance || 0,
        duration: this.routeData.total_duration || 0
      };
    }
  },

  watch: {
    routePoints: {
      handler(newPoints, oldPoints) {
        console.log('RoutePoints changed:', newPoints.length, 'points');

        if (oldPoints && newPoints.length === oldPoints.length) {
          this.updateMarkersOnly();
        } else {
          this.displayRoutePoints();

          if (this.autoCalculate && newPoints.length >= 2 && !this.routeId) {
            this.autoCalculateRoute();
          }
        }
      },
      deep: true
    },

    routeId: {
      handler(newId, oldId) {
        console.log('RouteId changed:', oldId, '->', newId);

        if (newId && newId !== oldId) {
          this.loadRoute(newId);
        } else if (!newId) {
          this.clearRoute();
        }
      },
      immediate: true
    },

    routeDraw: {
      handler(newSegments, oldSegments) {
        console.log('MapView: routeDraw prop changed');
        console.log('- Segmentos anteriores:', oldSegments?.length || 0);
        console.log('- Novos segmentos:', newSegments?.length || 0);
        console.log('- Mapa inicializado:', !!this.map);

        // *** VERIFICAR SE MAPA ESTÁ INICIALIZADO ***
        if (!this.map) {
          console.log('Mapa não inicializado ainda, salvando segmentos para depois...');
          this.pendingSegments = newSegments;
          return;
        }

        if (newSegments && newSegments.length > 0) {
          console.log('Exibindo segmentos da prop routeDraw...');
          this.displayRouteSegments(newSegments);
        } else {
          console.log('Limpando segmentos (prop vazia)...');
          this.clearRoutePolylines();
        }
      },
      deep: true
      // *** REMOVER immediate: true ***
    },

    calculationStatus: {
      handler(newStatus) {
        if (newStatus?.status === 'completed') {
          this.onCalculationCompleted();
        } else if (newStatus?.status === 'error' || newStatus?.status === 'failed') {
          this.onCalculationFailed(newStatus.error_message);
        }
      },
      deep: true
    }
  },

  async mounted() {
    await this.initMap();
    this.addCustomStyles();
    this.checkUserInstitutions();

    console.log('MapView montado com props:');
    console.log('- routePoints:', this.routePoints?.length || 0);
    console.log('- routeDraw:', this.routeDraw?.length || 0);
    console.log('- routeId:', this.routeId);
    console.log('- readonly:', this.readonly);

    this.processPendingData();
  },

  beforeUnmount() {
    this.cleanup();
  },

  methods: {
    processPendingData() {
      console.log('=== PROCESSANDO DADOS PENDENTES ===');

      // Processar segmentos pendentes
      if (this.pendingSegments && this.pendingSegments.length > 0) {
        console.log('Processando segmentos pendentes:', this.pendingSegments.length);
        this.displayRouteSegments(this.pendingSegments);
        this.pendingSegments = null;
      } else if (this.routeDraw && this.routeDraw.length > 0) {
        console.log('Processando routeDraw inicial:', this.routeDraw.length);
        this.displayRouteSegments(this.routeDraw);
      }

      // Processar rota pendente se houver routeId
      if (this.routeId && !this.routeData) {
        console.log('Carregando rota pendente:', this.routeId);
        this.loadRoute(this.routeId);
      }

      // Processar pontos se ainda não foram exibidos
      if (this.routePoints && this.routePoints.length > 0 && this.markers.length === 0) {
        console.log('Processando pontos pendentes:', this.routePoints.length);
        this.displayRoutePoints();
      }

      console.log('=== FIM DO PROCESSAMENTO PENDENTE ===');
    },
    // ===========================================
    // MÉTODOS DE SANITIZAÇÃO (CORRIGIDOS)
    // ===========================================
    sanitizeString(str) {
      if (!str || typeof str !== 'string') return '';
      return str
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove caracteres de controle
          .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove caracteres não imprimíveis
          .replace(/["'<>&]/g, '') // Remove caracteres potencialmente problemáticos em HTML
          .trim();
    },

    // Função específica para gerar IDs seguros para CSS
    generateSafeId(id) {
      if (!id) return `icon-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      return String(id)
              .replace(/[^a-zA-Z0-9-_]/g, '') // Remove todos os caracteres não permitidos em CSS
              .replace(/^[^a-zA-Z_]/, 'id-') // Garante que comece com letra ou underscore
              .substring(0, 50) // Limita o tamanho
          || `fallback-${Date.now()}`; // Fallback se a string ficar vazia
    },

    sanitizePointData(point) {
      if (!point) return null;

      // Gerar ID mais seguro
      const generatePointId = (originalId) => {
        if (originalId && !originalId.toString().includes('temp_')) {
          return this.generateSafeId(`point-${originalId}`);
        }
        return `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      };

      return {
        ...point,
        name: this.sanitizeString(point.name || `Ponto ${point.sequence || 'sem nome'}`),
        id: generatePointId(point.id),
        lat: Number(point.lat || point.latitude || 0),
        lng: Number(point.lng || point.longitude || 0),
        sequence: Number(point.sequence || 0)
      };
    },

    sanitizeSegmentData(segment, index) {
      if (!segment) return null;
      return {
        ...segment,
        id: this.generateSafeId(segment.id || `segment-${index}`),
        sequence: Number(segment.sequence || index),
        distance: Number(segment.distance || 0),
        duration: Number(segment.duration || 0),
        geometry: segment.geometry || null
      };
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
      );
    },

    // ===========================================
    // MÉTODOS DE INICIALIZAÇÃO E CONFIGURAÇÃO
    // ===========================================
    cleanup() {
      this.stopCalculationPolling();
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
    },

    checkUserInstitutions() {
      if (!this.authStore.hasUserInstitution) {
        console.warn('Usuário não possui instituições acessíveis');
        Notify.create({
          type: 'warning',
          message: 'Você não está associado a nenhuma instituição. Contate o administrador.',
          position: 'top',
          timeout: 5000
        });
      }
    },

    getUserInstitutionId() {
      const institutionId = this.authStore.primaryInstitutionId;
      if (!institutionId) {
        console.error('Usuário não possui instituições acessíveis');
        return null;
      }
      return institutionId;
    },

    addCustomStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .custom-bus-stop-icon { background: none !important; border: none !important; }
        .user-location-marker { background: transparent; }
        .user-marker-inner {
          width: 24px; height: 24px; background-color: #4285F4; border-radius: 50%;
          border: 3px solid white; box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        }
      `;
      document.head.appendChild(style);
    },

    // ===========================================
    // MÉTODOS DE INICIALIZAÇÃO DO MAPA
    // ===========================================
    async initMap() {
      L.Marker.prototype.options.icon = DefaultIcon;

      try {
        this.loading = true;
        this.loadingMessage = 'Inicializando mapa...';
        this.locatingUser = true;

        let initialLat = this.defaultPosition.lat;
        let initialLng = this.defaultPosition.lng;
        let initialZoom = this.defaultPosition.zoom;

        // Tentar obter localização do usuário
        try {
          this.loadingMessage = 'Obtendo sua localização...';
          const position = await this.getUserLocation();
          initialLat = position.coords.latitude;
          initialLng = position.coords.longitude;
          initialZoom = 16;

          Notify.create({
            type: 'positive',
            message: 'Localização obtida com sucesso',
            position: 'top',
            timeout: 2000
          });
        } catch (error) {
          console.warn('Usando localização padrão:', error);
        }

        this.loadingMessage = 'Carregando mapa...';

        // Criar mapa
        this.map = L.map(this.$refs.mapContainer).setView([initialLat, initialLng], initialZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(this.map);

        L.control.scale().addTo(this.map);

        // Adicionar marcador de localização se obtida
        if (initialLat !== this.defaultPosition.lat && initialLng !== this.defaultPosition.lng) {
          this.addUserLocationMarker(initialLat, initialLng);
        }

        // Configurar eventos do mapa
        if (!this.readonly) {
          this.map.on('click', this.onMapClick);
        }

        // Exibir pontos se já existem
        this.displayRoutePoints();

        console.log('Mapa inicializado com sucesso');

      } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        this.handleError('map_init', 'Falha ao inicializar o mapa', error);
      } finally {
        this.loading = false;
        this.locatingUser = false;
      }
    },

    onMapClick(e) {
      console.log('Clique no mapa detectado:', e.latlng.lat, e.latlng.lng);
      L.DomEvent.stopPropagation(e);
      this.$emit('map-clicked', { lat: e.latlng.lat, lng: e.latlng.lng });
    },

    // ===========================================
    // MÉTODOS DE VISUALIZAÇÃO DE ROTAS (CORRIGIDOS)
    // ===========================================
    createBusStopIcon(type = 'stop', uniqueId = null) {
      const color = routeUtils.getPointTypeColor(type);
      const safeId = this.generateSafeId(uniqueId);

      const html = `
        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
          <div style="width: 48px; height: 48px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); background-color: ${color};"></div>
        </div>
      `;
      return L.divIcon({
        html: html,
        className: `custom-bus-stop-icon icon-${safeId}`, // Prefixo mais seguro
        iconSize: [60, 60],
        iconAnchor: [30, 30],
        popupAnchor: [0, -30]
      });
    },

    displayRoutePoints(points = null, autoFit = true) {
      console.log('Exibindo pontos no mapa...');

      if (!this.map) {
        console.warn('Tentativa de exibir pontos sem mapa inicializado!');
        return;
      }

      this.clearRouteMarkers();
      const routePoints = points || this.routePoints;

      if (!routePoints?.length) {
        console.log('Nenhum ponto para exibir');
        return;
      }

      console.log('Adicionando', routePoints.length, 'pontos ao mapa');

      this.markers = routePoints
          .map((point, index) => {
            try {
              const sanitizedPoint = this.sanitizePointData(point);
              if (!sanitizedPoint) {
                console.warn(`Ponto ${index} inválido, pulando...`);
                return null;
              }

              const latLng = [sanitizedPoint.lat, sanitizedPoint.lng];

              if (!this.isValidCoordinate(latLng[0], latLng[1])) {
                console.warn(`Coordenadas inválidas para ponto ${index}:`, latLng);
                return null;
              }

              const name = sanitizedPoint.name;
              const pointType = sanitizedPoint.type || 'stop';
              const busStopIcon = this.createBusStopIcon(pointType, `${sanitizedPoint.id}-${index}`);

              // *** VERIFICAÇÃO FINAL ANTES DE ADICIONAR ***
              if (!this.map) {
                console.error(`Mapa se tornou null durante processamento do ponto ${index}!`);
                return null;
              }

              const marker = L.marker(latLng, {
                draggable: !this.readonly,
                icon: busStopIcon,
                title: name
              });

              marker.addTo(this.map);

              const popupContent = `
          <b>${this.sanitizeString(name)}</b><br>
          Ponto #${index + 1}<br>
          Tipo: ${this.sanitizeString(pointType)}<br>
          <small>Lat: ${latLng[0].toFixed(6)}, Lng: ${latLng[1].toFixed(6)}</small>
        `;
              marker.bindPopup(popupContent);

              // Eventos do marcador
              marker.on('click', () => {
                console.log('Marcador clicado:', name);
                this.$emit('point-clicked', { ...sanitizedPoint, index });
              });

              if (!this.readonly) {
                marker.on('dragend', (e) => {
                  const newPos = e.target.getLatLng();
                  this.$emit('point-dragged', {
                    id: sanitizedPoint.id,
                    index: index,
                    lat: newPos.lat,
                    lng: newPos.lng,
                    originalPoint: sanitizedPoint
                  });
                });
              }

              return marker;
            } catch (error) {
              console.error(`Erro ao criar marcador para ponto ${index}:`, error);
              return null;
            }
          })
          .filter(Boolean);

      console.log(`${this.markers.length} marcadores criados`);

      if (autoFit && this.markers.length > 0) {
        this.fitRouteOnMap();
      }
    },

    displayRouteSegments(segments) {
      console.log('Exibindo segmentos da rota:', segments?.length || 0);
      console.log('Segmentos recebidos:', segments);

      // *** VERIFICAÇÃO CRÍTICA ***
      if (!this.map) {
        console.warn('Tentativa de exibir segmentos sem mapa inicializado! Salvando para depois...');
        this.pendingSegments = segments;
        return;
      }

      this.clearRoutePolylines();

      if (!segments?.length) {
        console.log('Nenhum segmento para exibir');
        return;
      }

      this.routePolylines = segments
          .map((segment, index) => {
            try {
              const sanitizedSegment = this.sanitizeSegmentData(segment, index);
              if (!sanitizedSegment) {
                console.warn(`Segmento ${index} inválido, pulando...`);
                return null;
              }

              console.log(`Processando segmento ${index}:`, sanitizedSegment);

              if (!sanitizedSegment.geometry) {
                console.warn(`Segmento ${index} sem geometria`);
                return null;
              }

              // Parse da geometria
              let coordinates = this.parseGeometry(sanitizedSegment.geometry, index);
              if (!coordinates?.length) {
                console.warn(`Segmento ${index} sem coordenadas válidas`);
                return null;
              }

              // Converter coordenadas para LatLng
              const latLngs = coordinates
                  .map((coord, coordIndex) => {
                    if (Array.isArray(coord) && coord.length >= 2) {
                      const lng = Number(coord[0]);
                      const lat = Number(coord[1]);

                      if (this.isValidCoordinate(lat, lng)) {
                        return L.latLng(lat, lng);
                      } else {
                        console.warn(`Coordenada inválida no segmento ${index}, ponto ${coordIndex}:`, coord);
                        return null;
                      }
                    }
                    return null;
                  })
                  .filter(Boolean);

              if (!latLngs.length) {
                console.warn(`Segmento ${index} sem coordenadas válidas após conversão`);
                return null;
              }

              console.log(`Segmento ${index}: ${latLngs.length} pontos válidos para polyline`);

              // *** VERIFICAÇÃO FINAL ANTES DE ADICIONAR ***
              if (!this.map) {
                console.error(`Mapa se tornou null durante processamento do segmento ${index}!`);
                return null;
              }

              // Criar polyline
              const routePolyline = L.polyline(latLngs, {
                color: '#1976D2',
                opacity: 0.8,
                weight: 6,
                smoothFactor: 1
              }).addTo(this.map);

              const popupContent = `
          <b>Segmento ${sanitizedSegment.sequence + 1}</b><br>
          Distância: ${this.formatDistance(sanitizedSegment.distance / 1000)}<br>
          Duração: ${this.formatDuration(sanitizedSegment.duration / 60)}<br>
          <small>Pontos: ${latLngs.length}</small>
        `;
              routePolyline.bindPopup(popupContent);

              console.log(`Segmento ${index} adicionado ao mapa com sucesso`);
              return routePolyline;

            } catch (error) {
              console.error(`Erro ao processar segmento ${index}:`, error);
              return null;
            }
          })
          .filter(Boolean);

      console.log(`${this.routePolylines.length} polylines criadas e adicionadas ao mapa`);

      if (this.routePolylines.length > 0) {
        console.log('Polylines adicionadas com sucesso, ajustando visualização...');
        setTimeout(() => {
          this.fitRouteOnMap();
        }, 100);
      }
    },

    parseGeometry(geometry, segmentIndex) {
      try {
        if (typeof geometry === 'string') {
          // Tentar como JSON primeiro
          try {
            const geoJson = JSON.parse(geometry);
            if (geoJson.coordinates && Array.isArray(geoJson.coordinates)) {
              return geoJson.coordinates;
            }
          } catch (jsonError) {
            // Tentar como polyline encoded
            try {
              return polyline.decode(geometry);
            } catch (polylineError) {
              console.error(`Erro ao decodificar geometria do segmento ${segmentIndex}:`, polylineError);
              return null;
            }
          }
        } else if (geometry.coordinates) {
          return geometry.coordinates;
        }

        return null;
      } catch (error) {
        console.error(`Erro geral ao parsear geometria do segmento ${segmentIndex}:`, error);
        return null;
      }
    },

    updateMarkersOnly() {
      console.log('Atualizando marcadores sem ajustar zoom...');
      this.displayRoutePoints(null, false);
    },

    clearRouteMarkers() {
      this.markers.forEach(marker => {
        if (this.map) this.map.removeLayer(marker);
      });
      this.markers = [];
    },

    clearRoutePolylines() {
      this.routePolylines.forEach(polyline => {
        if (this.map && polyline) this.map.removeLayer(polyline);
      });
      this.routePolylines = [];
    },

    clearRouteVisualization() {
      this.clearRouteMarkers();
      this.clearRoutePolylines();
    },

    fitRouteOnMap() {
      if (!this.map) return;

      let bounds = null;

      // Incluir marcadores
      if (this.markers.length > 0) {
        bounds = L.latLngBounds(this.markers.map(marker => marker.getLatLng()));
      }

      // Incluir polylines
      this.routePolylines.forEach(polyline => {
        if (polyline) {
          const polylineBounds = polyline.getBounds();
          if (bounds) {
            bounds.extend(polylineBounds);
          } else {
            bounds = polylineBounds;
          }
        }
      });

      if (bounds?.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }
    },

    // ===========================================
    // MÉTODOS DE GERENCIAMENTO DE ROTAS
    // ===========================================
    async loadRoute(routeId) {
      try {
        this.loading = true;
        this.loadingMessage = `Carregando rota #${routeId}...`;

        this.clearRouteVisualization();

        const response = this.readonly
            ? await routeApiService.getPublicRoute(routeId)
            : await routeApiService.getRoute(routeId);

        this.routeData = response.data.route;

        if (routeUtils.isCalculating(this.routeData.calculation_status)) {
          this.startCalculationPolling(routeId);
        }

        if (this.routeData.points?.length > 0) {
          this.displayRoutePoints(this.routeData.points);
        }

        if (this.routeData.segments?.length > 0) {
          this.displayRouteSegments(this.routeData.segments);
        }

        this.fitRouteOnMap();

        this.$emit('route-loaded', this.routeData);
        this.$emit('route-updated', {
          id: this.routeData.id,
          totalDistance: this.routeData.total_distance,
          totalDuration: this.routeData.total_duration,
          points: this.routeData.points,
          segments: this.routeData.segments
        });

        if (this.shouldAutoCalculate()) {
          await this.calculateRoute();
        }

      } catch (error) {
        console.error('Erro ao carregar rota:', error);
        this.handleError('route_load', 'Não foi possível carregar a rota', error);
      } finally {
        this.loading = false;
      }
    },

    shouldAutoCalculate() {
      if (!this.routeData || this.readonly) return false;
      return (
          this.routeData.points?.length >= 2 &&
          (!this.routeData.segments || this.routeData.segments.length === 0) &&
          !routeUtils.isCalculating(this.routeData.calculation_status) &&
          this.autoCalculate
      );
    },

    clearRoute() {
      this.routeData = null;
      this.clearRouteVisualization();
      this.stopCalculationPolling();
    },

    async refreshRoute() {
      if (!this.routeId) return;
      await this.loadRoute(this.routeId);
    },

    updateMapVisualization() {
      if (!this.routeData) {
        console.log('updateMapVisualization: Nenhum dado de rota disponível');
        return;
      }

      console.log('=== ATUALIZANDO VISUALIZAÇÃO DO MAPA ===');
      console.log('RouteData:', this.routeData);
      console.log('Pontos disponíveis:', this.routeData.points?.length || 0);
      console.log('Segmentos disponíveis:', this.routeData.segments?.length || 0);

      // Atualizar pontos
      if (this.routeData.points?.length > 0) {
        console.log('Atualizando pontos...');
        this.displayRoutePoints(this.routeData.points, false);
      } else {
        console.log('Nenhum ponto para atualizar');
      }

      // Atualizar segmentos
      if (this.routeData.segments?.length > 0) {
        console.log('Atualizando segmentos...');
        this.displayRouteSegments(this.routeData.segments);
      } else {
        console.log('Nenhum segmento para atualizar');
      }

      // Ajustar visualização
      console.log('Ajustando visualização do mapa...');
      this.fitRouteOnMap();
      console.log('=== FIM DA ATUALIZAÇÃO ===');
    },

    // ===========================================
    // MÉTODOS DE CÁLCULO DE ROTAS
    // ===========================================
    async calculateRoute() {
      if (!this.canCalculateRoute) {
        console.log('Não é possível calcular rota - condições não atendidas');
        return;
      }

      console.log('=== INICIANDO CÁLCULO DE ROTA ===');

      try {
        this.clearCalculationError();

        if (this.routeId) {
          console.log('Recalculando rota existente:', this.routeId);
          await this.recalculateExistingRoute();
        } else {
          console.log('Criando nova rota com', this.routePoints.length, 'pontos');
          await this.createNewRoute();
        }
      } catch (error) {
        console.error('Erro ao calcular rota:', error);
        this.handleCalculationError(error);
        throw error;
      }
    },

    async autoCalculateRoute() {
      try {
        console.log('Auto-calculando rota...');
        await this.createNewRoute();
      } catch (error) {
        console.warn('Erro no auto-cálculo:', error);
      }
    },

    async recalculateExistingRoute() {
      console.log('Iniciando recálculo da rota:', this.routeId);

      // Mostrar banner imediatamente
      this.isCalculating = true;
      this.calculationStatus = {
        status: 'calculating',
        progress_percentage: 0,
        message: 'Iniciando recálculo...'
      };

      const response = await routeApiService.calculateRoute(this.routeId);

      if (response.data.status === 'calculating') {
        this.startCalculationPolling(this.routeId);
        this.$emit('calculation-started', { routeId: this.routeId });

        Notify.create({
          type: 'info',
          message: 'Recálculo iniciado. Acompanhe o progresso...',
          position: 'top'
        });
      } else if (response.data.status === 'completed') {
        // Se já completou, processar imediatamente
        console.log('Rota recalculada imediatamente');
        this.routeData = response.data.route;
        this.onCalculationCompleted();
      }
    },

    async createNewRoute() {
      const institutionId = this.getUserInstitutionId();
      if (!institutionId) {
        throw new Error('Nenhuma instituição encontrada para o usuário.');
      }

      console.log('Criando nova rota...');

      // Mostrar banner imediatamente
      this.isCalculating = true;
      this.calculationStatus = {
        status: 'calculating',
        progress_percentage: 0,
        message: 'Criando nova rota...'
      };

      const routeData = {
        name: this.routeName || 'Nova Rota',
        institution_id: institutionId,
        points: routeUtils.formatPointsForAPI(this.routePoints)
      };

      // Criar rota
      const createResponse = await routeApiService.createRoute(routeData);
      this.routeData = createResponse.data.route;
      console.log(createResponse)
      console.log('Rota criada:', this.routeData.id);

      // Emitir evento de rota criada
      this.$emit('route-created', {
        id: this.routeData.id,
        institutionId: this.routeData.institution_id,
        totalDistance: this.routeData.total_distance,
        totalDuration: this.routeData.total_duration,
        points: this.routeData.points,
        segments: this.routeData.segments
      });

      // Atualizar status
      this.calculationStatus = {
        status: 'calculating',
        progress_percentage: 10,
        message: 'Iniciando cálculo dos segmentos...'
      };

      // Iniciar cálculo se necessário
      if (!this.routeData.segments?.length && this.routeData.points?.length >= 2) {
        console.log('Iniciando cálculo da nova rota...');
        const calculateResponse = await routeApiService.calculateRoute(this.routeData.id);

        if (calculateResponse.data.status === 'calculating') {
          this.startCalculationPolling(this.routeData.id);
          this.$emit('calculation-started', { routeId: this.routeData.id });
        } else if (calculateResponse.data.status === 'completed') {
          // Se já completou, processar dados
          console.log('Rota calculada imediatamente');
          if (calculateResponse.data.route) {
            this.routeData = calculateResponse.data.route;
          }
          this.onCalculationCompleted();
        }
      } else if (this.routeData.segments?.length > 0) {
        // Rota já calculada, parar loading e atualizar visualização
        this.isCalculating = false;
        this.updateMapVisualization();
      }

      Notify.create({
        type: 'positive',
        message: 'Rota criada com sucesso',
        position: 'top'
      });
    },

    // ===========================================
    // MÉTODOS DE POLLING DE CÁLCULO
    // ===========================================
    startCalculationPolling(routeId) {
      console.log('=== INICIANDO POLLING ===');
      console.log('RouteId:', routeId);
      console.log('isCalculating antes:', this.isCalculating);

      // Garantir que está calculando
      this.isCalculating = true;
      this.calculationStartTime = Date.now();
      this.pollingCount = 0;

      // Atualizar status inicial se não existir
      if (!this.calculationStatus) {
        this.calculationStatus = {
          status: 'calculating',
          progress_percentage: 0,
          message: 'Verificando status...'
        };
      }

      console.log('isCalculating definido como:', this.isCalculating);
      console.log('calculationStatus:', this.calculationStatus);

      // Parar polling anterior se existir
      this.stopCalculationPolling();

      // Iniciar polling imediatamente
      this.calculationPollingInterval = setInterval(async () => {
        await this.performPoll(routeId);
      }, 1000); // Polling mais rápido para melhor UX

      // Fazer primeiro poll imediatamente
      this.performPoll(routeId);
    },

    async performPoll(routeId) {
      try {
        this.pollingCount++;

        if (this.pollingCount > this.maxPollingAttempts) {
          console.warn('Limite de polling atingido');
          this.stopCalculationPolling();
          this.calculationError = 'Timeout no cálculo da rota. Tente novamente.';
          return;
        }

        console.log(`Poll #${this.pollingCount} para rota ${routeId}`);
        const response = await routeApiService.getCalculationStatus(routeId);

        // Verificar estrutura da resposta
        let status;
        if (response.data.status && response.data.status.route) {
          status = response.data.status;
        } else {
          status = response.data;
        }

        console.log(`Poll #${this.pollingCount} - Status:`, status.status, `${status.progress_percentage || 0}%`);

        // Atualizar status
        this.calculationStatus = {
          ...status,
          message: routeUtils.getStatusMessage(status.status, status)
        };

        // Verificar se completou
        if (status.status === 'completed') {
          console.log('Cálculo concluído! Processando resultado...');

          if (status.route) {
            this.routeData = status.route;
            console.log('RouteData atualizado com', this.routeData.segments?.length || 0, 'segmentos');
          }

          this.onCalculationCompleted();

        } else if (status.status === 'error' || status.status === 'failed') {
          console.log('Cálculo falhou:', status.error_message);
          this.onCalculationFailed(status.error_message);
        }
        // Se ainda está calculando, continua o polling

      } catch (error) {
        console.error(`Erro no poll #${this.pollingCount}:`, error);

        if (this.pollingCount > 5 && error.response?.status >= 400) {
          this.stopCalculationPolling();
          this.calculationError = 'Erro ao verificar status do cálculo';
        }
      }
    },

    stopCalculationPolling() {
      if (this.calculationPollingInterval) {
        clearInterval(this.calculationPollingInterval);
        this.calculationPollingInterval = null;
        console.log('Polling interrompido');
      }
      this.isCalculating = false;
      console.log('isCalculating definido como:', this.isCalculating);
    },

    onCalculationCompleted() {
      console.log('=== FINALIZANDO CÁLCULO ===');
      this.stopCalculationPolling();

      const calculationTime = this.calculationStartTime
          ? Math.round((Date.now() - this.calculationStartTime) / 1000) : 0;

      console.log(`Cálculo concluído em ${calculationTime}s`);
      console.log('RouteData final:', this.routeData);
      console.log('Total distance:', this.routeData?.total_distance);
      console.log('Total duration:', this.routeData?.total_duration);
      console.log('Segments:', this.routeData?.segments?.length || 0);

      // Atualizar visualização ANTES de mostrar o sucesso
      this.updateMapVisualization();

      // Verificar se routeInfo será calculado corretamente
      console.log('RouteInfo calculado:', this.routeInfo);

      // Emitir eventos PRIMEIRO para atualizar o componente pai
      this.$emit('calculation-completed', {
        routeId: this.routeData?.id,
        calculationTime,
        totalDistance: this.routeData?.total_distance,
        totalDuration: this.routeData?.total_duration,
        segments: this.routeData?.segments
      });

      // Emitir evento route-updated com os dados corretos para o RouteMapStep
      this.$emit('route-updated', {
        id: this.routeData?.id,
        totalDistance: this.routeData?.total_distance * 1000, // Converter km para metros para compatibilidade
        totalDuration: this.routeData?.total_duration * 60,   // Converter minutos para segundos
        points: this.routeData?.points,
        segments: this.routeData?.segments
      });

      // Mostrar notificação de sucesso (simples)
      Notify.create({
        type: 'positive',
        message: `Rota calculada em ${calculationTime}s!`,
        position: 'top',
        timeout: 3000
      });

      console.log('=== CÁLCULO FINALIZADO ===');
    },

    onCalculationFailed(errorMessage) {
      this.stopCalculationPolling();

      const calculationTime = this.calculationStartTime
          ? Math.round((Date.now() - this.calculationStartTime) / 1000) : 0;

      this.calculationError = errorMessage || 'Erro desconhecido no cálculo';

      this.$emit('calculation-failed', {
        routeId: this.routeData?.id,
        error: this.calculationError,
        calculationTime
      });

      Notify.create({
        type: 'negative',
        message: 'Erro ao calcular rota: ' + this.calculationError,
        position: 'top',
        timeout: 6000
      });
    },

    async cancelCalculation() {
      this.stopCalculationPolling();
      Notify.create({
        type: 'info',
        message: 'Cálculo cancelado',
        position: 'top'
      });
    },

    async retryCalculation() {
      this.clearCalculationError();
      await this.calculateRoute();
    },

    clearCalculationError() {
      this.calculationError = null;
    },

    handleCalculationError(error) {
      let errorMessage = 'Não foi possível calcular a rota';

      if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para calcular esta rota';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data.message || 'Dados inválidos para cálculo';
      } else if (error.response?.status === 422) {
        errorMessage = error.response.data.message || 'Dados inválidos fornecidos';
      } else if (error.message?.includes('instituição')) {
        errorMessage = error.message;
      }

      this.calculationError = errorMessage;
      this.$emit('error', { type: 'route_calculation', message: errorMessage, error });
    },

    // ===========================================
    // MÉTODOS DE GEOLOCALIZAÇÃO
    // ===========================================
    getUserLocation() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalização não suportada pelo navegador'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    },

    async centerOnUserLocation() {
      if (!this.map) return;

      this.locatingUser = true;

      try {
        const position = await this.getUserLocation();
        const { latitude, longitude, accuracy } = position.coords;

        this.removeUserLocationMarker();
        this.addUserLocationMarker(latitude, longitude, accuracy);
        this.map.setView([latitude, longitude], 16);

        Notify.create({
          type: 'positive',
          message: 'Localização obtida com sucesso',
          position: 'top'
        });
      } catch (error) {
        console.error('Erro ao obter localização:', error);
        this.handleError('user_location', 'Não foi possível obter sua localização', error);

        this.map.setView(
            [this.defaultPosition.lat, this.defaultPosition.lng],
            this.defaultPosition.zoom
        );
      } finally {
        this.locatingUser = false;
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
      }).addTo(this.map);

      this.userLocationMarker.bindPopup('Sua localização atual').openPopup();

      if (accuracy > 0) {
        this.accuracyCircle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#4285F4',
          fillColor: '#4285F4',
          fillOpacity: 0.2,
          weight: 1
        }).addTo(this.map);
      }
    },

    removeUserLocationMarker() {
      if (this.userLocationMarker && this.map) {
        this.map.removeLayer(this.userLocationMarker);
        this.userLocationMarker = null;
      }

      if (this.accuracyCircle && this.map) {
        this.map.removeLayer(this.accuracyCircle);
        this.accuracyCircle = null;
      }
    },

    centerOnPoint(point) {
      if (this.map) {
        const lat = point.latitude || point.lat;
        const lng = point.longitude || point.lng;
        this.map.setView([lat, lng], 15);
      }
    },

    // ===========================================
    // MÉTODOS UTILITÁRIOS
    // ===========================================
    formatDistance(distanceInKm) {
      return routeUtils.formatDistance(distanceInKm);
    },

    formatDuration(durationInMinutes) {
      return routeUtils.formatDuration(durationInMinutes);
    },

    formatTime(seconds) {
      return routeUtils.formatTime(seconds);
    },

    handleError(type, message, error) {
      this.$emit('error', { type, message, error });
      Notify.create({
        type: 'negative',
        message,
        position: 'top'
      });
    },

    // Método de debug para verificar estado
    debugMapState() {
      console.log('=== DEBUG MAP STATE ===');
      console.log('isCalculating:', this.isCalculating);
      console.log('calculationStatus:', this.calculationStatus);
      console.log('showCalculationProgress:', this.showCalculationProgress);
      console.log('routeData:', this.routeData);
      console.log('markers:', this.markers?.length || 0);
      console.log('routePolylines:', this.routePolylines?.length || 0);
      console.log('map inicializado:', !!this.map);
      console.log('=====================');
    },

    // Debug específico para o banner
    debugBannerState() {
      console.log('=== DEBUG BANNER STATE ===');
      console.log('isCalculating:', this.isCalculating);
      console.log('calculationStatus exists:', !!this.calculationStatus);
      console.log('calculationStatus:', this.calculationStatus);
      console.log('Banner should show:', this.isCalculating);
      console.log('routeId for banner:', this.routeId || (this.routeData && this.routeData.id) || 0);
      console.log('========================');
    },

    // Forçar exibição do banner para teste
    testBanner() {
      console.log('Forçando exibição do banner para teste...');
      this.isCalculating = true;
      this.calculationStatus = {
        status: 'calculating',
        progress_percentage: 50,
        calculated_segments: 1,
        total_segments: 2,
        message: 'Teste do banner'
      };
      this.$forceUpdate();
    }
  }
};
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

// Keyframes
@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

// Responsive design improvements
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
