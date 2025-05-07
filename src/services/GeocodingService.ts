/**
 * Serviço para busca de endereços e geocodificação
 */
export default {
  /**
   * Busca endereços usando o serviço OpenStreetMap Nominatim
   * @param {string} address - Endereço ou termo de busca
   * @param {number} limit - Número máximo de resultados
   * @param userLocation - Usuario localização (opcional) para priorizar resultados próximos
   * @returns {Promise<Array>} - Lista de resultados formatados
   */
  async searchAddress(address, limit = 5, userLocation = null) {
    // Construir URL base
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=${limit}`;

    // Se temos a localização do usuário, adicionar viewbox para priorizar resultados próximos
    if (userLocation && userLocation.lat && userLocation.lng) {
      // Criar uma caixa de aproximadamente 50km ao redor da localização do usuário
      // (0.5 graus é aproximadamente 55km no equador)
      const boxSize = 0.5;
      const viewbox = [
        userLocation.lng - boxSize, // min longitude (oeste)
        userLocation.lat - boxSize, // min latitude (sul)
        userLocation.lng + boxSize, // max longitude (leste)
        userLocation.lat + boxSize  // max latitude (norte)
      ].join(',');

      // Adicionar parâmetros à URL
      url += `&viewbox=${viewbox}&bounded=0`;
      // bounded=0 significa que é apenas uma preferência, não uma restrição rígida
    }

    // Executar a chamada à API
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Erro ao buscar endereço');
    }

    const data = await response.json();

    // Formatar dados para uso na aplicação
    return data.map((item) => ({
      name: item.display_name.split(',')[0],
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  }
};
