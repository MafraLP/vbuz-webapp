// src/services/api/RouteApiService.js

import BaseApiService from '../BaseApiService';

class RouteApiService extends BaseApiService {
  /**
   * Construtor do serviço de API de rotas
   */
  constructor() {
    super('routes'); // 'routes' é o recurso base para esta API
  }

  /**
   * Obtém todas as rotas do usuário
   * @returns {Promise} Promessa com a lista de rotas
   */
  getRoutes() {
    return this.get();
  }

  /**
   * Obtém detalhes de uma rota específica
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com os detalhes da rota
   */
  getRoute(routeId) {
    return this.get(`${routeId}`);
  }

  /**
   * Cria uma nova rota
   * @param {Object} routeData - Dados da rota
   * @param {string} routeData.name - Nome da rota
   * @param {Array} routeData.points - Lista de pontos
   * @returns {Promise} Promessa com a rota criada
   */
  createRoute(routeData) {
    return this.post('', routeData);
  }

  /**
   * Atualiza uma rota existente
   * @param {number} routeId - ID da rota
   * @param {Object} routeData - Dados atualizados da rota
   * @returns {Promise} Promessa com a rota atualizada
   */
  updateRoute(routeId, routeData) {
    console.log('🔄 [API] Atualizando rota:', routeId, routeData);
    return this.put(`${routeId}`, routeData);
  }

  /**
   * Exclui uma rota
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com o resultado da exclusão
   */
  deleteRoute(routeId) {
    return this.delete(`${routeId}`);
  }

  /**
   * Adiciona um ponto a uma rota
   * @param {number} routeId - ID da rota
   * @param {Object} pointData - Dados do ponto
   * @returns {Promise} Promessa com o resultado da adição
   */
  addPoint(routeId, pointData) {
    return this.post(`${routeId}/points`, pointData);
  }

  /**
   * Remove um ponto de uma rota
   * @param {number} routeId - ID da rota
   * @param {number} pointId - ID do ponto
   * @returns {Promise} Promessa com o resultado da remoção
   */
  removePoint(routeId, pointId) {
    return this.delete(`${routeId}/points/${pointId}`);
  }

  /**
   * Atualiza a posição de um ponto
   * @param {number} routeId - ID da rota
   * @param {number} pointId - ID do ponto
   * @param {Object} positionData - Novas coordenadas do ponto
   * @returns {Promise} Promessa com o resultado da atualização
   */
  updatePointPosition(routeId, pointId, positionData) {
    return this.put(`${routeId}/points/${pointId}/position`, positionData);
  }

  /**
   * Inicia o cálculo de uma rota (NOVO - Sistema Assíncrono)
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com o status do cálculo iniciado
   */
  calculateRoute(routeId) {
    return this.post(`${routeId}/calculate`);
  }

  /**
   * Verifica o status do cálculo de uma rota (NOVO)
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com o status atual do cálculo
   */
  getCalculationStatus(routeId) {
    return this.get(`${routeId}/status`);
  }

  /**
   * Força o recálculo de uma rota (alias para calculateRoute)
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com o status do cálculo iniciado
   */
  recalculateRoute(routeId) {
    return this.post(`${routeId}/recalculate`);
  }

  /**
   * Obtém uma rota pública (sem autenticação)
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com os detalhes da rota
   */
  getPublicRoute(routeId) {
    // Criar instância separada para chamada pública sem token
    const publicApi = new BaseApiService('public');
    return publicApi.get(`routes/${routeId}`);
  }

  /**
   * Publica/despublica uma rota
   * @param {number} routeId - ID da rota
   * @param {boolean} isPublished - Se deve publicar ou despublicar
   * @returns {Promise} Promessa com a rota atualizada
   */
  togglePublish(routeId, isPublished) {
    return this.patch(`${routeId}/publish`, {
      is_published: isPublished
    });
  }

  /**
   * Lista rotas públicas
   * @param {Object} params - Parâmetros de filtro
   * @returns {Promise} Promessa com a lista de rotas públicas
   */
  getPublicRoutes(params = {}) {
    const publicApi = new BaseApiService('routes');
    return publicApi.get('public', { params });
  }

  /**
   * Busca rotas próximas a um ponto
   * @param {number} latitude - Latitude do ponto de busca
   * @param {number} longitude - Longitude do ponto de busca
   * @param {number} radius - Raio de busca em km (padrão: 5)
   * @param {number} limit - Limite de resultados (padrão: 10)
   * @returns {Promise} Promessa com as rotas próximas
   */
  getNearbyRoutes(latitude, longitude, radius = 5, limit = 10) {
    return this.get('nearby', {
      params: {
        latitude,
        longitude,
        radius,
        limit
      }
    });
  }

  /**
   * Busca rotas de uma instituição específica
   * @param {number} institutionId - ID da instituição
   * @returns {Promise} Promessa com as rotas da instituição
   */
  getInstitutionRoutes(institutionId) {
    return this.get(`institution/${institutionId}`);
  }

  // === MÉTODOS DE ESTATÍSTICAS ===

  /**
   * Busca estatísticas de uma rota
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com as estatísticas da rota
   */
  getRouteStats(routeId) {
    return this.get(`${routeId}/stats`);
  }

  /**
   * Busca estatísticas gerais do usuário
   * @returns {Promise} Promessa com as estatísticas do usuário
   */
  getUserRouteStats() {
    return this.get('stats');
  }

  // === MÉTODOS DE EXPORTAÇÃO ===

  /**
   * Exporta rota em formato GPX
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com o arquivo GPX
   */
  exportRouteGPX(routeId) {
    return this.get(`${routeId}/export/gpx`, {
      responseType: 'blob'
    });
  }

  /**
   * Exporta rota em formato KML
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com o arquivo KML
   */
  exportRouteKML(routeId) {
    return this.get(`${routeId}/export/kml`, {
      responseType: 'blob'
    });
  }

  /**
   * Exporta rota em formato GeoJSON
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com o GeoJSON
   */
  exportRouteGeoJSON(routeId) {
    return this.get(`${routeId}/export/geojson`);
  }

  // === MÉTODOS DE IMPORTAÇÃO ===

  /**
   * Importa rota de arquivo GPX
   * @param {File} file - Arquivo GPX
   * @param {number} institutionId - ID da instituição
   * @returns {Promise} Promessa com a rota importada
   */
  importRouteFromGPX(file, institutionId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('institution_id', institutionId);

    return this.post('import/gpx', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // === MÉTODOS DE VALIDAÇÃO ===

  /**
   * Valida pontos de uma rota antes de criar
   * @param {Array} points - Lista de pontos para validar
   * @returns {Promise} Promessa com o resultado da validação
   */
  validateRoutePoints(points) {
    return this.post('validate-points', { points });
  }

  /**
   * Estima tempo e distância de uma rota
   * @param {Array} points - Lista de pontos
   * @param {string} profile - Perfil de roteamento (padrão: 'driving-car')
   * @returns {Promise} Promessa com a estimativa
   */
  estimateRoute(points, profile = 'driving-car') {
    return this.post('estimate', {
      points,
      profile
    });
  }

  // === MÉTODOS DE REORDENAÇÃO ===

  /**
   * Reordena pontos de uma rota
   * @param {number} routeId - ID da rota
   * @param {Array} pointsOrder - Nova ordem dos pontos (array de IDs)
   * @returns {Promise} Promessa com a rota atualizada
   */
  reorderRoutePoints(routeId, pointsOrder) {
    return this.patch(`${routeId}/points/reorder`, {
      points_order: pointsOrder
    });
  }
}

// === UTILITÁRIOS PARA O FRONTEND ===

export const routeUtils = {
  /**
   * Formata distância em km
   * @param {number} distanceInKm - Distância em quilômetros
   * @returns {string} Distância formatada
   */
  formatDistance(distanceInKm) {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)}m`;
    }
    return `${distanceInKm.toFixed(1)}km`;
  },

  /**
   * Formata duração em minutos
   * @param {number} durationInMinutes - Duração em minutos
   * @returns {string} Duração formatada
   */
  formatDuration(durationInMinutes) {
    if (durationInMinutes < 60) {
      return `${Math.round(durationInMinutes)}min`;
    }

    const hours = Math.floor(durationInMinutes / 60);
    const minutes = Math.round(durationInMinutes % 60);

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}min`;
  },

  /**
   * Calcula centro de uma lista de pontos
   * @param {Array} points - Lista de pontos
   * @returns {Object|null} Centro calculado ou null
   */
  calculateCenter(points) {
    if (!points || points.length === 0) return null;

    const sumLat = points.reduce((sum, p) => sum + (p.latitude || p.lat), 0);
    const sumLng = points.reduce((sum, p) => sum + (p.longitude || p.lng), 0);

    return {
      lat: sumLat / points.length,
      lng: sumLng / points.length
    };
  },

  /**
   * Calcula bounds de uma lista de pontos
   * @param {Array} points - Lista de pontos
   * @returns {Object|null} Bounds calculados ou null
   */
  calculateBounds(points) {
    if (!points || points.length === 0) return null;

    const lats = points.map(p => p.latitude || p.lat);
    const lngs = points.map(p => p.longitude || p.lng);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  },

  /**
   * Verifica se um status indica que a rota está sendo calculada
   * @param {string} status - Status da rota
   * @returns {boolean} Se está calculando
   */
  isCalculating(status) {
    return status === 'calculating';
  },

  /**
   * Verifica se um status indica que a rota foi calculada com sucesso
   * @param {string} status - Status da rota
   * @returns {boolean} Se foi calculada
   */
  isCalculated(status) {
    return status === 'completed';
  },

  /**
   * Verifica se um status indica erro no cálculo
   * @param {string} status - Status da rota
   * @returns {boolean} Se houve erro
   */
  hasCalculationError(status) {
    return status === 'error' || status === 'failed';
  },

  /**
   * Converte pontos do formato interno para formato da API
   * @param {Array} points - Pontos no formato interno
   * @returns {Array} Pontos no formato da API
   */
  formatPointsForAPI(points) {
    return points.map((point, index) => ({
      sequence: index,
      name: point.name || `Ponto ${index + 1}`,
      description: point.description || null,
      latitude: point.lat || point.latitude,
      longitude: point.lng || point.longitude,
      type: point.type || 'stop'
    }));
  },

  /**
   * Converte pontos do formato da API para formato interno
   * @param {Array} points - Pontos no formato da API
   * @returns {Array} Pontos no formato interno
   */
  formatPointsFromAPI(points) {
    return points.map(point => ({
      id: point.id,
      lat: point.latitude,
      lng: point.longitude,
      name: point.name,
      description: point.description,
      type: point.type || 'stop',
      sequence: point.sequence
    }));
  },

  /**
   * Gera cor para tipo de ponto
   * @param {string} type - Tipo do ponto
   * @returns {string} Cor hexadecimal
   */
  getPointTypeColor(type) {
    const colors = {
      'stop': '#1976D2',
      'terminal': '#E53935',
      'landmark': '#43A047',
      'connection': '#7B1FA2'
    };
    return colors[type] || colors.stop;
  },

  /**
   * Gera ícone para tipo de ponto
   * @param {string} type - Tipo do ponto
   * @returns {string} Nome do ícone
   */
  getPointTypeIcon(type) {
    const icons = {
      'stop': 'directions_bus',
      'terminal': 'home',
      'landmark': 'place',
      'connection': 'swap_horiz'
    };
    return icons[type] || icons.stop;
  },

  /**
   * Formata tempo em segundos para string legível
   * @param {number} seconds - Tempo em segundos
   * @returns {string} Tempo formatado
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
  },

  /**
   * Gera mensagem de status amigável
   * @param {string} status - Status da rota
   * @param {Object} details - Detalhes adicionais do status
   * @returns {string} Mensagem amigável
   */
  getStatusMessage(status, details = {}) {
    const { calculated_segments = 0, total_segments = 0, progress_percentage = 0 } = details;

    switch (status) {
      case 'not_started':
        return 'Rota não calculada';
      case 'calculating':
        if (progress_percentage === 0) {
          return 'Preparando cálculo...';
        } else if (progress_percentage < 25) {
          return 'Processando primeiros segmentos...';
        } else if (progress_percentage < 75) {
          return `Calculando segmentos (${calculated_segments}/${total_segments})...`;
        } else if (progress_percentage < 100) {
          return 'Finalizando cálculo...';
        }
        return 'Calculando rota...';
      case 'completed':
        return 'Rota calculada com sucesso';
      case 'error':
        return 'Erro no cálculo da rota';
      case 'failed':
        return 'Falha no cálculo da rota';
      default:
        return 'Status desconhecido';
    }
  }
};

// Criar instância única do serviço para exportação
const routeApiService = new RouteApiService();
export { routeApiService };
