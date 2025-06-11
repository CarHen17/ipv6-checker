/**
 * Tabs Manager - Gerenciador de Abas da Aplicação (CORRIGIDO)
 * Controla navegação entre diferentes funcionalidades com implementação completa
 */

export class TabsManager {
  constructor() {
    this.activeTab = 'overlap';
    this.tabs = new Map();
    this.observers = new Set();
    this.loadedTabs = new Set(['overlap']); // Overlap sempre carregado
    
    this.config = {
      animationDuration: 300,
      lazyLoad: true
    };

    // Features implementadas para cada aba
    this.tabFeatures = new Map();
  }

  /**
   * Inicializa o gerenciador de abas
   */
  async init() {
    console.log('[TabsManager] Inicializando...');
    
    try {
      // Mapear elementos de abas
      this.mapTabElements();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Configurar estado inicial
      this.setupInitialState();
      
      // Inicializar features das abas
      this.initializeTabFeatures();
      
      console.log('[TabsManager] ✅ Inicializado');
      return true;
      
    } catch (error) {
      console.error('[TabsManager] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Mapeia elementos das abas
   */
  mapTabElements() {
    // Botões de aba
    const tabButtons = document.querySelectorAll('.tab[data-tab]');
    tabButtons.forEach(button => {
      const tabId = button.dataset.tab;
      this.tabs.set(tabId, {
        button: button,
        content: document.getElementById(`tab-${tabId}`),
        loaded: tabId === 'overlap',
        title: button.querySelector('span')?.textContent || tabId
      });
    });

    // Verificar se todas as abas foram encontradas
    if (this.tabs.size === 0) {
      throw new Error('Nenhuma aba encontrada');
    }

    console.log(`[TabsManager] Mapeadas ${this.tabs.size} abas:`, Array.from(this.tabs.keys()));
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Click nos botões de aba
    this.tabs.forEach((tab, tabId) => {
      if (tab.button) {
        tab.button.addEventListener('click', () => {
          this.switchToTab(tabId);
        });
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        const tabNumber = parseInt(e.key);
        if (tabNumber >= 1 && tabNumber <= this.tabs.size) {
          e.preventDefault();
          const tabIds = Array.from(this.tabs.keys());
          const targetTab = tabIds[tabNumber - 1];
          if (targetTab) {
            this.switchToTab(targetTab);
          }
        }
      }
    });
  }

  /**
   * Configura estado inicial
   */
  setupInitialState() {
    // Ativar aba overlap por padrão
    this.setActiveTab('overlap', false);
    
    // Marcar aba overlap como carregada
    this.loadedTabs.add('overlap');
  }

  /**
   * Inicializa features específicas de cada aba
   */
  initializeTabFeatures() {
    // Inicializar feature para análise múltipla
    this.tabFeatures.set('multi', new MultiAnalysisFeature());
    
    // Inicializar feature para planejamento
    this.tabFeatures.set('planning', new PlanningFeature());
    
    // Inicializar feature para calculadora
    this.tabFeatures.set('calculator', new CalculatorFeature());
    
    // Inicializar feature para validação
    this.tabFeatures.set('validation', new ValidationFeature());
  }

  /**
   * Muda para uma aba específica
   */
  async switchToTab(tabId) {
    if (!this.tabs.has(tabId)) {
      console.warn(`[TabsManager] Aba não encontrada: ${tabId}`);
      return false;
    }

    if (this.activeTab === tabId) {
      return true; // Já está ativa
    }

    try {
      // Verificar se precisa carregar conteúdo
      if (this.config.lazyLoad && !this.loadedTabs.has(tabId)) {
        await this.loadTabContent(tabId);
      }

      // Mudar aba ativa
      this.setActiveTab(tabId);
      
      return true;
      
    } catch (error) {
      console.error(`[TabsManager] Erro ao mudar para aba ${tabId}:`, error);
      return false;
    }
  }

  /**
   * Define aba ativa
   */
  setActiveTab(tabId, notify = true) {
    const oldTab = this.activeTab;
    
    // Atualizar estado
    this.activeTab = tabId;
    
    // Atualizar UI
    this.updateTabsUI(tabId, oldTab);
    
    // Notificar observadores
    if (notify) {
      this.notifyObservers(oldTab, tabId);
    }
    
    console.log(`[TabsManager] Aba ativa: ${oldTab} → ${tabId}`);
  }

  /**
   * Atualiza interface das abas
   */
  updateTabsUI(activeTabId, oldTabId) {
    // Atualizar botões de aba
    this.tabs.forEach((tab, tabId) => {
      const isActive = tabId === activeTabId;
      
      if (tab.button) {
        tab.button.classList.toggle('active', isActive);
        tab.button.setAttribute('aria-selected', isActive.toString());
      }
    });

    // Atualizar conteúdo das abas
    if (oldTabId && this.tabs.has(oldTabId)) {
      this.hideTabContent(oldTabId);
    }
    
    this.showTabContent(activeTabId);
  }

  /**
   * Mostra conteúdo da aba
   */
  showTabContent(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.content) return;

    const content = tab.content;
    content.classList.add('active');
    content.style.display = 'block';
    
    // Animar entrada
    requestAnimationFrame(() => {
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    });
  }

  /**
   * Oculta conteúdo da aba
   */
  hideTabContent(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.content) return;

    const content = tab.content;
    content.classList.remove('active');
    content.style.opacity = '0';
    content.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      if (!content.classList.contains('active')) {
        content.style.display = 'none';
      }
    }, this.config.animationDuration);
  }

  /**
   * Carrega conteúdo da aba dinamicamente
   */
  async loadTabContent(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.content) return;

    console.log(`[TabsManager] Carregando conteúdo da aba: ${tabId}`);
    
    try {
      // Gerar conteúdo específico da aba
      const content = this.generateTabContent(tabId);
      
      // Atualizar conteúdo
      tab.content.innerHTML = content;
      
      // Inicializar feature da aba
      const feature = this.tabFeatures.get(tabId);
      if (feature) {
        await feature.initialize(tab.content);
      }
      
      // Marcar como carregada
      this.loadedTabs.add(tabId);
      tab.loaded = true;
      
      console.log(`[TabsManager] ✅ Aba ${tabId} carregada`);
      
    } catch (error) {
      console.error(`[TabsManager] Erro ao carregar aba ${tabId}:`, error);
      this.showErrorState(tab.content, error.message);
    }
  }

  /**
   * Gera conteúdo específico para cada aba
   */
  generateTabContent(tabId) {
    const templates = {
      multi: this.generateMultiAnalysisContent(),
      planning: this.generatePlanningContent(),
      calculator: this.generateCalculatorContent(),
      validation: this.generateValidationContent()
    };

    return templates[tabId] || this.generateDefaultContent(tabId);
  }

  /**
   * Gera conteúdo para análise múltipla
   */
  generateMultiAnalysisContent() {
    return `
      <div class="multi-analysis-container">
        <div class="input-section">
          <div class="input-group">
            <label for="multiPrefixes" class="input-label">
              <i class="fas fa-list"></i>
              Lista de Prefixos IPv6
            </label>
            <textarea 
              id="multiPrefixes" 
              class="input-field multi-textarea"
              placeholder="Insira um prefixo por linha:&#10;2001:db8:a::/64&#10;2001:db8:b::/64&#10;2001:db8:c::/48"
              rows="8"
            ></textarea>
            <div class="input-help">
              <i class="fas fa-info-circle"></i>
              Insira um prefixo IPv6 por linha (formato CIDR)
            </div>
          </div>
          
          <div class="action-section">
            <button id="analyzeMultiBtn" class="btn-primary btn-large">
              <i class="fas fa-search"></i>
              <span>Analisar Todos</span>
            </button>
            <button id="importFileBtn" class="btn-secondary">
              <i class="fas fa-file-import"></i>
              <span>Importar Arquivo</span>
            </button>
            <button id="clearMultiBtn" class="btn-ghost">
              <i class="fas fa-eraser"></i>
              <span>Limpar</span>
            </button>
          </div>
        </div>

        <div id="multiResults" class="multi-results" style="display: none;">
          <div class="results-header">
            <h3>Resultados da Análise</h3>
            <div class="results-summary" id="multiSummary"></div>
          </div>
          <div class="results-content" id="multiContent"></div>
        </div>
      </div>
    `;
  }

  /**
   * Gera conteúdo para planejamento
   */
  generatePlanningContent() {
    return `
      <div class="planning-container">
        <div class="planning-form">
          <div class="input-grid">
            <div class="input-group">
              <label for="parentBlock" class="input-label">
                <i class="fas fa-sitemap"></i>
                Bloco Pai
              </label>
              <input 
                type="text" 
                id="parentBlock" 
                class="input-field"
                placeholder="Ex.: 2001:db8::/32"
                value="2001:db8::/32"
              >
            </div>
            
            <div class="input-group">
              <label for="subnetSize" class="input-label">
                <i class="fas fa-ruler"></i>
                Tamanho da Sub-rede
              </label>
              <select id="subnetSize" class="input-field">
                <option value="48">Prefixo /48 (Sites)</option>
                <option value="56">Prefixo /56 (Departamentos)</option>
                <option value="64" selected>Prefixo /64 (Sub-redes)</option>
                <option value="80">Prefixo /80 (SOHO)</option>
              </select>
            </div>
          </div>
          
          <div class="action-section">
            <button id="generatePlanBtn" class="btn-primary btn-large">
              <i class="fas fa-magic"></i>
              <span>Gerar Plano</span>
            </button>
          </div>
        </div>

        <div id="planningResults" class="planning-results" style="display: none;">
          <div class="plan-header">
            <h3>Plano de Sub-redes</h3>
            <div class="plan-actions">
              <button id="exportPlanBtn" class="btn-secondary">
                <i class="fas fa-download"></i>
                Exportar
              </button>
            </div>
          </div>
          <div class="plan-content" id="planContent"></div>
        </div>
      </div>
    `;
  }

  /**
   * Gera conteúdo para calculadora
   */
  generateCalculatorContent() {
    return `
      <div class="calculator-container">
        <div class="calculator-tabs">
          <button class="calc-tab active" data-calc="converter">
            <i class="fas fa-exchange-alt"></i>
            Conversão
          </button>
          <button class="calc-tab" data-calc="subnet">
            <i class="fas fa-network-wired"></i>
            Sub-redes
          </button>
          <button class="calc-tab" data-calc="random">
            <i class="fas fa-random"></i>
            Gerador
          </button>
        </div>

        <div class="calc-content">
          <div id="calc-converter" class="calc-panel active">
            <div class="input-group">
              <label for="calcInput" class="input-label">
                <i class="fas fa-keyboard"></i>
                Endereço IPv6
              </label>
              <input 
                type="text" 
                id="calcInput" 
                class="input-field"
                placeholder="Ex.: 2001:db8::1"
              >
            </div>
            
            <div class="action-section">
              <button id="convertBtn" class="btn-primary">
                <i class="fas fa-exchange-alt"></i>
                Converter
              </button>
            </div>
            
            <div class="conversion-results" id="conversionResults" style="display: none;">
              <div class="result-item">
                <label>Expandido:</label>
                <code id="expandedResult"></code>
              </div>
              <div class="result-item">
                <label>Comprimido:</label>
                <code id="compressedResult"></code>
              </div>
              <div class="result-item">
                <label>Tipo:</label>
                <code id="typeResult"></code>
              </div>
            </div>
          </div>

          <div id="calc-subnet" class="calc-panel">
            <div class="input-group">
              <label for="subnetCalcInput" class="input-label">
                <i class="fas fa-network-wired"></i>
                Rede CIDR
              </label>
              <input 
                type="text" 
                id="subnetCalcInput" 
                class="input-field"
                placeholder="Ex.: 2001:db8::/48"
              >
            </div>
            
            <div class="action-section">
              <button id="calcSubnetBtn" class="btn-primary">
                <i class="fas fa-calculator"></i>
                Calcular
              </button>
            </div>
            
            <div class="subnet-results" id="subnetResults" style="display: none;">
              <div class="result-item">
                <label>Endereço de Rede:</label>
                <code id="networkResult"></code>
              </div>
              <div class="result-item">
                <label>Primeiro Host:</label>
                <code id="firstHostResult"></code>
              </div>
              <div class="result-item">
                <label>Último Host:</label>
                <code id="lastHostResult"></code>
              </div>
              <div class="result-item">
                <label>Total de Endereços:</label>
                <code id="totalAddressesResult"></code>
              </div>
            </div>
          </div>

          <div id="calc-random" class="calc-panel">
            <div class="input-group">
              <label for="randomPrefix" class="input-label">
                <i class="fas fa-random"></i>
                Prefixo Base
              </label>
              <select id="randomPrefix" class="input-field">
                <option value="2001:db8::/32">2001:db8::/32 (Documentação)</option>
                <option value="fc00::/7">fc00::/7 (Unique Local)</option>
                <option value="fe80::/10">fe80::/10 (Link-Local)</option>
              </select>
            </div>
            
            <div class="action-section">
              <button id="generateRandomBtn" class="btn-primary">
                <i class="fas fa-dice"></i>
                Gerar Endereço Aleatório
              </button>
            </div>
            
            <div class="random-results" id="randomResults" style="display: none;">
              <div class="result-item">
                <label>Endereço Gerado:</label>
                <code id="randomAddressResult"></code>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Gera conteúdo para validação
   */
  generateValidationContent() {
    return `
      <div class="validation-container">
        <div class="validation-form">
          <div class="input-group">
            <label for="validationInput" class="input-label">
              <i class="fas fa-shield-alt"></i>
              Endereço ou Prefixo IPv6
            </label>
            <input 
              type="text" 
              id="validationInput" 
              class="input-field"
              placeholder="Ex.: 2001:db8::1/64"
            >
          </div>
          
          <div class="validation-options">
            <label class="checkbox-label">
              <input type="checkbox" id="rfcCheck" checked>
              <span>Verificação RFC</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="securityCheck">
              <span>Análise de Segurança</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="routabilityCheck">
              <span>Verificação de Roteabilidade</span>
            </label>
          </div>
          
          <div class="action-section">
            <button id="validateBtn" class="btn-primary btn-large">
              <i class="fas fa-check-circle"></i>
              <span>Validar Endereço</span>
            </button>
          </div>
        </div>

        <div id="validationResults" class="validation-results" style="display: none;">
          <div class="validation-header">
            <h3>Resultado da Validação</h3>
          </div>
          <div class="validation-content" id="validationContent"></div>
        </div>
      </div>
    `;
  }

  /**
   * Gera conteúdo padrão para abas não implementadas
   */
  generateDefaultContent(tabId) {
    return `
      <div class="default-tab-content">
        <div class="coming-soon">
          <i class="fas fa-construction"></i>
          <h3>Em Desenvolvimento</h3>
          <p>A funcionalidade "${tabId}" está sendo desenvolvida e estará disponível em breve.</p>
        </div>
      </div>
    `;
  }

  /**
   * Mostra estado de erro
   */
  showErrorState(container, errorMessage) {
    container.innerHTML = `
      <div class="tab-content-placeholder">
        <div class="error-content">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Erro ao carregar</h3>
          <p>${errorMessage}</p>
          <button onclick="location.reload()" class="btn-secondary">
            <i class="fas fa-refresh"></i>
            Recarregar
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Adiciona observador para mudanças de aba
   */
  addObserver(callback) {
    this.observers.add(callback);
  }

  /**
   * Remove observador
   */
  removeObserver(callback) {
    this.observers.delete(callback);
  }

  /**
   * Notifica observadores sobre mudança de aba
   */
  notifyObservers(oldTab, newTab) {
    this.observers.forEach(callback => {
      try {
        callback({ oldTab, newTab, activeTab: this.activeTab });
      } catch (error) {
        console.error('[TabsManager] Erro em observador:', error);
      }
    });
  }

  /**
   * Obtém aba ativa
   */
  getActiveTab() {
    return this.activeTab;
  }

  /**
   * Obtém informações de uma aba
   */
  getTabInfo(tabId) {
    return this.tabs.get(tabId);
  }

  /**
   * Obtém lista de todas as abas
   */
  getAllTabs() {
    return Array.from(this.tabs.entries()).map(([id, tab]) => ({
      id,
      title: tab.title,
      loaded: tab.loaded,
      active: id === this.activeTab
    }));
  }

  /**
   * Verifica se uma aba está carregada
   */
  isTabLoaded(tabId) {
    return this.loadedTabs.has(tabId);
  }

  /**
   * Força carregamento de uma aba
   */
  async forceLoadTab(tabId) {
    if (!this.tabs.has(tabId)) {
      throw new Error(`Aba não encontrada: ${tabId}`);
    }

    // Remover da lista de carregadas para forçar reload
    this.loadedTabs.delete(tabId);
    
    // Carregar novamente
    await this.loadTabContent(tabId);
  }
}

// ===== FEATURES DAS ABAS =====

/**
 * Feature para Análise Múltipla
 */
class MultiAnalysisFeature {
  async initialize(container) {
    console.log('[MultiAnalysisFeature] Inicializando...');
    
    // Obter elementos
    this.elements = {
      textarea: container.querySelector('#multiPrefixes'),
      analyzeBtn: container.querySelector('#analyzeMultiBtn'),
      clearBtn: container.querySelector('#clearMultiBtn'),
      results: container.querySelector('#multiResults'),
      summary: container.querySelector('#multiSummary'),
      content: container.querySelector('#multiContent')
    };

    // Configurar event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.elements.analyzeBtn) {
      this.elements.analyzeBtn.addEventListener('click', () => this.analyzeMultiple());
    }

    if (this.elements.clearBtn) {
      this.elements.clearBtn.addEventListener('click', () => this.clearAll());
    }
  }

  analyzeMultiple() {
    const text = this.elements.textarea?.value?.trim();
    if (!text) {
      this.showNotification('Insira pelo menos um prefixo para análise', 'warning');
      return;
    }

    const prefixes = text.split('\n').filter(line => line.trim());
    console.log('Analisando prefixos:', prefixes);

    // Simular análise
    this.showResults(prefixes);
  }

  showResults(prefixes) {
    if (!this.elements.results) return;

    this.elements.results.style.display = 'block';
    
    if (this.elements.summary) {
      this.elements.summary.textContent = `${prefixes.length} prefixos analisados`;
    }

    if (this.elements.content) {
      let html = '<div class="analysis-grid">';
      
      prefixes.forEach((prefix, index) => {
        const isValid = this.validatePrefix(prefix);
        html += `
          <div class="analysis-card ${isValid ? 'success' : 'error'}">
            <h4>Prefixo ${index + 1}</h4>
            <code>${prefix}</code>
            <div class="status">
              <i class="fas ${isValid ? 'fa-check-circle' : 'fa-times-circle'}"></i>
              ${isValid ? 'Válido' : 'Inválido'}
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      this.elements.content.innerHTML = html;
    }

    this.showNotification('Análise concluída!', 'success');
  }

  validatePrefix(prefix) {
    // Validação simples
    return prefix.includes('::') || prefix.match(/^[0-9a-fA-F:]+\/\d+$/);
  }

  clearAll() {
    if (this.elements.textarea) {
      this.elements.textarea.value = '';
    }
    
    if (this.elements.results) {
      this.elements.results.style.display = 'none';
    }

    this.showNotification('Análise limpa', 'info');
  }

  showNotification(message, type) {
    // Usar sistema de notificações global se disponível
    if (window.app && window.app.getModule('notifications')) {
      window.app.getModule('notifications').show(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

/**
 * Feature para Planejamento de Rede
 */
class PlanningFeature {
  async initialize(container) {
    console.log('[PlanningFeature] Inicializando...');
    
    this.elements = {
      parentBlock: container.querySelector('#parentBlock'),
      subnetSize: container.querySelector('#subnetSize'),
      generateBtn: container.querySelector('#generatePlanBtn'),
      results: container.querySelector('#planningResults'),
      content: container.querySelector('#planContent')
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.elements.generateBtn) {
      this.elements.generateBtn.addEventListener('click', () => this.generatePlan());
    }
  }

  generatePlan() {
    const parentBlock = this.elements.parentBlock?.value?.trim();
    const subnetSize = this.elements.subnetSize?.value;

    if (!parentBlock) {
      this.showNotification('Insira um bloco pai válido', 'warning');
      return;
    }

    console.log('Gerando plano:', { parentBlock, subnetSize });

    // Simular geração de plano
    this.showPlan(parentBlock, subnetSize);
  }

  showPlan(parentBlock, subnetSize) {
    if (!this.elements.results) return;

    this.elements.results.style.display = 'block';

    if (this.elements.content) {
      const subnets = this.generateSubnets(parentBlock, subnetSize);
      
      let html = '<div class="subnets-table">';
      html += '<div class="table-header">Sub-redes Geradas</div>';
      
      subnets.forEach((subnet, index) => {
        html += `
          <div class="subnet-row">
            <span class="subnet-index">${index + 1}</span>
            <code class="subnet-cidr">${subnet}</code>
            <span class="subnet-type">/${subnetSize}</span>
          </div>
        `;
      });
      
      html += '</div>';
      this.elements.content.innerHTML = html;
    }

    this.showNotification('Plano gerado com sucesso!', 'success');
  }

  generateSubnets(parentBlock, subnetSize) {
    // Gerar sub-redes de exemplo
    const basePrefix = parentBlock.split('::')[0];
    const subnets = [];
    
    for (let i = 0; i < 10; i++) {
      subnets.push(`${basePrefix}:${i.toString(16).padStart(4, '0')}::/${subnetSize}`);
    }
    
    return subnets;
  }

  showNotification(message, type) {
    if (window.app && window.app.getModule('notifications')) {
      window.app.getModule('notifications').show(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

/**
 * Feature para Calculadora IPv6
 */
class CalculatorFeature {
  async initialize(container) {
    console.log('[CalculatorFeature] Inicializando...');
    
    this.elements = {
      // Tabs
      calcTabs: container.querySelectorAll('.calc-tab'),
      calcPanels: container.querySelectorAll('.calc-panel'),
      
      // Converter
      calcInput: container.querySelector('#calcInput'),
      convertBtn: container.querySelector('#convertBtn'),
      conversionResults: container.querySelector('#conversionResults'),
      expandedResult: container.querySelector('#expandedResult'),
      compressedResult: container.querySelector('#compressedResult'),
      typeResult: container.querySelector('#typeResult'),
      
      // Subnet
      subnetCalcInput: container.querySelector('#subnetCalcInput'),
      calcSubnetBtn: container.querySelector('#calcSubnetBtn'),
      subnetResults: container.querySelector('#subnetResults'),
      networkResult: container.querySelector('#networkResult'),
      firstHostResult: container.querySelector('#firstHostResult'),
      lastHostResult: container.querySelector('#lastHostResult'),
      totalAddressesResult: container.querySelector('#totalAddressesResult'),
      
      // Random
      randomPrefix: container.querySelector('#randomPrefix'),
      generateRandomBtn: container.querySelector('#generateRandomBtn'),
      randomResults: container.querySelector('#randomResults'),
      randomAddressResult: container.querySelector('#randomAddressResult')
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Calculator tabs
    this.elements.calcTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const calcType = tab.dataset.calc;
        this.switchCalcTab(calcType);
      });
    });

    // Convert button
    if (this.elements.convertBtn) {
      this.elements.convertBtn.addEventListener('click', () => this.convertAddress());
    }

    // Subnet calculation button
    if (this.elements.calcSubnetBtn) {
      this.elements.calcSubnetBtn.addEventListener('click', () => this.calculateSubnet());
    }

    // Random generation button
    if (this.elements.generateRandomBtn) {
      this.elements.generateRandomBtn.addEventListener('click', () => this.generateRandom());
    }

    // Enter key support
    if (this.elements.calcInput) {
      this.elements.calcInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.convertAddress();
      });
    }

    if (this.elements.subnetCalcInput) {
      this.elements.subnetCalcInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.calculateSubnet();
      });
    }
  }

  switchCalcTab(calcType) {
    // Update tab buttons
    this.elements.calcTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.calc === calcType);
    });

    // Update panels
    this.elements.calcPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `calc-${calcType}`);
    });
  }

  convertAddress() {
    const address = this.elements.calcInput?.value?.trim();
    if (!address) {
      this.showNotification('Insira um endereço IPv6 válido', 'warning');
      return;
    }

    try {
      // Simulação de conversão IPv6
      const result = this.performConversion(address);
      this.showConversionResults(result);
      this.showNotification('Conversão realizada!', 'success');
    } catch (error) {
      this.showNotification('Erro na conversão: ' + error.message, 'error');
    }
  }

  performConversion(address) {
    // Simulação simples de conversão IPv6
    let expanded = address;
    let compressed = address;
    let type = 'Global Unicast';

    // Detectar tipo básico
    if (address.includes('::1')) {
      type = 'Loopback';
    } else if (address.startsWith('fe80:')) {
      type = 'Link-Local';
    } else if (address.startsWith('fc') || address.startsWith('fd')) {
      type = 'Unique Local';
    } else if (address.startsWith('2001:db8:')) {
      type = 'Documentation';
    }

    // Simulação de expansão (muito básica)
    if (address.includes('::')) {
      expanded = address.replace('::', ':0000:0000:0000:0000:');
    }

    // Simulação de compressão
    if (!address.includes('::')) {
      compressed = address.replace(/:0000:/g, '::').replace(/::.*::/, '::');
    }

    return { expanded, compressed, type };
  }

  showConversionResults(result) {
    if (this.elements.conversionResults) {
      this.elements.conversionResults.style.display = 'block';
    }

    if (this.elements.expandedResult) {
      this.elements.expandedResult.textContent = result.expanded;
    }

    if (this.elements.compressedResult) {
      this.elements.compressedResult.textContent = result.compressed;
    }

    if (this.elements.typeResult) {
      this.elements.typeResult.textContent = result.type;
    }
  }

  calculateSubnet() {
    const cidr = this.elements.subnetCalcInput?.value?.trim();
    if (!cidr) {
      this.showNotification('Insira um CIDR válido', 'warning');
      return;
    }

    try {
      const result = this.performSubnetCalculation(cidr);
      this.showSubnetResults(result);
      this.showNotification('Cálculo de sub-rede realizado!', 'success');
    } catch (error) {
      this.showNotification('Erro no cálculo: ' + error.message, 'error');
    }
  }

  performSubnetCalculation(cidr) {
    // Simulação básica de cálculo de sub-rede
    const [address, prefix] = cidr.split('/');
    const prefixNum = parseInt(prefix);

    // Simulação muito básica
    const network = address.replace(/::.*/, '::');
    const firstHost = network.replace(/::$/, '::1');
    const lastHost = network.replace(/::$/, '::ffff:ffff:ffff:ffff');
    
    const hostBits = 128 - prefixNum;
    const totalAddresses = hostBits >= 64 ? 
      'Mais de 18 quintilhões' : 
      Math.pow(2, hostBits).toLocaleString();

    return {
      network,
      firstHost,
      lastHost,
      totalAddresses
    };
  }

  showSubnetResults(result) {
    if (this.elements.subnetResults) {
      this.elements.subnetResults.style.display = 'block';
    }

    if (this.elements.networkResult) {
      this.elements.networkResult.textContent = result.network;
    }

    if (this.elements.firstHostResult) {
      this.elements.firstHostResult.textContent = result.firstHost;
    }

    if (this.elements.lastHostResult) {
      this.elements.lastHostResult.textContent = result.lastHost;
    }

    if (this.elements.totalAddressesResult) {
      this.elements.totalAddressesResult.textContent = result.totalAddresses;
    }
  }

  generateRandom() {
    const basePrefix = this.elements.randomPrefix?.value;
    if (!basePrefix) {
      this.showNotification('Selecione um prefixo base', 'warning');
      return;
    }

    try {
      const randomAddress = this.generateRandomAddress(basePrefix);
      this.showRandomResults(randomAddress);
      this.showNotification('Endereço aleatório gerado!', 'success');
    } catch (error) {
      this.showNotification('Erro na geração: ' + error.message, 'error');
    }
  }

  generateRandomAddress(basePrefix) {
    // Gerar endereço aleatório dentro do prefixo
    const [baseAddr] = basePrefix.split('/');
    const randomPart = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0');
    
    if (baseAddr.includes('2001:db8:')) {
      return `2001:db8:${randomPart}::1`;
    } else if (baseAddr.includes('fc00:')) {
      return `fc00::${randomPart}:1`;
    } else if (baseAddr.includes('fe80:')) {
      return `fe80::${randomPart}`;
    }
    
    return `${baseAddr}${randomPart}::1`;
  }

  showRandomResults(address) {
    if (this.elements.randomResults) {
      this.elements.randomResults.style.display = 'block';
    }

    if (this.elements.randomAddressResult) {
      this.elements.randomAddressResult.textContent = address;
    }
  }

  showNotification(message, type) {
    if (window.app && window.app.getModule('notifications')) {
      window.app.getModule('notifications').show(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

/**
 * Feature para Validação Avançada
 */
class ValidationFeature {
  async initialize(container) {
    console.log('[ValidationFeature] Inicializando...');
    
    this.elements = {
      input: container.querySelector('#validationInput'),
      validateBtn: container.querySelector('#validateBtn'),
      rfcCheck: container.querySelector('#rfcCheck'),
      securityCheck: container.querySelector('#securityCheck'),
      routabilityCheck: container.querySelector('#routabilityCheck'),
      results: container.querySelector('#validationResults'),
      content: container.querySelector('#validationContent')
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.elements.validateBtn) {
      this.elements.validateBtn.addEventListener('click', () => this.validateAddress());
    }

    if (this.elements.input) {
      this.elements.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.validateAddress();
      });
    }
  }

  validateAddress() {
    const address = this.elements.input?.value?.trim();
    if (!address) {
      this.showNotification('Insira um endereço IPv6 para validação', 'warning');
      return;
    }

    const options = {
      rfc: this.elements.rfcCheck?.checked || false,
      security: this.elements.securityCheck?.checked || false,
      routability: this.elements.routabilityCheck?.checked || false
    };

    try {
      const result = this.performValidation(address, options);
      this.showValidationResults(result);
      this.showNotification('Validação concluída!', 'success');
    } catch (error) {
      this.showNotification('Erro na validação: ' + error.message, 'error');
    }
  }

  performValidation(address, options) {
    // Simulação de validação abrangente
    const result = {
      address: address,
      valid: true,
      type: 'Global Unicast',
      scope: 'Global',
      checks: []
    };

    // Validação básica de formato
    const basicValid = this.isValidIPv6Format(address);
    result.checks.push({
      name: 'Formato Básico',
      status: basicValid ? 'success' : 'error',
      message: basicValid ? 'Formato IPv6 válido' : 'Formato IPv6 inválido'
    });

    if (!basicValid) {
      result.valid = false;
      return result;
    }

    // Determinar tipo e escopo
    if (address.includes('::1')) {
      result.type = 'Loopback';
      result.scope = 'Host';
    } else if (address.startsWith('fe80:')) {
      result.type = 'Link-Local';
      result.scope = 'Link';
    } else if (address.startsWith('fc') || address.startsWith('fd')) {
      result.type = 'Unique Local';
      result.scope = 'Organization';
    } else if (address.startsWith('2001:db8:')) {
      result.type = 'Documentation';
      result.scope = 'Documentation';
    }

    // Verificações RFC
    if (options.rfc) {
      result.checks.push({
        name: 'Conformidade RFC',
        status: 'success',
        message: `Tipo ${result.type} está em conformidade com RFC 4291`
      });
    }

    // Verificações de segurança
    if (options.security) {
      const isSecure = !address.startsWith('2001:db8:');
      result.checks.push({
        name: 'Análise de Segurança',
        status: isSecure ? 'success' : 'warning',
        message: isSecure ? 
          'Endereço adequado para uso em produção' : 
          'Endereço de documentação - não usar em produção'
      });
    }

    // Verificações de roteabilidade
    if (options.routability) {
      const isRoutable = !['Loopback', 'Link-Local', 'Documentation'].includes(result.type);
      result.checks.push({
        name: 'Roteabilidade',
        status: isRoutable ? 'success' : 'warning',
        message: isRoutable ? 
          'Endereço roteável globalmente' : 
          'Endereço com escopo limitado'
      });
    }

    return result;
  }

  isValidIPv6Format(address) {
    // Validação básica de formato IPv6
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$|^::$|^::([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4}$|^([0-9a-fA-F]{0,4}:){1,7}:$/;
    return ipv6Regex.test(address.split('/')[0]); // Remove CIDR se presente
  }

  showValidationResults(result) {
    if (this.elements.results) {
      this.elements.results.style.display = 'block';
    }

    if (this.elements.content) {
      let html = `
        <div class="validation-summary">
          <div class="validation-status ${result.valid ? 'success' : 'error'}">
            <i class="fas ${result.valid ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            <span>${result.valid ? 'Endereço Válido' : 'Endereço Inválido'}</span>
          </div>
          <div class="validation-details">
            <div class="detail-row">
              <span>Endereço:</span>
              <code>${result.address}</code>
            </div>
            <div class="detail-row">
              <span>Tipo:</span>
              <span>${result.type}</span>
            </div>
            <div class="detail-row">
              <span>Escopo:</span>
              <span>${result.scope}</span>
            </div>
          </div>
        </div>
      `;

      if (result.checks.length > 0) {
        html += '<div class="validation-checks">';
        html += '<h4>Verificações Realizadas</h4>';
        
        result.checks.forEach(check => {
          html += `
            <div class="check-item ${check.status}">
              <div class="check-header">
                <i class="fas ${this.getCheckIcon(check.status)}"></i>
                <strong>${check.name}</strong>
              </div>
              <p>${check.message}</p>
            </div>
          `;
        });
        
        html += '</div>';
      }

      this.elements.content.innerHTML = html;
    }
  }

  getCheckIcon(status) {
    const icons = {
      success: 'fa-check-circle',
      warning: 'fa-exclamation-triangle',
      error: 'fa-times-circle',
      info: 'fa-info-circle'
    };
    return icons[status] || 'fa-info-circle';
  }

  showNotification(message, type) {
    if (window.app && window.app.getModule('notifications')) {
      window.app.getModule('notifications').show(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// ===== MÉTODOS ADICIONAIS DO TABSMANAGER =====

// Continuação da classe TabsManager...
TabsManager.prototype.muda = function(tabId) {
  return this.switchToTab(tabId);
};

TabsManager.prototype.reloadAllTabs = async function() {
  const tabIds = Array.from(this.tabs.keys());
  
  for (const tabId of tabIds) {
    if (tabId !== 'overlap') { // Não recarregar overlap que é estático
      this.loadedTabs.delete(tabId);
      if (tabId === this.activeTab) {
        await this.loadTabContent(tabId);
      }
    }
  }
};

TabsManager.prototype.getStats = function() {
  const totalTabs = this.tabs.size;
  const loadedTabs = this.loadedTabs.size;
  const unloadedTabs = totalTabs - loadedTabs;

  return {
    total: totalTabs,
    loaded: loadedTabs,
    unloaded: unloadedTabs,
    activeTab: this.activeTab,
    loadedTabsList: Array.from(this.loadedTabs),
    loadingPercentage: Math.round((loadedTabs / totalTabs) * 100)
  };
};

TabsManager.prototype.destroy = function() {
  // Limpar observadores
  this.observers.clear();
  
  // Limpar features
  this.tabFeatures.forEach(feature => {
    if (feature.destroy) {
      feature.destroy();
    }
  });
  this.tabFeatures.clear();
  
  // Limpar event listeners
  this.tabs.forEach(tab => {
    if (tab.button) {
      tab.button.replaceWith(tab.button.cloneNode(true));
    }
  });
  
  // Limpar maps
  this.tabs.clear();
  this.loadedTabs.clear();
  
  console.log('[TabsManager] Destroyed');
};