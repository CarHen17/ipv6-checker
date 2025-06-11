/**
 * Validation Engine - Sistema de Validação IPv6
 * Módulo focado em validação e análise de endereços IPv6
 */

export class ValidationEngine {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 300000; // 5 minutos
    
    // Padrões de validação
    this.patterns = {
      IPV6_FULL: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      IPV6_COMPRESSED: /^(([0-9a-fA-F]{1,4}:)*)?::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^::$/,
      CIDR: /^(.+)\/(\d{1,3})$/,
      HEX_GROUP: /^[0-9a-fA-F]{1,4}$/
    };
    
    // Regras RFC
    this.rfcRules = {
      'fe80::/10': { type: 'Link-Local', rfc: 'RFC 4291', routable: false },
      'ff00::/8': { type: 'Multicast', rfc: 'RFC 4291', routable: true },
      'fc00::/7': { type: 'Unique Local', rfc: 'RFC 4193', routable: false },
      '2001:db8::/32': { type: 'Documentation', rfc: 'RFC 3849', routable: false },
      '::1/128': { type: 'Loopback', rfc: 'RFC 4291', routable: false },
      '::/128': { type: 'Unspecified', rfc: 'RFC 4291', routable: false }
    };
  }

  /**
   * Inicializa o módulo
   */
  async init() {
    console.log('[ValidationEngine] Inicializando...');
    
    // Configurar limpeza do cache
    this.setupCacheCleanup();
    
    console.log('[ValidationEngine] ✅ Inicializado');
    return true;
  }

  /**
   * Validação principal de IPv6
   */
  validateIPv6(address) {
    if (!address || typeof address !== 'string') {
      return {
        valid: false,
        error: 'Endereço deve ser uma string não vazia'
      };
    }

    const cacheKey = `validate_${address}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const result = this.performValidation(address.trim());
      this.setToCache(cacheKey, result);
      return result;
    } catch (error) {
      const errorResult = {
        valid: false,
        error: error.message
      };
      this.setToCache(cacheKey, errorResult);
      return errorResult;
    }
  }

  /**
   * Executa a validação detalhada
   */
  performValidation(address) {
    let cleanAddress = address;
    let prefix = null;

    // Extrair CIDR se presente
    const cidrMatch = address.match(this.patterns.CIDR);
    if (cidrMatch) {
      cleanAddress = cidrMatch[1];
      prefix = parseInt(cidrMatch[2], 10);
      
      if (prefix < 0 || prefix > 128) {
        throw new Error(`Prefixo CIDR inválido: /${prefix}. Deve estar entre 0 e 128`);
      }
    }

    // Remover colchetes se presentes
    cleanAddress = cleanAddress.replace(/^\[|\]$/g, '');

    // Validar formato
    if (!this.isValidFormat(cleanAddress)) {
      throw new Error('Formato de endereço IPv6 inválido');
    }

    // Expandir para análise
    const expanded = this.expandAddress(cleanAddress);
    const compressed = this.compressAddress(expanded);
    const type = this.getAddressType(expanded);
    const scope = this.getAddressScope(type);

    return {
      valid: true,
      original: address,
      cleanAddress: cleanAddress,
      expanded: expanded,
      compressed: compressed,
      prefix: prefix,
      type: type,
      scope: scope,
      recommendations: this.generateRecommendations(type, prefix)
    };
  }

  /**
   * Verifica se o formato é válido
   */
  isValidFormat(address) {
    if (!address) return false;

    // Verificar caracteres válidos
    if (!/^[0-9a-fA-F:]+$/.test(address)) return false;

    // Verificar múltiplos "::"
    const doubleColonCount = (address.match(/::/g) || []).length;
    if (doubleColonCount > 1) return false;

    // Verificar ":::" inválido
    if (address.includes(':::')) return false;

    const hasDoubleColon = address.includes('::');

    if (hasDoubleColon) {
      return this.validateCompressedFormat(address);
    } else {
      return this.validateFullFormat(address);
    }
  }

  /**
   * Valida formato comprimido
   */
  validateCompressedFormat(address) {
    const parts = address.split('::');
    if (parts.length !== 2) return false;

    const before = parts[0] ? parts[0].split(':').filter(g => g !== '') : [];
    const after = parts[1] ? parts[1].split(':').filter(g => g !== '') : [];

    if (before.length + after.length > 8) return false;

    const allGroups = [...before, ...after];
    return allGroups.every(group => this.patterns.HEX_GROUP.test(group));
  }

  /**
   * Valida formato completo
   */
  validateFullFormat(address) {
    const groups = address.split(':');
    if (groups.length !== 8) return false;
    return groups.every(group => this.patterns.HEX_GROUP.test(group));
  }

  /**
   * Expande endereço IPv6
   */
  expandAddress(address) {
    let addr = address.replace(/^\[|\]$/g, '');
    
    if (!addr.includes('::')) {
      const groups = addr.split(':');
      if (groups.length !== 8) {
        throw new Error('Endereço IPv6 incompleto');
      }
      return groups.map(group => group.padStart(4, '0')).join(':');
    }

    const parts = addr.split('::');
    const before = parts[0] ? parts[0].split(':').filter(g => g !== '') : [];
    const after = parts[1] ? parts[1].split(':').filter(g => g !== '') : [];
    
    const missingGroups = 8 - (before.length + after.length);
    if (missingGroups < 0) {
      throw new Error('Muitos grupos no endereço IPv6');
    }

    const zeros = new Array(missingGroups).fill('0000');
    const allGroups = [...before, ...zeros, ...after];
    
    return allGroups.map(group => {
      if (!this.patterns.HEX_GROUP.test(group)) {
        throw new Error(`Grupo hexadecimal inválido: ${group}`);
      }
      return group.padStart(4, '0');
    }).join(':');
  }

  /**
   * Comprime endereço IPv6
   */
  compressAddress(address) {
    try {
      const expanded = this.expandAddress(address);
      const groups = expanded.split(':');

      // Encontrar maior sequência de zeros
      let bestStart = -1, bestLength = 0;
      let currentStart = -1, currentLength = 0;

      for (let i = 0; i < 8; i++) {
        if (groups[i] === '0000') {
          if (currentStart === -1) currentStart = i;
          currentLength++;
        } else {
          if (currentLength > bestLength) {
            bestLength = currentLength;
            bestStart = currentStart;
          }
          currentStart = -1;
          currentLength = 0;
        }
      }

      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
      }

      if (bestLength < 2) {
        return groups.map(g => g.replace(/^0+/, '') || '0').join(':');
      }

      const before = groups.slice(0, bestStart).map(g => g.replace(/^0+/, '') || '0');
      const after = groups.slice(bestStart + bestLength).map(g => g.replace(/^0+/, '') || '0');

      if (before.length === 0 && after.length === 0) {
        return '::';
      } else if (before.length === 0) {
        return '::' + after.join(':');
      } else if (after.length === 0) {
        return before.join(':') + '::';
      } else {
        return before.join(':') + '::' + after.join(':');
      }
    } catch (error) {
      return address;
    }
  }

  /**
   * Determina tipo do endereço
   */
  getAddressType(expanded) {
    if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') {
      return 'Loopback';
    }
    
    if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000') {
      return 'Unspecified';
    }
    
    if (expanded.startsWith('fe80:')) {
      return 'Link-Local';
    }
    
    if (expanded.startsWith('ff')) {
      return 'Multicast';
    }
    
    if (expanded.startsWith('fc') || expanded.startsWith('fd')) {
      return 'Unique Local';
    }
    
    if (expanded.startsWith('2001:0db8:')) {
      return 'Documentation';
    }
    
    return 'Global Unicast';
  }

  /**
   * Determina escopo do endereço
   */
  getAddressScope(type) {
    const scopeMap = {
      'Loopback': 'Host',
      'Unspecified': 'None',
      'Link-Local': 'Link',
      'Multicast': 'Variable',
      'Unique Local': 'Organization',
      'Documentation': 'Documentation',
      'Global Unicast': 'Global'
    };
    
    return scopeMap[type] || 'Unknown';
  }

  /**
   * Gera recomendações
   */
  generateRecommendations(type, prefix) {
    const recommendations = [];
    
    switch (type) {
      case 'Documentation':
        recommendations.push({
          type: 'warning',
          message: 'Prefixo de documentação - não usar em produção'
        });
        break;
        
      case 'Link-Local':
        recommendations.push({
          type: 'info',
          message: 'Endereço válido apenas no segmento local'
        });
        break;
        
      case 'Global Unicast':
        recommendations.push({
          type: 'success',
          message: 'Endereço válido para uso na Internet'
        });
        break;
    }
    
    if (prefix && prefix > 64) {
      recommendations.push({
        type: 'warning',
        message: 'Prefixos > /64 podem causar problemas com SLAAC'
      });
    }
    
    return recommendations;
  }

  /**
   * Configura limpeza do cache
   */
  setupCacheCleanup() {
    setInterval(() => {
      this.cleanExpiredCache();
    }, 60000);
  }

  /**
   * Obtém valor do cache
   */
  getFromCache(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.value;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Define valor no cache
   */
  setToCache(key, value) {
    if (this.cache.size >= 1000) {
      this.cleanExpiredCache();
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Limpa cache expirado
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}