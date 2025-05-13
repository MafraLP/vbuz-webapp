/**
 * Serviço para busca de endereços e geocodificação
 */
class GeocodingService {
  /**
   * Busca endereços usando o serviço OpenStreetMap Nominatim
   * @param {string} address - Endereço ou termo de busca
   * @param {number} limit - Número máximo de resultados
   * @param {Object} userLocation - Localização do usuário (opcional) para priorizar resultados próximos
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

    // Adicionar cabeçalho User-Agent (necessário para o Nominatim)
    const headers = {
      'User-Agent': 'TravelTracker/1.0 (https://vbuz.mobi; lucasmafrapinheiro@gmail.com)'
    };

    // Adicionar um atraso para evitar exceder os limites da API Nominatim
    await this.delay(1000);

    // Executar a chamada à API
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error('Erro ao buscar endereço');
    }

    const data = await response.json();

    // Formatar dados para uso na aplicação
    return data.map((item) => ({
      name: item.display_name.split(',')[0],
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      category: item.class
    }));
  }

  /**
   * Busca pontos de interesse por categoria em uma região
   * @param {string} category - Categoria de POI (hospital, school, etc)
   * @param {Object} centerLocation - Localização central para busca
   * @param {number} radius - Raio de busca em km
   * @param {number} limit - Número máximo de resultados
   * @returns {Promise<Array>} - Lista de resultados formatados
   */
  async searchPointsOfInterest(category, centerLocation, radius = 10, limit = 5) {
    // Converter raio de km para graus (aproximadamente para fins de busca)
    // 1 grau = aprox. 111 km no equador para latitude
    const radiusDegrees = radius / 111;

    // Montar a query para buscar a categoria específica
    const query = `${category}`;

    // Criar uma viewbox baseada no centro e raio
    const viewbox = [
      centerLocation.lng - radiusDegrees,
      centerLocation.lat - radiusDegrees,
      centerLocation.lng + radiusDegrees,
      centerLocation.lat + radiusDegrees
    ].join(',');

    // Construir URL com os parâmetros
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=${limit}`;

    // Adicionar cabeçalho User-Agent (necessário para o Nominatim)
    const headers = {
      'User-Agent': 'TravelTracker/1.0 (https://yourwebsite.com; your.email@example.com)'
    };

    // Adicionar um atraso para evitar exceder os limites da API Nominatim
    await this.delay(1000);

    // Executar a chamada à API
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Erro ao buscar pontos de interesse do tipo ${category}`);
    }

    const data = await response.json();

    // Formatar dados para uso na aplicação
    return data.map((item) => ({
      name: item.display_name.split(',')[0],
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      category: item.class
    }));
  }

  /**
   * Implementa um delay para controlar a taxa de chamadas à API
   * @param {number} ms - Tempo de espera em milissegundos
   * @returns {Promise} - Promessa que resolve após o tempo especificado
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new GeocodingService();
