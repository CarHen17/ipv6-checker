/**
 * Overlap Engine - Sistema Avançado de Verificação de Sobreposição IPv6
 * Otimizado para performance e precisão
 */

export class OverlapEngine {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 300000; // 5 minutos
    this.CACHE_MAX_SIZE = 500;
    
    // Tipos de sobreposição
    this.OVERLAP_TYPES = {
      IDENTICAL: 'identical',
      FIRST_CONTAINS_SECOND: 'first_contains_second',
      SECOND_CONTAINS_FIRST: 'second_contains_first',
      PARTIAL: 'partial',
      ADJACENT: 'adjacent',
      NO_OVERLAP: 'no_overlap'
    };
    
    // Níveis de severidade
    this.SEVERITY_LEVELS = {
      CRITICAL: { level: 4, label: 'Crítico', color: 'error', priority: 'high' },
      HIGH: { level: 3, label: 'Alto', color: 'warning', priority: 'high' },
      MEDIUM: { level: 2, label: 'Médio', color: 'warning', priority: 'medium' },
      LOW: { level: 1, label: 'Baixo', color: 'info', priority: 'low' },
      NONE: { level: 0, label: 'Sem Conflito', color: 'success', priority: 'none' }
    };
  }

  /**
   * Inicializa o módulo
   */
  async init() {
    console.log('[OverlapEngine] Inicializando...');
    
    // Configurar limpeza do cache
    this.setupCacheCleanup();
    
    console.log('[OverlapEngine] ✅ Inicializado');
    return true;
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
   * Verifica sobreposição entre dois CIDRs (interface simples)
   */
  checkOverlap(cidr1, cidr2) {
    try {
      const result = this.checkOverlapAdvanced(cidr1, cidr2);
      return {
        hasOverlap: result.hasOverlap,
        reason: result.reason || (result.hasOverlap ? 'Os blocos se sobrepõem' : 'Os blocos não se sobrepõem'),
        type: result.overlapType,
        severity: result.severity
      };
    } catch (error) {
      return {
        hasOverlap: null,
        reason: error.message,
        error: true
      };
    }
  }

  /**
   * Verificação avançada de sobreposição
   */
  checkOverlapAdvanced(cidr1, cidr2, options = {}) {
    const startTime = performance.now();
    
    try {
      // Validar entradas
      if (!cidr1 || !cidr2) {
        throw new Error('Ambos os CIDRs devem ser fornecidos');
      }

      // Verificar cache
      const cacheKey = `${cidr1}|${cidr2}|${JSON.stringify(options)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        cached.details.performance.cached = true;
        return cached;
      }

      // Importar IPv6Utils dinamicamente se necessário
      if (!this.ipv6Utils) {
        throw new Error('IPv6Utils não disponível - inicialize primeiro');
      }

      // Validar e obter informações dos CIDRs
      const network1 = this.validateAndGetNetworkInfo(cidr1);
      const network2 = this.validateAndGetNetworkInfo(cidr2);

      // Realizar análise de sobreposição
      const overlapAnalysis = this.analyzeOverlap(network1, network2);
      
      // Criar resultado completo
      const result = {
        hasOverlap: overlapAnalysis.hasOverlap,
        overlapType: overlapAnalysis.type,
        severity: overlapAnalysis.severity,
        reason: overlapAnalysis.reason,
        confidence: overlapAnalysis.confidence || 100,
        details: {
          cidr1: cidr1,
          cidr2: cidr2,
          network1: this.sanitizeNetworkInfo(network1),
          network2: this.sanitizeNetworkInfo(network2),
          analysis: overlapAnalysis,
          recommendations: this.generateRecommendations(overlapAnalysis, network1, network2),
          performance: {
            executionTime: performance.now() - startTime,
            cached: false,
            timestamp: Date.now()
          }
        }
      };

      // Armazenar no cache
      this.setToCache(cacheKey, result);
      
      return result;

    } catch (error) {
      return this.createErrorResult(error.message, startTime);
    }
  }

  /**
   * Valida CIDR e obtém informações da rede
   */
  validateAndGetNetworkInfo(cidr) {
    try {
      // Verificar formato CIDR
      if (!cidr.includes('/')) {
        throw new Error(`CIDR inválido: ${cidr} - deve incluir prefixo (ex: /64)`);
      }

      // Usar IPv6Utils para validação e informações
      const validation = this.ipv6Utils.validateIPv6(cidr);
      if (!validation.valid) {
        throw new Error(`CIDR inválido: ${cidr}`);
      }

      const networkInfo = this.ipv6Utils.getNetworkInfo(cidr);
      
      return {
        ...networkInfo,
        original: cidr,
        validation: validation
      };
    } catch (error) {
      throw new Error(`Erro ao processar ${cidr}: ${error.message}`);
    }
  }

  /**
   * Remove informações sensíveis das informações de rede
   */
  sanitizeNetworkInfo(networkInfo) {
    const { networkBigInt, broadcastBigInt, mask, ...safe } = networkInfo;
    return {
      ...safe,
      // Manter apenas strings para o resultado
      networkBigIntStr: networkBigInt?.toString(),
      broadcastBigIntStr: broadcastBigInt?.toString(),
      maskStr: mask?.toString()
    };
  }

  /**
   * Analisa sobreposição entre duas redes
   */
  analyzeOverlap(network1, network2) {
    const start1 = network1.networkBigInt;
    const end1 = network1.broadcastBigInt;
    const start2 = network2.networkBigInt;
    const end2 = network2.broadcastBigInt;

    // Verificar se há sobreposição
    const hasOverlap = (start1 <= start2 && end1 >= start2) || 
                       (start2 <= start1 && end2 >= start1);

    if (!hasOverlap) {
      return this.analyzeNoOverlap(network1, network2, start1, end1, start2, end2);
    }

    return this.analyzeOverlapDetails(network1, network2, start1, end1, start2, end2);
  }

  /**
   * Analisa caso sem sobreposição
   */
  analyzeNoOverlap(network1, network2, start1, end1, start2, end2) {
    // Verificar se são adjacentes
    const isAdjacent = (end1 + 1n === start2) || (end2 + 1n === start1);
    
    const distance = this.calculateDistance(start1, end1, start2, end2);
    
    return {
      hasOverlap: false,
      type: isAdjacent ? this.OVERLAP_TYPES.ADJACENT : this.OVERLAP_TYPES.NO_OVERLAP,
      severity: this.SEVERITY_LEVELS.NONE,
      reason: isAdjacent ? 
        'Os blocos são adjacentes mas não se sobrepõem' : 
        'Os blocos não se sobrepõem',
      confidence: 100,
      details: {
        distance: distance.toString(),
        isAdjacent: isAdjacent,
        gap: isAdjacent ? '0' : distance.toString()
      }
    };
  }

  /**
   * Analisa detalhes da sobreposição
   */
  analyzeOverlapDetails(network1, network2, start1, end1, start2, end2) {
    let overlapType, severity, reason;
    
    // Determinar tipo de sobreposição
    if (start1 === start2 && end1 === end2) {
      overlapType = this.OVERLAP_TYPES.IDENTICAL;
      severity = this.SEVERITY_LEVELS.CRITICAL;
      reason = 'Os blocos são idênticos';
    } else if (start1 <= start2 && end1 >= end2) {
      overlapType = this.OVERLAP_TYPES.FIRST_CONTAINS_SECOND;
      severity = this.SEVERITY_LEVELS.HIGH;
      reason = `O primeiro bloco (${network1.original}) contém completamente o segundo (${network2.original})`;
    } else if (start2 <= start1 && end2 >= end1) {
      overlapType = this.OVERLAP_TYPES.SECOND_CONTAINS_FIRST;
      severity = this.SEVERITY_LEVELS.HIGH;
      reason = `O segundo bloco (${network2.original}) contém completamente o primeiro (${network1.original})`;
    } else {
      overlapType = this.OVERLAP_TYPES.PARTIAL;
      severity = this.SEVERITY_LEVELS.MEDIUM;
      reason = 'Os blocos se sobrepõem parcialmente';
    }

    // Calcular detalhes da sobreposição
    const overlapStart = start1 > start2 ? start1 : start2;
    const overlapEnd = end1 < end2 ? end1 : end2;
    const overlapSize = overlapEnd - overlapStart + 1n;
    
    const percentageOverlap = this.calculateOverlapPercentage(
      network1, network2, overlapSize
    );

    return {
      hasOverlap: true,
      type: overlapType,
      severity: severity,
      reason: reason,
      confidence: 100,
      details: {
        overlapStart: this.ipv6Utils.bigIntToIPv6(overlapStart),
        overlapEnd: this.ipv6Utils.bigIntToIPv6(overlapEnd),
        overlapSize: overlapSize.toString(),
        percentageOverlap: percentageOverlap,
        affectedAddresses: this.calculateAffectedAddresses(overlapSize)
      }
    };
  }

  /**
   * Calcula distância entre redes
   */
  calculateDistance(start1, end1, start2, end2) {
    if (end1 < start2) {
      return start2 - end1 - 1n;
    } else if (end2 < start1) {
      return start1 - end2 - 1n;
    } else {
      return 0n;
    }
  }

  /**
   * Calcula porcentagem de sobreposição
   */
  calculateOverlapPercentage(network1, network2, overlapSize) {
    try {
      const size1 = network1.broadcastBigInt - network1.networkBigInt + 1n;
      const size2 = network2.broadcastBigInt - network2.networkBigInt + 1n;
      
      const smallerSize = size1 < size2 ? size1 : size2;
      const percentage = Number((overlapSize * 100n) / smallerSize);
      
      return Math.round(percentage * 100) / 100;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calcula número de endereços afetados
   */
  calculateAffectedAddresses(overlapSize) {
    if (overlapSize > BigInt(Number.MAX_SAFE_INTEGER)) {
      return 'Mais de ' + Number.MAX_SAFE_INTEGER.toLocaleString();
    }
    return Number(overlapSize).toLocaleString();
  }

  /**
   * Gera recomendações baseadas na análise
   */
  generateRecommendations(analysis, network1, network2) {
    const recommendations = [];

    if (!analysis.hasOverlap) {
      recommendations.push({
        type: 'success',
        priority: 'low',
        title: 'Configuração Válida',
        description: 'Os prefixos não apresentam conflitos e podem ser utilizados simultaneamente.',
        action: null,
        impact: 'none'
      });

      if (analysis.type === this.OVERLAP_TYPES.ADJACENT) {
        recommendations.push({
          type: 'info',
          priority: 'low',
          title: 'Blocos Adjacentes',
          description: 'Os blocos são adjacentes. Verifique se esta proximidade é intencional.',
          action: 'Confirmar se a adjacência é desejada no plano de endereçamento',
          impact: 'low'
        });
      }

      return recommendations;
    }

    // Recomendações para casos de sobreposição
    switch (analysis.severity.level) {
      case 4: // CRITICAL
        recommendations.push({
          type: 'error',
          priority: 'critical',
          title: 'Conflito Crítico Detectado',
          description: 'Os blocos são idênticos, causando conflito total de roteamento.',
          action: 'Alterar imediatamente um dos prefixos para evitar problemas de conectividade',
          impact: 'critical',
          urgency: 'immediate'
        });
        break;

      case 3: // HIGH
        recommendations.push({
          type: 'warning',
          priority: 'high',
          title: 'Sobreposição Completa',
          description: 'Um bloco está completamente contido no outro.',
          action: 'Redefinir o bloco menor ou usar sub-redes não conflitantes do bloco maior',
          impact: 'high',
          urgency: 'soon'
        });
        break;

      case 2: // MEDIUM
        recommendations.push({
          type: 'warning',
          priority: 'medium',
          title: 'Sobreposição Parcial',
          description: `Os blocos se sobrepõem em ${analysis.details.percentageOverlap}% dos endereços.`,
          action: 'Ajustar os prefixos para eliminar a área de sobreposição',
          impact: 'medium',
          urgency: 'planned'
        });
        break;
    }

    // Recomendações adicionais baseadas no contexto
    this.addContextualRecommendations(recommendations, analysis, network1, network2);

    return recommendations;
  }

  /**
   * Adiciona recomendações contextuais
   */
  addContextualRecommendations(recommendations, analysis, network1, network2) {
    // Verificar se são redes de tipos diferentes
    const type1 = network1.validation?.type;
    const type2 = network2.validation?.type;

    if (type1 && type2 && type1 !== type2) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: 'Tipos de Rede Diferentes',
        description: `Conflito entre ${type1} e ${type2}`,
        action: 'Verificar se a mistura de tipos é intencional',
        impact: 'medium'
      });
    }

    // Verificar prefixos incomuns
    if (network1.prefix > 80 || network2.prefix > 80) {
      recommendations.push({
        type: 'warning',
        priority: 'low',
        title: 'Prefixos Grandes Detectados',
        description: 'Prefixos maiores que /80 podem causar problemas de roteamento',
        action: 'Considerar usar prefixos menores se possível',
        impact: 'low'
      });
    }

    // Sugestão de resolução automática
    if (analysis.hasOverlap) {
      const suggestion = this.generateSuggestion(network2.original, network1.original);
      if (suggestion) {
        recommendations.push({
          type: 'success',
          priority: 'medium',
          title: 'Sugestão Automática Disponível',
          description: `Prefixo sugerido: ${suggestion}`,
          action: 'Aplicar sugestão automática',
          impact: 'positive',
          suggestion: suggestion
        });
      }
    }
  }

  /**
   * Gera sugestão de prefixo não conflitante
   */
  generateSuggestion(lanPrefix, wanPrefix) {
    try {
      // Extrair informações dos prefixos
      const [wanAddr, wanPrefixLen] = wanPrefix.split('/');
      const wanNetwork = this.ipv6Utils.getNetworkInfo(wanPrefix);
      
      const prefixLength = parseInt(wanPrefixLen);
      const increment = 1n << (128n - BigInt(prefixLength));
      
      // Tentar próximo bloco
      let suggestedBigInt = wanNetwork.networkBigInt + increment;
      
      // Verificar se está dentro do espaço de endereçamento válido
      const maxIPv6 = (1n << 128n) - 1n;
      if (suggestedBigInt > maxIPv6) {
        // Tentar bloco anterior
        suggestedBigInt = wanNetwork.networkBigInt - increment;
        if (suggestedBigInt < 0n) {
          return null;
        }
      }
      
      const suggestedAddr = this.ipv6Utils.bigIntToIPv6(suggestedBigInt);
      const compressedAddr = this.ipv6Utils.compressAddress(suggestedAddr);
      const suggestion = `${compressedAddr}/${prefixLength}`;
      
      // Verificar se a sugestão não conflita
      const testResult = this.checkOverlap(suggestion, wanPrefix);
      if (!testResult.hasOverlap) {
        return suggestion;
      }
      
      return null;
    } catch (error) {
      console.warn('[OverlapEngine] Erro ao gerar sugestão:', error);
      return null;
    }
  }

  /**
   * Análise em lote de múltiplos prefixos
   */
  analyzeBatch(prefixes, options = {}) {
    const results = [];
    const conflicts = [];
    const startTime = performance.now();
    
    try {
      // Validar todos os prefixos primeiro
      const validPrefixes = [];
      for (let i = 0; i < prefixes.length; i++) {
        try {
          const validation = this.ipv6Utils.validateIPv6(prefixes[i]);
          if (validation.valid) {
            validPrefixes.push({ index: i, prefix: prefixes[i], validation });
          } else {
            results.push({
              index: i,
              prefix: prefixes[i],
              valid: false,
              error: 'Prefixo inválido'
            });
          }
        } catch (error) {
          results.push({
            index: i,
            prefix: prefixes[i],
            valid: false,
            error: error.message
          });
        }
      }

      // Verificar sobreposições entre todos os pares
      for (let i = 0; i < validPrefixes.length; i++) {
        for (let j = i + 1; j < validPrefixes.length; j++) {
          const prefix1 = validPrefixes[i];
          const prefix2 = validPrefixes[j];
          
          try {
            const overlapResult = this.checkOverlapAdvanced(
              prefix1.prefix, 
              prefix2.prefix, 
              options
            );
            
            if (overlapResult.hasOverlap) {
              conflicts.push({
                indices: [prefix1.index, prefix2.index],
                prefixes: [prefix1.prefix, prefix2.prefix],
                overlapType: overlapResult.overlapType,
                severity: overlapResult.severity,
                reason: overlapResult.reason,
                recommendations: overlapResult.details.recommendations
              });
            }
          } catch (error) {
            conflicts.push({
              indices: [prefix1.index, prefix2.index],
              prefixes: [prefix1.prefix, prefix2.prefix],
              error: error.message
            });
          }
        }
      }

      // Adicionar prefixos válidos aos resultados
      validPrefixes.forEach(vp => {
        results.push({
          index: vp.index,
          prefix: vp.prefix,
          valid: true,
          type: vp.validation.type,
          scope: vp.validation.scope
        });
      });

      // Gerar estatísticas
      const stats = this.generateBatchStatistics(results, conflicts);
      
      return {
        results: results.sort((a, b) => a.index - b.index),
        conflicts: conflicts,
        statistics: stats,
        summary: this.generateBatchSummary(results, conflicts),
        executionTime: performance.now() - startTime
      };

    } catch (error) {
      throw new Error(`Erro na análise em lote: ${error.message}`);
    }
  }

  /**
   * Gera estatísticas da análise em lote
   */
  generateBatchStatistics(results, conflicts) {
    const total = results.length;
    const valid = results.filter(r => r.valid).length;
    const invalid = total - valid;
    const conflictCount = conflicts.length;
    
    // Análise de severidade
    const severityBreakdown = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    conflicts.forEach(conflict => {
      if (conflict.severity) {
        const level = conflict.severity.label.toLowerCase();
        if (severityBreakdown.hasOwnProperty(level)) {
          severityBreakdown[level]++;
        }
      }
    });

    // Calcular score de saúde
    let healthScore = 100;
    if (total > 0) {
      healthScore = Math.max(0, 100 - (invalid * 10) - (conflictCount * 15));
    }

    return {
      total,
      valid,
      invalid,
      conflictCount,
      severityBreakdown,
      healthScore: Math.round(healthScore),
      validationRate: total > 0 ? Math.round((valid / total) * 100) : 0,
      conflictRate: valid > 0 ? Math.round((conflictCount / valid) * 100) : 0
    };
  }

  /**
   * Gera resumo da análise em lote
   */
  generateBatchSummary(results, conflicts) {
    const stats = this.generateBatchStatistics(results, conflicts);
    
    let status = 'excellent';
    let message = 'Todos os prefixos estão válidos e sem conflitos';
    
    if (stats.conflictCount > 0) {
      if (stats.healthScore < 50) {
        status = 'critical';
        message = 'Múltiplos conflitos críticos detectados';
      } else if (stats.healthScore < 75) {
        status = 'warning';
        message = 'Alguns conflitos detectados que requerem atenção';
      } else {
        status = 'info';
        message = 'Conflitos menores detectados';
      }
    } else if (stats.invalid > 0) {
      status = 'warning';
      message = 'Alguns prefixos são inválidos';
    }

    return {
      status,
      message,
      healthScore: stats.healthScore,
      recommendations: this.generateBatchRecommendations(stats, conflicts)
    };
  }

  /**
   * Gera recomendações para análise em lote
   */
  generateBatchRecommendations(stats, conflicts) {
    const recommendations = [];

    if (stats.conflictCount === 0 && stats.invalid === 0) {
      recommendations.push({
        type: 'success',
        title: 'Configuração Excelente',
        description: 'Todos os prefixos estão válidos e sem conflitos'
      });
    }

    if (stats.invalid > 0) {
      recommendations.push({
        type: 'error',
        title: `${stats.invalid} Prefixo(s) Inválido(s)`,
        description: 'Corrija os prefixos inválidos antes de prosseguir'
      });
    }

    if (stats.severityBreakdown.critical > 0) {
      recommendations.push({
        type: 'error',
        title: `${stats.severityBreakdown.critical} Conflito(s) Crítico(s)`,
        description: 'Resolva imediatamente os conflitos críticos'
      });
    }

    if (stats.conflictRate > 25) {
      recommendations.push({
        type: 'warning',
        title: 'Alta Taxa de Conflitos',
        description: 'Considere revisar seu esquema de endereçamento'
      });
    }

    return recommendations;
  }

  /**
   * Cria resultado de erro
   */
  createErrorResult(message, startTime) {
    return {
      hasOverlap: null,
      error: message,
      details: {
        performance: {
          executionTime: performance.now() - startTime,
          cached: false,
          timestamp: Date.now()
        }
      }
    };
  }

  /**
   * Define referência para IPv6Utils
   */
  setIPv6Utils(ipv6Utils) {
    this.ipv6Utils = ipv6Utils;
  }

  // ===== MÉTODOS DE CACHE =====

  getFromCache(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.value;
    }
    this.cache.delete(key);
    return null;
  }

  setToCache(key, value) {
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      this.cleanExpiredCache();
      if (this.cache.size >= this.CACHE_MAX_SIZE) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

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

  clearCache() {
    this.cache.clear();
    console.log('[OverlapEngine] Cache limpo');
  }

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