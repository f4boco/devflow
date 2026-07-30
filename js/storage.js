const Storage = {
  KEYS: {
    TABS: 'devflow_tabs_list',
    FOLDERS: 'devflow_folders_list',
    ACTIVE_TAB: 'devflow_active_tab_id',
    CUSTOM_SYMBOLS: 'devflow_custom_symbols'
  },

  getTabs() {
    try {
      const tabs = localStorage.getItem(this.KEYS.TABS);
      if (tabs) return JSON.parse(tabs);
    } catch (e) {
      console.error('Erro ao ler abas:', e);
    }
    return [{ id: 'tab_default', name: 'Fluxograma 1', folderId: null, zoom: 1.0, panX: 0, panY: 0 }];
  },

  saveTabs(tabs) {
    try {
      localStorage.setItem(this.KEYS.TABS, JSON.stringify(tabs));
    } catch (e) {
      console.error('Erro ao salvar abas:', e);
    }
  },

  getFolders() {
    try {
      const folders = localStorage.getItem(this.KEYS.FOLDERS);
      if (folders) return JSON.parse(folders);
    } catch (e) {
      console.error('Erro ao ler pastas:', e);
    }
    return [];
  },

  saveFolders(folders) {
    try {
      localStorage.setItem(this.KEYS.FOLDERS, JSON.stringify(folders));
    } catch (e) {
      console.error('Erro ao salvar pastas:', e);
    }
  },

  getActiveTabId() {
    return localStorage.getItem(this.KEYS.ACTIVE_TAB) || 'tab_default';
  },

  setActiveTabId(tabId) {
    localStorage.setItem(this.KEYS.ACTIVE_TAB, tabId);
  },

  loadTabData(tabId) {
    try {
      const data = localStorage.getItem(`devflow_elements_${tabId}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Erro ao carregar elementos da aba:', e);
    }
    return [];
  },

  saveTabData(tabId, elements) {
    try {
      localStorage.setItem(`devflow_elements_${tabId}`, JSON.stringify(elements));
    } catch (e) {
      console.error('Erro ao salvar elementos da aba:', e);
    }
  },

  removeTabData(tabId) {
    localStorage.removeItem(`devflow_elements_${tabId}`);
  },

  // --- MÉTODOS DE SÍMBOLOS CUSTOMIZADOS ---
  getCustomSymbols() {
    try {
      const symbols = localStorage.getItem(this.KEYS.CUSTOM_SYMBOLS);
      if (symbols) return JSON.parse(symbols);
    } catch (e) {
      console.error('Erro ao ler símbolos customizados:', e);
    }
    return [];
  },

  saveCustomSymbol(symbol) {
    const list = this.getCustomSymbols();
    list.push(symbol);
    try {
      localStorage.setItem(this.KEYS.CUSTOM_SYMBOLS, JSON.stringify(list));
    } catch (e) {
      console.error('Erro ao salvar símbolo customizado:', e);
    }
  },

  deleteCustomSymbol(id) {
    let list = this.getCustomSymbols();
    list = list.filter(s => s.id !== id);
    try {
      localStorage.setItem(this.KEYS.CUSTOM_SYMBOLS, JSON.stringify(list));
    } catch (e) {
      console.error('Erro ao deletar símbolo customizado:', e);
    }
  },

  load() {
    return this.loadTabData(this.getActiveTabId());
  },

  save(elements) {
    this.saveTabData(this.getActiveTabId(), elements);
  },

  clear() {
    this.removeTabData(this.getActiveTabId());
  }
};