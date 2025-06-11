/**
 * Export Manager - Gerenciador de Exportação de Dados
 * Sistema para exportar resultados em múltiplos formatos
 */

export class ExportManager {
  constructor() {
    this.supportedFormats = ['csv', 'json', 'xlsx', 'txt'];
    this.config = {
      defaultFilename: 'ipv6_analysis',
      dateFormat: 'YYYY-MM-DD_HH-mm-ss',
      encoding: 'utf-8'
    };
  }

  /**
   * Inicializa o gerenciador de exportação
   */
  async init() {
    console.log('[ExportManager] Inicializando...');
    
    try {
      // Verificar suporte do navegador
      this.checkBrowserSupport();
      
      console.log('[ExportManager] ✅ Inicializado');
      return true;
      
    } catch (error) {
      console.error('[ExportManager] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Verifica suporte do navegador
   */
  checkBrowserSupport() {
    // Verificar APIs necessárias
    if (!window.Blob) {
      throw new Error('Blob API não suportada');
    }
    
    if (!window.URL || !window.URL.createObjectURL) {
      throw new Error('URL API não suportada');
    }
    
    // Verificar se pode criar links de download
    const testLink = document.createElement('a');
    if (typeof testLink.download === 'undefined') {
      console.warn('[ExportManager] Download attribute não suportado - usando fallback');
    }
  }

  /**
   * Exporta dados no formato especificado
   */
  async exportData(data, format, filename = null, options = {}) {
    try {
      // Validar parâmetros
      if (!data) {
        throw new Error('Dados não fornecidos para exportação');
      }
      
      if (!this.supportedFormats.includes(format.toLowerCase())) {
        throw new Error(`Formato não suportado: ${format}`);
      }
      
      // Gerar nome do arquivo
      const finalFilename = this.generateFilename(filename, format);
      
      // Processar dados baseado no formato
      const processedData = await this.processDataForFormat(data, format, options);
      
      // Criar e baixar arquivo
      this.downloadFile(processedData.content, finalFilename, processedData.mimeType);
      
      console.log(`[ExportManager] Arquivo exportado: ${finalFilename}`);
      return { success: true, filename: finalFilename };
      
    } catch (error) {
      console.error('[ExportManager] Erro na exportação:', error);
      throw error;
    }
  }

  /**
   * Processa dados para o formato especificado
   */
  async processDataForFormat(data, format, options) {
    switch (format.toLowerCase()) {
      case 'csv':
        return this.processCSV(data, options);
      case 'json':
        return this.processJSON(data, options);
      case 'xlsx':
        return await this.processXLSX(data, options);
      case 'txt':
        return this.processTXT(data, options);
      default:
        throw new Error(`Processamento não implementado para formato: ${format}`);
    }
  }

  /**
   * Processa dados para CSV
   */
  processCSV(data, options = {}) {
    const {
      delimiter = ',',
      includeHeaders = true,
      encoding = 'utf-8'
    } = options;

    let csvContent = '';
    
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error('Array de dados vazio');
      }
      
      // Se é array de objetos
      if (typeof data[0] === 'object') {
        const headers = Object.keys(data[0]);
        
        if (includeHeaders) {
          csvContent += headers.map(h => this.escapeCsvField(h)).join(delimiter) + '\n';
        }
        
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header] ?? '';
            return this.escapeCsvField(String(value));
          });
          csvContent += values.join(delimiter) + '\n';
        });
      } else {
        // Array simples
        data.forEach(item => {
          csvContent += this.escapeCsvField(String(item)) + '\n';
        });
      }
    } else if (typeof data === 'object') {
      // Objeto simples - converter para key-value
      if (includeHeaders) {
        csvContent += 'Key' + delimiter + 'Value\n';
      }
      
      Object.entries(data).forEach(([key, value]) => {
        csvContent += this.escapeCsvField(key) + delimiter + this.escapeCsvField(String(value)) + '\n';
      });
    } else {
      throw new Error('Formato de dados não suportado para CSV');
    }

    return {
      content: csvContent,
      mimeType: 'text/csv;charset=utf-8'
    };
  }

  /**
   * Processa dados para JSON
   */
  processJSON(data, options = {}) {
    const {
      pretty = true,
      encoding = 'utf-8'
    } = options;

    try {
      const jsonContent = pretty ? 
        JSON.stringify(data, null, 2) : 
        JSON.stringify(data);

      return {
        content: jsonContent,
        mimeType: 'application/json;charset=utf-8'
      };
    } catch (error) {
      throw new Error(`Erro ao serializar JSON: ${error.message}`);
    }
  }

  /**
   * Processa dados para XLSX (Excel)
   */
  async processXLSX(data, options = {}) {
    // Nota: Esta é uma implementação simples
    // Para produção, considere usar bibliotecas como SheetJS
    
    const {
      sheetName = 'Data',
      includeHeaders = true
    } = options;

    // Converter para formato compatível com Excel (TSV)
    const tsvData = await this.processDataForFormat(data, 'csv', {
      delimiter: '\t',
      includeHeaders
    });

    // Para uma implementação completa, você precisaria:
    // 1. Usar SheetJS (xlsx) library
    // 2. Criar workbook e worksheet
    // 3. Aplicar formatação
    
    console.warn('[ExportManager] XLSX export usando fallback TSV');
    
    return {
      content: tsvData.content,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Processa dados para TXT
   */
  processTXT(data, options = {}) {
    const {
      separator = '\n',
      includeTimestamp = true,
      encoding = 'utf-8'
    } = options;

    let txtContent = '';
    
    if (includeTimestamp) {
      txtContent += `Generated: ${new Date().toISOString()}\n`;
      txtContent += '=' + '='.repeat(50) + '\n\n';
    }

    if (Array.isArray(data)) {
      if (typeof data[0] === 'object') {
        data.forEach((item, index) => {
          txtContent += `Item ${index + 1}:\n`;
          Object.entries(item).forEach(([key, value]) => {
            txtContent += `  ${key}: ${value}\n`;
          });
          txtContent += '\n';
        });
      } else {
        txtContent += data.join(separator);
      }
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        txtContent += `${key}: ${value}\n`;
      });
    } else {
      txtContent += String(data);
    }

    return {
      content: txtContent,
      mimeType: 'text/plain;charset=utf-8'
    };
  }

  /**
   * Escapa campo para CSV
   */
  escapeCsvField(field) {
    const stringField = String(field);
    
    // Se contém vírgula, quebra de linha ou aspas, precisa ser escapado
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
      return '"' + stringField.replace(/"/g, '""') + '"';
    }
    
    return stringField;
  }

  /**
   * Gera nome do arquivo
   */
  generateFilename(customName, format) {
    const timestamp = new Date().toISOString()
      .replace(/[:]/g, '-')
      .replace(/\..+/, '');
    
    const baseName = customName || this.config.defaultFilename;
    const extension = format.toLowerCase();
    
    return `${baseName}_${timestamp}.${extension}`;
  }

  /**
   * Faz download do arquivo
   */
  downloadFile(content, filename, mimeType) {
    try {
      // Criar Blob
      const blob = new Blob([content], { type: mimeType });
      
      // Criar URL do blob
      const url = window.URL.createObjectURL(blob);
      
      // Criar link temporário
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Adicionar ao DOM, clicar e remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL do blob
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('[ExportManager] Erro no download:', error);
      
      // Fallback: tentar abrir em nova aba
      try {
        const dataUrl = 'data:' + mimeType + ';base64,' + btoa(content);
        window.open(dataUrl, '_blank');
      } catch (fallbackError) {
        throw new Error('Não foi possível fazer download do arquivo');
      }
    }
  }

  /**
   * Exporta resultados de análise de overlap
   */
  async exportOverlapResults(results, format = 'json', filename = null) {
    const exportData = {
      timestamp: new Date().toISOString(),
      type: 'overlap_analysis',
      results: results
    };

    return this.exportData(exportData, format, filename || 'overlap_analysis');
  }

  /**
   * Exporta lista de sub-redes
   */
  async exportSubnetList(subnets, format = 'csv', filename = null) {
    const exportData = subnets.map(subnet => ({
      'Network': subnet.network || subnet.cidr,
      'First Host': subnet.firstHost || '',
      'Last Host': subnet.lastHost || '',
      'Total Addresses': subnet.totalAddresses || '',
      'Type': subnet.type || 'Subnet'
    }));

    return this.exportData(exportData, format, filename || 'subnet_list');
  }

  /**
   * Exporta relatório de validação
   */
  async exportValidationReport(validationResults, format = 'json', filename = null) {
    const exportData = {
      timestamp: new Date().toISOString(),
      type: 'validation_report',
      summary: {
        total: validationResults.length,
        valid: validationResults.filter(r => r.valid).length,
        invalid: validationResults.filter(r => !r.valid).length
      },
      results: validationResults
    };

    return this.exportData(exportData, format, filename || 'validation_report');
  }

  /**
   * Obtém formatos suportados
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Verifica se formato é suportado
   */
  isFormatSupported(format) {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  /**
   * Obtém informações do formato
   */
  getFormatInfo(format) {
    const formatInfo = {
      'csv': {
        name: 'CSV (Comma Separated Values)',
        description: 'Arquivo de valores separados por vírgula',
        mimeType: 'text/csv',
        extension: 'csv',
        useCase: 'Ideal para planilhas e análise de dados'
      },
      'json': {
        name: 'JSON (JavaScript Object Notation)',
        description: 'Formato de dados estruturados',
        mimeType: 'application/json',
        extension: 'json',
        useCase: 'Ideal para intercâmbio de dados e APIs'
      },
      'xlsx': {
        name: 'Excel Spreadsheet',
        description: 'Planilha do Microsoft Excel',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
        useCase: 'Ideal para relatórios complexos com formatação'
      },
      'txt': {
        name: 'Plain Text',
        description: 'Arquivo de texto simples',
        mimeType: 'text/plain',
        extension: 'txt',
        useCase: 'Ideal para documentação e logs simples'
      }
    };

    return formatInfo[format.toLowerCase()] || null;
  }

  /**
   * Calcula tamanho estimado do arquivo
   */
  estimateFileSize(data, format) {
    try {
      // Estimativa aproximada baseada no formato
      const dataStr = JSON.stringify(data);
      const baseSize = new Blob([dataStr]).size;
      
      const multipliers = {
        'json': 1.0,
        'csv': 0.7,
        'txt': 0.8,
        'xlsx': 1.3
      };
      
      const multiplier = multipliers[format.toLowerCase()] || 1.0;
      const estimatedSize = Math.round(baseSize * multiplier);
      
      return {
        bytes: estimatedSize,
        readable: this.formatFileSize(estimatedSize)
      };
    } catch (error) {
      return {
        bytes: 0,
        readable: 'Desconhecido'
      };
    }
  }

  /**
   * Formata tamanho do arquivo para leitura humana
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Exporta múltiplos conjuntos de dados
   */
  async exportBatch(exports) {
    const results = [];
    
    for (const exportConfig of exports) {
      try {
        const result = await this.exportData(
          exportConfig.data,
          exportConfig.format,
          exportConfig.filename,
          exportConfig.options
        );
        results.push({ ...result, name: exportConfig.name || exportConfig.filename });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          name: exportConfig.name || exportConfig.filename
        });
      }
    }
    
    return results;
  }

  /**
   * Cria template de exportação
   */
  createExportTemplate(templateName, data) {
    const templates = {
      'network_plan': {
        format: 'csv',
        options: {
          includeHeaders: true,
          delimiter: ','
        },
        filename: 'network_plan'
      },
      'conflict_report': {
        format: 'json',
        options: {
          pretty: true
        },
        filename: 'conflict_report'
      },
      'validation_summary': {
        format: 'txt',
        options: {
          includeTimestamp: true,
          separator: '\n'
        },
        filename: 'validation_summary'
      }
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template não encontrado: ${templateName}`);
    }

    return {
      ...template,
      data: data
    };
  }
}