class CanvasManager {
  constructor(canvasId, workspaceId) {
    this.canvas = document.getElementById(canvasId);
    this.workspace = document.getElementById(workspaceId);
    this.ctx = this.canvas.getContext('2d');
    this.rc = rough.canvas(this.canvas);

    const activeTabId = Storage.getActiveTabId();
    this.elements = Storage.loadTabData(activeTabId);

    this.currentTool = 'select';
    this.customSymbolShape = null;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.activeElement = null;
    this.activeHandle = null;
    this.freehandPoints = [];
    
    // Pan & Zoom State
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
    this.minZoom = 0.2;
    this.maxZoom = 3.0;

    this.isShiftPressed = false;
    this.zoomMode = 'in';

    // Otimização de Performance
    this.renderRequested = false;
    this.isInteracting = false;

    // Gestos Touch
    this.initialPinchDistance = null;
    this.initialPinchZoom = 1.0;

    // Clipboard Interno para Copiar/Colar/Recortar/Duplicar
    this.clipboard = [];

    // Histórico para Undo/Redo
    this.undoStack = [];
    this.redoStack = [];
    this.saveHistory();

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupEvents();
    this.setupTouchEvents();
    this.setupKeyboardShortcuts();
    this.render();
  }

  applyViewState(zoom, panX, panY) {
    this.zoom = zoom !== undefined ? zoom : 1.0;
    this.panX = panX !== undefined ? panX : 0;
    this.panY = panY !== undefined ? panY : 0;
    this.updateZoomDisplay();
    this.render();
  }

  saveHistory() {
    const currentState = JSON.stringify(this.elements);
    const lastState = this.undoStack[this.undoStack.length - 1];

    if (currentState !== lastState) {
      this.undoStack.push(currentState);
      this.redoStack = [];
    }
    this.updateHistoryButtonsUI();
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.redoStack.push(this.undoStack.pop());
      const previousState = JSON.parse(this.undoStack[this.undoStack.length - 1]);
      this.elements = previousState;
      Storage.save(this.elements);
      this.render();
      this.updateHistoryButtonsUI();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const nextState = this.redoStack.pop();
      this.undoStack.push(nextState);
      this.elements = JSON.parse(nextState);
      Storage.save(this.elements);
      this.render();
      this.updateHistoryButtonsUI();
    }
  }

  updateHistoryButtonsUI() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    if (btnUndo) {
      btnUndo.disabled = this.undoStack.length <= 1;
    }
    if (btnRedo) {
      btnRedo.disabled = this.redoStack.length === 0;
    }
  }

  deleteSelected() {
    const initialCount = this.elements.length;
    this.elements = this.elements.filter(el => !el.selected);

    if (this.elements.length !== initialCount) {
      Storage.save(this.elements);
      this.saveHistory();
      this.render();
    }
  }

  // --- OPERAÇÕES DE CLIPBOARD (COPIAR, COLAR, RECORTAR, DUPLICAR) ---

  copySelected() {
    const selected = this.elements.filter(el => el.selected);
    if (selected.length === 0) return;

    // Guarda uma cópia profunda dos elementos selecionados no clipboard
    this.clipboard = JSON.parse(JSON.stringify(selected));
  }

  cutSelected() {
    this.copySelected();
    this.deleteSelected();
  }

  pasteClipboard() {
    if (!this.clipboard || this.clipboard.length === 0) return;

    // Dicionário para mapear os IDs antigos para os novos IDs clonados
    const idMap = {};
    const offset = 20; // Deslocamento visual ao colar

    // Desmarca todos os elementos atualmente presentes na tela
    this.elements.forEach(el => el.selected = false);

    // 1º passo: Clona os elementos, gera novos IDs e aplica o deslocamento
    const newClones = this.clipboard.map((item, index) => {
      const newId = Date.now() + index + Math.floor(Math.random() * 1000);
      idMap[item.id] = newId;

      const newItem = JSON.parse(JSON.stringify(item));
      newItem.id = newId;
      newItem.selected = true;

      // Ajusta posição x, y
      newItem.x += offset;
      newItem.y += offset;

      // Ajusta waypoints se existirem
      if (newItem.waypoints && Array.isArray(newItem.waypoints)) {
        newItem.waypoints.forEach(wp => {
          wp.x += offset;
          wp.y += offset;
        });
      }

      return newItem;
    });

    // 2º passo: Atualiza referências de conexões (se formas conectadas foram copiadas juntas)
    newClones.forEach(item => {
      if (['line', 'arrow'].includes(item.type)) {
        if (item.startConnectedTo && idMap[item.startConnectedTo]) {
          item.startConnectedTo = idMap[item.startConnectedTo];
        } else {
          item.startConnectedTo = null;
        }

        if (item.endConnectedTo && idMap[item.endConnectedTo]) {
          item.endConnectedTo = idMap[item.endConnectedTo];
        } else {
          item.endConnectedTo = null;
        }
      }
    });

    // Adiciona os novos elementos ao canvas e atualiza o clipboard para permitir múltiplos colares seguidos com offset
    this.elements.push(...newClones);
    this.clipboard = JSON.parse(JSON.stringify(newClones));

    Storage.save(this.elements);
    this.saveHistory();
    this.render();
  }

  duplicateSelected() {
    this.copySelected();
    this.pasteClipboard();
  }

  resetToSelectTool() {
    this.currentTool = 'select';
    this.customSymbolShape = null;
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
      if (btn.dataset.tool === 'select') {
        btn.classList.add('active-tool');
      } else {
        btn.classList.remove('active-tool');
      }
    });
  }

  zoomAt(centerX, centerY, deltaZoom) {
    const oldZoom = this.zoom;
    let newZoom = oldZoom + deltaZoom;
    newZoom = Math.min(Math.max(newZoom, this.minZoom), this.maxZoom);

    if (newZoom === oldZoom) return;

    this.panX = centerX - (centerX - this.panX) * (newZoom / oldZoom);
    this.panY = centerY - (centerY - this.panY) * (newZoom / oldZoom);
    this.zoom = newZoom;

    this.updateZoomDisplay();
    this.requestRender();
  }

  zoomToFit() {
    if (!this.elements || this.elements.length === 0) {
      this.zoom = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.updateZoomDisplay();
      this.requestRender();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.elements.forEach(el => {
      if (['line', 'arrow'].includes(el.type)) {
        const waypoints = ShapeRenderer.getLineWaypoints(el, this.elements);
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

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    if (contentWidth <= 0 || contentHeight <= 0) return;

    const padding = 80;
    const availableWidth = this.canvas.width - padding * 2;
    const availableHeight = this.canvas.height - padding * 2;

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    let targetZoom = Math.min(scaleX, scaleY);

    targetZoom = Math.min(Math.max(targetZoom, this.minZoom), this.maxZoom);

    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    const canvasCenterX = this.canvas.width / 2;
    const canvasCenterY = this.canvas.height / 2;

    this.zoom = targetZoom;
    this.panX = canvasCenterX - contentCenterX * targetZoom;
    this.panY = canvasCenterY - contentCenterY * targetZoom;

    this.updateZoomDisplay();
    this.requestRender();
  }

  updateZoomDisplay() {
    const zoomText = document.getElementById('zoom-level-text');
    if (zoomText) {
      zoomText.textContent = `${Math.round(this.zoom * 100)}%`;
    }
  }

  toggleZoomMode() {
    this.zoomMode = this.zoomMode === 'in' ? 'out' : 'in';
    this.updateZoomIcon();
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = true;
        this.updateZoomIcon();
      }

      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      // Atalhos do Clipboard (Ctrl/Cmd + C, V, X, D)
      if (isCtrlOrCmd) {
        if (keyLower === 'c') {
          e.preventDefault();
          this.copySelected();
          return;
        } else if (keyLower === 'v') {
          e.preventDefault();
          this.pasteClipboard();
          return;
        } else if (keyLower === 'x') {
          e.preventDefault();
          this.cutSelected();
          return;
        } else if (keyLower === 'd') {
          e.preventDefault();
          this.duplicateSelected();
          return;
        }
      }

      if ((e.shiftKey && (e.key === '!' || e.key === '1')) || e.key === '0') {
        e.preventDefault();
        this.zoomToFit();
        return;
      }

      if (isCtrlOrCmd && keyLower === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          this.redo();
        } else {
          e.preventDefault();
          this.undo();
        }
      } else if (isCtrlOrCmd && keyLower === 'y') {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelected();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = false;
        this.updateZoomIcon();
      }
    });
  }

  updateZoomIcon() {
    const zoomIcons = document.querySelectorAll('.zoom-icon-target');
    const isOut = this.isShiftPressed || this.zoomMode === 'out';
    zoomIcons.forEach(icon => {
      if (this.currentTool === 'zoom') {
        icon.setAttribute('data-lucide', isOut ? 'zoom-out' : 'zoom-in');
        lucide.createIcons();
      }
    });
  }

  resize() {
    this.canvas.width = this.workspace.clientWidth;
    this.canvas.height = this.workspace.clientHeight;
    this.render();
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        this.zoomAt(mouseX, mouseY, delta);
        return;
      }

      if (e.shiftKey) {
        this.panX -= e.deltaY;
      } else {
        this.panY -= e.deltaY;
      }

      this.requestRender();
    }, { passive: false });
  }

  setupTouchEvents() {
    const getTouchPos = (touch) => {
      return { clientX: touch.clientX, clientY: touch.clientY, movementX: 0, movementY: 0, shiftKey: this.isShiftPressed };
    };

    let lastTouch = null;

    const getDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    this.canvas.addEventListener('touchstart', (e) => {
      this.isInteracting = true;
      if (e.touches.length === 1) {
        this.initialPinchDistance = null;
        lastTouch = getTouchPos(e.touches[0]);
        this.onMouseDown(lastTouch);
      } else if (e.touches.length === 2) {
        this.isDrawing = false;
        this.initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        this.initialPinchZoom = this.zoom;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && lastTouch && !this.initialPinchDistance) {
        const touch = getTouchPos(e.touches[0]);
        touch.movementX = touch.clientX - lastTouch.clientX;
        touch.movementY = touch.clientY - lastTouch.clientY;
        lastTouch = touch;
        this.onMouseMove(touch);
      } else if (e.touches.length === 2 && this.initialPinchDistance) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const rect = this.canvas.getBoundingClientRect();
        
        const centerScreenX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const centerScreenY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const scaleRatio = currentDistance / this.initialPinchDistance;
        const targetZoom = this.initialPinchZoom * scaleRatio;
        const delta = targetZoom - this.zoom;

        this.zoomAt(centerScreenX, centerScreenY, delta);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.isInteracting = false;
        this.onMouseUp();
        lastTouch = null;
        this.initialPinchDistance = null;
        this.render();
      }
    });
  }

  getCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    return {
      x: (clientX - this.panX) / this.zoom,
      y: (clientY - this.panY) / this.zoom,
      screenX: clientX,
      screenY: clientY
    };
  }

  getHandleAtPoint(x, y, shape) {
    if (!shape || !shape.selected) return null;
    const handles = ShapeRenderer.getHandles(shape, this.elements);
    const threshold = 12 / this.zoom;

    for (const [key, handle] of Object.entries(handles)) {
      if (Math.hypot(x - handle.x, y - handle.y) <= threshold) {
        return key;
      }
    }
    return null;
  }

  smoothPoints(points) {
    if (points.length < 3) return points;
    const smoothed = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      smoothed.push({
        x: (prev.x + curr.x * 2 + next.x) / 4,
        y: (prev.y + curr.y * 2 + next.y) / 4
      });
    }

    smoothed.push(points[points.length - 1]);
    return smoothed;
  }

  onMouseDown(e) {
    const coords = this.getCoords(e);
    const { x, y, screenX, screenY } = coords;

    if (this.currentTool === 'zoom') {
      const isZoomOut = this.isShiftPressed || this.zoomMode === 'out';
      const delta = isZoomOut ? -0.2 : 0.2;
      this.zoomAt(screenX, screenY, delta);
      return;
    }

    this.isDrawing = true;
    this.isInteracting = true;
    this.startX = x;
    this.startY = y;

    if (this.currentTool === 'hand') return;

    if (this.currentTool === 'auto-draw' || this.currentTool === 'pencil') {
      this.freehandPoints = [{ x, y }];
      return;
    }

    if (this.currentTool === 'eraser') {
      const initialCount = this.elements.length;
      this.elements = this.elements.filter(el => !this.isPointInside(x, y, el));
      if (this.elements.length !== initialCount) {
        Storage.save(this.elements);
        this.saveHistory();
      }
      this.requestRender();
      return;
    }

    if (this.currentTool === 'select') {
      const selectedElWithHandle = this.elements.find(el => el.selected && this.getHandleAtPoint(x, y, el));
      if (selectedElWithHandle) {
        const handleKey = this.getHandleAtPoint(x, y, selectedElWithHandle);
        this.activeElement = selectedElWithHandle;

        if (handleKey.startsWith('mid_')) {
          const segmentIdx = parseInt(handleKey.split('_')[1], 10);
          if (!this.activeElement.waypoints) this.activeElement.waypoints = [];
          this.activeElement.waypoints.splice(segmentIdx, 0, { x, y });
          this.activeHandle = `waypoint_${segmentIdx}`;
        } else {
          this.activeHandle = handleKey;
        }
        return;
      }

      const clicked = [...this.elements].reverse().find(el => this.isPointInside(x, y, el));

      if (e.shiftKey) {
        if (clicked) {
          clicked.selected = !clicked.selected;
          this.activeElement = clicked.selected ? clicked : null;
        }
      } else {
        if (clicked) {
          if (!clicked.selected) {
            this.elements.forEach(el => el.selected = false);
            clicked.selected = true;
          }
          this.activeElement = clicked;
        } else {
          this.elements.forEach(el => el.selected = false);
          this.activeElement = null;
        }
      }

      this.activeHandle = null;
      this.requestRender();
      return;
    }

    // Busca elemento inicial (forma OU linha/seta existente)
    const startTarget = [...this.elements].reverse().find(el => this.isPointInside(x, y, el));
    const customSymbol = this.customSymbolShape;

    // Se estiver desenhando uma Linha ou Seta, inicia EXATAMENTE no ponto do clique do mouse para ser 100% natural
    let initX = x;
    let initY = y;

    let startSegIdx = null;
    let startRatioVal = null;

    if (startTarget && ['line', 'arrow'].includes(this.currentTool)) {
      if (['line', 'arrow'].includes(startTarget.type)) {
        const info = ShapeRenderer.findClosestSegmentAndRatio({ x, y }, startTarget, this.elements);
        initX = info.point.x;
        initY = info.point.y;
        startSegIdx = info.segmentIndex;
        startRatioVal = info.ratio;
      } else {
        // Usa as coordenadas exatas do clique na borda/área da forma
        initX = x;
        initY = y;
      }
    }

    this.activeElement = {
      id: Date.now(),
      type: this.currentTool,
      x: initX,
      y: initY,
      width: customSymbol ? customSymbol.initialWidth : 0,
      height: customSymbol ? customSymbol.initialHeight : 0,
      initialWidth: customSymbol ? customSymbol.initialWidth : null,
      initialHeight: customSymbol ? customSymbol.initialHeight : null,
      customStrokes: customSymbol ? customSymbol.customStrokes : null,
      customPoints: customSymbol ? customSymbol.customPoints : null,
      text: '',
      textAlign: this.currentTool === 'text' ? 'left' : 'center',
      waypoints: [],
      startConnectedTo: startTarget ? startTarget.id : null,
      startSegmentIndex: startSegIdx,
      startRatio: startRatioVal,
      endConnectedTo: null,
      endSegmentIndex: null,
      endRatio: null
    };
  }

  onMouseMove(e) {
    const { x, y } = this.getCoords(e);

    if (this.currentTool === 'zoom') {
      const isZoomOut = this.isShiftPressed || this.zoomMode === 'out';
      this.canvas.style.cursor = isZoomOut ? 'zoom-out' : 'zoom-in';
      return;
    }

    if (this.currentTool === 'select' && !this.isDrawing) {
      const selectedEl = this.elements.find(el => el.selected);
      if (selectedEl) {
        const handleKey = this.getHandleAtPoint(x, y, selectedEl);
        if (handleKey) {
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
      this.canvas.style.cursor = 'crosshair';
    }

    if (!this.isDrawing) return;

    if (this.currentTool === 'hand') {
      this.panX += e.movementX;
      this.panY += e.movementY;
      this.requestRender();
      return;
    }

    if (this.currentTool === 'auto-draw' || this.currentTool === 'pencil') {
      this.freehandPoints.push({ x, y });
      this.renderFreehand();
      return;
    }

    if (this.activeElement) {
      if (this.currentTool === 'select') {
        const dx = e.movementX / this.zoom;
        const dy = e.movementY / this.zoom;

        if (this.activeHandle) {
          this.resizeElementWithHandle(this.activeElement, this.activeHandle, x, y);
        } else {
          const selectedElements = this.elements.filter(el => el.selected);
          selectedElements.forEach(el => {
            el.x += dx;
            el.y += dy;
            if (el.waypoints) {
              el.waypoints.forEach(wp => {
                wp.x += dx;
                wp.y += dy;
              });
            }
          });
        }
        this.requestRender();
      } else {
        this.activeElement.width = x - this.activeElement.x;
        this.activeElement.height = y - this.activeElement.y;
        this.requestRender();
      }
    }
  }

  resizeElementWithHandle(el, handle, x, y) {
    if (['line', 'arrow'].includes(el.type)) {
      if (handle === 'start') {
        el.startConnectedTo = null;
        el.startSegmentIndex = null;
        el.startRatio = null;
        el.x = x;
        el.y = y;
      } else if (handle === 'end') {
        el.endConnectedTo = null;
        el.endSegmentIndex = null;
        el.endRatio = null;
        el.width = x - el.x;
        el.height = y - el.y;
      } else if (handle.startsWith('waypoint_')) {
        const wpIdx = parseInt(handle.split('_')[1], 10);
        if (el.waypoints && el.waypoints[wpIdx]) {
          el.waypoints[wpIdx] = { x, y };
        }
      }
      return;
    }

    switch (handle) {
      case 'br':
        el.width = x - el.x;
        el.height = y - el.y;
        break;
      case 'bl':
        el.width += (el.x - x);
        el.x = x;
        el.height = y - el.y;
        break;
      case 'tr':
        el.width = x - el.x;
        el.height += (el.y - y);
        el.y = y;
        break;
      case 'tl':
        el.width += (el.x - x);
        el.height += (el.y - y);
        el.x = x;
        el.y = y;
        break;
    }
  }

  onMouseUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.isInteracting = false;

    if (this.currentTool === 'pencil' && this.freehandPoints.length > 1) {
      const smoothed = this.smoothPoints(this.freehandPoints);

      const xs = smoothed.map(p => p.x);
      const ys = smoothed.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const width = Math.max(maxX - minX, 30);
      const height = Math.max(maxY - minY, 30);

      const relativePoints = smoothed.map(p => ({
        dx: p.x - minX,
        dy: p.y - minY
      }));

      const pencilShape = {
        id: Date.now(),
        type: 'pencil',
        x: minX,
        y: minY,
        width,
        height,
        initialWidth: width,
        initialHeight: height,
        points: relativePoints,
        text: '',
        textAlign: 'center'
      };

      this.elements.push(pencilShape);
      Storage.save(this.elements);
      this.saveHistory();
      this.freehandPoints = [];
      this.render();
      return;
    }

    if (this.currentTool === 'auto-draw' && this.freehandPoints.length > 0) {
      const recognized = ShapeRecognizer.recognize(this.freehandPoints);
      if (recognized) {
        const newShape = { id: Date.now(), ...recognized, text: '', textAlign: 'center' };
        this.elements.push(newShape);
        Storage.save(this.elements);
        this.saveHistory();
        
        if (!['line', 'arrow'].includes(newShape.type)) {
          this.openTextEditor(newShape);
        }
      }
      this.freehandPoints = [];
      this.render();

      this.resetToSelectTool();
      return;
    }

    if (this.activeElement) {
      if (this.currentTool !== 'select') {
        const endX = this.activeElement.x + this.activeElement.width;
        const endY = this.activeElement.y + this.activeElement.height;

        if (['line', 'arrow'].includes(this.activeElement.type)) {
          const endTarget = [...this.elements].reverse().find(el => 
            this.isPointInside(endX, endY, el) && el.id !== this.activeElement.id && el.id !== this.activeElement.startConnectedTo
          );

          if (endTarget) {
            this.activeElement.endConnectedTo = endTarget.id;
            if (['line', 'arrow'].includes(endTarget.type)) {
              const info = ShapeRenderer.findClosestSegmentAndRatio({ x: endX, y: endY }, endTarget, this.elements);
              this.activeElement.endSegmentIndex = info.segmentIndex;
              this.activeElement.endRatio = info.ratio;
              this.activeElement.width = info.point.x - this.activeElement.x;
              this.activeElement.height = info.point.y - this.activeElement.y;
            } else {
              this.activeElement.width = endX - this.activeElement.x;
              this.activeElement.height = endY - this.activeElement.y;
            }
          }
        } else {
          if (this.activeElement.width < 0) {
            this.activeElement.x += this.activeElement.width;
            this.activeElement.width = Math.abs(this.activeElement.width);
          }
          if (this.activeElement.height < 0) {
            this.activeElement.y += this.activeElement.height;
            this.activeElement.height = Math.abs(this.activeElement.height);
          }
        }

        const createdElement = this.activeElement;
        this.elements.push(createdElement);
        Storage.save(this.elements);
        this.saveHistory();
        this.activeElement = null;

        this.render();

        if (!['line', 'arrow'].includes(createdElement.type)) {
          this.openTextEditor(createdElement);
        }

        this.resetToSelectTool();
        return;
      }

      if (this.activeHandle && ['line', 'arrow'].includes(this.activeElement.type)) {
        const handlePt = this.activeHandle === 'start' 
          ? { x: this.activeElement.x, y: this.activeElement.y }
          : { x: this.activeElement.x + this.activeElement.width, y: this.activeElement.y + this.activeElement.height };

        const target = [...this.elements].reverse().find(el => 
          this.isPointInside(handlePt.x, handlePt.y, el) && el.id !== this.activeElement.id
        );

        if (target) {
          if (this.activeHandle === 'start') {
            this.activeElement.startConnectedTo = target.id;
            if (['line', 'arrow'].includes(target.type)) {
              const info = ShapeRenderer.findClosestSegmentAndRatio(handlePt, target, this.elements);
              this.activeElement.startSegmentIndex = info.segmentIndex;
              this.activeElement.startRatio = info.ratio;
            }
          }
          if (this.activeHandle === 'end') {
            this.activeElement.endConnectedTo = target.id;
            if (['line', 'arrow'].includes(target.type)) {
              const info = ShapeRenderer.findClosestSegmentAndRatio(handlePt, target, this.elements);
              this.activeElement.endSegmentIndex = info.segmentIndex;
              this.activeElement.endRatio = info.ratio;
            }
          }
        }
      }

      Storage.save(this.elements);
      this.saveHistory();
      this.activeElement = null;
      this.activeHandle = null;
    }

    this.render();
  }

  onDoubleClick(e) {
    const { x, y } = this.getCoords(e);
    
    const selectedEl = this.elements.find(el => el.selected && ['line', 'arrow'].includes(el.type));
    if (selectedEl && selectedEl.waypoints) {
      const handleKey = this.getHandleAtPoint(x, y, selectedEl);
      if (handleKey && handleKey.startsWith('waypoint_')) {
        const wpIdx = parseInt(handleKey.split('_')[1], 10);
        selectedEl.waypoints.splice(wpIdx, 1);
        Storage.save(this.elements);
        this.saveHistory();
        this.render();
        return;
      }
    }

    const target = [...this.elements].reverse().find(el => this.isPointInside(x, y, el));
    if (target) {
      this.openTextEditor(target);
    }
  }

  openTextEditor(shape) {
    const container = document.getElementById('text-editor-container');
    const editor = document.getElementById('text-editor');
    const alignBtns = document.querySelectorAll('.align-btn');

    if (!shape.textAlign) {
      shape.textAlign = shape.type === 'text' ? 'left' : 'center';
    }

    const updateAlignButtons = (currentAlign) => {
      alignBtns.forEach(btn => {
        if (btn.dataset.align === currentAlign) {
          btn.classList.add('text-emerald-400', 'bg-slate-800');
        } else {
          btn.classList.remove('text-emerald-400', 'bg-slate-800');
        }
      });
      editor.style.textAlign = currentAlign;
    };

    updateAlignButtons(shape.textAlign);

    editor.value = shape.text || '';
    
    const scaledX = shape.x * this.zoom + this.panX;
    const scaledY = shape.y * this.zoom + this.panY;
    const scaledW = Math.max(shape.width * this.zoom, 120);
    const scaledH = Math.max(shape.height * this.zoom, 40);

    container.style.left = `${scaledX}px`;
    container.style.top = `${scaledY - 32}px`;
    container.style.width = `${scaledW}px`;
    container.style.height = `${scaledH + 32}px`;

    editor.style.width = '100%';
    editor.style.height = `${scaledH}px`;

    container.classList.remove('hidden');

    setTimeout(() => {
      editor.focus();
      editor.select();
    }, 10);

    const handleAlignClick = (e) => {
      const btn = e.target.closest('.align-btn');
      if (btn) {
        shape.textAlign = btn.dataset.align;
        updateAlignButtons(shape.textAlign);
        this.render();
      }
    };

    const alignToolbar = document.getElementById('text-align-toolbar');
    alignToolbar.addEventListener('click', handleAlignClick);

    const saveText = (e) => {
      if (e.relatedTarget && alignToolbar.contains(e.relatedTarget)) {
        return;
      }

      shape.text = editor.value;
      
      this.ctx.font = '14px monospace';
      const lines = shape.text.split('\n');
      let maxLineWidth = 0;
      lines.forEach(l => {
        const w = this.ctx.measureText(l).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });

      shape.width = Math.max(shape.width, maxLineWidth + 20);
      shape.height = Math.max(shape.height, lines.length * 20 + 20);

      container.classList.add('hidden');
      Storage.save(this.elements);
      this.saveHistory();
      this.render();

      editor.removeEventListener('blur', saveText);
      editor.removeEventListener('keydown', handleKeyDown);
      alignToolbar.removeEventListener('click', handleAlignClick);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        editor.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        editor.blur();
      }
    };

    editor.addEventListener('blur', saveText);
    editor.addEventListener('keydown', handleKeyDown);
  }

  isPointInside(x, y, el) {
    if (['line', 'arrow'].includes(el.type)) {
      const waypoints = ShapeRenderer.getLineWaypoints(el, this.elements);
      for (let i = 0; i < waypoints.length - 1; i++) {
        const x1 = waypoints[i].x;
        const y1 = waypoints[i].y;
        const x2 = waypoints[i + 1].x;
        const y2 = waypoints[i + 1].y;
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const dist = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / len;
        
        const dot = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (len * len);
        if (dist < (12 / this.zoom) && dot >= 0 && dot <= 1) return true;
      }
      return false;
    }

    return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height;
  }

  renderFreehand() {
    if (this.freehandPoints.length < 2) return;
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    this.ctx.beginPath();
    this.ctx.strokeStyle = '#10b981';
    this.ctx.lineWidth = 2 / this.zoom;
    this.ctx.moveTo(this.freehandPoints[0].x, this.freehandPoints[0].y);
    for (let i = 1; i < this.freehandPoints.length; i++) {
      this.ctx.lineTo(this.freehandPoints[i].x, this.freehandPoints[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  ShapeRendererDraw(shape) {
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);
    ShapeRenderer.draw(this.rc, this.ctx, shape, this.elements, this.isInteracting);
    this.ctx.restore();
  }

  requestRender() {
    if (!this.renderRequested) {
      this.renderRequested = true;
      requestAnimationFrame(() => {
        this.renderRequested = false;
        this.render();
      });
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.elements.forEach(shape => this.ShapeRendererDraw(shape));
    if (this.activeElement && this.isDrawing) {
      this.ShapeRendererDraw(this.activeElement);
    }
  }

  clearCanvas() {
    this.elements = [];
    Storage.clear();
    this.saveHistory();
    this.render();
  }
}