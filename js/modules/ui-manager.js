/**
 * UI Manager - Gerenciador Central de Interface
 * Coordena todos os aspectos da interface do usuário
 */

export class UIManager {
  constructor() {
    this.state = {
      theme: 'light',
      activeTab: 'overlap',
      isLoading: false,
      modalsOpen: new Set(),
      notifications: new Map()
    };
    
    this.config = {
      animationDuration: 300,
      notificationDuration: 3000,
      loadingDelay: 100
    };
    
    this.elements = {};
    this.observers = {
      theme: new Set(),
      tab: new Set(),
      loading: new Set()
    };
  }

  /**
   * Inicializa o gerenciador de UI
   */
  async init() {
    console.log('[UIManager] Inicializando...');
    
    try {
      // Mapear elementos essenciais
      this.mapElements();
      
      // Configurar observadores de mudanças
      this.setupObservers();
      
      // Configurar handlers globais
      this.setupGlobalHandlers();
      
      // Aplicar estado inicial
      this.applyInitialState();
      
      console.log('[UIManager] ✅ Inicializado');
      return true;
      
    } catch (error) {
      console.error('[UIManager] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Mapeia elementos essenciais da UI
   */
  mapElements() {
    this.elements = {
      // Container principal
      container: document.getElementById('mainContainer'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      
      // Navigation e tabs
      tabNavigation: document.querySelector('.tab-navigation'),
      tabs: document.querySelectorAll('.tab'),
      tabContents: document.querySelectorAll('.tab-content'),
      
      // Header controls
      themeToggle: document.getElementById('themeToggle'),
      helpBtn: document.getElementById('helpBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      
      // Modal e notifications
      modalContainer: document.getElementById('modalContainer'),
      notificationContainer: document.getElementById('notificationContainer')
    };

    // Verificar elementos críticos
    const criticalElements = ['container', 'tabNavigation'];
    for (const elementName of criticalElements) {
      if (!this.elements[elementName]) {
        throw new Error(`Elemento crítico não encontrado: ${elementName}`);
      }
    }
  }

  /**
   * Configura observadores de mudanças
   */
  setupObservers() {
    // Observer para mudanças de tema do sistema
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (this.state.theme === 'auto') {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }

    // Observer para mudanças de visibilidade da página
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });

    // Observer para redimensionamento da janela
    window.addEventListener('resize', this.debounce(() => {
      this.handleWindowResize();
    }, 250));
  }

  /**
   * Configura handlers globais
   */
  setupGlobalHandlers() {
    // Prevent default para drag & drop
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());

    // Handler para cliques fora de modais
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.closeTopModal();
      }
    });

    // Handler para escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }
    });

    // Handler para erros de imagem
    document.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') {
        this.handleImageError(e.target);
      }
    }, true);
  }

  /**
   * Aplica estado inicial da UI
   */
  applyInitialState() {
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('ipv6-checker-theme') || 'light';
    this.setTheme(savedTheme);
    
    // Definir tab ativa inicial
    this.setActiveTab('overlap');
    
    // Aplicar preferências de acessibilidade se detectadas
    this.applyAccessibilityPreferences();
  }

  // ===== GERENCIAMENTO DE TEMA =====

  /**
   * Define tema da aplicação
   */
  setTheme(theme) {
    const oldTheme = this.state.theme;
    this.state.theme = theme;
    
    this.applyTheme(theme);
    this.saveThemePreference(theme);
    this.notifyObservers('theme', { oldTheme, newTheme: theme });
  }

  /**
   * Aplica tema visualmente
   */
  applyTheme(theme) {
    const isDark = theme === 'dark';
    
    // Aplicar classe ao body
    document.body.classList.toggle('dark-mode', isDark);
    
    // Atualizar meta theme-color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? '#1e293b' : '#667eea');
    }
    
    // Atualizar ícone do botão de tema
    if (this.elements.themeToggle) {
      const icon = this.elements.themeToggle.querySelector('i');
      if (icon) {
        icon.className = `fas ${isDark ? 'fa-sun' : 'fa-moon'}`;
      }
    }
    
    // Animar transição suave
    this.animateThemeTransition();
  }

  /**
   * Anima transição de tema
   */
  animateThemeTransition() {
    const transitionOverlay = document.createElement('div');
    transitionOverlay.className = 'theme-transition-overlay';
    transitionOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: ${this.state.theme === 'dark' ? '#000' : '#fff'};
      opacity: 0;
      pointer-events: none;
      z-index: 99999;
      transition: opacity 150ms ease;
    `;
    
    document.body.appendChild(transitionOverlay);
    
    // Fade in
    requestAnimationFrame(() => {
      transitionOverlay.style.opacity = '0.3';
    });
    
    // Fade out após aplicar tema
    setTimeout(() => {
      transitionOverlay.style.opacity = '0';
      setTimeout(() => {
        if (transitionOverlay.parentNode) {
          transitionOverlay.parentNode.removeChild(transitionOverlay);
        }
      }, 150);
    }, 100);
  }

  /**
   * Salva preferência de tema
   */
  saveThemePreference(theme) {
    try {
      localStorage.setItem('ipv6-checker-theme', theme);
    } catch (error) {
      console.warn('[UIManager] Erro ao salvar preferência de tema:', error);
    }
  }

  /**
   * Alterna entre temas
   */
  toggleTheme() {
    const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  // ===== GERENCIAMENTO DE ABAS =====

  /**
   * Define aba ativa
   */
  setActiveTab(tabId) {
    const oldTab = this.state.activeTab;
    
    if (oldTab === tabId) return;

    this.state.activeTab = tabId;
    
    // Atualizar UI das abas
    this.updateTabsUI(tabId, oldTab);
    
    // Notificar observadores
    this.notifyObservers('tab', { oldTab, newTab: tabId });
    
    // Log para debugging
    console.log(`[UIManager] Aba alterada: ${oldTab} → ${tabId}`);
  }

  /**
   * Atualiza UI das abas
   */
  updateTabsUI(activeTabId, oldTabId) {
    // Atualizar botões de aba
    this.elements.tabs.forEach(tab => {
      const tabId = tab.dataset.tab;
      const isActive = tabId === activeTabId;
      
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive.toString());
    });

    // Atualizar conteúdo das abas
    this.elements.tabContents.forEach(content => {
      const tabId = content.id.replace('tab-', '');
      const isActive = tabId === activeTabId;
      
      if (isActive) {
        this.showTabContent(content);
      } else {
        this.hideTabContent(content);
      }
    });
  }

  /**
   * Mostra conteúdo da aba
   */
  showTabContent(content) {
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
  hideTabContent(content) {
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
   * Obtém aba ativa
   */
  getActiveTab() {
    return this.state.activeTab;
  }

  // ===== GERENCIAMENTO DE LOADING =====

  /**
   * Mostra estado de loading
   */
  showLoading(message = 'Carregando...', delay = 0) {
    if (this.state.isLoading) return;

    const showLoadingFn = () => {
      this.state.isLoading = true;
      
      if (this.elements.loadingOverlay) {
        const messageElement = this.elements.loadingOverlay.querySelector('p');
        if (messageElement) {
          messageElement.textContent = message;
        }
        
        this.elements.loadingOverlay.style.display = 'flex';
        this.elements.loadingOverlay.classList.add('active');
      }
      
      this.notifyObservers('loading', { isLoading: true, message });
    };

    if (delay > 0) {
      setTimeout(showLoadingFn, delay);
    } else {
      showLoadingFn();
    }
  }

  /**
   * Oculta estado de loading
   */
  hideLoading() {
    if (!this.state.isLoading) return;

    this.state.isLoading = false;
    
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.classList.remove('active');
      
      setTimeout(() => {
        if (!this.state.isLoading) {
          this.elements.loadingOverlay.style.display = 'none';
        }
      }, this.config.animationDuration);
    }
    
    this.notifyObservers('loading', { isLoading: false });
  }

  /**
   * Verifica se está em loading
   */
  isLoading() {
    return this.state.isLoading;
  }

  // ===== GERENCIAMENTO DE MODAIS =====

  /**
   * Abre modal
   */
  openModal(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn(`[UIManager] Modal não encontrado: ${modalId}`);
      return false;
    }

    // Adicionar à pilha de modais
    this.state.modalsOpen.add(modalId);
    
    // Configurar modal
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Focus management
    if (options.focusElement) {
      setTimeout(() => {
        const elementToFocus = modal.querySelector(options.focusElement);
        if (elementToFocus) {
          elementToFocus.focus();
        }
      }, 100);
    }
    
    // Aplicar configurações adicionais
    if (options.closeOnClickOutside !== false) {
      modal.addEventListener('click', this.handleModalClickOutside.bind(this));
    }
    
    return true;
  }

  /**
   * Fecha modal específico
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;

    // Remover da pilha
    this.state.modalsOpen.delete(modalId);
    
    // Animar saída
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
      modal.style.display = 'none';
    }, this.config.animationDuration);
    
    return true;
  }

  /**
   * Fecha modal no topo da pilha
   */
  closeTopModal() {
    const modalIds = Array.from(this.state.modalsOpen);
    if (modalIds.length > 0) {
      const topModalId = modalIds[modalIds.length - 1];
      this.closeModal(topModalId);
    }
  }

  /**
   * Fecha todos os modais
   */
  closeAllModals() {
    const modalIds = Array.from(this.state.modalsOpen);
    modalIds.forEach(modalId => this.closeModal(modalId));
  }

  /**
   * Manipula clique fora do modal
   */
  handleModalClickOutside(event) {
    if (event.target.classList.contains('modal-overlay')) {
      this.closeTopModal();
    }
  }

  // ===== GERENCIAMENTO DE NOTIFICAÇÕES =====

  /**
   * Cria container de notificações se não existir
   */
  ensureNotificationContainer() {
    if (!this.elements.notificationContainer) {
      const container = document.createElement('div');
      container.id = 'notificationContainer';
      container.className = 'notification-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-label', 'Notificações');
      document.body.appendChild(container);
      this.elements.notificationContainer = container;
    }
  }

  /**
   * Mostra notificação toast
   */
  showNotification(message, type = 'info', duration = null) {
    this.ensureNotificationContainer();
    
    const id = this.generateNotificationId();
    const actualDuration = duration || this.config.notificationDuration;
    
    // Criar elemento de notificação
    const notification = this.createNotificationElement(id, message, type);
    
    // Adicionar ao container
    this.elements.notificationContainer.appendChild(notification);
    
    // Animar entrada
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Armazenar referência
    this.state.notifications.set(id, {
      element: notification,
      type: type,
      message: message,
      timestamp: Date.now()
    });
    
    // Auto-remover
    setTimeout(() => {
      this.hideNotification(id);
    }, actualDuration);
    
    return id;
  }

  /**
   * Cria elemento de notificação
   */
  createNotificationElement(id, message, type) {
    const notification = document.createElement('div');
    notification.id = `notification-${id}`;
    notification.className = `notification ${type}`;
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
      <i class="${icons[type] || icons.info}"></i>
      <span class="notification-message">${this.escapeHtml(message)}</span>
      <button class="notification-close" aria-label="Fechar notificação">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Event listeners
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideNotification(id));
    }
    
    notification.addEventListener('click', () => this.hideNotification(id));
    
    return notification;
  }

  /**
   * Oculta notificação
   */
  hideNotification(id) {
    const notification = this.state.notifications.get(id);
    if (!notification) return;

    // Animar saída
    notification.element.classList.remove('show');
    
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.state.notifications.delete(id);
    }, this.config.animationDuration);
  }

  /**
   * Gera ID único para notificação
   */
  generateNotificationId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ===== UTILITÁRIOS =====

  /**
   * Escape HTML para prevenir XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Aplica preferências de acessibilidade
   */
  applyAccessibilityPreferences() {
    // Verificar preferência por movimento reduzido
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--transition-fast', '0ms');
      document.documentElement.style.setProperty('--transition', '0ms');
      document.documentElement.style.setProperty('--transition-slow', '0ms');
    }
    
    // Verificar preferência por alto contraste
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      document.body.classList.add('high-contrast');
    }
  }

  // ===== HANDLERS DE EVENTOS =====

  /**
   * Manipula tecla Escape
   */
  handleEscapeKey() {
    // Fechar modal no topo primeiro
    if (this.state.modalsOpen.size > 0) {
      this.closeTopModal();
      return;
    }
    
    // Se em loading, tentar cancelar
    if (this.state.isLoading) {
      this.hideLoading();
      return;
    }
  }

  /**
   * Manipula página oculta
   */
  handlePageHidden() {
    // Pausar animações desnecessárias
    document.body.classList.add('page-hidden');
  }

  /**
   * Manipula página visível
   */
  handlePageVisible() {
    // Retomar animações
    document.body.classList.remove('page-hidden');
  }

  /**
   * Manipula redimensionamento da janela
   */
  handleWindowResize() {
    // Fechar modais em telas pequenas se necessário
    if (window.innerWidth < 768 && this.state.modalsOpen.size > 0) {
      // Opcional: fechar modais automaticamente
      // this.closeAllModals();
    }
    
    // Ajustar notificações para telas pequenas
    this.adjustNotificationsForViewport();
  }

  /**
   * Ajusta notificações para viewport
   */
  adjustNotificationsForViewport() {
    if (this.elements.notificationContainer) {
      const isMobile = window.innerWidth < 768;
      this.elements.notificationContainer.classList.toggle('mobile', isMobile);
    }
  }

  /**
   * Manipula erro de imagem
   */
  handleImageError(img) {
    // Adicionar classe de erro e placeholder
    img.classList.add('image-error');
    img.alt = img.alt || 'Imagem não pôde ser carregada';
    
    // Opcional: substituir por imagem placeholder
    if (!img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      // img.src = '/path/to/placeholder.svg';
    }
  }

  // ===== SISTEMA DE OBSERVADORES =====

  /**
   * Adiciona observador para evento
   */
  addObserver(event, callback) {
    if (this.observers[event]) {
      this.observers[event].add(callback);
    }
  }

  /**
   * Remove observador para evento
   */
  removeObserver(event, callback) {
    if (this.observers[event]) {
      this.observers[event].delete(callback);
    }
  }

  /**
   * Notifica observadores de evento
   */
  notifyObservers(event, data) {
    if (this.observers[event]) {
      this.observers[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[UIManager] Erro em observador ${event}:`, error);
        }
      });
    }
  }

  // ===== API PÚBLICA =====

  /**
   * Obtém estado atual da UI
   */
  getState() {
    return {
      ...this.state,
      modalsOpen: Array.from(this.state.modalsOpen),
      notificationsCount: this.state.notifications.size
    };
  }

  /**
   * Obtém informações do viewport
   */
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768,
      isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
      isDesktop: window.innerWidth >= 1024
    };
  }

  /**
   * Força atualização da UI
   */
  forceUpdate() {
    this.applyTheme(this.state.theme);
    this.updateTabsUI(this.state.activeTab);
    this.adjustNotificationsForViewport();
  }

  /**
   * Limpa estado da UI
   */
  cleanup() {
    this.closeAllModals();
    this.state.notifications.forEach((notification, id) => {
      this.hideNotification(id);
    });
    this.hideLoading();
  }
}