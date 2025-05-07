import axios from 'axios';
import type { AxiosInstance } from 'axios';

// Criar uma instância axios para uso em toda a aplicação
const apiClient: AxiosInstance = axios.create({
  // URL base da API - apontando para o Laravel
  baseURL: 'http://localhost/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000 // 10 segundos
});

// Interfaces para os tipos de dados geoespaciais
export interface Point {
  id?: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  type?: string; // tipo de ponto (parada de ônibus, estação, etc.)
  createdAt?: string;
  updatedAt?: string;
}

export interface Route {
  id?: number;
  name: string;
  description?: string;
  points: Point[]; // pontos que compõem a rota
  distance?: number; // distância total em metros
  estimatedTime?: number; // tempo estimado em minutos
  createdAt?: string;
  updatedAt?: string;
}

// Serviço para gerenciar pontos
export const PointService = {
  // Obter todos os pontos
  getAll: async (): Promise<Point[]> => {
    try {
      const response = await apiClient.get('/points');
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar pontos:', error);
      throw error;
    }
  },

  // Obter ponto por ID
  getById: async (id: number): Promise<Point> => {
    try {
      const response = await apiClient.get(`/points/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Erro ao buscar ponto ID ${id}:`, error);
      throw error;
    }
  },

  // Criar novo ponto
  create: async (point: Point): Promise<Point> => {
    try {
      const response = await apiClient.post('/points', point);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao criar ponto:', error);
      throw error;
    }
  },

  // Atualizar ponto existente
  update: async (id: number, point: Point): Promise<Point> => {
    try {
      const response = await apiClient.put(`/points/${id}`, point);
      return response.data.data;
    } catch (error) {
      console.error(`Erro ao atualizar ponto ID ${id}:`, error);
      throw error;
    }
  },

  // Excluir ponto
  delete: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/points/${id}`);
    } catch (error) {
      console.error(`Erro ao excluir ponto ID ${id}:`, error);
      throw error;
    }
  },

  // Buscar pontos próximos a uma localização
  getNearby: async (lat: number, lng: number, radius: number = 25000): Promise<Point[]> => {
    try {
      const response = await apiClient.get('/points/nearby', {
        params: { lat, lng, radius }
      });
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar pontos próximos:', error);
      throw error;
    }
  }
};

// Serviço para gerenciar rotas/itinerários
export const RouteService = {
  // Obter todas as rotas
  getAll: async (): Promise<Route[]> => {
    try {
      const response = await apiClient.get('/routes');
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar rotas:', error);
      throw error;
    }
  },

  // Obter rota por ID
  getById: async (id: number): Promise<Route> => {
    try {
      const response = await apiClient.get(`/routes/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Erro ao buscar rota ID ${id}:`, error);
      throw error;
    }
  },

  // Criar nova rota
  create: async (route: Route): Promise<Route> => {
    try {
      const response = await apiClient.post('/routes', route);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao criar rota:', error);
      throw error;
    }
  },

  // Atualizar rota existente
  update: async (id: number, route: Route): Promise<Route> => {
    try {
      const response = await apiClient.put(`/routes/${id}`, route);
      return response.data.data;
    } catch (error) {
      console.error(`Erro ao atualizar rota ID ${id}:`, error);
      throw error;
    }
  },

  // Excluir rota
  delete: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/routes/${id}`);
    } catch (error) {
      console.error(`Erro ao excluir rota ID ${id}:`, error);
      throw error;
    }
  }
};

export default {
  apiClient,
  PointService,
  RouteService
};
