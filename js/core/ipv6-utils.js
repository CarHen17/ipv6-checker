/**
 * IPv6 Utils - Biblioteca Core de Utilitários IPv6
 * Versão corrigida e otimizada para ES6 modules
 */

export class IPv6Utils {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 300000; // 5 minutos
    this.CACHE_MAX_SIZE = 1000;
    
    // Padrões IPv6 compilados para performance
    this.patterns = {
      FULL: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      COMPRESSED: /^(([0-9a-fA-F]{1,4}:)*)?::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^::$/,
      CIDR: /^(.+)\/(\d{1,3})$/,
      ZONE_ID: /^(.+)%(.+)$/,
      HEX_GROUP: /^[0-9a-fA-F]{1,4}$/
    };
    
    // Alocações RFC para classificação
    this.rfcAllocations = new Map([
      ['::1/128', { type: 'Loopback', rfc: 'RFC 4291', description: 'Interface de loopback' }],
      ['::/128', { type: 'Unspecified', rfc: 'RFC 4291', description: 'Endereço não especificado' }],
      ['fe80::/10', { type: 'Link-Local', rfc: 'RFC 4291', description: 'Link-local unicast' }],
      ['ff00::/8', { type: 'Multicast', rfc: 'RFC 4291', description: 'Endereços multicast' }],
      ['fc00::/7', { type: 'Unique Local', rfc: 'RFC 4193', description: 'Unique Local Unicast' }],
      ['2001:db8::/32', { type: 'Documentation', rfc: 'RFC 3849', description: 'Documentação e exemplos' }],
      ['2001::/32', { type: 'Teredo', rfc: 'RFC 4380', description: 'Túnel Teredo' }],
      ['2002::/16', { type: '6to4', rfc: 'RFC 3056', description: 'Túnel 6to4' }],
      ['64:ff9b::/96', { type: 'IPv4-Embedded', rfc: 'RFC 6052', description: 'IPv4-Embedded IPv6' }]
    ]);
  }

  /**
   * Inicializa o módulo
   */
  async init() {
    console.log('[IPv6Utils] Inicializando...');
    
    // Pré-aquecer cache com endereços comuns
    this.preWarmCache();
    
    // Configurar limpeza automática do cache
    this.setupCacheCleanup();
    
    console.log('[IPv6Utils] ✅ Inicializado');
    return true;
  }

  /**
   * Pré-aquece o cache com endereços comuns
   */
  preWarmCache() {
    const commonAddresses = [
      '::1',
      '::',
      'fe80::1',
      '2001:db8::1',
      'ff02::1',
      'fc00::1'
    ];
    
    commonAddresses.forEach(addr => {
      try {
        this.validateIPv6(addr);
        this.expandAddress(addr);
        this.compressAddress(addr);
      } catch (error) {
        // Ignorar erros no pré-aquecimento
      }
    });
  }

  /**
   * Configura limpeza automática do cache
   */
  setupCacheCleanup() {
    setInterval(() => {
      this.cleanExpiredCache();
    }, 60000); // Limpar a cada minuto
  }

  /**
   * Validação principal de IPv6 (compatibilidade com código legado)
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
    if (cached !== null) return cached;

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
   * Realiza a validação detalhada
   */
  performValidation(address) {
    let cleanAddress = address;
    let prefix = null;
    let zoneId = null;

    // Extrair CIDR se presente
    const cidrMatch = address.match(this.patterns.CIDR);
    if (cidrMatch) {
      cleanAddress = cidrMatch[1];
      prefix = parseInt(cidrMatch[2], 10);
      
      if (prefix < 0 || prefix > 128) {
        throw new Error(`Prefixo CIDR inválido: /${prefix}. Deve estar entre 0 e 128`);
      }
    }

    // Extrair Zone ID se presente
    const zoneMatch = cleanAddress.match(this.patterns.ZONE_ID);
    if (zoneMatch) {
      cleanAddress = zoneMatch[1];
      zoneId = zoneMatch[2];
    }

    // Remover colchetes se presentes
    cleanAddress = cleanAddress.replace(/^\[|\]$/g, '');

    // Validar formato básico
    if (!this.isValidFormat(cleanAddress)) {
      throw new Error('Formato de endereço IPv6 inválido');
    }

    return {
      valid: true,
      original: address,
      cleanAddress: cleanAddress,
      prefix: prefix,
      zoneId: zoneId,
      expanded: this.expandAddress(cleanAddress),
      compressed: this.compressAddress(cleanAddress),
      type: this.getAddressType(cleanAddress),
      scope: this.getAddressScope(cleanAddress)
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
   * Valida formato comprimido (com ::)
   */
  validateCompressedFormat(address) {
    const parts = address.split('::');
    if (parts.length !== 2) return false;

    const before = parts[0] ? parts[0].split(':').filter(g => g !== '') : [];
    const after = parts[1] ? parts[1].split(':').filter(g => g !== '') : [];

    // Verificar se não há muitos grupos
    if (before.length + after.length > 8) return false;

    // Verificar cada grupo
    const allGroups = [...before, ...after];
    return allGroups.every(group => this.patterns.HEX_GROUP.test(group));
  }

  /**
   * Valida formato completo (sem ::)
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
    const cacheKey = `expand_${address}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    const result = this.performExpansion(address);
    this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * Realiza a expansão do endereço
   */
  performExpansion(address) {
    let addr = address.replace(/^\[|\]$/g, '');
    
    if (!addr.includes('::')) {
      // Já está expandido ou formato completo
      const groups = addr.split(':');
      if (groups.length !== 8) {
        throw new Error('Endereço IPv6 incompleto');
      }
      return groups.map(group => group.padStart(4, '0')).join(':');
    }

    // Expandir formato comprimido
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
    const cacheKey = `compress_${address}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    const result = this.performCompression(address);
    this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * Realiza a compressão do endereço
   */
  performCompression(address) {
    try {
      const expanded = this.expandAddress(address);
      const groups = expanded.split(':');

      // Encontrar a maior sequência de zeros consecutivos
      let bestStart = -1;
      let bestLength = 0;
      let currentStart = -1;
      let currentLength = 0;

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

      // Verificar sequência final
      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
      }

      // Comprimir apenas se houver pelo menos 2 zeros consecutivos
      if (bestLength < 2) {
        return groups.map(g => g.replace(/^0+/, '') || '0').join(':');
      }

      // Aplicar compressão
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
      return address; // Retornar original se falhar
    }
  }

  /**
   * Determina o tipo do endereço
   */
  getAddressType(address) {
    try {
      const expanded = this.expandAddress(address);
      
      // Verificar tipos específicos
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
      
      if (expanded.startsWith('2001:0000:')) {
        return 'Teredo';
      }
      
      if (expanded.startsWith('2002:')) {
        return '6to4';
      }
      
      return 'Global Unicast';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Determina o escopo do endereço
   */
  getAddressScope(address) {
    const type = this.getAddressType(address);
    
    const scopeMap = {
      'Loopback': 'Host',
      'Unspecified': 'None',
      'Link-Local': 'Link',
      'Multicast': this.getMulticastScope(address),
      'Unique Local': 'Organization',
      'Documentation': 'Documentation',
      'Teredo': 'Global',
      '6to4': 'Global',
      'Global Unicast': 'Global'
    };
    
    return scopeMap[type] || 'Unknown';
  }

  /**
   * Determina o escopo de endereços multicast
   */
  getMulticastScope(address) {
    try {
      const expanded = this.expandAddress(address);
      const scopeField = expanded.charAt(3);
      
      const scopes = {
        '0': 'Reserved',
        '1': 'Interface-Local',
        '2': 'Link-Local',
        '3': 'Reserved',
        '4': 'Admin-Local',
        '5': 'Site-Local',
        '8': 'Organization-Local',
        'e': 'Global'
      };
      
      return scopes[scopeField] || 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Converte IPv6 para BigInt
   */
  ipv6ToBigInt(address) {
    const cacheKey = `toBigInt_${address}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    try {
      const expanded = this.expandAddress(address);
      const hexString = expanded.replace(/:/g, '');
      const result = BigInt('0x' + hexString);
      this.setToCache(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Falha ao converter ${address} para BigInt: ${error.message}`);
    }
  }

  /**
   * Converte BigInt para IPv6
   */
  bigIntToIPv6(bigIntValue) {
    if (typeof bigIntValue !== 'bigint') {
      throw new Error('Valor deve ser um BigInt');
    }

    const cacheKey = `fromBigInt_${bigIntValue.toString()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    try {
      const hexStr = bigIntValue.toString(16).padStart(32, '0');
      const groups = hexStr.match(/.{4}/g);
      const result = groups.join(':');
      this.setToCache(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Erro ao converter BigInt para IPv6: ${error.message}`);
    }
  }

  /**
   * Calcula máscara de rede
   */
  calculateNetworkMask(prefixLength) {
    if (prefixLength < 0 || prefixLength > 128) {
      throw new Error('Comprimento do prefixo deve estar entre 0 e 128');
    }
    
    if (prefixLength === 0) return 0n;
    return ((1n << BigInt(prefixLength)) - 1n) << (128n - BigInt(prefixLength));
  }

  /**
   * Obtém informações da rede
   */
  getNetworkInfo(cidr) {
    const cacheKey = `networkInfo_${cidr}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    try {
      const validation = this.validateIPv6(cidr);
      if (!validation.valid) {
        throw new Error('CIDR inválido');
      }

      const [address, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr, 10);
      
      const ipBigInt = this.ipv6ToBigInt(address);
      const mask = this.calculateNetworkMask(prefix);
      const network = ipBigInt & mask;
      const broadcast = network + (1n << (128n - BigInt(prefix))) - 1n;
      
      const hostBits = 128 - prefix;
      const totalAddresses = hostBits >= 64 ? 
        'Mais de 18 quintilhões' : 
        (1n << BigInt(hostBits)).toString();

      const result = {
        network: this.bigIntToIPv6(network),
        broadcast: this.bigIntToIPv6(broadcast),
        networkBigInt: network,
        broadcastBigInt: broadcast,
        prefix: prefix,
        mask: mask,
        hostBits: hostBits,
        totalAddresses: totalAddresses,
        compressed: {
          network: this.compressAddress(this.bigIntToIPv6(network)),
          broadcast: this.compressAddress(this.bigIntToIPv6(broadcast))
        }
      };

      this.setToCache(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Erro ao calcular informações da rede: ${error.message}`);
    }
  }

  /**
   * Verifica se endereço está dentro da rede
   */
  isInNetwork(address, networkAddress, prefixLength) {
    try {
      const addrBigInt = this.ipv6ToBigInt(address);
      const netBigInt = this.ipv6ToBigInt(networkAddress);
      const mask = this.calculateNetworkMask(prefixLength);
      
      return (addrBigInt & mask) === (netBigInt & mask);
    } catch (error) {
      return false;
    }
  }

  /**
   * Analisa endereço completo
   */
  analyzeAddress(address) {
    try {
      const validation = this.validateIPv6(address);
      if (!validation.valid) {
        throw new Error('Endereço inválido');
      }

      const expanded = validation.expanded;
      const binary = this.ipv6ToBigInt(expanded).toString(2).padStart(128, '0');
      
      // Informações RFC
      const rfcInfo = this.getRFCInfo(expanded);
      
      return {
        ...validation,
        binary: binary,
        hexGroups: expanded.split(':'),
        rfc: rfcInfo,
        properties: {
          isSpecial: this.isSpecialAddress(validation.type),
          isRoutable: this.isRoutableAddress(validation.type),
          isPrivate: this.isPrivateAddress(validation.type)
        },
        recommendations: this.generateRecommendations(validation)
      };
    } catch (error) {
      throw new Error(`Erro na análise: ${error.message}`);
    }
  }

  /**
   * Obtém informações RFC para o endereço
   */
  getRFCInfo(expandedAddress) {
    for (const [block, info] of this.rfcAllocations) {
      const [blockAddr, blockPrefix] = block.split('/');
      const blockPrefixNum = parseInt(blockPrefix, 10);
      
      if (this.isInNetwork(expandedAddress, blockAddr, blockPrefixNum)) {
        return {
          ...info,
          allocatedBlock: block,
          compliance: 'Compliant'
        };
      }
    }
    return null;
  }

  /**
   * Verifica se é endereço especial
   */
  isSpecialAddress(type) {
    const specialTypes = ['Loopback', 'Unspecified', 'Documentation', 'Teredo', '6to4'];
    return specialTypes.includes(type);
  }

  /**
   * Verifica se é endereço roteável
   */
  isRoutableAddress(type) {
    const nonRoutableTypes = ['Loopback', 'Unspecified', 'Link-Local', 'Documentation'];
    return !nonRoutableTypes.includes(type);
  }

  /**
   * Verifica se é endereço privado
   */
  isPrivateAddress(type) {
    const privateTypes = ['Link-Local', 'Unique Local'];
    return privateTypes.includes(type);
  }

  /**
   * Gera recomendações para o endereço
   */
  generateRecommendations(validation) {
    const recommendations = [];
    
    switch (validation.type) {
      case 'Documentation':
        recommendations.push({
          type: 'warning',
          message: 'Este é um prefixo de documentação - não deve ser usado em produção'
        });
        break;
        
      case 'Link-Local':
        recommendations.push({
          type: 'info',
          message: 'Endereço link-local válido apenas no segmento local'
        });
        break;
        
      case 'Global Unicast':
        recommendations.push({
          type: 'success',
          message: 'Endereço válido para uso na Internet'
        });
        break;
    }
    
    if (validation.prefix && validation.prefix > 64) {
      recommendations.push({
        type: 'warning',
        message: 'Prefixos maiores que /64 podem causar problemas com SLAAC'
      });
    }
    
    return recommendations;
  }

  // ===== MÉTODOS DE CACHE =====

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
    // Limpar cache se muito grande
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      this.cleanExpiredCache();
      
      // Se ainda muito grande, remover mais antigos
      if (this.cache.size >= this.CACHE_MAX_SIZE) {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toRemove = entries.slice(0, Math.floor(this.CACHE_MAX_SIZE * 0.3));
        toRemove.forEach(([k]) => this.cache.delete(k));
      }
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Limpa itens expirados do cache
   */
  cleanExpiredCache() {
    const now = Date.now();
    const toDelete = [];
    
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > this.CACHE_TTL) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Limpa todo o cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[IPv6Utils] Cache limpo');
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach(item => {
      if (now - item.timestamp < this.CACHE_TTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      ttl: this.CACHE_TTL,
      maxSize: this.CACHE_MAX_SIZE
    };
  }
}