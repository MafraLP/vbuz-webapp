// src/services/api/permission/PermissionApiService.ts

import BaseApiService from '../BaseApiService';

/**
 * Serviço para gerenciar permissões/carteirinhas no sistema
 */
class PermissionApiService extends BaseApiService {
  /**
   * Construtor do serviço de API de permissões
   */
  constructor() {
    super('permissions'); // 'permissions' é o recurso base para esta API
  }

  // === MÉTODOS CRUD BÁSICOS ===

  /**
   * Obtém todas as permissões do usuário
   * @param {Object} params - Parâmetros de filtro
   * @param {number} params.institution_id - ID da instituição
   * @param {boolean} params.active_only - Apenas permissões ativas
   * @param {string} params.search - Termo de busca
   * @param {number} params.per_page - Itens por página
   * @returns {Promise} Promessa com a lista de permissões
   */
  getPermissions(params = {}) {
    console.log('🎫 [API] Buscando permissões:', params);
    return this.get('', { params });
  }

  /**
   * Obtém detalhes de uma permissão específica
   * @param {number} permissionId - ID da permissão
   * @returns {Promise} Promessa com os detalhes da permissão
   */
  getPermission(permissionId) {
    console.log('🎫 [API] Buscando permissão:', permissionId);
    return this.get(`${permissionId}`);
  }

  /**
   * Cria uma nova permissão/carteirinha
   * @param {Object} permissionData - Dados da permissão
   * @param {string} permissionData.name - Nome da carteirinha
   * @param {string} permissionData.code - Código único
   * @param {string} permissionData.description - Descrição
   * @param {string} permissionData.color - Cor hexadecimal
   * @param {string} permissionData.icon - Nome do ícone
   * @param {number} permissionData.institution_id - ID da instituição
   * @param {boolean} permissionData.is_active - Se está ativa
   * @returns {Promise} Promessa com a permissão criada
   */
  createPermission(permissionData) {
    console.log('🎫 [API] Criando permissão:', permissionData);
    return this.post('', permissionData);
  }

  /**
   * Atualiza uma permissão existente
   * @param {number} permissionId - ID da permissão
   * @param {Object} permissionData - Dados atualizados da permissão
   * @returns {Promise} Promessa com a permissão atualizada
   */
  updatePermission(permissionId, permissionData) {
    console.log('🎫 [API] Atualizando permissão:', permissionId, permissionData);
    return this.put(`${permissionId}`, permissionData);
  }

  /**
   * Exclui uma permissão
   * @param {number} permissionId - ID da permissão
   * @returns {Promise} Promessa com o resultado da exclusão
   */
  deletePermission(permissionId) {
    console.log('🎫 [API] Excluindo permissão:', permissionId);
    return this.delete(`${permissionId}`);
  }

  /**
   * Ativa ou desativa uma permissão
   * @param {number} permissionId - ID da permissão
   * @param {boolean} isActive - Se deve ativar ou desativar
   * @returns {Promise} Promessa com a permissão atualizada
   */
  togglePermissionStatus(permissionId, isActive) {
    console.log('🎫 [API] Alterando status da permissão:', permissionId, isActive);
    return this.patch(`${permissionId}/toggle-status`, {
      is_active: isActive
    });
  }

  // === MÉTODOS DE GESTÃO DE USUÁRIOS ===

  /**
   * Obtém usuários que possuem uma permissão específica
   * @param {number} permissionId - ID da permissão
   * @param {Object} params - Parâmetros de filtro
   * @param {boolean} params.active_only - Apenas usuários com permissão ativa
   * @param {number} params.per_page - Itens por página
   * @returns {Promise} Promessa com a lista de usuários
   */
  getPermissionUsers(permissionId, params = {}) {
    console.log('🎫 [API] Buscando usuários da permissão:', permissionId, params);
    return this.get(`${permissionId}/users`, { params });
  }

  /**
   * Concede uma permissão a um usuário
   * @param {number} permissionId - ID da permissão
   * @param {Object} grantData - Dados da concessão
   * @param {number} grantData.user_id - ID do usuário
   * @param {string} grantData.expires_at - Data de expiração (opcional)
   * @returns {Promise} Promessa com o resultado da concessão
   */
  grantPermissionToUser(permissionId, grantData) {
    console.log('🎫 [API] Concedendo permissão ao usuário:', permissionId, grantData);
    return this.post(`${permissionId}/grant-user`, grantData);
  }

  /**
   * Revoga uma permissão de um usuário
   * @param {number} permissionId - ID da permissão
   * @param {Object} revokeData - Dados da revogação
   * @param {number} revokeData.user_id - ID do usuário
   * @returns {Promise} Promessa com o resultado da revogação
   */
  revokePermissionFromUser(permissionId, revokeData) {
    console.log('🎫 [API] Revogando permissão do usuário:', permissionId, revokeData);
    return this.post(`${permissionId}/revoke-user`, revokeData);
  }

  // === MÉTODOS DE GESTÃO DE ROTAS ===

  /**
   * Obtém rotas que requerem uma permissão específica
   * @param {number} permissionId - ID da permissão
   * @param {Object} params - Parâmetros de filtro
   * @param {boolean} params.published_only - Apenas rotas publicadas
   * @param {number} params.per_page - Itens por página
   * @returns {Promise} Promessa com a lista de rotas
   */
  getPermissionRoutes(permissionId, params = {}) {
    console.log('🎫 [API] Buscando rotas da permissão:', permissionId, params);
    return this.get(`${permissionId}/routes`, { params });
  }

  // === MÉTODOS POR INSTITUIÇÃO ===

  /**
   * Obtém permissões de uma instituição específica
   * @param {number} institutionId - ID da instituição
   * @param {Object} params - Parâmetros de filtro
   * @returns {Promise} Promessa com as permissões da instituição
   */
  getInstitutionPermissions(institutionId, params = {}) {
    console.log('🎫 [API] Buscando permissões da instituição:', institutionId, params);
    return this.get(`../institutions/${institutionId}/permissions`, { params });
  }

  // === MÉTODOS DE GESTÃO DE USUÁRIOS ===

  /**
   * Busca permissões disponíveis para um usuário específico
   * @param {number} userId - ID do usuário
   * @param {Object} params - Parâmetros de filtro
   * @param {number} params.institution_id - ID da instituição (opcional)
   * @returns {Promise} Promessa com as permissões disponíveis
   */
  getAvailablePermissionsForUser(userId, params = {}) {
    console.log('🎫 [API] Buscando permissões disponíveis para usuário:', userId, params);
    return this.get(`../users/${userId}/available-permissions`, { params });
  }

  /**
   * Verifica se um usuário tem uma permissão específica
   * @param {number} userId - ID do usuário
   * @param {number} permissionId - ID da permissão
   * @returns {Promise} Promessa com o resultado da verificação
   */
  checkUserPermission(userId, permissionId) {
    console.log('🎫 [API] Verificando permissão do usuário:', userId, permissionId);
    return this.get(`../users/${userId}/has-permission/${permissionId}`);
  }

  /**
   * Obtém todas as permissões de um usuário
   * @param {number} userId - ID do usuário
   * @param {Object} params - Parâmetros de filtro
   * @param {boolean} params.include_expired - Incluir permissões expiradas
   * @param {number} params.institution_id - ID da instituição (opcional)
   * @returns {Promise} Promessa com as permissões do usuário
   */
  getUserPermissions(userId, params = {}) {
    console.log('🎫 [API] Buscando permissões do usuário:', userId, params);
    return this.get(`../users/${userId}/permissions`, { params });
  }

  /**
   * Busca usuários por múltiplas permissões
   * @param {Object} searchData - Dados da busca
   * @param {Array<string>} searchData.permission_codes - Códigos das permissões
   * @param {boolean} searchData.match_all - Se deve ter todas as permissões (AND) ou apenas algumas (OR)
   * @param {number} searchData.institution_id - ID da instituição (opcional)
   * @param {number} searchData.per_page - Itens por página
   * @returns {Promise} Promessa com os usuários encontrados
   */
  searchUsersByPermissions(searchData) {
    console.log('🎫 [API] Buscando usuários por permissões:', searchData);
    return this.get('search-users', { params: searchData });
  }

  // === MÉTODOS DE ESTATÍSTICAS ===

  /**
   * Obtém estatísticas de permissões de uma instituição
   * @param {number} institutionId - ID da instituição
   * @returns {Promise} Promessa com as estatísticas
   */
  getInstitutionPermissionStats(institutionId) {
    console.log('🎫 [API] Buscando estatísticas de permissões da instituição:', institutionId);
    return this.get(`../institutions/${institutionId}/permissions/stats`);
  }

  /**
   * Obtém permissões mais utilizadas
   * @param {Object} params - Parâmetros de filtro
   * @param {number} params.limit - Limite de resultados
   * @param {number} params.institution_id - ID da instituição (opcional)
   * @returns {Promise} Promessa com as permissões populares
   */
  getPopularPermissions(params = {}) {
    console.log('🎫 [API] Buscando permissões populares:', params);
    return this.get('popular', { params });
  }

  // === MÉTODOS DE VALIDAÇÃO ===

  /**
   * Valida se um código de permissão é único
   * @param {string} code - Código a ser validado
   * @param {number} institutionId - ID da instituição
   * @param {number} excludeId - ID da permissão a excluir da validação (para edição)
   * @returns {Promise} Promessa com o resultado da validação
   */
  validatePermissionCode(code, institutionId, excludeId = null) {
    console.log('🎫 [API] Validando código de permissão:', { code, institutionId, excludeId });
    return this.post('validate-code', {
      code,
      institution_id: institutionId,
      exclude_id: excludeId
    });
  }

  /**
   * Valida dados de uma permissão antes de criar/atualizar
   * @param {Object} permissionData - Dados da permissão para validar
   * @returns {Promise} Promessa com o resultado da validação
   */
  validatePermissionData(permissionData) {
    console.log('🎫 [API] Validando dados da permissão:', permissionData);
    return this.post('validate', permissionData);
  }

  // === MÉTODOS DE IMPORTAÇÃO/EXPORTAÇÃO ===

  /**
   * Exporta permissões de uma instituição em CSV
   * @param {number} institutionId - ID da instituição
   * @returns {Promise} Promessa com o arquivo CSV
   */
  exportInstitutionPermissions(institutionId) {
    console.log('🎫 [API] Exportando permissões da instituição:', institutionId);
    return this.get(`../institutions/${institutionId}/permissions/export`, {
      responseType: 'blob'
    });
  }

  /**
   * Importa permissões de um arquivo CSV
   * @param {File} file - Arquivo CSV
   * @param {number} institutionId - ID da instituição
   * @returns {Promise} Promessa com o resultado da importação
   */
  importPermissionsFromCSV(file, institutionId) {
    console.log('🎫 [API] Importando permissões do CSV:', { file: file.name, institutionId });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('institution_id', institutionId);

    return this.post('import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // === MÉTODOS DE BULK OPERATIONS ===

  /**
   * Atualiza múltiplas permissões de uma vez
   * @param {Array<Object>} permissionsData - Array de dados das permissões
   * @returns {Promise} Promessa com o resultado da atualização em lote
   */
  bulkUpdatePermissions(permissionsData) {
    console.log('🎫 [API] Atualizando permissões em lote:', permissionsData.length);
    return this.post('bulk-update', { permissions: permissionsData });
  }

  /**
   * Exclui múltiplas permissões de uma vez
   * @param {Array<number>} permissionIds - Array de IDs das permissões
   * @returns {Promise} Promessa com o resultado da exclusão em lote
   */
  bulkDeletePermissions(permissionIds) {
    console.log('🎫 [API] Excluindo permissões em lote:', permissionIds);
    return this.post('bulk-delete', { permission_ids: permissionIds });
  }

  /**
   * Concede permissões a múltiplos usuários
   * @param {number} permissionId - ID da permissão
   * @param {Array<number>} userIds - Array de IDs dos usuários
   * @param {Object} grantOptions - Opções da concessão
   * @param {string} grantOptions.expires_at - Data de expiração (opcional)
   * @returns {Promise} Promessa com o resultado da concessão em lote
   */
  bulkGrantPermissionToUsers(permissionId, userIds, grantOptions = {}) {
    console.log('🎫 [API] Concedendo permissão a múltiplos usuários:', { permissionId, userIds, grantOptions });
    return this.post(`${permissionId}/bulk-grant`, {
      user_ids: userIds,
      ...grantOptions
    });
  }

  /**
   * Revoga permissões de múltiplos usuários
   * @param {number} permissionId - ID da permissão
   * @param {Array<number>} userIds - Array de IDs dos usuários
   * @returns {Promise} Promessa com o resultado da revogação em lote
   */
  bulkRevokePermissionFromUsers(permissionId, userIds) {
    console.log('🎫 [API] Revogando permissão de múltiplos usuários:', { permissionId, userIds });
    return this.post(`${permissionId}/bulk-revoke`, {
      user_ids: userIds
    });
  }
}

// === UTILITÁRIOS PARA O FRONTEND ===

export const permissionUtils = {
  /**
   * Cores padrão para permissões
   */
  defaultColors: [
    '#1976D2', '#388E3C', '#F57C00', '#7B1FA2',
    '#C2185B', '#00796B', '#5D4037', '#455A64',
    '#E53935', '#1565C0', '#2E7D32', '#F57F17'
  ],

  /**
   * Ícones padrão para permissões
   */
  defaultIcons: [
    'card_membership', 'badge', 'security', 'verified_user',
    'school', 'work', 'people', 'admin_panel_settings',
    'assignment_ind', 'contact_mail', 'fingerprint', 'key'
  ],

  /**
   * Gera uma cor aleatória para permissão
   * @returns {string} Cor hexadecimal
   */
  getRandomColor() {
    const colors = this.defaultColors;
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /**
   * Gera um ícone aleatório para permissão
   * @returns {string} Nome do ícone
   */
  getRandomIcon() {
    const icons = this.defaultIcons;
    return icons[Math.floor(Math.random() * icons.length)];
  },

  /**
   * Gera código automaticamente baseado no nome
   * @param {string} name - Nome da permissão
   * @returns {string} Código sugerido
   */
  generateCodeFromName(name) {
    if (!name || typeof name !== 'string') return '';

    return name
      .toUpperCase()
      .replace(/[ÀÁÂÃÄÅ]/g, 'A')
      .replace(/[ÈÉÊË]/g, 'E')
      .replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÕÖ]/g, 'O')
      .replace(/[ÙÚÛÜ]/g, 'U')
      .replace(/[Ç]/g, 'C')
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
  },

  /**
   * Valida cor hexadecimal
   * @param {string} color - Cor a ser validada
   * @returns {boolean} Se é válida
   */
  isValidColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
  },

  /**
   * Valida código de permissão
   * @param {string} code - Código a ser validado
   * @returns {Object} Resultado da validação
   */
  validateCode(code) {
    const errors = [];

    if (!code || typeof code !== 'string') {
      errors.push('Código é obrigatório');
    } else {
      if (code.length < 2) {
        errors.push('Código deve ter pelo menos 2 caracteres');
      }
      if (code.length > 50) {
        errors.push('Código deve ter no máximo 50 caracteres');
      }
      if (!/^[A-Z0-9_]+$/.test(code)) {
        errors.push('Código deve conter apenas letras maiúsculas, números e underscore');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Formata dados de permissão para exibição
   * @param {Object} permission - Dados da permissão
   * @returns {Object} Permissão formatada
   */
  formatPermissionForDisplay(permission) {
    return {
      ...permission,
      color: permission.color || this.getRandomColor(),
      icon: permission.icon || 'card_membership',
      displayName: permission.name || 'Sem nome',
      displayCode: permission.code || 'SEM_CODIGO',
      isExpired: permission.expires_at && new Date(permission.expires_at) < new Date(),
      isActive: permission.is_active !== false
    };
  },

  /**
   * Agrupa permissões por instituição
   * @param {Array} permissions - Lista de permissões
   * @returns {Object} Permissões agrupadas
   */
  groupPermissionsByInstitution(permissions) {
    return permissions.reduce((groups, permission) => {
      const institutionId = permission.institution_id || 'without_institution';
      const institutionName = permission.institution?.name || 'Sem instituição';

      if (!groups[institutionId]) {
        groups[institutionId] = {
          institution: permission.institution,
          institutionName,
          permissions: []
        };
      }

      groups[institutionId].permissions.push(this.formatPermissionForDisplay(permission));
      return groups;
    }, {});
  },

  /**
   * Filtra permissões por termo de busca
   * @param {Array} permissions - Lista de permissões
   * @param {string} searchTerm - Termo de busca
   * @returns {Array} Permissões filtradas
   */
  filterPermissions(permissions, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      return permissions;
    }

    const term = searchTerm.toLowerCase().trim();

    return permissions.filter(permission => {
      return (
        permission.name?.toLowerCase().includes(term) ||
        permission.code?.toLowerCase().includes(term) ||
        permission.description?.toLowerCase().includes(term) ||
        permission.institution?.name?.toLowerCase().includes(term)
      );
    });
  },

  /**
   * Ordena permissões por critério
   * @param {Array} permissions - Lista de permissões
   * @param {string} sortBy - Critério de ordenação
   * @param {string} sortOrder - Ordem (asc/desc)
   * @returns {Array} Permissões ordenadas
   */
  sortPermissions(permissions, sortBy = 'name', sortOrder = 'asc') {
    return [...permissions].sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case 'name':
          valueA = a.name?.toLowerCase() || '';
          valueB = b.name?.toLowerCase() || '';
          break;
        case 'code':
          valueA = a.code?.toLowerCase() || '';
          valueB = b.code?.toLowerCase() || '';
          break;
        case 'created_at':
          valueA = new Date(a.created_at || 0);
          valueB = new Date(b.created_at || 0);
          break;
        case 'users_count':
          valueA = a.users_count || 0;
          valueB = b.users_count || 0;
          break;
        default:
          valueA = a[sortBy] || '';
          valueB = b[sortBy] || '';
      }

      if (valueA < valueB) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  },

  /**
   * Calcula estatísticas de um conjunto de permissões
   * @param {Array} permissions - Lista de permissões
   * @returns {Object} Estatísticas calculadas
   */
  calculatePermissionStats(permissions) {
    const total = permissions.length;
    const active = permissions.filter(p => p.is_active !== false).length;
    const inactive = total - active;
    const withUsers = permissions.filter(p => (p.users_count || 0) > 0).length;
    const withRoutes = permissions.filter(p => (p.routes_count || 0) > 0).length;

    return {
      total,
      active,
      inactive,
      withUsers,
      withRoutes,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      utilizationPercentage: total > 0 ? Math.round((withUsers / total) * 100) : 0
    };
  }
};

// Criar instância única do serviço para exportação
const permissionApiService = new PermissionApiService();
export { permissionApiService };
