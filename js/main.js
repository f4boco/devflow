document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  const canvasMgr = new CanvasManager('flowchart-canvas', 'workspace');
  const tabsMgr = new TabsManager(canvasMgr);

  const baseFlowchartSymbols = [
    { id: 'start-end', name: 'Terminador (Início/Fim)' },
    { id: 'process', name: 'Processo' },
    { id: 'predefined-process', name: 'Processo Predefinido' },
    { id: 'condition', name: 'Decisão / Condição' },
    { id: 'input-output', name: 'Entrada / Saída (I/O)' },
    { id: 'manual-input', name: 'Entrada Manual' },
    { id: 'manual-operation', name: 'Operação Manual' },
    { id: 'preparation', name: 'Preparação / Loop' },
    { id: 'document', name: 'Documento' },
    { id: 'multi-document', name: 'Múltiplos Documentos' },
    { id: 'display', name: 'Display (Tela)' },
    { id: 'database', name: 'Banco de Dados' },
    { id: 'data-storage', name: 'Armazenamento de Dados' },
    { id: 'file', name: 'Arquivo' },
    { id: 'internal-memory', name: 'Memória Interna' },
    { id: 'magnetic-disk', name: 'Disco Magnético' },
    { id: 'magnetic-drum', name: 'Tambor Magnético' },
    { id: 'magnetic-tape', name: 'Fita Magnética' },
    { id: 'punched-card', name: 'Cartão Perfurado' },
    { id: 'punched-tape', name: 'Fita Perfurada' },
    { id: 'merge', name: 'Junção (Merge)' },
    { id: 'extract', name: 'Extração' },
    { id: 'sort', name: 'Classificação (Sort)' },
    { id: 'collate', name: 'Agrupamento (Collate)' },
    { id: 'delay', name: 'Atraso (Delay)' },
    { id: 'on-page-connector', name: 'Conector na Página' },
    { id: 'off-page-connector', name: 'Conector Fora da Página' },
    { id: 'line', name: 'Linha de Fluxo' },
    { id: 'arrow', name: 'Seta de Fluxo' },
    { id: 'communication', name: 'Rede / Comunicação' },
    { id: 'comment', name: 'Comentário / Anotação' }
  ];

  // Alternar Ferramentas
  const toolButtons = document.querySelectorAll('.tool-btn');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTool = btn.dataset.tool;

      if (selectedTool === 'zoom' && canvasMgr.currentTool === 'zoom') {
        canvasMgr.toggleZoomMode();
        return;
      }

      toolButtons.forEach(b => {
        if (b.dataset.tool === selectedTool) {
          b.classList.add('active-tool');
        } else {
          b.classList.remove('active-tool');
        }
      });

      canvasMgr.currentTool = selectedTool;
      canvasMgr.updateZoomIcon();
    });
  });

  // Modal Biblioteca de Símbolos com Suporte a Símbolos Customizados
  const symbolsModal = document.getElementById('symbols-modal');
  const btnSymbolLibrary = document.getElementById('btn-symbol-library');
  const closeSymbolsModal = document.getElementById('close-symbols-modal');
  const symbolsGrid = document.getElementById('symbols-grid');
  const searchInput = document.getElementById('search-symbol');

  function renderSymbolsGrid(filterText = '') {
    symbolsGrid.innerHTML = '';

    const customSymbols = Storage.getCustomSymbols();
    const allSymbols = [...baseFlowchartSymbols, ...customSymbols];
    const filtered = allSymbols.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));

    // Card em Destaque para "Criar Novo Símbolo"
    const createCard = document.createElement('button');
    createCard.className = 'p-3 rounded-lg border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition flex items-center gap-3 group shrink-0';
    createCard.innerHTML = `
      <div class="w-12 h-12 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 transition">
        <i data-lucide="plus" class="w-6 h-6"></i>
      </div>
      <div class="flex flex-col">
        <span class="text-xs font-bold text-emerald-400">Criar Novo Símbolo</span>
        <span class="text-[10px] text-slate-400">Desenhe e salve seu símbolo</span>
      </div>
    `;
    createCard.addEventListener('click', () => {
      symbolsModal.classList.add('hidden');
      openCreateSymbolModal();
    });
    symbolsGrid.appendChild(createCard);

    filtered.forEach(s => {
      const card = document.createElement('button');
      card.className = 'p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/40 text-left transition flex items-center justify-between group';
      
      const canvasId = `preview-${s.id}`;
      const isCustom = !!(s.customStrokes || s.customPoints);

      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-12 h-12 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-emerald-500/40 transition">
            <canvas id="${canvasId}" width="40" height="40"></canvas>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition truncate">${s.name}</span>
              ${isCustom ? '<span class="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded font-mono">Custom</span>' : ''}
            </div>
            <span class="text-[10px] text-slate-500 font-mono">type: "${s.id}"</span>
          </div>
        </div>
        ${isCustom ? `
          <button class="btn-delete-custom-symbol text-slate-600 hover:text-rose-400 p-1 transition" title="Excluir Símbolo Customizado">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        ` : ''}
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-custom-symbol')) return;

        canvasMgr.currentTool = s.id;
        canvasMgr.customSymbolShape = isCustom ? s : null;

        toolButtons.forEach(b => b.classList.remove('active-tool'));
        symbolsModal.classList.add('hidden');
      });

      const btnDelete = card.querySelector('.btn-delete-custom-symbol');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Deseja excluir o símbolo customizado "${s.name}"?`)) {
            Storage.deleteCustomSymbol(s.id);
            renderSymbolsGrid(searchInput.value);
          }
        });
      }

      symbolsGrid.appendChild(card);

      setTimeout(() => {
        const pCanvas = document.getElementById(canvasId);
        if (pCanvas) {
          const pCtx = pCanvas.getContext('2d');
          const pRc = rough.canvas(pCanvas);

          if (isCustom) {
            const scaleX = 28 / s.initialWidth;
            const scaleY = 28 / s.initialHeight;

            if (s.customStrokes) {
              s.customStrokes.forEach(stroke => {
                if (stroke.length > 1) {
                  const scaledPoints = stroke.map(p => [6 + p.dx * scaleX, 6 + p.dy * scaleY]);
                  pRc.curve(scaledPoints, { stroke: '#10b981', strokeWidth: 1.5, roughness: 1.2 });
                }
              });
            } else if (s.customPoints) {
              const scaledPoints = s.customPoints.map(p => [6 + p.dx * scaleX, 6 + p.dy * scaleY]);
              pRc.curve(scaledPoints, { stroke: '#10b981', strokeWidth: 1.5, roughness: 1.2 });
            }
          } else {
            const previewShape = {
              type: s.id,
              x: 6,
              y: 6,
              width: 28,
              height: 28,
              selected: false,
              waypoints: [{ x: 34, y: 34 }]
            };

            if (['line', 'arrow'].includes(s.id)) {
              previewShape.x = 6;
              previewShape.y = 20;
              previewShape.width = 28;
              previewShape.height = 0;
              previewShape.waypoints = [{ x: 34, y: 20 }];
            }

            ShapeRenderer.draw(pRc, pCtx, previewShape, []);
          }
        }
      }, 0);
    });

    lucide.createIcons();
  }

  if (btnSymbolLibrary) {
    btnSymbolLibrary.addEventListener('click', () => {
      renderSymbolsGrid();
      symbolsModal.classList.remove('hidden');
    });
  }

  closeSymbolsModal.addEventListener('click', () => {
    symbolsModal.classList.add('hidden');
  });

  searchInput.addEventListener('input', (e) => {
    renderSymbolsGrid(e.target.value);
  });

  // --- LÓGICA DA MODAL DE DESENHAR NOVO SÍMBOLO CUSTOMIZADO ---
  const createSymbolModal = document.getElementById('create-symbol-modal');
  const closeCreateSymbolModal = document.getElementById('close-create-symbol-modal');
  const btnCancelCustomSymbol = document.getElementById('btn-cancel-custom-symbol');
  const btnSaveCustomSymbol = document.getElementById('btn-save-custom-symbol');
  const btnClearDrawSymbol = document.getElementById('btn-clear-draw-symbol');
  const btnUndoDrawSymbol = document.getElementById('btn-undo-draw-symbol');
  
  const toolPencil = document.getElementById('tool-draw-pencil');
  const toolEraser = document.getElementById('tool-draw-eraser');

  const customCanvas = document.getElementById('custom-symbol-canvas');
  const newSymbolNameInput = document.getElementById('new-symbol-name');

  let customCtx = customCanvas ? customCanvas.getContext('2d') : null;
  let isCustomDrawing = false;
  let customTool = 'pencil';
  
  let strokePaths = [];
  let currentStroke = [];

  function setDrawTool(tool) {
    customTool = tool;
    if (tool === 'pencil') {
      toolPencil.classList.add('text-emerald-400', 'bg-slate-800');
      toolPencil.classList.remove('text-slate-400');
      toolEraser.classList.remove('text-emerald-400', 'bg-slate-800');
      toolEraser.classList.add('text-slate-400');
      customCanvas.style.cursor = 'crosshair';
    } else {
      toolEraser.classList.add('text-emerald-400', 'bg-slate-800');
      toolEraser.classList.remove('text-slate-400');
      toolPencil.classList.remove('text-emerald-400', 'bg-slate-800');
      toolPencil.classList.add('text-slate-400');
      customCanvas.style.cursor = 'cell';
    }
  }

  if (toolPencil) toolPencil.addEventListener('click', () => setDrawTool('pencil'));
  if (toolEraser) toolEraser.addEventListener('click', () => setDrawTool('eraser'));

  function openCreateSymbolModal() {
    newSymbolNameInput.value = '';
    strokePaths = [];
    currentStroke = [];
    setDrawTool('pencil');
    redrawCustomCanvas();
    createSymbolModal.classList.remove('hidden');
  }

  function redrawCustomCanvas() {
    if (!customCtx) return;
    customCtx.clearRect(0, 0, customCanvas.width, customCanvas.height);

    customCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    customCtx.lineWidth = 1;
    for (let x = 0; x < customCanvas.width; x += 20) {
      customCtx.beginPath(); customCtx.moveTo(x, 0); customCtx.lineTo(x, customCanvas.height); customCtx.stroke();
    }
    for (let y = 0; y < customCanvas.height; y += 20) {
      customCtx.beginPath(); customCtx.moveTo(0, y); customCtx.lineTo(customCanvas.width, y); customCtx.stroke();
    }

    customCtx.strokeStyle = '#10b981';
    customCtx.lineWidth = 2.5;
    customCtx.lineCap = 'round';
    customCtx.lineJoin = 'round';

    strokePaths.forEach(path => {
      if (path.length < 2) return;
      customCtx.beginPath();
      customCtx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        customCtx.lineTo(path[i].x, path[i].y);
      }
      customCtx.stroke();
    });

    if (currentStroke.length >= 2) {
      customCtx.beginPath();
      customCtx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        customCtx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      customCtx.stroke();
    }
  }

  function eraseAtPoint(x, y) {
    const radius = 12;
    strokePaths = strokePaths.map(path => {
      return path.filter(p => Math.hypot(p.x - x, p.y - y) > radius);
    }).filter(path => path.length > 1);

    redrawCustomCanvas();
  }

  function getCanvasCoords(e) {
    const rect = customCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  if (customCanvas) {
    const startDraw = (e) => {
      isCustomDrawing = true;
      const { x, y } = getCanvasCoords(e);
      if (customTool === 'pencil') {
        currentStroke = [{ x, y }];
      } else {
        eraseAtPoint(x, y);
      }
    };

    const moveDraw = (e) => {
      if (!isCustomDrawing) return;
      const { x, y } = getCanvasCoords(e);
      if (customTool === 'pencil') {
        currentStroke.push({ x, y });
        redrawCustomCanvas();
      } else {
        eraseAtPoint(x, y);
      }
    };

    const endDraw = () => {
      if (!isCustomDrawing) return;
      isCustomDrawing = false;
      if (customTool === 'pencil' && currentStroke.length > 1) {
        strokePaths.push([...currentStroke]);
      }
      currentStroke = [];
      redrawCustomCanvas();
    };

    customCanvas.addEventListener('mousedown', startDraw);
    customCanvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);

    customCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
    customCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveDraw(e); }, { passive: false });
    customCanvas.addEventListener('touchend', endDraw);

    btnClearDrawSymbol.addEventListener('click', () => {
      strokePaths = [];
      currentStroke = [];
      redrawCustomCanvas();
    });

    btnUndoDrawSymbol.addEventListener('click', () => {
      strokePaths.pop();
      redrawCustomCanvas();
    });
  }

  closeCreateSymbolModal.addEventListener('click', () => createSymbolModal.classList.add('hidden'));
  btnCancelCustomSymbol.addEventListener('click', () => createSymbolModal.classList.add('hidden'));

  btnSaveCustomSymbol.addEventListener('click', () => {
    const name = newSymbolNameInput.value.trim();
    if (!name) {
      alert('Por favor, informe um nome para o seu símbolo.');
      return;
    }

    if (strokePaths.length === 0) {
      alert('Por favor, desenhe uma forma no quadro antes de salvar.');
      return;
    }

    const allPoints = strokePaths.flat();
    const xs = allPoints.map(p => p.x);
    const ys = allPoints.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const initialWidth = Math.max(maxX - minX, 20);
    const initialHeight = Math.max(maxY - minY, 20);

    const relativeStrokes = strokePaths.map(path => {
      return path.map(p => ({
        dx: p.x - minX,
        dy: p.y - minY
      }));
    });

    const newCustomSymbol = {
      id: `custom_${Date.now()}`,
      name: name,
      initialWidth: initialWidth,
      initialHeight: initialHeight,
      customStrokes: relativeStrokes,
      customPoints: relativeStrokes[0]
    };

    Storage.saveCustomSymbol(newCustomSymbol);
    createSymbolModal.classList.add('hidden');

    renderSymbolsGrid();
    symbolsModal.classList.remove('hidden');
  });

  // Auxiliares para Exportação
  async function saveWithSystemDialog(blob, defaultName, types) {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: types
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportFullCanvasToBlob() {
    return new Promise((resolve) => {
      const elements = canvasMgr.elements;

      if (!elements || elements.length === 0) {
        alert('Não há elementos no diagrama para exportar.');
        return resolve(null);
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      elements.forEach(el => {
        if (['line', 'arrow'].includes(el.type)) {
          const waypoints = ShapeRenderer.getLineWaypoints(el, elements);
          waypoints.forEach(pt => {
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
          });
        } else {
          if (el.x < minX) minX = el.x;
          if (el.y < minY) minY = el.y;
          if (el.x + el.width > maxX) maxX = el.x + el.width;
          if (el.y + el.height > maxY) maxY = el.y + el.height;
        }
      });

      const padding = 40;
      const width = Math.max(maxX - minX + padding * 2, 200);
      const height = Math.max(maxY - minY + padding * 2, 200);

      const offCanvas = document.createElement('canvas');
      offCanvas.width = width;
      offCanvas.height = height;

      const ctx = offCanvas.getContext('2d');
      const rc = rough.canvas(offCanvas);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(-minX + padding, -minY + padding);

      elements.forEach(shape => {
        const cleanShape = { ...shape, selected: false };
        ShapeRenderer.draw(rc, ctx, cleanShape, elements);
      });

      ctx.restore();

      offCanvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }

  // Importar Projeto
  const btnOpenFile = document.getElementById('btn-open-file');
  const inputImportFile = document.getElementById('input-import-file');

  btnOpenFile.addEventListener('click', () => {
    inputImportFile.click();
  });

  inputImportFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedElements = JSON.parse(event.target.result);
        if (Array.isArray(importedElements)) {
          const fileName = file.name.replace(/\.(devflow|json)$/i, '');
          tabsMgr.createNewTab(fileName, importedElements);
          alert('Projeto DevFlow importado em uma nova aba!');
        } else {
          alert('O arquivo selecionado não contém uma estrutura válida do DevFlow.');
        }
      } catch (err) {
        alert('Erro ao carregar o arquivo .devflow.');
      }
    };
    reader.readAsText(file);
    inputImportFile.value = '';
  });

  // Limpar Aba
  document.getElementById('btn-new').addEventListener('click', () => {
    if (confirm('Tem certeza de que deseja apagar os elementos desta aba?')) {
      canvasMgr.clearCanvas();
    }
  });

  // Modal Exportação
  const modal = document.getElementById('export-modal');
  const asciiPreview = document.getElementById('ascii-preview');

  document.getElementById('btn-export').addEventListener('click', () => {
    const asciiText = ASCIIConverter.generate(canvasMgr.elements);
    asciiPreview.textContent = asciiText;
    modal.classList.remove('hidden');
  });

  document.getElementById('close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('btn-copy-ascii').addEventListener('click', () => {
    navigator.clipboard.writeText(asciiPreview.textContent);
    alert('ASCII Art copiado para a área de transferência!');
  });

  document.getElementById('btn-download-editable').addEventListener('click', async () => {
    const activeTab = tabsMgr.tabs.find(t => t.id === tabsMgr.activeTabId);
    const fileName = activeTab ? activeTab.name.toLowerCase().replace(/\s+/g, '-') : 'diagrama';
    
    const jsonString = JSON.stringify(canvasMgr.elements, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    await saveWithSystemDialog(blob, `${fileName}.devflow`, [
      {
        description: 'DevFlow Project File',
        accept: { 'application/json': ['.devflow', '.json'] }
      }
    ]);
  });

  document.getElementById('btn-download-md').addEventListener('click', async () => {
    const content = "```text\n" + asciiPreview.textContent + "\n```";
    const blob = new Blob([content], { type: 'text/markdown' });
    await saveWithSystemDialog(blob, 'flowchart.md', [
      {
        description: 'Markdown File',
        accept: { 'text/markdown': ['.md'] }
      }
    ]);
  });

  document.getElementById('btn-download-img').addEventListener('click', async () => {
    const imageBlob = await exportFullCanvasToBlob();
    if (imageBlob) {
      await saveWithSystemDialog(imageBlob, 'devflow-diagram.png', [
        {
          description: 'PNG Image',
          accept: { 'image/png': ['.png'] }
        }
      ]);
    }
  });
});