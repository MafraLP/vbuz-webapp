// src/services/DirectRoutingService.ts

// API key
const ORS_API_KEY = import.meta.env.VITE_OSMROUTE_APIKEY || '';

if (!ORS_API_KEY) {
  console.warn('VITE_OSMROUTE_APIKEY não está definida. O serviço de rotas não funcionará corretamente.');
}

// URL base para a API
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteSummary {
  totalDistance: number; // metros
  totalTime: number; // segundos
}

// Classe para cache local
class RouteCache {
  static getKey(points: Coordinates[]): string {
    // Cria uma chave única para este conjunto de pontos
    return points.map(p => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|');
  }

  static getRoute(points: Coordinates[]): any {
    const key = this.getKey(points);
    const cached = localStorage.getItem(`route_${key}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  static saveRoute(points: Coordinates[], routeData: any): void {
    const key = this.getKey(points);
    localStorage.setItem(`route_${key}`, JSON.stringify(routeData));
  }
}

export class DirectRoutingService {
  // Contador de uso da API
  static countApiCalls(): number {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const count = parseInt(localStorage.getItem(`ors_api_calls_${today}`) || '0');
    const newCount = count + 1;
    localStorage.setItem(`ors_api_calls_${today}`, newCount.toString());

    console.log(`API Calls today: ${newCount}/2000`);

    // Avisar quando estiver chegando no limite
    if (newCount > 1800) {
      console.warn('Approaching API limit for today!');
    }

    return newCount;
  }

  /**
   * Calcula uma rota entre os pontos fornecidos
   */
  static async calculateRoute(
    points: Coordinates[],
    profile: string = 'driving-car'
  ): Promise<any> {
    if (points.length < 2) {
      throw new Error('São necessários pelo menos 2 pontos para calcular uma rota');
    }

    // Verificar cache primeiro
    const cachedRoute = RouteCache.getRoute(points);
    if (cachedRoute) {
      console.log('Usando rota em cache');
      return cachedRoute;
    }

    // Formata as coordenadas no formato esperado pela API ([lng, lat])
    const coordinates = points.map(point => [point.lng, point.lat]);

    // Contador de uso da API
    this.countApiCalls();

    try {
      const response = await fetch(`${ORS_BASE_URL}/directions/${profile}/geojson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ORS_API_KEY
        },
        body: JSON.stringify({
          coordinates,
          preference: 'recommended',
          units: 'km',
          language: 'pt',
          geometry_simplify: false,
          instructions: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro na API OpenRouteService: ${errorData.error}`);
      }

      const responseData = await response.json();

      // Salvar no cache
      RouteCache.saveRoute(points, responseData);

      return responseData;
    } catch (error) {
      console.error('Erro ao calcular rota:', error);
      throw error;
    }
  }

  /**
   * Adiciona uma rota diretamente ao mapa sem usar o Leaflet Routing Machine
   */
  static async addRouteToMap(map: L.Map, points: Coordinates[], options: any = {}): Promise<{
    routeLine: L.Polyline,
    summary: RouteSummary
  }> {
    try {
      const routeData = await this.calculateRoute(points);

      if (!routeData || !routeData.features || routeData.features.length === 0) {
        throw new Error('Nenhuma rota encontrada');
      }

      // Obter a primeira rota
      const route = routeData.features[0];

      // Converter as coordenadas para o formato esperado pelo Leaflet
      const latLngs = route.geometry.coordinates.map(
        (coord: number[]) => L.latLng(coord[1], coord[0])
      );

      // Criar uma polyline para a rota
      const defaultOptions = {
        color: '#1976D2',
        opacity: 0.8,
        weight: 6
      };

      const mergedOptions = { ...defaultOptions, ...options };
      const routeLine = L.polyline(latLngs, mergedOptions).addTo(map);

      // Ajustar o mapa para mostrar a rota
      if (options.fitBounds !== false) {
        map.fitBounds(routeLine.getBounds(), {
          padding: [50, 50]
        });
      }

      // Preparar o resumo da rota
      const summary: RouteSummary = {
        totalDistance: route.properties.summary.distance * 1000, // km para m
        totalTime: route.properties.summary.duration // segundos
      };

      return {
        routeLine,
        summary
      };
    } catch (error) {
      console.error('Erro ao adicionar rota ao mapa:', error);
      throw error;
    }
  }

  /**
   * Remove uma rota do mapa
   */
  static removeRouteFromMap(map: L.Map, routeLine: L.Polyline): void {
    if (routeLine && map) {
      map.removeLayer(routeLine);
    }
  }
}
