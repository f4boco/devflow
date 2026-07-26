class CanvasManager {
  constructor(canvasId, workspaceId) {
    this.canvas = document.getElementById(canvasId);
    this.workspace = document.getElementById(workspaceId);
    this.ctx = this.canvas.getContext('2d');
    this.rc = rough.canvas(this.canvas);

    this.elements = Storage.load();
    this.currentTool = 'select';
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.activeElement = null;
    this.activeHandle = null;
    this.freehandPoints = [];
    
    // Pan & Zoom
    this.panX = 0;
    this.panY = 0;

    // Histórico para Undo/Redo (Ctrl+Z / Ctrl+Y)
    this.undoStack = [];
    this.redoStack = [];
    this.saveHistory();

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupEvents();
    this.setupKeyboardShortcuts();
    this.render();
  }

  saveHistory() {
    const currentState = JSON.stringify(this.elements);
    const lastState = this.undoStack[this.undoStack.length - 1];

    if (currentState !== lastState) {
      this.undoStack.push(currentState);
      this.redoStack = [];
    }
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.redoStack.push(this.undoStack.pop());
      const previousState = JSON.parse(this.undoStack[this.undoStack.length - 1]);
      this.elements = previousState;
      Storage.save(this.elements);
      this.render();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const nextState = this.redoStack.pop();
      this.undoStack.push(nextState);
      this.elements = JSON.parse(nextState);
      Storage.save(this.elements);
      this.render();
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

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          this.redo();
        } else {
          e.preventDefault();
          this.undo();
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.deleteSelected();
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
  }

  getCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - this.panX,
      y: e.clientY - rect.top - this.panY
    };
  }

  getHandleAtPoint(x, y, shape) {
    if (!shape || !shape.selected) return null;
    const handles = ShapeRenderer.getHandles(shape, this.elements);
    const threshold = 10;

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
    const { x, y } = this.getCoords(e);
    this.isDrawing = true;
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
      this.render();
      return;
    }

    if (this.currentTool === 'select') {
      const selectedEl = this.elements.find(el => el.selected);
      if (selectedEl) {
        const handleKey = this.getHandleAtPoint(x, y, selectedEl);
        if (handleKey) {
          this.activeElement = selectedEl;

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
      }

      this.elements.forEach(el => el.selected = false);
      const clicked = [...this.elements].reverse().find(el => this.isPointInside(x, y, el));
      if (clicked) {
        clicked.selected = true;
        this.activeElement = clicked;
        this.activeHandle = null;
      } else {
        this.activeElement = null;
        this.activeHandle = null;
      }
      this.render();
      return;
    }

    const startShape = [...this.elements].reverse().find(el => this.isPointInside(x, y, el) && !['line', 'arrow'].includes(el.type));

    this.activeElement = {
      id: Date.now(),
      type: this.currentTool,
      x: startShape ? (startShape.x + startShape.width / 2) : x,
      y: startShape ? (startShape.y + startShape.height / 2) : y,
      width: 10,
      height: 10,
      text: '',
      textAlign: 'center', // Padrão Centralizado
      waypoints: [],
      startConnectedTo: startShape ? startShape.id : null,
      endConnectedTo: null
    };
  }

  onMouseMove(e) {
    const { x, y } = this.getCoords(e);

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
      this.render();
      return;
    }

    if (this.currentTool === 'auto-draw' || this.currentTool === 'pencil') {
      this.freehandPoints.push({ x, y });
      this.renderFreehand();
      return;
    }

    if (this.activeElement) {
      if (this.currentTool === 'select') {
        if (this.activeHandle) {
          this.resizeElementWithHandle(this.activeElement, this.activeHandle, x, y);
        } else {
          this.activeElement.x += e.movementX;
          this.activeElement.y += e.movementY;
          if (this.activeElement.waypoints) {
            this.activeElement.waypoints.forEach(wp => {
              wp.x += e.movementX;
              wp.y += e.movementY;
            });
          }
        }
        this.render();
      } else {
        this.activeElement.width = x - this.startX;
        this.activeElement.height = y - this.startY;
        this.render();
        this.ShapeRendererDraw(this.activeElement);
      }
    }
  }

  resizeElementWithHandle(el, handle, x, y) {
    if (['line', 'arrow'].includes(el.type)) {
      if (handle === 'start') {
        el.startConnectedTo = null;
        el.x = x;
        el.y = y;
      } else if (handle === 'end') {
        el.endConnectedTo = null;
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

      this.openTextEditor(pencilShape);
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
      return;
    }

    if (this.activeElement) {
      if (this.currentTool !== 'select') {
        const endX = this.activeElement.x + this.activeElement.width;
        const endY = this.activeElement.y + this.activeElement.height;

        if (['line', 'arrow'].includes(this.activeElement.type)) {
          const endShape = [...this.elements].reverse().find(el => 
            this.isPointInside(endX, endY, el) && !['line', 'arrow'].includes(el.type) && el.id !== this.activeElement.startConnectedTo
          );
          if (endShape) {
            this.activeElement.endConnectedTo = endShape.id;
            this.activeElement.width = (endShape.x + endShape.width / 2) - this.activeElement.x;
            this.activeElement.height = (endShape.y + endShape.height / 2) - this.activeElement.y;
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
        return;
      }

      if (this.activeHandle && ['line', 'arrow'].includes(this.activeElement.type)) {
        const handlePt = this.activeHandle === 'start' 
          ? { x: this.activeElement.x, y: this.activeElement.y }
          : { x: this.activeElement.x + this.activeElement.width, y: this.activeElement.y + this.activeElement.height };

        const targetShape = [...this.elements].reverse().find(el => 
          this.isPointInside(handlePt.x, handlePt.y, el) && !['line', 'arrow'].includes(el.type)
        );

        if (targetShape) {
          if (this.activeHandle === 'start') this.activeElement.startConnectedTo = targetShape.id;
          if (this.activeHandle === 'end') this.activeElement.endConnectedTo = targetShape.id;
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

    if (!shape.textAlign) shape.textAlign = 'center';

    // Atualiza botões ativos na toolbar de alinhamento
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
    
    // Posiciona o container com offset para caber a toolbar de alinhamento em cima
    container.style.left = `${shape.x + this.panX}px`;
    container.style.top = `${shape.y + this.panY - 32}px`;
    container.style.width = `${Math.max(shape.width, 120)}px`;
    container.style.height = `${Math.max(shape.height + 32, 70)}px`;

    editor.style.width = '100%';
    editor.style.height = `${Math.max(shape.height, 40)}px`;

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
      // Se clicou dentro da toolbar de alinhamento, não encerra a edição
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

      shape.width = Math.max(shape.width, maxLineWidth + 40);
      shape.height = Math.max(shape.height, lines.length * 20 + 30);

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
        if (dist < 12 && dot >= 0 && dot <= 1) return true;
      }
      return false;
    }

    return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height;
  }

  renderFreehand() {
    if (this.freehandPoints.length < 2) return;
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#10b981';
    this.ctx.lineWidth = 2;
    this.ctx.moveTo(this.freehandPoints[0].x + this.panX, this.freehandPoints[0].y + this.panY);
    for (let i = 1; i < this.freehandPoints.length; i++) {
      this.ctx.lineTo(this.freehandPoints[i].x + this.panX, this.freehandPoints[i].y + this.panY);
    }
    this.ctx.stroke();
  }

  ShapeRendererDraw(shape) {
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    ShapeRenderer.draw(this.rc, this.ctx, shape, this.elements);
    this.ctx.restore();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.elements.forEach(shape => this.ShapeRendererDraw(shape));
  }

  clearCanvas() {
    this.elements = [];
    Storage.clear();
    this.saveHistory();
    this.render();
  }
}