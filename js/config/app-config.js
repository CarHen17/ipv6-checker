/**
 * App Configuration - Configurações centralizadas da aplicação
 */

export const AppConfig = {
  // Informações da aplicação
  app: {
    name: 'IPv6 Checker Professional',
    version: '3.0.0',
    author: 'IPv6 Checker Team',
    description: 'Verificador Profissional de Sobreposição IPv6'
  },

  // Configurações de cache
  cache: {
    ttl: 300000, // 5 minutos
    maxSize: 1000,
    cleanupInterval: 60000 // 1 minuto
  },

  // Configurações de UI
  ui: {
    theme: {
      default: 'light',
      storageKey: 'ipv6-checker-theme'
    },
    notifications: {
      defaultDuration: 3000,
      maxNotifications: 5,
      position: 'top-right'
    },
    tabs: {
      animationDuration: 300,
      lazyLoad: true
    },
    transitions: {
      fast: 150,
      normal: 200,
      slow: 300
    }
  },

  // Configurações de validação
  validation: {
    debounceDelay: 300,
    realTimeValidation: true,
    showWarnings: true
  },

  // Configurações de exportação
  export: {
    defaultFormat: 'json',
    supportedFormats: ['csv', 'json', 'xlsx', 'txt'],
    defaultFilename: 'ipv6_analysis',
    dateFormat: 'YYYY-MM-DD_HH-mm-ss'
  },

  // Configurações de overlap
  overlap: {
    autoSuggestions: true,
    showAdvancedDetails: false,
    cacheResults: true
  },

  // URLs e recursos externos
  resources: {
    fontAwesome: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    documentation: 'https://github.com/ipv6-checker/docs',
    support: 'https://github.com/ipv6-checker/issues'
  },

  // Configurações de desenvolvimento
  development: {
    debug: false,
    verbose: false,
    mockDelay: 0
  },

  // Mensagens padrão
  messages: {
    loading: 'Carregando...',
    error: 'Ocorreu um erro inesperado',
    success: 'Operação realizada com sucesso',
    validation: {
      required: 'Campo obrigatório',
      invalidIPv6: 'Formato de IPv6 inválido',
      invalidCIDR: 'Formato CIDR inválido'
    }
  },

  // Atalhos de teclado
  keyboard: {
    shortcuts: {
      calculate: 'Ctrl+Enter',
      toggleTheme: 'Ctrl+D',
      help: 'F1',
      escape: 'Escape',
      selectAll: 'Ctrl+A'
    }
  },

  // Limites e constraints
  limits: {
    maxSubnets: 1000,
    maxPrefixAnalysis: 100,
    maxNotifications: 5,
    maxCacheSize: 1000
  },

  // Formatos de endereços IPv6 comuns para exemplos
  examples: {
    wan: '2001:db8:a::1/64',
    lan: '2001:db8:b::/48',
    documentation: '2001:db8::/32',
    linkLocal: 'fe80::1/64',
    uniqueLocal: 'fc00::1/7',
    multicast: 'ff02::1/128'
  },

  // Configurações de acessibilidade
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    screenReader: false
  }
};

/**
 * Obtém configuração aninhada usando notação de ponto
 * @param {string} path - Caminho da configuração (ex: 'ui.theme.default')
 * @param {any} defaultValue - Valor padrão se não encontrado
 * @returns {any} Valor da configuração
 */
export function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let current = AppConfig;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current;
}

/**
 * Define configuração aninhada usando notação de ponto
 * @param {string} path - Caminho da configuração
 * @param {any} value - Novo valor
 */
export function setConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = AppConfig;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

/**
 * Carrega configurações do localStorage
 */
export function loadUserConfig() {
  try {
    const saved = localStorage.getItem('ipv6-checker-config');
    if (saved) {
      const userConfig = JSON.parse(saved);
      
      // Aplicar configurações do usuário
      if (userConfig.theme) {
        setConfig('ui.theme.default', userConfig.theme);
      }
      
      if (userConfig.debug !== undefined) {
        setConfig('development.debug', userConfig.debug);
      }
      
      if (userConfig.autoSave !== undefined) {
        setConfig('validation.realTimeValidation', userConfig.autoSave);
      }
    }
  } catch (error) {
    console.warn('[AppConfig] Erro ao carregar configurações do usuário:', error);
  }
}

/**
 * Salva configurações no localStorage
 */
export function saveUserConfig() {
  try {
    const userConfig = {
      theme: getConfig('ui.theme.default'),
      debug: getConfig('development.debug'),
      autoSave: getConfig('validation.realTimeValidation'),
      timestamp: Date.now()
    };
    
    localStorage.setItem('ipv6-checker-config', JSON.stringify(userConfig));
  } catch (error) {
    console.warn('[AppConfig] Erro ao salvar configurações do usuário:', error);
  }
}

/**
 * Detecta preferências do sistema
 */
export function detectSystemPreferences() {
  // Detectar tema escuro
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setConfig('ui.theme.default', 'dark');
  }
  
  // Detectar preferência por movimento reduzido
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setConfig('accessibility.reducedMotion', true);
    setConfig('ui.transitions.fast', 0);
    setConfig('ui.transitions.normal', 0);
    setConfig('ui.transitions.slow', 0);
  }
  
  // Detectar alto contraste
  if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
    setConfig('accessibility.highContrast', true);
  }
}

// Inicializar configurações
export function initConfig() {
  detectSystemPreferences();
  loadUserConfig();
}