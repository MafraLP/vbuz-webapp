import BaseApiService from 'src/services/api/BaseApiService';

/**
 * Serviço para gerenciar instituições no sistema
 */
class InstitutionsService extends BaseApiService {
  constructor() {
    super('institutions');
  }

  /**
   * Busca todas as instituições disponíveis para o usuário
   * @returns {Promise<Array>} Lista de instituições
   */
  async getUserInstitutions() {
    try {
      const response = await this.request('GET', '/user/institutions');
      return response.data.institutions || [];
    } catch (error) {
      console.error('Erro ao buscar instituições do usuário:', error);
      throw error;
    }
  }

  /**
   * Busca uma instituição específica pelo ID
   * @param {string|number} institutionId - ID da instituição
   * @returns {Promise<Object>} Dados da instituição
   */
  async getInstitution(institutionId) {
    try {
      const response = await this.get(institutionId);
      return response.data.institution;
    } catch (error) {
      console.error(`Erro ao buscar instituição ${institutionId}:`, error);
      throw error;
    }
  }

  /**
   * Cria uma nova instituição
   * @param {Object} institutionData - Dados da instituição a ser criada
   * @returns {Promise<Object>} Instituição criada
   */
  async createInstitution(institutionData) {
    try {
      const response = await this.post('', institutionData);
      return response.data.institution;
    } catch (error) {
      console.error('Erro ao criar instituição:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma instituição existente
   * @param {string|number} institutionId - ID da instituição
   * @param {Object} institutionData - Novos dados da instituição
   * @returns {Promise<Object>} Instituição atualizada
   */
  async updateInstitution(institutionId, institutionData) {
    try {
      const response = await this.put(institutionId, institutionData);
      return response.data.institution;
    } catch (error) {
      console.error(`Erro ao atualizar instituição ${institutionId}:`, error);
      throw error;
    }
  }

  /**
   * Remove uma instituição
   * @param {string|number} institutionId - ID da instituição a ser removida
   * @returns {Promise<Object>} Resposta da API
   */
  async deleteInstitution(institutionId) {
    try {
      const response = await this.delete(institutionId);
      return response.data;
    } catch (error) {
      console.error(`Erro ao remover instituição ${institutionId}:`, error);
      throw error;
    }
  }

  /**
   * Busca os usuários associados a uma instituição
   * @param {string|number} institutionId - ID da instituição
   * @returns {Promise<Array>} Lista de usuários
   */
  async getInstitutionUsers(institutionId) {
    try {
      const response = await this.get(`${institutionId}/users`);
      return response.data.users || [];
    } catch (error) {
      console.error(`Erro ao buscar usuários da instituição ${institutionId}:`, error);
      throw error;
    }
  }

  /**
   * Adiciona um usuário a uma instituição
   * @param {string|number} institutionId - ID da instituição
   * @param {Object} userData - Dados do usuário a ser adicionado
   * @returns {Promise<Object>} Resposta da API
   */
  async addUserToInstitution(institutionId, userData) {
    try {
      const response = await this.post(`${institutionId}/users`, userData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao adicionar usuário à instituição ${institutionId}:`, error);
      throw error;
    }
  }

  /**
   * Remove um usuário de uma instituição
   * @param {string|number} institutionId - ID da instituição
   * @param {string|number} userId - ID do usuário a ser removido
   * @returns {Promise<Object>} Resposta da API
   */
  async removeUserFromInstitution(institutionId, userId) {
    try {
      const response = await this.delete(`${institutionId}/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao remover usuário ${userId} da instituição ${institutionId}:`, error);
      throw error;
    }
  }
}

const institutionService = new InstitutionsService();
export {institutionService};
