// src/services/api/BaseApiService.js

import axios from 'axios';

export default class BaseApiService {
  /**
   * Construtor do serviço base de API
   * @param {string} resource - Nome do recurso da API (ex: 'routes', 'users')
   * @param {Object} options - Opções adicionais
   */
  constructor(resource, options = {}) {
    if (!resource) {
      throw new Error('Recurso da API é obrigatório');
    }

    this.resource = resource;
    this.config = {
      baseURL: import.meta.env.VITE_APP_API_URL,
      ...options
    };

    console.log(this.config)

    this.initializeAxios();
  }

  /**
   * Inicializa a instância do axios com configurações padrão
   */
  initializeAxios() {
    this.api = axios.create({
      baseURL: this.config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.config.headers
      }
    });

    this.setupInterceptors();
  }

  /**
   * Configura os interceptors para adicionar token de autenticação
   * e manipular erros comuns
   */
  setupInterceptors() {
    // Interceptor para adicionar token de autenticação
    this.api.interceptors.request.use(config => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor para manipular erros comuns
    this.api.interceptors.response.use(
      response => response,
      error => {
        // Tratamento comum de erros (401, 403, 500, etc)
        if (error.response) {
          // Tratamento específico para erro de autenticação
          if (error.response.status === 401) {
            // Limpar token e redirecionar para login se necessário
            localStorage.removeItem('auth_token');
            // Pode-se disparar um evento aqui ou usar um router
          }

          // Aqui você pode adicionar outros tratamentos de erros comuns
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Constrói a URL para um endpoint específico
   * @param {string} endpoint - Endpoint da API
   * @returns {string} URL completa
   */
  getUrl(endpoint = '') {
    return endpoint ? `/${this.resource}/${endpoint}` : `/${this.resource}`;
  }

  /**
   * Realiza uma requisição GET
   * @param {string} endpoint - Endpoint específico (opcional)
   * @param {Object} params - Parâmetros da query string
   * @returns {Promise} Promessa com a resposta
   */
  get(endpoint = '', params = {}) {
    return this.api.get(this.getUrl(endpoint), { params });
  }

  /**
   * Realiza uma requisição POST
   * @param {string} endpoint - Endpoint específico (opcional)
   * @param {Object} data - Dados para enviar
   * @returns {Promise} Promessa com a resposta
   */
  post(endpoint = '', data = {}) {
    return this.api.post(this.getUrl(endpoint), data);
  }

  /**
   * Realiza uma requisição PUT
   * @param {string} endpoint - Endpoint específico (opcional)
   * @param {Object} data - Dados para enviar
   * @returns {Promise} Promessa com a resposta
   */
  put(endpoint = '', data = {}) {
    return this.api.put(this.getUrl(endpoint), data);
  }

  /**
   * Realiza uma requisição PATCH
   * @param {string} endpoint - Endpoint específico (opcional)
   * @param {Object} data - Dados para enviar
   * @returns {Promise} Promessa com a resposta
   */
  patch(endpoint = '', data = {}) {
    return this.api.patch(this.getUrl(endpoint), data);
  }

  /**
   * Realiza uma requisição DELETE
   * @param {string} endpoint - Endpoint específico (opcional)
   * @returns {Promise} Promessa com a resposta
   */
  delete(endpoint = '') {
    return this.api.delete(this.getUrl(endpoint));
  }

  /**
   * Realiza uma requisição para um endpoint sem prefixo de recurso
   * @param {string} method - Método HTTP
   * @param {string} url - URL completa
   * @param {Object} data - Dados para enviar
   * @param {Object} config - Configurações adicionais
   * @returns {Promise} Promessa com a resposta
   */
  request(method, url, data = {}, config = {}) {
    return this.api.request({
      method,
      url,
      data,
      ...config
    });
  }
}
