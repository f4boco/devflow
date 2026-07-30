class TabsManager {
  constructor(canvasManager) {
    this.canvasMgr = canvasManager;
    this.container = document.getElementById('tabs-container');
    this.btnAddTab = document.getElementById('btn-add-tab');
    this.btnAddFolder = document.getElementById('btn-add-folder');
    
    this.tabs = Storage.getTabs();
    this.folders = Storage.getFolders();
    this.activeTabId = Storage.getActiveTabId();

    this.openFolders = new Set(); // Guarda IDs das pastas abertas/expandidas
    this.draggedTabId = null; // Guarda o ID da aba que está sendo arrastada
    this.clickTimer = null;

    this.init();
  }

  init() {
    if (this.btnAddTab) {
      this.btnAddTab.addEventListener('click', () => this.createNewTab());
    }
    if (this.btnAddFolder) {
      this.btnAddFolder.addEventListener('click', () => this.createNewFolder());
    }

    // Permite soltar elementos na área vazia da barra para tirar das pastas (mover para a raiz)
    if (this.container) {
      this.container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      this.container.addEventListener('drop', (e) => {
        // Se soltou diretamente no container (e não dentro de uma pasta específica)
        if (this.draggedTabId && !e.target.closest('.folder-group-wrapper')) {
          e.preventDefault();
          this.moveTabToFolder(this.draggedTabId, null);
          this.draggedTabId = null;
        }
      });
    }

    this.renderTabs();
    this.switchTab(this.activeTabId, false);
  }

  renderTabs() {
    this.container.innerHTML = '';

    // 1. RENDERIZAR PASTAS E SEUS FLUXOGRAMAS INTERNOS
    this.folders.forEach(folder => {
      const isFolderExpanded = this.openFolders.has(folder.id);
      const childTabs = this.tabs.filter(t => t.folderId === folder.id);
      const hasActiveChild = childTabs.some(t => t.id === this.activeTabId);

      const folderWrapper = document.createElement('div');
      folderWrapper.className = 'folder-group-wrapper relative flex items-center shrink-0 transition-all';

      const folderBtn = document.createElement('div');
      folderBtn.className = `group flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer border transition shrink-0 select-none ${
        hasActiveChild 
          ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-semibold' 
          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-900'
      }`;

      folderBtn.innerHTML = `
        <i data-lucide="${isFolderExpanded ? 'folder-open' : 'folder'}" class="w-3.5 h-3.5 text-amber-400"></i>
        <span class="folder-title truncate max-w-[100px]">${folder.name}</span>
        <span class="text-[10px] text-slate-500 bg-slate-900 px-1 rounded font-mono">${childTabs.length}</span>
        <button class="btn-add-tab-in-folder opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 hover:text-emerald-400 transition ml-0.5" title="Novo Fluxograma nesta Pasta">
          <i data-lucide="plus" class="w-3 h-3"></i>
        </button>
        <button class="btn-delete-folder opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 hover:text-rose-400 transition" title="Excluir Pasta">
          <i data-lucide="trash-2" class="w-3 h-3"></i>
        </button>
      `;

      // --- SUPORTE A DRAG & DROP NA PASTA (DROP ZONE) ---
      folderWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        folderBtn.classList.add('border-dashed', 'border-amber-400', 'bg-amber-500/20');
      });

      folderWrapper.addEventListener('dragleave', (e) => {
        if (!folderWrapper.contains(e.relatedTarget)) {
          folderBtn.classList.remove('border-dashed', 'border-amber-400', 'bg-amber-500/20');
        }
      });

      folderWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderBtn.classList.remove('border-dashed', 'border-amber-400', 'bg-amber-500/20');

        if (this.draggedTabId) {
          this.moveTabToFolder(this.draggedTabId, folder.id);
          this.draggedTabId = null;
        }
      });

      // Clique na Pasta expande/recolhe a pasta
      folderBtn.addEventListener('click', (e) => {
        if (e.target.closest('.btn-add-tab-in-folder') || e.target.closest('.btn-delete-folder') || e.target.tagName === 'INPUT') return;
        
        if (this.openFolders.has(folder.id)) {
          this.openFolders.delete(folder.id);
        } else {
          this.openFolders.add(folder.id);
        }
        this.renderTabs();
      });

      // Duplo clique renomeia a pasta
      folderBtn.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const titleSpan = folderBtn.querySelector('.folder-title');
        if (titleSpan) this.renameFolder(folder.id, titleSpan);
      });

      // Criar aba dentro da pasta
      const btnAddInFolder = folderBtn.querySelector('.btn-add-tab-in-folder');
      if (btnAddInFolder) {
        btnAddInFolder.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openFolders.add(folder.id);
          this.createNewTab(null, [], folder.id);
        });
      }

      // Excluir pasta
      const btnDeleteFolder = folderBtn.querySelector('.btn-delete-folder');
      if (btnDeleteFolder) {
        btnDeleteFolder.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteFolder(folder.id);
        });
      }

      folderWrapper.appendChild(folderBtn);

      // Se a pasta estiver expandida e tiver abas, exibe-as logo ao lado
      if (isFolderExpanded) {
        const folderContentContainer = document.createElement('div');
        folderContentContainer.className = 'flex items-center gap-1 pl-1 pr-1 py-0.5 bg-amber-500/5 border-y border-r border-amber-500/20 rounded-r-lg -ml-1';

        if (childTabs.length === 0) {
          const emptyMsg = document.createElement('span');
          emptyMsg.className = 'text-[10px] text-slate-500 italic px-2 select-none';
          emptyMsg.textContent = '(Solte um fluxograma aqui)';
          folderContentContainer.appendChild(emptyMsg);
        } else {
          childTabs.forEach(tab => {
            folderContentContainer.appendChild(this.createTabElement(tab));
          });
        }
        folderWrapper.appendChild(folderContentContainer);
      }

      this.container.appendChild(folderWrapper);
    });

    // 2. RENDERIZAR FLUXOGRAMAS SOLTOS (FORA DE PASTAS)
    const rootTabs = this.tabs.filter(t => !t.folderId);
    rootTabs.forEach(tab => {
      this.container.appendChild(this.createTabElement(tab));
    });

    lucide.createIcons();
  }

  createTabElement(tab) {
    const isActive = tab.id === this.activeTabId;

    const tabEl = document.createElement('div');
    tabEl.draggable = true; // Habilita o arrasto da aba
    tabEl.className = `group relative flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-grab active:cursor-grabbing border transition shrink-0 ${
      isActive 
        ? 'bg-slate-900 border-emerald-500/60 text-emerald-400 font-semibold shadow-sm' 
        : 'bg-slate-950/80 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
    }`;

    tabEl.innerHTML = `
      <i data-lucide="file-text" class="w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}"></i>
      <span class="tab-title truncate max-w-[110px] pointer-events-auto select-none" title="Duplo clique para renomear">${tab.name}</span>

      ${this.tabs.length > 1 ? `
        <button class="btn-close-tab opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 hover:text-rose-400 transition" title="Fechar aba">
          <i data-lucide="x" class="w-3 h-3"></i>
        </button>
      ` : ''}
    `;

    // --- EVENTOS DE DRAG AND DROP DA ABA ---
    tabEl.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      this.draggedTabId = tab.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tab.id);
      
      // Efeito visual suave durante o arrasto
      setTimeout(() => {
        tabEl.classList.add('opacity-40', 'scale-95');
      }, 0);
    });

    tabEl.addEventListener('dragend', () => {
      tabEl.classList.remove('opacity-40', 'scale-95');
      this.draggedTabId = null;
    });

    // Clique Simples -> Alternar Aba
    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.btn-close-tab') || e.target.tagName === 'INPUT') return;

      if (this.clickTimer) clearTimeout(this.clickTimer);

      this.clickTimer = setTimeout(() => {
        this.switchTab(tab.id);
        this.clickTimer = null;
      }, 200);
    });

    // Duplo Clique -> Renomear
    tabEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
      }

      const titleSpan = tabEl.querySelector('.tab-title');
      if (titleSpan) this.renameTab(tab.id, titleSpan);
    });

    // Botão Fechar Aba
    const btnClose = tabEl.querySelector('.btn-close-tab');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });
    }

    return tabEl;
  }

  createNewFolder() {
    const folderName = prompt('Nome da Nova Pasta:', `Pasta ${this.folders.length + 1}`);
    if (!folderName || !folderName.trim()) return;

    const newFolder = {
      id: `folder_${Date.now()}`,
      name: folderName.trim()
    };

    this.folders.push(newFolder);
    this.openFolders.add(newFolder.id);
    Storage.saveFolders(this.folders);
    this.renderTabs();
  }

  renameFolder(folderId, titleSpan) {
    const currentName = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'bg-slate-800 text-amber-300 border border-amber-500 rounded px-1.5 py-0.5 outline-none text-xs w-24 font-mono';

    titleSpan.replaceWith(input);

    setTimeout(() => {
      input.focus();
      input.select();
    }, 10);

    let isSaved = false;

    const saveName = () => {
      if (isSaved) return;
      isSaved = true;

      const newName = input.value.trim() || currentName;
      const folder = this.folders.find(f => f.id === folderId);
      if (folder) {
        folder.name = newName;
        Storage.saveFolders(this.folders);
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

  deleteFolder(folderId) {
    if (confirm('Tem certeza de que deseja excluir esta pasta? Os fluxogramas dentro dela continuarão salvos fora da pasta.')) {
      // Move os fluxogramas dessa pasta para a raiz
      this.tabs.forEach(t => {
        if (t.folderId === folderId) t.folderId = null;
      });
      Storage.saveTabs(this.tabs);

      this.folders = this.folders.filter(f => f.id !== folderId);
      this.openFolders.delete(folderId);
      Storage.saveFolders(this.folders);

      this.renderTabs();
    }
  }

  createNewTab(name = null, elementsToLoad = [], folderId = null) {
    const tabId = `tab_${Date.now()}`;
    const tabName = name || `Fluxograma ${this.tabs.length + 1}`;

    const newTab = { 
      id: tabId, 
      name: tabName,
      folderId: folderId,
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

  moveTabToFolder(tabId, folderId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.folderId = folderId;
      if (folderId) this.openFolders.add(folderId);
      Storage.saveTabs(this.tabs);
    }
    this.renderTabs();
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