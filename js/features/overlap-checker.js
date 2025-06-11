/**
 * Overlap Checker Feature - Funcionalidade Principal de Verificação de Sobreposição
 * Interface e lógica para a aba de verificação de overlap
 */

export class OverlapChecker {
  constructor(dependencies = {}) {
    this.ipv6Utils = dependencies.ipv6Utils;
    this.overlapEngine = dependencies.overlapEngine;
    this.validationEngine = dependencies.validationEngine;
    this.notifications = dependencies.notifications;
    this.uiManager = dependencies.uiManager;
    
    this.elements = {};
    this.state = {
      wanValid: false,
      lanValid: false,
      isChecking: false,
      lastResult: null,
      validationTimeouts: new Map()
    };
    
    this.config = {
      validationDelay: 300,
      autoSuggestions: true,
      showAdvancedDetails: false
    };
  }

  /**
   * Inicializa a feature
   */
  async init() {
    console.log('[OverlapChecker] Inicializando...');
    
    try {
      // Configurar dependências
      this.setupDependencies();
      
      // Mapear elementos DOM
      this.mapDOMElements();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Configurar validação inicial
      this.setupInitialState();
      
      console.log('[OverlapChecker] ✅ Inicializado');
      return true;
      
    } catch (error) {
      console.error('[OverlapChecker] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Configura dependências entre módulos
   */
  setupDependencies() {
    if (this.overlapEngine && this.ipv6Utils) {
      this.overlapEngine.setIPv6Utils(this.ipv6Utils);
    }
  }

  /**
   * Mapeia elementos DOM necessários
   */
  mapDOMElements() {
    this.elements = {
      // Form elements
      form: document.getElementById('overlapForm'),
      wanInput: document.getElementById('wanPrefix'),
      lanInput: document.getElementById('lanPrefix'),
      
      // Validation elements
      wanValidation: document.getElementById('wanValidation'),
      lanValidation: document.getElementById('lanValidation'),
      wanError: document.getElementById('wanError'),
      lanError: document.getElementById('lanError'),
      
      // Action buttons
      checkBtn: document.getElementById('checkOverlapBtn'),
      quickAnalysisBtn: document.getElementById('quickAnalysisBtn'),
      clearBtn: document.getElementById('clearBtn'),
      
      // Copy buttons
      copyWanBtn: document.getElementById('copyWanBtn'),
      copyLanBtn: document.getElementById('copyLanBtn'),
      copySuggestionBtn: document.getElementById('copySuggestionBtn'),
      
      // Results section
      resultsSection: document.getElementById('resultsSection'),
      statusIndicator: document.getElementById('statusIndicator'),
      statusTitle: document.getElementById('statusTitle'),
      statusMessage: document.getElementById('statusMessage'),
      resultDetails: document.getElementById('resultDetails'),
      
      // Suggestion section
      suggestionSection: document.getElementById('suggestionSection'),
      suggestedPrefix: document.getElementById('suggestedPrefix'),
      suggestionContext: document.getElementById('suggestionContext'),
      applySuggestionBtn: document.getElementById('applySuggestionBtn')
    };

    // Verificar elementos críticos
    const criticalElements = ['wanInput', 'lanInput', 'checkBtn', 'resultsSection'];
    for (const elementName of criticalElements) {
      if (!this.elements[elementName]) {
        throw new Error(`Elemento crítico não encontrado: ${elementName}`);
      }
    }
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Form submission
    if (this.elements.form) {
      this.elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.checkOverlap();
      });
    }

    // Input validation em tempo real
    this.elements.wanInput.addEventListener('input', () => {
      this.handleRealTimeValidation('wan');
    });

    this.elements.lanInput.addEventListener('input', () => {
      this.handleRealTimeValidation('lan');
    });

    // Input events para UX
    this.elements.wanInput.addEventListener('focus', () => this.handleInputFocus('wan'));
    this.elements.lanInput.addEventListener('focus', () => this.handleInputFocus('lan'));
    this.elements.wanInput.addEventListener('blur', () => this.handleInputBlur('wan'));
    this.elements.lanInput.addEventListener('blur', () => this.handleInputBlur('lan'));

    // Keyboard shortcuts
    this.elements.wanInput.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.elements.lanInput.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Action buttons
    this.elements.checkBtn.addEventListener('click', () => this.checkOverlap());
    
    if (this.elements.quickAnalysisBtn) {
      this.elements.quickAnalysisBtn.addEventListener('click', () => this.performQuickAnalysis());
    }
    
    if (this.elements.clearBtn) {
      this.elements.clearBtn.addEventListener('click', () => this.clearForm());
    }

    // Copy buttons
    if (this.elements.copyWanBtn) {
      this.elements.copyWanBtn.addEventListener('click', () => this.copyToClipboard('wan'));
    }
    
    if (this.elements.copyLanBtn) {
      this.elements.copyLanBtn.addEventListener('click', () => this.copyToClipboard('lan'));
    }
    
    if (this.elements.copySuggestionBtn) {
      this.elements.copySuggestionBtn.addEventListener('click', () => this.copyToClipboard('suggestion'));
    }

    // Suggestion button
    if (this.elements.applySuggestionBtn) {
      this.elements.applySuggestionBtn.addEventListener('click', () => this.applySuggestion());
    }
  }

  /**
   * Configura estado inicial
   */
  setupInitialState() {
    // Carregar valores padrão se campos estiverem vazios
    if (!this.elements.wanInput.value) {
      this.elements.wanInput.value = '2001:db8:a::1/64';
    }
    
    if (!this.elements.lanInput.value) {
      this.elements.lanInput.value = '2001:db8:b::/48';
    }
    
    // Validar valores iniciais
    setTimeout(() => {
      this.handleRealTimeValidation('wan', true);
      this.handleRealTimeValidation('lan', true);
    }, 100);
  }

  /**
   * Manipula validação em tempo real
   */
  handleRealTimeValidation(fieldType, isInitial = false) {
    const input = fieldType === 'wan' ? this.elements.wanInput : this.elements.lanInput;
    const value = input.value.trim();
    
    // Cancelar timeout anterior
    const timeoutKey = `validation_${fieldType}`;
    if (this.state.validationTimeouts.has(timeoutKey)) {
      clearTimeout(this.state.validationTimeouts.get(timeoutKey));
    }

    // Debounce para validação
    const timeout = setTimeout(() => {
      this.performFieldValidation(fieldType, value, isInitial);
      this.state.validationTimeouts.delete(timeoutKey);
    }, isInitial ? 0 : this.config.validationDelay);

    this.state.validationTimeouts.set(timeoutKey, timeout);
  }

  /**
   * Executa validação de campo
   */
  performFieldValidation(fieldType, value, isInitial = false) {
    const isWan = fieldType === 'wan';
    const input = isWan ? this.elements.wanInput : this.elements.lanInput;
    const validationIcon = isWan ? this.elements.wanValidation : this.elements.lanValidation;
    const errorElement = isWan ? this.elements.wanError : this.elements.lanError;

    // Reset visual state
    this.resetFieldValidation(input, validationIcon, errorElement);

    if (!value) {
      this.updateFieldState(fieldType, false);
      return;
    }

    try {
      // Usar IPv6Utils para validação
      const validation = this.ipv6Utils.validateIPv6(value);
      
      if (validation.valid) {
        this.showFieldSuccess(input, validationIcon, errorElement, validation);
        this.updateFieldState(fieldType, true);
      } else {
        if (!isInitial) {
          this.showFieldError(input, validationIcon, errorElement, 'Formato IPv6 inválido');
        }
        this.updateFieldState(fieldType, false);
      }
    } catch (error) {
      if (!isInitial) {
        this.showFieldError(input, validationIcon, errorElement, error.message);
      }
      this.updateFieldState(fieldType, false);
    }
  }

  /**
   * Reset do estado visual do campo
   */
  resetFieldValidation(input, validationIcon, errorElement) {
    input.classList.remove('valid', 'invalid');
    if (validationIcon) {
      validationIcon.className = 'validation-icon';
    }
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  /**
   * Mostra estado de sucesso do campo
   */
  showFieldSuccess(input, validationIcon, errorElement, validation) {
    input.classList.add('valid');
    if (validationIcon) {
      validationIcon.className = 'validation-icon fas fa-check-circle success';
    }
    
    // Mostrar warnings se houver
    if (validation.recommendations && validation.recommendations.length > 0) {
      const warnings = validation.recommendations.filter(r => r.type === 'warning');
      if (warnings.length > 0 && errorElement) {
        errorElement.textContent = `⚠️ ${warnings[0].message}`;
        errorElement.style.color = '#f59e0b';
      }
    }
  }

  /**
   * Mostra estado de erro do campo
   */
  showFieldError(input, validationIcon, errorElement, message) {
    input.classList.add('invalid');
    if (validationIcon) {
      validationIcon.className = 'validation-icon fas fa-times-circle error';
    }
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.color = '#ef4444';
    }
  }

  /**
   * Atualiza estado do campo
   */
  updateFieldState(fieldType, isValid) {
    if (fieldType === 'wan') {
      this.state.wanValid = isValid;
    } else {
      this.state.lanValid = isValid;
    }
    
    this.updateCheckButtonState();
  }

  /**
   * Atualiza estado do botão de verificação
   */
  updateCheckButtonState() {
    const canCheck = this.state.wanValid && this.state.lanValid && !this.state.isChecking;
    
    this.elements.checkBtn.disabled = !canCheck;
    
    if (canCheck) {
      this.elements.checkBtn.title = 'Verificar sobreposição entre os prefixos (Ctrl+Enter)';
    } else if (this.state.isChecking) {
      this.elements.checkBtn.title = 'Verificação em andamento...';
    } else {
      this.elements.checkBtn.title = 'Preencha ambos os prefixos com formatos válidos';
    }
  }

  /**
   * Manipula eventos de foco
   */
  handleInputFocus(fieldType) {
    const input = fieldType === 'wan' ? this.elements.wanInput : this.elements.lanInput;
    input.classList.add('focused');
    
    // Selecionar texto para facilitar edição
    setTimeout(() => input.select(), 10);
  }

  /**
   * Manipula eventos de blur
   */
  handleInputBlur(fieldType) {
    const input = fieldType === 'wan' ? this.elements.wanInput : this.elements.lanInput;
    input.classList.remove('focused');
  }

  /**
   * Manipula eventos de teclado
   */
  handleKeyDown(event) {
    // Enter - submeter form
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.state.wanValid && this.state.lanValid && !this.state.isChecking) {
        this.checkOverlap();
      }
    }
    
    // Escape - limpar campo
    if (event.key === 'Escape') {
      event.target.value = '';
      this.handleRealTimeValidation(event.target === this.elements.wanInput ? 'wan' : 'lan');
    }
  }

  /**
   * Função principal de verificação de overlap
   */
  async checkOverlap() {
    if (!this.state.wanValid || !this.state.lanValid || this.state.isChecking) {
      return;
    }

    const wanPrefix = this.elements.wanInput.value.trim();
    const lanPrefix = this.elements.lanInput.value.trim();

    console.log('[OverlapChecker] Verificando overlap:', { wanPrefix, lanPrefix });

    try {
      // Atualizar estado
      this.state.isChecking = true;
      this.updateCheckButtonState();
      this.updateButtonLoading(true);

      // Mostrar seção de resultados
      this.showResultsSection();
      this.showLoadingState();

      // Realizar verificação
      const result = await this.performOverlapCheck(wanPrefix, lanPrefix);
      
      // Armazenar resultado
      this.state.lastResult = result;

      // Exibir resultado
      this.displayResult(result, wanPrefix, lanPrefix);

    } catch (error) {
      console.error('[OverlapChecker] Erro na verificação:', error);
      this.displayError(error.message);
      this.notify('Erro na verificação: ' + error.message, 'error');
    } finally {
      // Resetar estado
      this.state.isChecking = false;
      this.updateCheckButtonState();
      this.updateButtonLoading(false);
    }
  }

  /**
   * Executa a verificação de overlap
   */
  async performOverlapCheck(wanPrefix, lanPrefix) {
    // Simular delay para melhor UX
    await new Promise(resolve => setTimeout(resolve, 300));

    // Usar OverlapEngine para verificação
    const result = this.overlapEngine.checkOverlapAdvanced(wanPrefix, lanPrefix);
    
    return result;
  }

  /**
   * Mostra seção de resultados
   */
  showResultsSection() {
    if (this.elements.resultsSection) {
      this.elements.resultsSection.style.display = 'block';
      this.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Mostra estado de loading
   */
  showLoadingState() {
    this.updateStatusIndicator('info', 'Verificando...', 'Analisando sobreposição entre os prefixos', 'fa-spinner fa-spin');
    this.hideResultDetails();
    this.hideSuggestionSection();
  }

  /**
   * Atualiza indicador de status
   */
  updateStatusIndicator(type, title, message, iconClass = '') {
    if (!this.elements.statusIndicator) return;

    // Reset classes
    this.elements.statusIndicator.classList.remove('success', 'warning', 'error', 'info');
    this.elements.statusIndicator.classList.add(type);

    // Atualizar ícone
    const iconElement = this.elements.statusIndicator.querySelector('.status-icon i');
    if (iconElement && iconClass) {
      iconElement.className = `fas ${iconClass}`;
    }

    // Atualizar texto
    if (this.elements.statusTitle) {
      this.elements.statusTitle.textContent = title;
    }
    
    if (this.elements.statusMessage) {
      this.elements.statusMessage.textContent = message;
    }
  }

  /**
   * Exibe resultado da verificação
   */
  displayResult(result, wanPrefix, lanPrefix) {
    if (result.error) {
      this.displayError(result.error);
      return;
    }

    if (result.hasOverlap) {
      this.displayOverlapResult(result, wanPrefix, lanPrefix);
    } else {
      this.displayNoOverlapResult(result, wanPrefix, lanPrefix);
    }
  }

  /**
   * Exibe resultado de sobreposição
   */
  displayOverlapResult(result, wanPrefix, lanPrefix) {
    const severity = result.severity || { label: 'Médio', color: 'warning' };
    
    this.updateStatusIndicator(
      severity.color,
      'Conflito Detectado!',
      result.reason || 'Os prefixos se sobrepõem',
      'fa-exclamation-triangle'
    );

    // Mostrar detalhes
    this.showResultDetails(result);

    // Tentar gerar sugestão
    if (this.config.autoSuggestions) {
      this.generateAndShowSuggestion(lanPrefix, wanPrefix, result);
    }

    // Notificar
    this.notify('Conflito detectado entre os prefixos', 'warning', 4000);
  }

  /**
   * Exibe resultado sem sobreposição
   */
  displayNoOverlapResult(result, wanPrefix, lanPrefix) {
    this.updateStatusIndicator(
      'success',
      'Sem Conflitos',
      result.reason || 'Os prefixos não se sobrepõem',
      'fa-check-circle'
    );

    // Mostrar detalhes se disponível
    if (result.details) {
      this.showResultDetails(result);
    }

    // Ocultar sugestões
    this.hideSuggestionSection();

    // Notificar
    this.notify('✅ Nenhum conflito detectado', 'success', 3000);
  }

  /**
   * Exibe erro
   */
  displayError(message) {
    this.updateStatusIndicator(
      'error',
      'Erro na Verificação',
      message,
      'fa-exclamation-circle'
    );

    this.hideResultDetails();
    this.hideSuggestionSection();
  }

  /**
   * Mostra detalhes do resultado
   */
  showResultDetails(result) {
    if (!this.elements.resultDetails) return;

    let detailsHTML = '<div class="result-details-content">';
    
    // Informações básicas
    detailsHTML += `
      <div class="detail-section">
        <h4><i class="fas fa-info-circle"></i> Informações da Análise</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Tipo de Análise:</span>
            <span class="detail-value">${result.overlapType || 'Básica'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Tempo de Execução:</span>
            <span class="detail-value">${result.details?.performance?.executionTime?.toFixed(2) || '0'}ms</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Confiança:</span>
            <span class="detail-value">${result.confidence || 100}%</span>
          </div>
        </div>
      </div>
    `;

    // Detalhes específicos de sobreposição
    if (result.hasOverlap && result.details?.analysis?.details) {
      const analysis = result.details.analysis.details;
      detailsHTML += `
        <div class="detail-section">
          <h4><i class="fas fa-exclamation-triangle"></i> Detalhes da Sobreposição</h4>
          <div class="detail-grid">
            ${analysis.overlapSize ? `
              <div class="detail-item">
                <span class="detail-label">Endereços Afetados:</span>
                <span class="detail-value">${analysis.affectedAddresses || analysis.overlapSize}</span>
              </div>
            ` : ''}
            ${analysis.percentageOverlap ? `
              <div class="detail-item">
                <span class="detail-label">Percentual de Sobreposição:</span>
                <span class="detail-value">${analysis.percentageOverlap}%</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Recomendações
    if (result.details?.recommendations?.length > 0) {
      detailsHTML += '<div class="detail-section">';
      detailsHTML += '<h4><i class="fas fa-lightbulb"></i> Recomendações</h4>';
      detailsHTML += '<div class="recommendations-list">';
      
      result.details.recommendations.forEach(rec => {
        detailsHTML += `
          <div class="recommendation-item ${rec.type}">
            <div class="recommendation-header">
              <i class="fas ${this.getRecommendationIcon(rec.type)}"></i>
              <strong>${rec.title}</strong>
            </div>
            <p>${rec.description}</p>
            ${rec.action ? `<div class="recommendation-action">${rec.action}</div>` : ''}
          </div>
        `;
      });
      
      detailsHTML += '</div></div>';
    }

    detailsHTML += '</div>';

    this.elements.resultDetails.innerHTML = detailsHTML;
    this.elements.resultDetails.style.display = 'block';
  }

  /**
   * Obtém ícone para tipo de recomendação
   */
  getRecommendationIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      warning: 'fa-exclamation-triangle',
      error: 'fa-times-circle',
      info: 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
  }

  /**
   * Oculta detalhes do resultado
   */
  hideResultDetails() {
    if (this.elements.resultDetails) {
      this.elements.resultDetails.style.display = 'none';
    }
  }

  /**
   * Gera e mostra sugestão
   */
  generateAndShowSuggestion(lanPrefix, wanPrefix, result) {
    try {
      // Tentar obter sugestão do resultado primeiro
      let suggestion = null;
      
      if (result.details?.recommendations) {
        const suggestionRec = result.details.recommendations.find(r => r.suggestion);
        if (suggestionRec) {
          suggestion = suggestionRec.suggestion;
        }
      }
      
      // Se não há sugestão, tentar gerar uma
      if (!suggestion) {
        suggestion = this.overlapEngine.generateSuggestion(lanPrefix, wanPrefix);
      }
      
      this.showSuggestionSection(suggestion, wanPrefix, lanPrefix);
      
    } catch (error) {
      console.warn('[OverlapChecker] Erro ao gerar sugestão:', error);
      this.showSuggestionSection(null, wanPrefix, lanPrefix);
    }
  }

  /**
   * Mostra seção de sugestão
   */
  showSuggestionSection(suggestion, wanPrefix, lanPrefix) {
    if (!this.elements.suggestionSection) return;

    if (suggestion) {
      if (this.elements.suggestedPrefix) {
        this.elements.suggestedPrefix.textContent = suggestion;
      }
      
      if (this.elements.suggestionContext) {
        this.elements.suggestionContext.innerHTML = 
          `Este prefixo sugerido (<code>${suggestion}</code>) não conflita com o bloco WAN (<code>${wanPrefix}</code>).`;
      }
      
      if (this.elements.applySuggestionBtn) {
        this.elements.applySuggestionBtn.disabled = false;
      }
    } else {
      if (this.elements.suggestedPrefix) {
        this.elements.suggestedPrefix.textContent = '-';
      }
      
      if (this.elements.suggestionContext) {
        this.elements.suggestionContext.textContent = 
          'Não foi possível gerar uma sugestão automática neste caso.';
      }
      
      if (this.elements.applySuggestionBtn) {
        this.elements.applySuggestionBtn.disabled = true;
      }
    }

    this.elements.suggestionSection.style.display = 'block';
  }

  /**
   * Oculta seção de sugestão
   */
  hideSuggestionSection() {
    if (this.elements.suggestionSection) {
      this.elements.suggestionSection.style.display = 'none';
    }
  }

  /**
   * Aplica sugestão ao campo LAN
   */
  applySuggestion() {
    const suggestedPrefix = this.elements.suggestedPrefix?.textContent;
    
    if (suggestedPrefix && suggestedPrefix !== '-') {
      this.elements.lanInput.value = suggestedPrefix;
      this.handleRealTimeValidation('lan');
      this.elements.lanInput.focus();
      
      // Feedback visual no botão
      this.showAppliedFeedback();
      
      this.notify('Sugestão aplicada com sucesso!', 'success', 2000);
    }
  }

  /**
   * Mostra feedback visual de aplicação
   */
  showAppliedFeedback() {
    if (!this.elements.applySuggestionBtn) return;
    
    const originalHTML = this.elements.applySuggestionBtn.innerHTML;
    const originalClass = this.elements.applySuggestionBtn.className;
    
    this.elements.applySuggestionBtn.innerHTML = '<i class="fas fa-check"></i> Aplicado!';
    this.elements.applySuggestionBtn.className = 'btn-primary applied';
    
    setTimeout(() => {
      this.elements.applySuggestionBtn.innerHTML = originalHTML;
      this.elements.applySuggestionBtn.className = originalClass;
    }, 1500);
  }

  /**
   * Atualiza loading do botão principal
   */
  updateButtonLoading(isLoading) {
    if (!this.elements.checkBtn) return;
    
    const icon = this.elements.checkBtn.querySelector('i');
    const text = this.elements.checkBtn.querySelector('span');
    
    if (isLoading) {
      if (icon) icon.className = 'fas fa-spinner fa-spin';
      if (text) text.textContent = 'Verificando...';
    } else {
      if (icon) icon.className = 'fas fa-check-double';
      if (text) text.textContent = 'Verificar Sobreposição';
    }
  }

  /**
   * Análise rápida dos prefixos
   */
  async performQuickAnalysis() {
    const wanPrefix = this.elements.wanInput.value.trim();
    const lanPrefix = this.elements.lanInput.value.trim();

    if (!wanPrefix && !lanPrefix) {
      this.notify('Preencha pelo menos um campo para análise rápida', 'warning');
      return;
    }

    try {
      const analyses = [];
      
      if (wanPrefix) {
        try {
          const analysis = this.ipv6Utils.analyzeAddress(wanPrefix);
          analyses.push({ type: 'WAN', prefix: wanPrefix, data: analysis });
        } catch (error) {
          analyses.push({ type: 'WAN', prefix: wanPrefix, error: error.message });
        }
      }

      if (lanPrefix) {
        try {
          const analysis = this.ipv6Utils.analyzeAddress(lanPrefix);
          analyses.push({ type: 'LAN', prefix: lanPrefix, data: analysis });
        } catch (error) {
          analyses.push({ type: 'LAN', prefix: lanPrefix, error: error.message });
        }
      }

      this.displayQuickAnalysisResults(analyses);
      
    } catch (error) {
      this.notify('Erro na análise rápida: ' + error.message, 'error');
    }
  }

  /**
   * Exibe resultados da análise rápida
   */
  displayQuickAnalysisResults(analyses) {
    this.showResultsSection();
    
    this.updateStatusIndicator(
      'info',
      'Análise Rápida Concluída',
      'Informações detalhadas dos prefixos',
      'fa-bolt'
    );

    let html = '<div class="quick-analysis-results">';
    
    analyses.forEach(analysis => {
      html += `<div class="analysis-card ${analysis.error ? 'error' : 'success'}">`;
      html += `<h4><i class="fas ${analysis.type === 'WAN' ? 'fa-globe' : 'fa-network-wired'}"></i> ${analysis.type}</h4>`;
      html += `<div class="analysis-prefix"><code>${analysis.prefix}</code></div>`;
      
      if (analysis.error) {
        html += `<div class="analysis-error"><i class="fas fa-exclamation-circle"></i> ${analysis.error}</div>`;
      } else {
        const data = analysis.data;
        html += '<div class="analysis-details">';
        html += `<div class="detail-row"><span>Tipo:</span> <span>${data.type || 'Desconhecido'}</span></div>`;
        html += `<div class="detail-row"><span>Escopo:</span> <span>${data.scope || 'Desconhecido'}</span></div>`;
        if (data.compressed && data.compressed !== data.original) {
          html += `<div class="detail-row"><span>Comprimido:</span> <span><code>${data.compressed}</code></span></div>`;
        }
        if (data.rfc) {
          html += `<div class="detail-row"><span>RFC:</span> <span>${data.rfc.rfc} (${data.rfc.type})</span></div>`;
        }
        html += '</div>';
        
        if (data.recommendations?.length > 0) {
          html += '<div class="analysis-recommendations">';
          data.recommendations.forEach(rec => {
            html += `<div class="recommendation ${rec.type}"><i class="fas ${this.getRecommendationIcon(rec.type)}"></i> ${rec.message}</div>`;
          });
          html += '</div>';
        }
      }
      
      html += '</div>';
    });
    
    html += '</div>';

    this.elements.resultDetails.innerHTML = html;
    this.elements.resultDetails.style.display = 'block';
    this.hideSuggestionSection();
  }

  /**
   * Copia conteúdo para área de transferência
   */
  async copyToClipboard(type) {
    let textToCopy = '';
    let label = '';

    switch (type) {
      case 'wan':
        textToCopy = this.elements.wanInput.value.trim();
        label = 'Prefixo WAN';
        break;
      case 'lan':
        textToCopy = this.elements.lanInput.value.trim();
        label = 'Prefixo LAN';
        break;
      case 'suggestion':
        textToCopy = this.elements.suggestedPrefix?.textContent?.trim() || '';
        label = 'Sugestão';
        break;
    }

    if (!textToCopy || textToCopy === '-') {
      this.notify(`${label} está vazio`, 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.notify(`${label} copiado!`, 'success', 1500);
    } catch (error) {
      // Fallback para navegadores antigos
      this.fallbackCopy(textToCopy, label);
    }
  }

  /**
   * Fallback para cópia em navegadores antigos
   */
  fallbackCopy(text, label) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      this.notify(`${label} copiado!`, 'success', 1500);
    } catch (error) {
      this.notify('Erro ao copiar', 'error');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Limpa formulário
   */
  clearForm() {
    this.elements.wanInput.value = '';
    this.elements.lanInput.value = '';
    
    this.handleRealTimeValidation('wan');
    this.handleRealTimeValidation('lan');
    
    if (this.elements.resultsSection) {
      this.elements.resultsSection.style.display = 'none';
    }
    
    this.state.lastResult = null;
    
    this.notify('Formulário limpo', 'info', 1500);
  }

  /**
   * Notificação (interface com sistema de notificações)
   */
  notify(message, type = 'info', duration = 3000) {
    if (this.notifications) {
      this.notifications.show(message, type, duration);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Obtém estado atual da feature
   */
  getState() {
    return {
      ...this.state,
      wanValue: this.elements.wanInput?.value || '',
      lanValue: this.elements.lanInput?.value || ''
    };
  }

  /**
   * Define valores dos campos
   */
  setValues(wanValue, lanValue) {
    if (wanValue && this.elements.wanInput) {
      this.elements.wanInput.value = wanValue;
      this.handleRealTimeValidation('wan');
    }
    
    if (lanValue && this.elements.lanInput) {
      this.elements.lanInput.value = lanValue;
      this.handleRealTimeValidation('lan');
    }
  }
}