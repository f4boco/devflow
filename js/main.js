document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  const canvasMgr = new CanvasManager('flowchart-canvas', 'workspace');

  const flowchartSymbols = [
    { id: 'start-end', name: 'Terminador (Início/Fim)' },
    { id: 'process', name: 'Processo' },
    { id: 'predefined-process', name: 'Processo Predefinido (Subprocesso)' },
    { id: 'condition', name: 'Decisão' },
    { id: 'input-output', name: 'Entrada/Saída (I/O)' },
    { id: 'manual-input', name: 'Entrada Manual' },
    { id: 'manual-operation', name: 'Operação Manual' },
    { id: 'preparation', name: 'Preparação' },
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
    { id: 'sort', name: 'Classificação (Sort)' },
    { id: 'collate', name: 'Agrupamento (Collate)' },
    { id: 'delay', name: 'Atraso (Delay)' },
    { id: 'wait', name: 'Espera' },
    { id: 'on-page-connector', name: 'Conector na Mesma Página' },
    { id: 'off-page-connector', name: 'Conector Fora da Página' },
    { id: 'line', name: 'Linha de Fluxo' },
    { id: 'data-flow', name: 'Fluxo de Dados' },
    { id: 'communication', name: 'Comunicação' },
    { id: 'data-transmission', name: 'Transmissão de Dados' },
    { id: 'comment', name: 'Comentário' },
    { id: 'annotation', name: 'Anotação' },
    { id: 'routine-call', name: 'Chamada de Rotina' },
    { id: 'parallel-process', name: 'Processo Paralelo' },
    { id: 'extract', name: 'Extração' },
    { id: 'sequential-storage', name: 'Armazenamento Sequencial' },
    { id: 'direct-access-storage', name: 'Armazenamento de Acesso Direto' },
    { id: 'keyboard-input', name: 'Entrada por Teclado' },
    { id: 'screen-display', name: 'Exibição em Monitor' },
    { id: 'print', name: 'Impressão' },
    { id: 'printed-output', name: 'Saída Impressa' },
    { id: 'network-interface', name: 'Interface de Rede' },
    { id: 'terminal', name: 'Terminal' },
    { id: 'logical-connector', name: 'Conector Lógico' },
    { id: 'inspection-point', name: 'Ponto de Inspeção' },
    { id: 'synchronization', name: 'Sincronização' },
    { id: 'loop', name: 'Loop' },
    { id: 'initialization', name: 'Inicialização' },
    { id: 'finalization', name: 'Finalização' }
  ];

  // Alternar Ferramentas
  const toolButtons = document.querySelectorAll('.tool-btn');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTool = btn.dataset.tool;
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

  // Resetar Zoom
  const zoomText = document.getElementById('zoom-level-text');
  if (zoomText) {
    zoomText.addEventListener('click', () => {
      canvasMgr.zoom = 1.0;
      canvasMgr.panX = 0;
      canvasMgr.panY = 0;
      canvasMgr.updateZoomDisplay();
      canvasMgr.render();
    });
  }

  // Modal Biblioteca de Símbolos
  const symbolsModal = document.getElementById('symbols-modal');
  const btnSymbolLibrary = document.getElementById('btn-symbol-library');
  const closeSymbolsModal = document.getElementById('close-symbols-modal');
  const symbolsGrid = document.getElementById('symbols-grid');
  const searchInput = document.getElementById('search-symbol');

  function renderSymbolsGrid(filterText = '') {
    symbolsGrid.innerHTML = '';
    const filtered = flowchartSymbols.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));

    if (filtered.length === 0) {
      symbolsGrid.innerHTML = `<div class="col-span-full text-center py-6 text-slate-500 text-sm">Nenhum símbolo encontrado.</div>`;
      return;
    }

    filtered.forEach(s => {
      const card = document.createElement('button');
      card.className = 'p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 text-left transition flex flex-col justify-between gap-1 group';
      
      card.innerHTML = `
        <span class="text-xs font-semibold text-slate-300 group-hover:text-emerald-400 transition">${s.name}</span>
        <span class="text-[10px] text-slate-500 font-mono">type: "${s.id}"</span>
      `;

      card.addEventListener('click', () => {
        canvasMgr.currentTool = s.id;
        toolButtons.forEach(b => b.classList.remove('active-tool'));
        symbolsModal.classList.add('hidden');
      });

      symbolsGrid.appendChild(card);
    });
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

  // Funções Auxiliares para Salvamento com File System Access API
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

  // Função para exportar PNG do Bounding Box completo de todos os elementos
  function exportFullCanvasToBlob() {
    return new Promise((resolve) => {
      const elements = canvasMgr.elements;

      if (!elements || elements.length === 0) {
        alert('Não há elementos no diagrama para exportar.');
        return resolve(null);
      }

      // Calcula os limites cartesianos absolutos (Bounding Box) de todos os elementos
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

      const padding = 40; // Margem interna em pixels em volta da imagem
      const width = Math.max(maxX - minX + padding * 2, 200);
      const height = Math.max(maxY - minY + padding * 2, 200);

      // Cria canvas invisível em memória
      const offCanvas = document.createElement('canvas');
      offCanvas.width = width;
      offCanvas.height = height;

      const ctx = offCanvas.getContext('2d');
      const rc = rough.canvas(offCanvas);

      // Preenche com o fundo escuro do tema
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Aplica a translação para centralizar com a margem (padding)
      ctx.save();
      ctx.translate(-minX + padding, -minY + padding);

      // Renderiza cada elemento de forma limpa (sem seleção ativa)
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
          canvasMgr.elements = importedElements;
          Storage.save(canvasMgr.elements);
          canvasMgr.saveHistory();
          canvasMgr.render();
          alert('Projeto DevFlow importado com sucesso!');
        } else {
          alert('O arquivo selecionado não contém uma estrutura válida do DevFlow.');
        }
      } catch (err) {
        alert('Erro ao carregar o arquivo .devflow. Certifique-se de que é um JSON válido.');
      }
    };
    reader.readAsText(file);
    inputImportFile.value = '';
  });

  // Atalhos de Teclado
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

    const keyToolMap = {
      'h': 'hand',
      'z': 'zoom',
      's': 'select',
      'p': 'pencil',
      'w': 'auto-draw',
      't': 'text',
      'e': 'eraser'
    };

    const tool = keyToolMap[e.key.toLowerCase()];
    if (tool && !(e.ctrlKey || e.metaKey)) {
      const btn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
      if (btn) btn.click();
    }
  });

  // Botão Novo
  document.getElementById('btn-new').addEventListener('click', () => {
    if (confirm('Tem certeza de que deseja apagar o fluxograma atual e começar um novo?')) {
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
    const jsonString = JSON.stringify(canvasMgr.elements, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    await saveWithSystemDialog(blob, 'meu-diagrama.devflow', [
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

  // Baixar Imagem (PNG) calculando o Bounding Box de todos os elementos
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