/**
 * Notification System - Sistema de Notificações Toast
 * Sistema de notificações não intrusivas para feedback do usuário
 */

export class NotificationSystem {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.nextId = 1;
    
    this.config = {
      defaultDuration: 3000,
      maxNotifications: 5,
      position: 'top-right',
      stackDirection: 'down'
    };
    
    this.types = {
      success: {
        icon: 'fas fa-check-circle',
        className: 'success',
        defaultDuration: 3000
      },
      error: {
        icon: 'fas fa-exclamation-circle',
        className: 'error',
        defaultDuration: 5000
      },
      warning: {
        icon: 'fas fa-exclamation-triangle',
        className: 'warning',
        defaultDuration: 4000
      },
      info: {
        icon: 'fas fa-info-circle',
        className: 'info',
        defaultDuration: 3000
      }
    };
  }

  /**
   * Inicializa o sistema de notificações
   */
  async init() {
    console.log('[NotificationSystem] Inicializando...');
    
    try {
      // Criar container de notificações
      this.createContainer();
      
      // Configurar event listeners globais
      this.setupGlobalListeners();
      
      console.log('[NotificationSystem] ✅ Inicializado');
      return true;
      
    } catch (error) {
      console.error('[NotificationSystem] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Cria container de notificações
   */
  createContainer() {
    // Verificar se já existe
    this.container = document.getElementById('notificationContainer');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notificationContainer';
      this.container.className = 'notification-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-label', 'Notificações');
      document.body.appendChild(this.container);
    }
    
    // Aplicar posicionamento
    this.applyPositioning();
  }

  /**
   * Aplica posicionamento do container
   */
  applyPositioning() {
    if (!this.container) return;
    
    const positions = {
      'top-right': { top: '1rem', right: '1rem', left: 'auto', bottom: 'auto' },
      'top-left': { top: '1rem', left: '1rem', right: 'auto', bottom: 'auto' },
      'bottom-right': { bottom: '1rem', right: '1rem', left: 'auto', top: 'auto' },
      'bottom-left': { bottom: '1rem', left: '1rem', right: 'auto', top: 'auto' },
      'top-center': { top: '1rem', left: '50%', transform: 'translateX(-50%)', right: 'auto', bottom: 'auto' },
      'bottom-center': { bottom: '1rem', left: '50%', transform: 'translateX(-50%)', right: 'auto', top: 'auto' }
    };
    
    const position = positions[this.config.position] || positions['top-right'];
    
    Object.assign(this.container.style, {
      position: 'fixed',
      zIndex: '9999',
      pointerEvents: 'none',
      maxWidth: '400px',
      ...position
    });
  }

  /**
   * Configura listeners globais
   */
  setupGlobalListeners() {
    // Listener para redimensionamento da janela
    window.addEventListener('resize', this.debounce(() => {
      this.adjustForViewport();
    }, 250));
    
    // Listener para mudança de orientação em mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.adjustForViewport(), 100);
    });
  }

  /**
   * Mostra notificação
   */
  show(message, type = 'info', duration = null) {
    if (!message) {
      console.warn('[NotificationSystem] Mensagem vazia ignorada');
      return null;
    }

    const notificationType = this.types[type] || this.types.info;
    const notificationDuration = duration || notificationType.defaultDuration;
    const id = this.generateId();

    // Verificar limite de notificações
    this.checkNotificationLimit();

    // Criar elemento de notificação
    const element = this.createElement(id, message, notificationType);
    
    // Adicionar ao container
    this.container.appendChild(element);
    
    // Armazenar referência
    const notification = {
      id: id,
      element: element,
      type: type,
      message: message,
      timestamp: Date.now(),
      duration: notificationDuration,
      timer: null
    };
    
    this.notifications.set(id, notification);
    
    // Animar entrada
    this.animateIn(element);
    
    // Configurar auto-dismiss
    if (notificationDuration > 0) {
      notification.timer = setTimeout(() => {
        this.hide(id);
      }, notificationDuration);
    }
    
    // Log para debugging
    console.log(`[NotificationSystem] Notificação criada: ${type} - ${message}`);
    
    return id;
  }

  /**
   * Cria elemento DOM da notificação
   */
  createElement(id, message, notificationType) {
    const notification = document.createElement('div');
    notification.id = `notification-${id}`;
    notification.className = `notification ${notificationType.className}`;
    notification.setAttribute('role', 'alert');
    notification.style.pointerEvents = 'auto';
    
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">
          <i class="${notificationType.icon}"></i>
        </div>
        <div class="notification-message">
          ${this.escapeHtml(message)}
        </div>
        <button class="notification-close" aria-label="Fechar notificação" type="button">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Event listeners
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide(id);
      });
    }
    
    // Click na notificação para fechar
    notification.addEventListener('click', () => {
      this.hide(id);
    });
    
    // Hover para pausar timer
    notification.addEventListener('mouseenter', () => {
      this.pauseTimer(id);
    });
    
    notification.addEventListener('mouseleave', () => {
      this.resumeTimer(id);
    });
    
    return notification;
  }

  /**
   * Anima entrada da notificação
   */
  animateIn(element) {
    // Estado inicial
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';
    
    // Forçar reflow
    element.offsetHeight;
    
    // Animar
    requestAnimationFrame(() => {
      element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';
    });
  }

  /**
   * Anima saída da notificação
   */
  animateOut(element, callback) {
    element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';
    
    setTimeout(() => {
      if (callback) callback();
    }, 300);
  }

  /**
   * Oculta notificação
   */
  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Cancelar timer
    if (notification.timer) {
      clearTimeout(notification.timer);
      notification.timer = null;
    }

    // Animar saída
    this.animateOut(notification.element, () => {
      // Remover do DOM
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      
      // Remover da coleção
      this.notifications.delete(id);
    });

    console.log(`[NotificationSystem] Notificação removida: ${id}`);
  }

  /**
   * Pausa timer da notificação
   */
  pauseTimer(id) {
    const notification = this.notifications.get(id);
    if (!notification || !notification.timer) return;

    clearTimeout(notification.timer);
    notification.timer = null;
    notification.pausedAt = Date.now();
  }

  /**
   * Resume timer da notificação
   */
  resumeTimer(id) {
    const notification = this.notifications.get(id);
    if (!notification || !notification.pausedAt) return;

    const elapsed = Date.now() - notification.timestamp;
    const remaining = notification.duration - elapsed;

    if (remaining > 0) {
      notification.timer = setTimeout(() => {
        this.hide(id);
      }, remaining);
    } else {
      this.hide(id);
    }

    delete notification.pausedAt;
  }

  /**
   * Verifica limite de notificações
   */
  checkNotificationLimit() {
    const count = this.notifications.size;
    
    if (count >= this.config.maxNotifications) {
      // Remover notificações mais antigas
      const sortedNotifications = Array.from(this.notifications.values())
        .sort((a, b) => a.timestamp - b.timestamp);
      
      const toRemove = count - this.config.maxNotifications + 1;
      
      for (let i = 0; i < toRemove; i++) {
        if (sortedNotifications[i]) {
          this.hide(sortedNotifications[i].id);
        }
      }
    }
  }

  /**
   * Ajusta para viewport mobile
   */
  adjustForViewport() {
    if (!this.container) return;
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      Object.assign(this.container.style, {
        left: '0.5rem',
        right: '0.5rem',
        maxWidth: 'none'
      });
    } else {
      this.applyPositioning();
    }
  }

  /**
   * Gera ID único
   */
  generateId() {
    return this.nextId++;
  }

  /**
   * Escape HTML para prevenir XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Debounce utility
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

  // ===== MÉTODOS DE CONVENIÊNCIA =====

  /**
   * Mostra notificação de sucesso
   */
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  /**
   * Mostra notificação de erro
   */
  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  /**
   * Mostra notificação de aviso
   */
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  /**
   * Mostra notificação informativa
   */
  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  /**
   * Remove todas as notificações
   */
  clear() {
    const notificationIds = Array.from(this.notifications.keys());
    notificationIds.forEach(id => this.hide(id));
  }

  /**
   * Remove notificações por tipo
   */
  clearByType(type) {
    const toRemove = Array.from(this.notifications.values())
      .filter(n => n.type === type)
      .map(n => n.id);
    
    toRemove.forEach(id => this.hide(id));
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    const typeCount = {};
    
    this.notifications.forEach(notification => {
      typeCount[notification.type] = (typeCount[notification.type] || 0) + 1;
    });

    return {
      total: this.notifications.size,
      byType: typeCount,
      maxNotifications: this.config.maxNotifications
    };
  }

  /**
   * Configura opções
   */
  configure(options) {
    Object.assign(this.config, options);
    
    // Reaplicar posicionamento se mudou
    if (options.position) {
      this.applyPositioning();
    }
  }

  /**
   * Destruir sistema de notificações
   */
  destroy() {
    this.clear();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.container = null;
    this.notifications.clear();
  }
}