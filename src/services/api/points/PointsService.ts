import BaseApiService from 'src/services/api/BaseApiService';

/**
 * Serviço para gerenciar pontos no sistema
 */
class PointsService extends BaseApiService {
  constructor() {
    super('points');
  }

  /**
   * Busca todos os pontos de uma instituição
   * @param {string|number} institutionId - ID da instituição
   * @returns {Promise<Array>} Lista de pontos
   */
  async getPoints(institutionId) {
    try {
      // Neste caso, usamos request pois não estamos usando o recurso padrão 'points'
      const response = await this.request('GET', `/institutions/${institutionId}/points`);
      return response.data.points || [];
    } catch (error) {
      console.error('Erro ao buscar pontos:', error);
      throw error;
    }
  }

  /**
   * Busca um ponto específico pelo ID
   * @param {string|number} pointId - ID do ponto
   * @returns {Promise<Object>} Dados do ponto
   */
  async getPoint(pointId) {
    try {
      const response = await this.get(pointId);
      return response.data.point;
    } catch (error) {
      console.error(`Erro ao buscar ponto ${pointId}:`, error);
      throw error;
    }
  }

  /**
   * Cria um novo ponto
   * @param {Object} pointData - Dados do ponto a ser criado
   * @returns {Promise<Object>} Ponto criado
   */
  async createPoint(pointData) {
    try {
      const response = await this.post('', pointData);
      return response.data.point;
    } catch (error) {
      console.error('Erro ao criar ponto:', error);
      throw error;
    }
  }

  /**
   * Atualiza um ponto existente
   * @param {string|number} pointId - ID do ponto
   * @param {Object} pointData - Novos dados do ponto
   * @returns {Promise<Object>} Ponto atualizado
   */
  async updatePoint(pointId, pointData) {
    try {
      const response = await this.put(pointId, pointData);
      return response.data.point;
    } catch (error) {
      console.error(`Erro ao atualizar ponto ${pointId}:`, error);
      throw error;
    }
  }

  /**
   * Remove um ponto
   * @param {string|number} pointId - ID do ponto a ser removido
   * @returns {Promise<Object>} Resposta da API
   */
  async deletePoint(pointId) {
    try {
      const response = await this.delete(pointId);
      return response.data;
    } catch (error) {
      console.error(`Erro ao remover ponto ${pointId}:`, error);
      throw error;
    }
  }

  /**
   * Busca as rotas associadas a uma instituição
   * @param {string|number} institutionId - ID da instituição
   * @returns {Promise<Array>} Lista de rotas
   */
  async getRoutes(institutionId) {
    try {
      const response = await this.request('GET', `/institutions/${institutionId}/routes`);
      return response.data.routes || [];
    } catch (error) {
      console.error('Erro ao buscar rotas:', error);
      throw error;
    }
  }

  /**
   * Busca os motoristas associados a uma instituição
   * @param {string|number} institutionId - ID da instituição
   * @returns {Promise<Array>} Lista de motoristas
   */
  async getDrivers(institutionId) {
    try {
      const response = await this.request('GET', `/institutions/${institutionId}/drivers`);
      return response.data.drivers || [];
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
      throw error;
    }
  }

  /**
   * Busca os veículos associados a uma instituição
   * @param {string|number} institutionId - ID da instituição
   * @returns {Promise<Array>} Lista de veículos
   */
  async getVehicles(institutionId) {
    try {
      const response = await this.request('GET', `/institutions/${institutionId}/vehicles`);
      return response.data.vehicles || [];
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
      throw error;
    }
  }
}

const pointsService = new PointsService();
export { pointsService };
