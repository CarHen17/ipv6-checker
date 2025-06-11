/**
 * IPv6 Checker Professional - Aplicação Principal
 * Arquitetura modular otimizada com ES6 Modules
 */

// Importações dos módulos core
import { IPv6Utils } from './core/ipv6-utils.js';
import { OverlapEngine } from './core/overlap-engine.js';
import { ValidationEngine } from './core/validation.js';

// Importações dos módulos de UI
import { UIManager } from './modules/ui-manager.js';
import { TabsManager } from './modules/tabs-manager.js';
import { NotificationSystem } from './modules/notifications.js';
import { ExportManager } from './modules/export-manager.js';

// Importações das features
import { OverlapChecker } from './features/overlap-checker.js';

/**
 * Classe principal da aplicação
 */
class IPv6CheckerApp {
  constructor() {
    this.version = '3.0.0';
    this.modules = new Map();
    this.features = new Map();
    this.initialized = false;
    this.config = {
      theme: 'light',
      autoSave: true,
      debug: false,
      language: 'pt-BR'
    };
  }

  /**
   * Inicializa a aplicação
   */
  async init() {
    try {
      console.log(`🚀 Inicializando IPv6 Checker Pro v${this.version}`);
      
      // Mostrar loading
      this.showInitialLoading(true);
      
      // Aguardar DOM estar pronto
      await this.waitForDOM();
      
      // Inicializar módulos core
      await this.initCoreModules();
      
      // Inicializar módulos de UI
      await this.initUIModules();
      
      // Inicializar features
      await this.initFeatures();
      
      // Configurar aplicação
      await this.setupApplication();
      
      // Marcar como inicializado
      this.initialized = true;
      
      // Ocultar loading
      this.showInitialLoading(false);
      
      // Notificar sucesso
      this.notify('IPv6 Checker Pro carregado com sucesso! 🚀', 'success', 3000);
      
      console.log('✅ Aplicação inicializada com sucesso');
      
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      this.handleInitError(error);
    }
  }

  /**
   * Aguarda o DOM estar pronto
   */
  async waitForDOM() {
    if (document.readyState === 'loading') {
      return new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
  }

  /**
   * Inicializa módulos core
   */
  async initCoreModules() {
    console.log('📦 Inicializando módulos core...');
    
    try {
      // Inicializar IPv6Utils
      const ipv6Utils = new IPv6Utils();
      await ipv6Utils.init();
      this.modules.set('ipv6Utils', ipv6Utils);
      
      // Inicializar ValidationEngine
      const validationEngine = new ValidationEngine();
      await validationEngine.init();
      this.modules.set('validationEngine', validationEngine);
      
      // Inicializar OverlapEngine
      const overlapEngine = new OverlapEngine();
      await overlapEngine.init();
      // Configurar dependência
      overlapEngine.setIPv6Utils(ipv6Utils);
      this.modules.set('overlapEngine', overlapEngine);
      
      console.log('✅ Módulos core inicializados');
      
    } catch (error) {
      throw new Error(`Falha ao inicializar módulos core: ${error.message}`);
    }
  }

  /**
   * Inicializa módulos de UI
   */
  async initUIModules() {
    console.log('🎨 Inicializando módulos de UI...');
    
    try {
      // Inicializar NotificationSystem
      const notifications = new NotificationSystem();
      await notifications.init();
      this.modules.set('notifications', notifications);
      
      // Inicializar UIManager
      const uiManager = new UIManager();
      await uiManager.init();
      this.modules.set('uiManager', uiManager);
      
      // Inicializar TabsManager
      const tabsManager = new TabsManager();
      await tabsManager.init();
      this.modules.set('tabsManager', tabsManager);
      
      // Inicializar ExportManager
      const exportManager = new ExportManager();
      await exportManager.init();
      this.modules.set('exportManager', exportManager);
      
      console.log('✅ Módulos de UI inicializados');
      
    } catch (error) {
      throw new Error(`Falha ao inicializar módulos de UI: ${error.message}`);
    }
  }

  /**
   * Inicializa features da aplicação
   */
  async initFeatures() {
    console.log('🔧 Inicializando features...');
    
    try {
      // Inicializar OverlapChecker
      const overlapChecker = new OverlapChecker({
        ipv6Utils: this.modules.get('ipv6Utils'),
        overlapEngine: this.modules.get('overlapEngine'),
        validationEngine: this.modules.get('validationEngine'),
        notifications: this.modules.get('notifications'),
        uiManager: this.modules.get('uiManager')
      });
      await overlapChecker.init();
      this.features.set('overlapChecker', overlapChecker);
      
      console.log('✅ Features inicializadas');
      
    } catch (error) {
      throw new Error(`Falha ao inicializar features: ${error.message}`);
    }
  }

  /**
   * Configura a aplicação
   */
  async setupApplication() {
    console.log('⚙️ Configurando aplicação...');
    
    try {
      // Carregar configurações salvas
      this.loadConfig();
      
      // Aplicar tema
      this.applyTheme(this.config.theme);
      
      // Configurar atalhos de teclado globais
      this.setupGlobalKeyboardShortcuts();
      
      // Configurar handlers globais
      this.setupGlobalHandlers();
      
      // Configurar PWA (se suportado)
      this.setupPWA();
      
      // Configurar integração entre módulos
      this.setupModuleIntegration();
      
      console.log('✅ Aplicação configurada');
      
    } catch (error) {
      console.warn('⚠️ Erro na configuração:', error);
    }
  }

  /**
   * Configura integração entre módulos
   */
  setupModuleIntegration() {
    const tabsManager = this.modules.get('tabsManager');
    const uiManager = this.modules.get('uiManager');
    
    // Sincronizar mudanças de aba entre TabsManager e UIManager
    if (tabsManager && uiManager) {
      tabsManager.addObserver(({ newTab }) => {
        uiManager.setActiveTab(newTab);
      });
    }
  }

  /**
   * Carrega configurações salvas
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem('ipv6-checker-config');
      if (saved) {
        const config = JSON.parse(saved);
        this.config = { ...this.config, ...config };
      }
      
      // Detectar preferência de tema do sistema
      if (!saved || !this.config.theme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.config.theme = prefersDark ? 'dark' : 'light';
      }
      
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
  }

  /**
   * Salva configurações
   */
  saveConfig() {
    try {
      localStorage.setItem('ipv6-checker-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Erro ao salvar configurações:', error);
    }
  }

  /**
   * Aplica tema
   */
  applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    this.config.theme = theme;
    
    // Atualizar botão de tema
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      const icon = themeBtn.querySelector('i');
      if (icon) {
        icon.className = `fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
      }
    }
    
    // Salvar configuração
    this.saveConfig();
  }

  /**
   * Alterna tema
   */
  toggleTheme() {
    const newTheme = this.config.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    this.notify(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} aplicado`, 'info', 2000);
  }

  /**
   * Configura atalhos de teclado globais
   */
  setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + D - Alternar tema
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        this.toggleTheme();
      }
      
      // F1 - Abrir ajuda
      if (e.key === 'F1') {
        e.preventDefault();
        this.showHelp();
      }
      
      // Escape - Fechar modais/overlays
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
      
      // Ctrl/Cmd + Enter - Ação principal da aba atual
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.triggerMainAction();
      }
    });
  }

  /**
   * Configura handlers globais
   */
  setupGlobalHandlers() {
    // Handler de tema
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }
    
    // Handler de ajuda
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.showHelp());
    }
    
    // Handler de configurações
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettings());
    }
    
    // Handler de erro global
    window.addEventListener('error', (e) => {
      console.error('Erro global capturado:', e.error);
      this.handleGlobalError(e.error);
    });
    
    // Handler de promessas rejeitadas
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Promise rejeitada:', e.reason);
      this.handleGlobalError(e.reason);
    });
  }

  /**
   * Configura PWA
   */
  setupPWA() {
    // Service Worker (se disponível)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('Service Worker não disponível:', err);
      });
    }
    
    // Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });
  }

  /**
   * Mostra loading inicial
   */
  showInitialLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Mostra notificação
   */
  notify(message, type = 'info', duration = 3000) {
    const notifications = this.modules.get('notifications');
    if (notifications) {
      notifications.show(message, type, duration);
    } else {
      // Fallback
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Mostra ajuda
   */
  showHelp() {
    const helpContent = `
      <div class="help-modal">
        <h2><i class="fas fa-question-circle"></i> Ajuda - IPv6 Checker Pro</h2>
        
        <div class="help-section">
          <h3>🚀 Como Usar</h3>
          <ol>
            <li>Insira os prefixos IPv6 nos campos WAN e LAN</li>
            <li>Clique em "Verificar Sobreposição" ou pressione Ctrl+Enter</li>
            <li>Veja os resultados e sugestões automáticas</li>
          </ol>
        </div>
        
        <div class="help-section">
          <h3>⌨️ Atalhos de Teclado</h3>
          <ul>
            <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd> - Verificar sobreposição</li>
            <li><kbd>Ctrl</kbd> + <kbd>D</kbd> - Alternar tema</li>
            <li><kbd>F1</kbd> - Abrir esta ajuda</li>
            <li><kbd>Escape</kbd> - Fechar modais</li>
            <li><kbd>Alt</kbd> + <kbd>1-5</kbd> - Mudar entre abas</li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3>🔧 Funcionalidades</h3>
          <ul>
            <li><strong>Verificação:</strong> Detecta sobreposição entre prefixos</li>
            <li><strong>Múltipla:</strong> Analisa vários prefixos simultaneamente</li>
            <li><strong>Planejamento:</strong> Gera planos de sub-redes</li>
            <li><strong>Calculadora:</strong> Ferramentas de cálculo IPv6</li>
            <li><strong>Validação:</strong> Verificação avançada RFC</li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3>📋 Exemplos de Prefixos Válidos</h3>
          <ul>
            <li><code>2001:db8::/32</code> - Prefixo de documentação</li>
            <li><code>fe80::/10</code> - Link-local</li>
            <li><code>fc00::/7</code> - Unique Local</li>
            <li><code>2001:db8:a::1/64</code> - Host específico</li>
          </ul>
        </div>
      </div>
    `;
    
    this.showModal('Ajuda', helpContent);
  }

  /**
   * Mostra configurações
   */
  showSettings() {
    const settingsContent = `
      <div class="settings-modal">
        <h2><i class="fas fa-cog"></i> Configurações</h2>
        
        <div class="setting-group">
          <label for="themeSelect">Tema:</label>
          <select id="themeSelect" class="input-field">
            <option value="light" ${this.config.theme === 'light' ? 'selected' : ''}>Claro</option>
            <option value="dark" ${this.config.theme === 'dark' ? 'selected' : ''}>Escuro</option>
            <option value="auto">Automático</option>
          </select>
        </div>
        
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" id="autoSaveCheck" ${this.config.autoSave ? 'checked' : ''}>
            <span>Salvar automaticamente</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" id="debugModeCheck" ${this.config.debug ? 'checked' : ''}>
            <span>Modo debug</span>
          </label>
        </div>
        
        <div class="settings-actions">
          <button class="btn-primary" onclick="app.saveSettings()">Salvar</button>
          <button class="btn-secondary" onclick="app.resetSettings()">Restaurar Padrões</button>
        </div>
      </div>
    `;
    
    this.showModal('Configurações', settingsContent);
  }

  /**
   * Salva configurações do modal
   */
  saveSettings() {
    const themeSelect = document.getElementById('themeSelect');
    const autoSaveCheck = document.getElementById('autoSaveCheck');
    const debugModeCheck = document.getElementById('debugModeCheck');
    
    if (themeSelect) {
      const theme = themeSelect.value;
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.applyTheme(prefersDark ? 'dark' : 'light');
      } else {
        this.applyTheme(theme);
      }
    }
    
    if (autoSaveCheck) {
      this.config.autoSave = autoSaveCheck.checked;
    }
    
    if (debugModeCheck) {
      this.config.debug = debugModeCheck.checked;
    }
    
    this.saveConfig();
    this.closeAllModals();
    this.notify('Configurações salvas com sucesso!', 'success');
  }

  /**
   * Restaura configurações padrão
   */
  resetSettings() {
    this.config = {
      theme: 'light',
      autoSave: true,
      debug: false,
      language: 'pt-BR'
    };
    
    this.saveConfig();
    this.applyTheme('light');
    this.closeAllModals();
    this.notify('Configurações restauradas para padrão', 'info');
  }

  /**
   * Mostra modal genérico
   */
  showModal(title, content) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;
    
    const modalHTML = `
      <div class="modal-overlay" id="currentModal">
        <div class="modal">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="app.closeAllModals()" aria-label="Fechar">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      </div>
    `;
    
    modalContainer.innerHTML = modalHTML;
    modalContainer.style.pointerEvents = 'auto';
    
    // Animar entrada
    setTimeout(() => {
      const overlay = document.getElementById('currentModal');
      if (overlay) {
        overlay.classList.add('active');
      }
    }, 10);
  }

  /**
   * Fecha todos os modais
   */
  closeAllModals() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
      const overlay = modalContainer.querySelector('.modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
          modalContainer.innerHTML = '';
          modalContainer.style.pointerEvents = 'none';
        }, 300);
      }
    }
  }

  /**
   * Dispara ação principal da aba atual
   */
  triggerMainAction() {
    const tabsManager = this.modules.get('tabsManager');
    if (tabsManager) {
      const activeTab = tabsManager.getActiveTab();
      
      switch (activeTab) {
        case 'overlap':
          const overlapChecker = this.features.get('overlapChecker');
          if (overlapChecker) {
            overlapChecker.checkOverlap();
          }
          break;
        case 'multi':
          this.triggerMultiAnalysis();
          break;
        case 'calculator':
          this.triggerCalculatorAction();
          break;
        case 'validation':
          this.triggerValidationAction();
          break;
        case 'planning':
          this.triggerPlanningAction();
          break;
      }
    }
  }

  /**
   * Ações específicas para cada aba
   */
  triggerMultiAnalysis() {
    const analyzeBtn = document.getElementById('analyzeMultiBtn');
    if (analyzeBtn && !analyzeBtn.disabled) {
      analyzeBtn.click();
    }
  }

  triggerCalculatorAction() {
    const activePanel = document.querySelector('.calc-panel.active');
    if (activePanel) {
      const calcBtn = activePanel.querySelector('button[id*="Btn"]');
      if (calcBtn && !calcBtn.disabled) {
        calcBtn.click();
      }
    }
  }

  triggerValidationAction() {
    const validateBtn = document.getElementById('validateBtn');
    if (validateBtn && !validateBtn.disabled) {
      validateBtn.click();
    }
  }

  triggerPlanningAction() {
    const generateBtn = document.getElementById('generatePlanBtn');
    if (generateBtn && !generateBtn.disabled) {
      generateBtn.click();
    }
  }

  /**
   * Trata erro de inicialização
   */
  handleInitError(error) {
    this.showInitialLoading(false);
    
    const errorHTML = `
      <div style="text-align: center; padding: 50px; color: #dc2626;">
        <h1><i class="fas fa-exclamation-triangle"></i> Erro de Inicialização</h1>
        <p style="margin: 20px 0;">A aplicação não pôde ser carregada:</p>
        <pre style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">${error.message}</pre>
        <button onclick="location.reload()" style="background: #dc2626; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
          Recarregar Página
        </button>
      </div>
    `;
    
    const container = document.getElementById('mainContainer');
    if (container) {
      container.innerHTML = errorHTML;
    }
  }

  /**
   * Trata erros globais
   */
  handleGlobalError(error) {
    if (this.config.debug) {
      console.error('Erro global:', error);
    }
    
    this.notify('Ocorreu um erro inesperado. Verifique o console para detalhes.', 'error', 5000);
  }

  /**
   * Mostra prompt de instalação PWA
   */
  showInstallPrompt() {
    if (this.deferredPrompt) {
      this.notify('Esta aplicação pode ser instalada em seu dispositivo!', 'info', 5000);
    }
  }

  /**
   * Obtém módulo por nome
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Obtém feature por nome
   */
  getFeature(name) {
    return this.features.get(name);
  }

  /**
   * Obtém status da aplicação
   */
  getStatus() {
    return {
      version: this.version,
      initialized: this.initialized,
      modules: Array.from(this.modules.keys()),
      features: Array.from(this.features.keys()),
      config: { ...this.config }
    };
  }

  /**
   * API para debug
   */
  debug() {
    return {
      modules: this.modules,
      features: this.features,
      config: this.config,
      version: this.version,
      status: this.getStatus(),
      // Métodos úteis para debug
      testOverlap: (wan, lan) => {
        const engine = this.modules.get('overlapEngine');
        return engine ? engine.checkOverlapAdvanced(wan, lan) : null;
      },
      validateIPv6: (address) => {
        const utils = this.modules.get('ipv6Utils');
        return utils ? utils.validateIPv6(address) : null;
      },
      switchTab: (tabId) => {
        const tabs = this.modules.get('tabsManager');
        return tabs ? tabs.switchToTab(tabId) : false;
      },
      notify: (msg, type) => this.notify(msg, type),
      toggleTheme: () => this.toggleTheme(),
      clearCache: () => {
        this.modules.forEach(module => {
          if (module.clearCache) module.clearCache();
        });
      }
    };
  }
}

// Estilos para modais (integrados no CSS principal agora)
// Removido daqui para evitar duplicação

// Criar e inicializar a aplicação
const app = new IPv6CheckerApp();

// Expor globalmente para debug e interação
window.app = app;

// Adicionar métodos de debug ao console
if (typeof window !== 'undefined') {
  window.debugIPv6 = () => app.debug();
}

// Inicializar quando o DOM estiver pronto
app.init().catch(error => {
  console.error('Falha crítica na inicialização:', error);
});

// Exportar para outros módulos
export default app;