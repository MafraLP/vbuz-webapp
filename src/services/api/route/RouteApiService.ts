// src/services/api/RouteApiService.js

import BaseApiService from '../BaseApiService';

class RouteApiService extends BaseApiService {
  /**
   * Construtor do serviço de API de rotas
   */
  constructor() {
    super('route'); // 'routes' é o recurso base para esta API
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
   * Força o recálculo de uma rota
   * @param {number} routeId - ID da rota
   * @returns {Promise} Promessa com a rota recalculada
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
}

// Criar instância única do serviço para exportação
const routeApiService = new RouteApiService();
export { routeApiService };
