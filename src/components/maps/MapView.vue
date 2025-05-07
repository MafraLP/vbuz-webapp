<template>
  <div class="map-container">
    <div id="map" ref="mapContainer"></div>
    <div class="map-controls">
      <q-btn
        round
        color="primary"
        icon="my_location"
        @click="centerOnUserLocation"
        :loading="locatingUser"
        class="location-btn"
      />
      <q-btn
        round
        color="secondary"
        icon="route"
        @click="calculateRoute"
        class="route-btn q-ml-sm"
        v-if="routePoints.length >= 2"
      />
    </div>

    <!-- Indicador de carregamento -->
    <div v-if="loading" class="loading-overlay flex flex-center">
      <q-spinner color="primary" size="3em" />
      <span class="q-ml-sm">Carregando...</span>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {Notify} from 'quasar';
import { routeApiService } from 'src/services/api/route/RouteApiService.js'

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
    }
  },

  emits: [
    'map-clicked',
    'point-clicked',
    'point-dragged',
    'route-updated',
    'route-loaded',
    'error'
  ],

  data() {
    return {
      map: null,
      userLocationMarker: null,
      accuracyCircle: null,
      locatingUser: false,
      loading: false,
      defaultPosition: {
        lat: -25.4284, // Exemplo: coordenadas para Curitiba
        lng: -49.2733,
        zoom: 13
      },
      markers: [],
      routePolylines: [],
      routeData: null,
    };
  },

  watch: {
    routePoints: {
      handler() {
        this.displayRoutePoints();
      },
      deep: true
    },
    routeId: {
      handler(newId) {
        if (newId) {
          this.loadRoute(newId);
        }
      },
      immediate: true
    }
  },

  mounted() {
    this.initMap();
  },

  beforeUnmount() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  },

  methods: {
    /**
     * Inicializa o mapa Leaflet
     */
    async initMap() {
      // Configurar ícone padrão para marcadores
      L.Marker.prototype.options.icon = DefaultIcon;

      try {
        this.locatingUser = true;

        // Tentar obter a localização do usuário
        let initialLat = this.defaultPosition.lat;
        let initialLng = this.defaultPosition.lng;
        let initialZoom = this.defaultPosition.zoom;

        try {
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

        // Criar instância do mapa
        this.map = L.map(this.$refs.mapContainer).setView(
          [initialLat, initialLng],
          initialZoom
        );

        // Adicionar camada de mapa base (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(this.map);

        // Adicionar controle de escala
        L.control.scale().addTo(this.map);

        // Se obtivemos a localização do usuário, adicionar marcador
        if (initialLat !== this.defaultPosition.lat && initialLng !== this.defaultPosition.lng) {
          this.addUserLocationMarker(initialLat, initialLng);
        }

        // Se não estiver em modo somente leitura, adicionar eventos de interação
        if (!this.readonly) {
          // Evento de clique no mapa
          this.map.on('click', (e) => {
            this.$emit('map-clicked', {
              lat: e.latlng.lat,
              lng: e.latlng.lng
            });
          });
        }

        // Adicionar pontos de rota existentes ao mapa
        this.displayRoutePoints();

        // Se temos um ID de rota, carregar do backend
        if (this.routeId) {
          this.loadRoute(this.routeId);
        }
      } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        this.$emit('error', {
          type: 'map_init',
          message: 'Falha ao inicializar o mapa',
          error
        });
      } finally {
        this.locatingUser = false;
      }
    },

    /**
     * Carrega dados da rota do backend
     * @param {number} routeId - ID da rota para carregar
     */
    async loadRoute(routeId) {
      try {
        this.loading = true;

        // Limpar elementos existentes
        this.clearRouteMarkers();
        this.clearRoutePolylines();

        // Carregar rota do backend
        const response = this.readonly
          ? await routeApiService.getPublicRoute(routeId)
          : await routeApiService.getRoute(routeId);

        this.routeData = response.data.route;

        // Mostrar pontos da rota
        if (this.routeData.points && this.routeData.points.length > 0) {
          this.displayRoutePoints(this.routeData.points);
        }

        // Mostrar segmentos da rota
        if (this.routeData.segments && this.routeData.segments.length > 0) {
          this.displayRouteSegments(this.routeData.segments);
        }

        // Ajustar visualização do mapa para mostrar a rota inteira
        this.fitRouteOnMap();

        // Emitir evento com os dados da rota
        this.$emit('route-loaded', this.routeData);
        this.$emit('route-updated', {
          totalDistance: this.routeData.total_distance,
          totalDuration: this.routeData.total_duration,
          points: this.routeData.points
        });
      } catch (error) {
        console.error('Erro ao carregar rota:', error);
        this.$emit('error', {
          type: 'route_load',
          message: 'Não foi possível carregar a rota',
          error
        });

        Notify.create({
          type: 'negative',
          message: 'Não foi possível carregar a rota',
          position: 'top'
        });
      } finally {
        this.loading = false;
      }
    },

    /**
     * Exibe pontos da rota no mapa como marcadores
     * @param {Array} points - Lista de pontos para exibir (opcional)
     */
    displayRoutePoints(points = null) {
      // Remover marcadores existentes
      this.clearRouteMarkers();

      // Usar pontos fornecidos ou os pontos do props
      const routePoints = points || this.routePoints;

      if (!routePoints || routePoints.length === 0) return;

      // Adicionar marcadores para todos os pontos do itinerário
      this.markers = routePoints.map((point, index) => {
        const latLng = [
          point.latitude || point.lat,
          point.longitude || point.lng
        ];

        const name = point.name || `Ponto #${index + 1}`;

        // Criar opções do marcador - se estiver em modo readonly, o marcador não será arrastável
        const markerOptions = {
          draggable: !this.readonly
        };

        const marker = L.marker(latLng, markerOptions)
          .addTo(this.map)
          .bindPopup(`<b>${name}</b><br>Ponto #${index + 1}`);

        // Adicionar evento de clique no marcador
        marker.on('click', () => {
          this.$emit('point-clicked', {
            ...point,
            index
          });
        });

        // Adicionar evento de arrasto se não estiver em modo readonly
        if (!this.readonly) {
          marker.on('dragend', (e) => {
            // Atualizar as coordenadas no ponto e emitir evento
            const newPos = e.target.getLatLng();
            this.$emit('point-dragged', {
              id: point.id,
              index: index,
              lat: newPos.lat,
              lng: newPos.lng
            });
          });
        }

        return marker;
      });

      // Ajustar o mapa para mostrar todos os pontos
      if (this.markers.length > 0) {
        this.fitRouteOnMap();
      }
    },

    /**
     * Exibe segmentos da rota como polylines no mapa
     * @param {Array} segments - Lista de segmentos da rota
     */
    displayRouteSegments(segments) {
      // Limpar polylines existentes
      this.clearRoutePolylines();

      // Adicionar cada segmento como uma polyline
      this.routePolylines = segments.map(segment => {
        // Verificar se temos geometria válida
        if (!segment.geometry || !segment.geometry.coordinates) {
          return null;
        }

        // Converter coordenadas para formato Leaflet
        const latLngs = segment.geometry.coordinates.map(
          coord => L.latLng(coord[1], coord[0])
        );

        // Criar e adicionar a polyline ao mapa
        return L.polyline(latLngs, {
          color: '#1976D2',
          opacity: 0.8,
          weight: 6
        }).addTo(this.map);
      }).filter(Boolean); // Filtrar itens nulos
    },

    /**
     * Remove todos os marcadores do mapa
     */
    clearRouteMarkers() {
      // Remover marcadores antigos
      this.markers.forEach(marker => {
        if (this.map) {
          this.map.removeLayer(marker);
        }
      });
      this.markers = [];
    },

    /**
     * Remove todas as polylines do mapa
     */
    clearRoutePolylines() {
      // Limpar as polylines existentes
      this.routePolylines.forEach(polyline => {
        if (this.map && polyline) {
          this.map.removeLayer(polyline);
        }
      });
      this.routePolylines = [];
    },

    /**
     * Ajusta a visualização do mapa para exibir toda a rota
     */
    fitRouteOnMap() {
      if (!this.map) return;

      // Criar limites a partir dos marcadores e polylines
      let bounds = null;

      // Adicionar pontos aos limites
      if (this.markers.length > 0) {
        bounds = L.latLngBounds(this.markers.map(marker => marker.getLatLng()));
      }

      // Adicionar polylines aos limites
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

      // Ajustar o mapa para os limites calculados
      if (bounds && bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }
    },

    /**
     * Calcula a rota usando o serviço de backend
     */
    async calculateRoute() {
      if (!this.map || this.routePoints.length < 2) {
        console.log('Mapa não inicializado ou pontos insuficientes');
        return;
      }

      console.log('Calculando rota entre pontos...');

      try {
        this.loading = true;

        // Se temos ID da rota, usar API para recalcular
        if (this.routeId) {
          const response = await routeApiService.recalculateRoute(this.routeId);
          this.routeData = response.data.route;

          // Atualizar visualização com novos dados
          this.displayRouteSegments(this.routeData.segments);
          this.fitRouteOnMap();

          // Emitir evento com os dados atualizados
          this.$emit('route-updated', {
            totalDistance: this.routeData.total_distance,
            totalDuration: this.routeData.total_duration,
            points: this.routeData.points
          });

          Notify.create({
            type: 'positive',
            message: 'Rota recalculada com sucesso',
            position: 'top'
          });
        } else {
          // Caso não tenhamos uma rota salva, criar uma nova
          const routeData = {
            name: 'Nova Rota',
            points: this.routePoints.map(p => ({
              latitude: p.lat,
              longitude: p.lng,
              name: p.name || 'Ponto'
            }))
          };

          const response = await routeApiService.createRoute(routeData);
          this.routeData = response.data.route;

          // Atualizar para visualizar nova rota
          this.displayRouteSegments(this.routeData.segments);
          this.fitRouteOnMap();

          // Emitir evento com os dados da nova rota
          this.$emit('route-updated', {
            id: this.routeData.id,
            totalDistance: this.routeData.total_distance,
            totalDuration: this.routeData.total_duration,
            points: this.routeData.points
          });

          Notify.create({
            type: 'positive',
            message: 'Rota calculada e salva com sucesso',
            position: 'top'
          });
        }
      } catch (error) {
        console.error('Erro ao calcular rota:', error);
        this.$emit('error', {
          type: 'route_calculation',
          message: 'Falha ao calcular rota',
          error
        });

        Notify.create({
          type: 'negative',
          message: 'Não foi possível calcular a rota entre os pontos',
          position: 'top'
        });
      } finally {
        this.loading = false;
      }
    },

    /**
     * Obtém a localização atual do usuário
     * @returns {Promise} Promessa com a posição do usuário
     */
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

    /**
     * Centraliza o mapa na localização atual do usuário
     */
    async centerOnUserLocation() {
      if (!this.map) return;

      this.locatingUser = true;

      try {
        const position = await this.getUserLocation();
        const { latitude, longitude, accuracy } = position.coords;

        // Remover marcadores existentes
        this.removeUserLocationMarker();

        // Adicionar marcador da localização do usuário
        this.addUserLocationMarker(latitude, longitude, accuracy);

        // Centralizar o mapa na localização do usuário
        this.map.setView([latitude, longitude], 16);

        Notify.create({
          type: 'positive',
          message: 'Localização obtida com sucesso',
          position: 'top'
        });
      } catch (error) {
        console.error('Erro ao obter localização:', error);
        this.$emit('error', {
          type: 'user_location',
          message: 'Falha ao obter localização',
          error
        });

        Notify.create({
          type: 'negative',
          message: 'Não foi possível obter sua localização. Verifique as permissões do navegador.',
          position: 'top'
        });

        // Usar posição padrão em caso de erro
        this.map.setView(
          [this.defaultPosition.lat, this.defaultPosition.lng],
          this.defaultPosition.zoom
        );
      } finally {
        this.locatingUser = false;
      }
    },

    /**
     * Adiciona um marcador para a localização do usuário
     * @param {number} latitude - Latitude da posição
     * @param {number} longitude - Longitude da posição
     * @param {number} accuracy - Precisão da localização (opcional)
     */
    addUserLocationMarker(latitude, longitude, accuracy = 0) {
      // Adicionar marcador da localização do usuário
      this.userLocationMarker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<div class="user-marker-inner"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map);

      this.userLocationMarker.bindPopup('Sua localização atual').openPopup();

      // Adicionar círculo de precisão se tiver informação de accuracy
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

    /**
     * Remove o marcador da localização do usuário
     */
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

    /**
     * Centraliza o mapa em um ponto específico
     * @param {Object} point - Ponto para centralizar
     */
    centerOnPoint(point) {
      if (this.map) {
        const lat = point.latitude || point.lat;
        const lng = point.longitude || point.lng;
        this.map.setView([lat, lng], 15);
      }
    }
  }
};
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

#map {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.map-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.location-btn, .route-btn {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

/* Estilos para o marcador de localização do usuário */
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

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
