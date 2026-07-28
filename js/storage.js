const Storage = {
  KEYS: {
    TABS: 'devflow_tabs_list',
    ACTIVE_TAB: 'devflow_active_tab_id'
  },

  getTabs() {
    try {
      const tabs = localStorage.getItem(this.KEYS.TABS);
      if (tabs) return JSON.parse(tabs);
    } catch (e) {
      console.error('Erro ao ler abas:', e);
    }
    return [{ id: 'tab_default', name: 'Fluxograma 1' }];
  },

  saveTabs(tabs) {
    try {
      localStorage.setItem(this.KEYS.TABS, JSON.stringify(tabs));
    } catch (e) {
      console.error('Erro ao salvar abas:', e);
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

  // Métodos de compatibilidade com o CanvasManager antigo
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