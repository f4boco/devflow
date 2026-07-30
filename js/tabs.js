class TabsManager {
  constructor(canvasManager) {
    this.canvasMgr = canvasManager;
    this.container = document.getElementById('tabs-container');
    this.btnAddTab = document.getElementById('btn-add-tab');
    
    this.tabs = Storage.getTabs();
    this.activeTabId = Storage.getActiveTabId();

    this.clickTimer = null; // Timer para diferenciar clique simples de duplo clique

    this.init();
  }

  init() {
    this.btnAddTab.addEventListener('click', () => this.createNewTab());
    this.renderTabs();
    this.switchTab(this.activeTabId, false);
  }

  renderTabs() {
    this.container.innerHTML = '';

    this.tabs.forEach(tab => {
      const isActive = tab.id === this.activeTabId;

      const tabEl = document.createElement('div');
      tabEl.className = `group flex items-center gap-1.5 px-3 py-1 rounded text-xs cursor-pointer border transition shrink-0 ${
        isActive 
          ? 'bg-slate-900 border-emerald-500/60 text-emerald-400 font-semibold shadow-sm' 
          : 'bg-slate-950/80 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
      }`;

      tabEl.innerHTML = `
        <span class="tab-title truncate max-w-[120px] pointer-events-auto" title="Duplo clique para renomear">${tab.name}</span>
        ${this.tabs.length > 1 ? `
          <button class="btn-close-tab opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 hover:text-rose-400 transition ml-1" title="Fechar aba">
            <i data-lucide="x" class="w-3 h-3"></i>
          </button>
        ` : ''}
      `;

      // Gestão Inteligente de Clique Simples vs Duplo Clique
      tabEl.addEventListener('click', (e) => {
        if (e.target.closest('.btn-close-tab') || e.target.tagName === 'INPUT') return;

        // Aguarda 200ms para confirmar se é apenas um clique simples ou se virá um duplo clique
        if (this.clickTimer) clearTimeout(this.clickTimer);

        this.clickTimer = setTimeout(() => {
          this.switchTab(tab.id);
          this.clickTimer = null;
        }, 200);
      });

      // Duplo clique imediato para ativar modo de edição/renomeação
      tabEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Cancela o evento de troca de aba pendente
        if (this.clickTimer) {
          clearTimeout(this.clickTimer);
          this.clickTimer = null;
        }

        const titleSpan = tabEl.querySelector('.tab-title');
        if (titleSpan) {
          this.renameTab(tab.id, titleSpan);
        }
      });

      // Clique no botão fechar aba
      const btnClose = tabEl.querySelector('.btn-close-tab');
      if (btnClose) {
        btnClose.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeTab(tab.id);
        });
      }

      this.container.appendChild(tabEl);
    });

    lucide.createIcons();
  }

  createNewTab(name = null, elementsToLoad = []) {
    const tabId = `tab_${Date.now()}`;
    const tabName = name || `Fluxograma ${this.tabs.length + 1}`;

    const newTab = { 
      id: tabId, 
      name: tabName,
      zoom: 1.0,
      panX: 0,
      panY: 0
    };

    this.tabs.push(newTab);
    Storage.saveTabs(this.tabs);

    if (elementsToLoad.length > 0) {
      Storage.saveTabData(tabId, elementsToLoad);
    }

    this.switchTab(tabId);
  }

  switchTab(tabId, saveCurrent = true) {
    if (saveCurrent && this.activeTabId) {
      // Salva os elementos da aba anterior
      Storage.saveTabData(this.activeTabId, this.canvasMgr.elements);

      // Salva o Zoom e Pan específicos da aba anterior
      const currentTab = this.tabs.find(t => t.id === this.activeTabId);
      if (currentTab) {
        currentTab.zoom = this.canvasMgr.zoom;
        currentTab.panX = this.canvasMgr.panX;
        currentTab.panY = this.canvasMgr.panY;
        Storage.saveTabs(this.tabs);
      }
    }

    this.activeTabId = tabId;
    Storage.setActiveTabId(tabId);

    // Carrega os elementos da nova aba selecionada
    const loadedElements = Storage.loadTabData(tabId);
    this.canvasMgr.elements = loadedElements;
    this.canvasMgr.undoStack = [];
    this.canvasMgr.redoStack = [];
    this.canvasMgr.saveHistory();

    // Restaura o Zoom e Pan salvos da nova aba selecionada (ou padrão se não houver)
    const targetTab = this.tabs.find(t => t.id === tabId);
    const savedZoom = targetTab && targetTab.zoom !== undefined ? targetTab.zoom : 1.0;
    const savedPanX = targetTab && targetTab.panX !== undefined ? targetTab.panX : 0;
    const savedPanY = targetTab && targetTab.panY !== undefined ? targetTab.panY : 0;

    this.canvasMgr.applyViewState(savedZoom, savedPanX, savedPanY);

    this.renderTabs();
  }

  renameTab(tabId, titleSpan) {
    const currentName = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'bg-slate-800 text-emerald-400 border border-emerald-500 rounded px-1.5 py-0.5 outline-none text-xs w-28 font-mono';

    titleSpan.replaceWith(input);
    
    // Pequeno atraso para focar e selecionar todo o texto do input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 10);

    let isSaved = false;

    const saveName = () => {
      if (isSaved) return;
      isSaved = true;

      const newName = input.value.trim() || currentName;
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.name = newName;
        Storage.saveTabs(this.tabs);
      }
      this.renderTabs();
    };

    input.addEventListener('blur', saveName);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveName();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        isSaved = true;
        this.renderTabs();
      }
    });
  }

  closeTab(tabId) {
    if (this.tabs.length <= 1) return;

    if (confirm('Tem certeza de que deseja fechar esta aba?')) {
      const index = this.tabs.findIndex(t => t.id === tabId);
      this.tabs = this.tabs.filter(t => t.id !== tabId);
      Storage.removeTabData(tabId);
      Storage.saveTabs(this.tabs);

      if (this.activeTabId === tabId) {
        const nextActiveTab = this.tabs[Math.max(0, index - 1)];
        this.switchTab(nextActiveTab.id, false);
      } else {
        this.renderTabs();
      }
    }
  }
}