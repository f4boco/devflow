// Renderização das formas Hand-Drawn via Rough.js com Suporte a Alinhamento de Texto
const ShapeRenderer = {
  draw(rc, ctx, shape, elements = []) {
    const options = {
      stroke: '#10b981',
      strokeWidth: 2,
      roughness: 1.2,
      bowing: 1,
      fill: shape.selected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
      fillStyle: 'solid'
    };

    let { x, y, width: w, height: h, type, text, points, initialWidth, initialHeight } = shape;

    if (type === 'line' || type === 'arrow') {
      const lineWaypoints = this.getLineWaypoints(shape, elements);

      for (let i = 0; i < lineWaypoints.length - 1; i++) {
        const p1 = lineWaypoints[i];
        const p2 = lineWaypoints[i + 1];
        rc.line(p1.x, p1.y, p2.x, p2.y, options);
      }

      if (type === 'arrow' && lineWaypoints.length >= 2) {
        const pLastPrev = lineWaypoints[lineWaypoints.length - 2];
        const pLast = lineWaypoints[lineWaypoints.length - 1];

        const angle = Math.atan2(pLast.y - pLastPrev.y, pLast.x - pLastPrev.x);
        const headlen = 12;

        rc.line(
          pLast.x, pLast.y,
          pLast.x - headlen * Math.cos(angle - Math.PI / 6),
          pLast.y - headlen * Math.sin(angle - Math.PI / 6),
          options
        );
        rc.line(
          pLast.x, pLast.y,
          pLast.x - headlen * Math.cos(angle + Math.PI / 6),
          pLast.y - headlen * Math.sin(angle + Math.PI / 6),
          options
        );
      }
    } else {
      switch (type) {
        case 'start-end':
        case 'terminator':
        case 'terminal':
          const radius = Math.min(Math.abs(h) / 2, Math.abs(w) / 2);
          rc.path(`M ${x + radius} ${y} L ${x + w - radius} ${y} A ${radius} ${radius} 0 0 1 ${x + w - radius} ${y + h} L ${x + radius} ${y + h} A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`, options);
          break;

        case 'process':
          rc.rectangle(x, y, w, h, options);
          break;

        case 'predefined-process':
        case 'routine-call':
          rc.rectangle(x, y, w, h, options);
          rc.line(x + 12, y, x + 12, y + h, options);
          rc.line(x + w - 12, y, x + w - 12, y + h, options);
          break;

        case 'parallel-process':
        case 'synchronization':
          rc.line(x, y + 4, x + w, y + 4, options);
          rc.line(x, y + h - 4, x + w, y + h - 4, options);
          break;

        case 'condition':
        case 'decision':
          rc.polygon([[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]], options);
          break;

        case 'input-output':
        case 'data-flow':
          const ioOffset = 15;
          rc.polygon([[x + ioOffset, y], [x + w], [x + w - ioOffset, y + h], [x, y + h]], options);
          break;

        case 'manual-input':
        case 'keyboard-input':
          rc.polygon([[x, y + 10], [x + w, y], [x + w, y + h], [x, y + h]], options);
          break;

        case 'manual-operation':
          rc.polygon([[x, y], [x + w, y], [x + w - 12, y + h], [x + 12, y + h]], options);
          break;

        case 'preparation':
        case 'loop':
          rc.polygon([[x + 15, y], [x + w - 15, y], [x + w, y + h / 2], [x + w - 15, y + h], [x + 15, y + h], [x, y + h / 2]], options);
          break;

        case 'document':
        case 'printed-output':
        case 'print':
          rc.path(`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - 10} Q ${x + w * 0.75} ${y + h + 5}, ${x + w * 0.5} ${y + h - 5} T ${x} ${y + h - 5} Z`, options);
          break;

        case 'multi-document':
          rc.path(`M ${x + 8} ${y + 8} L ${x + w + 8} ${y + 8} L ${x + w + 8} ${y + h - 2} Z`, options);
          rc.path(`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - 10} Q ${x + w * 0.75} ${y + h + 5}, ${x + w * 0.5} ${y + h - 5} T ${x} ${y + h - 5} Z`, options);
          break;

        case 'display':
        case 'screen-display':
          rc.path(`M ${x + 15} ${y} L ${x + w - 15} ${y} Q ${x + w} ${y + h / 2} ${x + w - 15} ${y + h} L ${x + 15} ${y + h} L ${x} ${y + h / 2} Z`, options);
          break;

        case 'database':
        case 'direct-access-storage':
          const ry = 8;
          rc.ellipse(x + w / 2, y + ry, w, ry * 2, options);
          rc.line(x, y + ry, x, y + h - ry, options);
          rc.line(x + w, y + ry, x + w, y + h - ry, options);
          rc.path(`M ${x} ${y + h - ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry}`, options);
          break;

        case 'data-storage':
        case 'internal-memory':
        case 'file':
          rc.rectangle(x, y, w, h, options);
          rc.line(x + 10, y, x + 10, y + h, options);
          rc.line(x, y + 10, x + w, y + 10, options);
          break;

        case 'magnetic-disk':
          rc.ellipse(x + w / 2, y + h / 2, w, h, options);
          rc.ellipse(x + w / 2, y + h / 2, w * 0.4, h * 0.4, options);
          break;

        case 'magnetic-drum':
          rc.ellipse(x + 10, y + h / 2, 20, h, options);
          rc.line(x + 10, y, x + w - 10, y, options);
          rc.line(x + 10, y + h, x + w - 10, y + h, options);
          rc.path(`M ${x + w - 10} ${y} A 10 ${h / 2} 0 0 1 ${x + w - 10} ${y + h}`, options);
          break;

        case 'magnetic-tape':
        case 'sequential-storage':
          rc.ellipse(x + w / 2, y + h / 2 - 5, w * 0.8, h * 0.8, options);
          rc.line(x + w / 2, y + h - 5, x + w, y + h - 5, options);
          break;

        case 'punched-card':
          rc.polygon([[x + 15, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 15]], options);
          break;

        case 'punched-tape':
          rc.path(`M ${x} ${y + 5} Q ${x + w * 0.25} ${y - 5}, ${x + w * 0.5} ${y + 5} T ${x + w} ${y + 5} L ${x + w} ${y + h - 5} Q ${x + w * 0.75} ${y + h + 5}, ${x + w * 0.5} ${y + h - 5} T ${x} ${y + h - 5} Z`, options);
          break;

        case 'merge':
        case 'extract':
          rc.polygon([[x, y], [x + w, y], [x + w / 2, y + h]], options);
          break;

        case 'sort':
          rc.polygon([[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]], options);
          rc.line(x, y + h / 2, x + w, y + h / 2, options);
          break;

        case 'collate':
          rc.polygon([[x, y], [x + w], [x, y + h], [x + w, y + h]], options);
          break;

        case 'delay':
        case 'wait':
          rc.path(`M ${x} ${y} L ${x + w - h / 2} ${y} A ${h / 2} ${h / 2} 0 0 1 ${x + w - h / 2} ${y + h} L ${x} ${y + h} Z`, options);
          break;

        case 'on-page-connector':
        case 'logical-connector':
        case 'inspection-point':
          const dim = Math.min(w, h);
          rc.ellipse(x + w / 2, y + h / 2, dim, dim, options);
          break;

        case 'off-page-connector':
          rc.polygon([[x, y], [x + w, y], [x + w, y + h * 0.7], [x + w / 2, y + h], [x, y + h * 0.7]], options);
          break;

        case 'comment':
        case 'annotation':
          rc.path(`M ${x + 15} ${y} L ${x} ${y} L ${x} ${y + h} L ${x + 15} ${y + h}`, options);
          break;

        case 'network-interface':
        case 'communication':
        case 'data-transmission':
          rc.polygon([[x, y + h / 2], [x + w * 0.4, y], [x + w * 0.4, y + h * 0.3], [x + w, y + h * 0.3], [x + w, y + h * 0.7], [x + w * 0.4, y + h * 0.7], [x + w * 0.4, y + h]], options);
          break;

        case 'pencil':
          if (points && points.length > 1) {
            const scaleX = initialWidth ? w / initialWidth : 1;
            const scaleY = initialHeight ? h / initialHeight : 1;
            const scaledPoints = points.map(p => [x + p.dx * scaleX, y + p.dy * scaleY]);
            rc.curve(scaledPoints, options);
          }
          break;
      }
    }

    // Renderiza Texto respeitando o alinhamento
    if (text) {
      ctx.font = '14px monospace';
      ctx.fillStyle = '#64748b';
      ctx.textBaseline = 'middle';
      
      const align = shape.textAlign || 'center';
      ctx.textAlign = align;

      const lines = text.split('\n');
      const lineHeight = 18;
      const startY = (y + h / 2) - ((lines.length - 1) * lineHeight) / 2;

      let textX = x + w / 2; // Padrão 'center'
      if (align === 'left') {
        textX = x + 15; // Margem interna esquerda
      } else if (align === 'right') {
        textX = x + w - 15; // Margem interna direita
      }

      lines.forEach((line, index) => {
        ctx.fillText(line, textX, startY + (index * lineHeight));
      });
    }

    if (shape.selected) {
      this.drawHandles(ctx, shape, elements);
    }
  },

  getLineWaypoints(shape, elements = []) {
    const startShape = elements.find(el => el.id === shape.startConnectedTo);
    const endShape = elements.find(el => el.id === shape.endConnectedTo);

    const waypoints = shape.waypoints || [];

    let pStart = { x: shape.x, y: shape.y };
    const pNext = waypoints.length > 0 ? waypoints[0] : { x: shape.x + shape.width, y: shape.y + shape.height };

    if (startShape) {
      const startCenter = { x: startShape.x + startShape.width / 2, y: startShape.y + startShape.height / 2 };
      pStart = this.getEdgeIntersection(startCenter, pNext, startShape);
    }

    let pEnd = { x: shape.x + shape.width, y: shape.y + shape.height };
    const pPrev = waypoints.length > 0 ? waypoints[waypoints.length - 1] : pStart;

    if (endShape) {
      const endCenter = { x: endShape.x + endShape.width / 2, y: endShape.y + endShape.height / 2 };
      pEnd = this.getEdgeIntersection(endCenter, pPrev, endShape);
    }

    return [pStart, ...waypoints, pEnd];
  },

  drawHandles(ctx, shape, elements = []) {
    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.5;

    const handles = this.getHandles(shape, elements);

    Object.entries(handles).forEach(([key, h]) => {
      ctx.beginPath();
      if (['line', 'arrow'].includes(shape.type)) {
        if (key.startsWith('mid_')) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = '#10b981';
          ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
        }
      } else {
        ctx.rect(h.x - 4, h.y - 4, 8, 8);
      }
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  },

  getHandles(shape, elements = []) {
    const { x, y, width: w, height: h, type } = shape;

    if (['line', 'arrow'].includes(type)) {
      const waypoints = this.getLineWaypoints(shape, elements);
      const handles = {};

      waypoints.forEach((pt, idx) => {
        if (idx === 0) handles['start'] = pt;
        else if (idx === waypoints.length - 1) handles['end'] = pt;
        else handles[`waypoint_${idx - 1}`] = pt;
      });

      for (let i = 0; i < waypoints.length - 1; i++) {
        const midX = (waypoints[i].x + waypoints[i + 1].x) / 2;
        const midY = (waypoints[i].y + waypoints[i + 1].y) / 2;
        handles[`mid_${i}`] = { x: midX, y: midY };
      }

      return handles;
    }

    return {
      tl: { x, y },
      tr: { x: x + w, y },
      br: { x: x + w, y: y + h },
      bl: { x, y: y + h }
    };
  },

  getEdgeIntersection(fromCenter, toCenter, targetShape) {
    const { x, y, width: w, height: h } = targetShape;

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const angle = Math.atan2(dy, dx);

    const halfW = Math.abs(w) / 2;
    const halfH = Math.abs(h) / 2;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let factor = 0;
    if (Math.abs(cos) * halfH > Math.abs(sin) * halfW) {
      factor = halfW / (Math.abs(cos) || 0.001);
    } else {
      factor = halfH / (Math.abs(sin) || 0.001);
    }

    return {
      x: fromCenter.x + cos * factor,
      y: fromCenter.y + sin * factor
    };
  }
};