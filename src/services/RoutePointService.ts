/**
 * Serviço para gerenciar pontos de rota
 */
export default {
  /**
   * Salva um ponto de rota na API
   * @param {Object} point - Ponto a ser salvo
   * @param {number} routeId - ID da rota a que o ponto pertence
   * @returns {Promise<Object>} - Ponto salvo com ID atribuído
   */
  async savePoint(point, routeId) {
    // Aqui você implementaria a chamada real para sua API Laravel
    // Por enquanto, é apenas um mock
    console.log('Salvando ponto:', point, 'para rota:', routeId);

    // Simular resposta da API
    return {
      ...point,
      id: point.id || Date.now(),
      routeId
    };
  },

  /**
   * Obtém pontos de uma rota específica
   * @param {number} routeId - ID da rota
   * @returns {Promise<Array>} - Lista de pontos da rota
   */
  async getRoutePoints(routeId) {
    // Implementar chamada para API Laravel
    console.log('Buscando pontos para rota:', routeId);

    // Dados de exemplo
    return [
      { id: 1, name: 'Terminal Central', lat: -25.4284, lng: -49.2733, type: 'terminal', routeId },
      { id: 2, name: 'Praça Tiradentes', lat: -25.4320, lng: -49.2715, type: 'stop', routeId },
      { id: 3, name: 'Hospital Municipal', lat: -25.4360, lng: -49.2680, type: 'stop', routeId }
    ];
  },

  /**
   * Reordena pontos de uma rota
   * @param {Array} points - Lista ordenada de pontos
   * @param {number} routeId - ID da rota
   * @returns {Promise<Array>} - Lista atualizada
   */
  async reorderPoints(points, routeId) {
    // Implementar chamada para API
    console.log('Reordenando pontos:', points, 'para rota:', routeId);

    // Retornar mesma lista como resposta simulada
    return points;
  }
};
