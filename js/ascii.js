/**
 * ASCIIConverter - Conversor cartesiano 2D fidedigno para ASCII Art.
 * Ajusta automaticamente a largura e altura do bloco em caracteres
 * para conter 100% do texto sem cortes na direita nem linhas fantasmas no fundo.
 */
const ASCIIConverter = {
  generate(elements) {
    if (!elements || elements.length === 0) {
      return " ( Canvas Vazio - Nenhum elemento para exportar ) ";
    }

    // Proporção do caractere monoespaçado em pixels no Canvas
    const CHAR_W = 10;
    const CHAR_H = 20;

    const PADDING_X = 2; // Espaço de caracteres à esquerda e à direita do texto

    // 1. Processar todos os elementos e determinar suas dimensões reais em ASCII
    const processedShapes = [];
    const shapes = elements.filter(el => !['line', 'arrow'].includes(el.type));
    const connectors = elements.filter(el => ['line', 'arrow'].includes(el.type));

    shapes.forEach(el => {
      // Normaliza o texto removendo quebras vazias na ponta
      const cleanRawText = (el.text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      const lines = cleanRawText ? cleanRawText.split('\n') : [];

      let maxLineLength = 0;
      lines.forEach(l => {
        if (l.length > maxLineLength) maxLineLength = l.length;
      });

      let c1 = Math.floor(el.x / CHAR_W);
      let r1 = Math.floor(el.y / CHAR_H);

      // Largura em colunas baseada no maior comprimento do texto + padding
      const visualCols = Math.ceil(el.width / CHAR_W);
      const textCols = maxLineLength > 0 ? maxLineLength + (PADDING_X * 2) + 2 : 6;
      const widthCols = Math.max(visualCols, textCols);

      // Altura em linhas baseada estritamente no número de linhas de texto + 2 bordas
      const visualRows = Math.ceil(el.height / CHAR_H);
      const textRows = lines.length > 0 ? lines.length + 2 : 3;
      const heightRows = Math.max(visualRows, textRows);

      let c2 = c1 + widthCols;
      let r2 = r1 + heightRows;

      processedShapes.push({
        el,
        c1,
        r1,
        c2,
        r2,
        widthCols,
        heightRows,
        lines
      });
    });

    // 2. Calcular os limites globais do desenho para criar a grade 2D
    let minC = Infinity, minR = Infinity, maxC = -Infinity, maxR = -Infinity;

    processedShapes.forEach(ps => {
      if (ps.c1 < minC) minC = ps.c1;
      if (ps.r1 < minR) minR = ps.r1;
      if (ps.c2 > maxC) maxC = ps.c2;
      if (ps.r2 > maxR) maxR = ps.r2;
    });

    connectors.forEach(el => {
      const waypoints = ShapeRenderer.getLineWaypoints(el, elements);
      waypoints.forEach(pt => {
        const c = Math.floor(pt.x / CHAR_W);
        const r = Math.floor(pt.y / CHAR_H);
        if (c < minC) minC = c;
        if (r < minR) minR = r;
        if (c > maxC) maxC = c;
        if (r > maxR) maxR = r;
      });
    });

    const marginCols = 4;
    const marginRows = 2;

    minC -= marginCols;
    minR -= marginRows;
    maxC += marginCols;
    maxR += marginRows;

    const cols = Math.max(maxC - minC, 30);
    const rows = Math.max(maxR - minR, 15);

    const toCol = (x) => Math.floor(x / CHAR_W) - minC;
    const toRow = (y) => Math.floor(y / CHAR_H) - minR;

    // Inicializa a grade 2D preenchida com espaços
    const grid = Array.from({ length: rows }, () => Array(cols).fill(' '));

    const setChar = (r, c, char) => {
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        grid[r][c] = char;
      }
    };

    const writeString = (r, startC, str) => {
      for (let i = 0; i < str.length; i++) {
        setChar(r, startC + i, str[i]);
      }
    };

    // 3. Desenhar as Formas na Matriz ASCII
    processedShapes.forEach(ps => {
      const { el, lines } = ps;
      const c1 = ps.c1 - minC;
      const r1 = ps.r1 - minR;
      const c2 = ps.c2 - minC;
      const r2 = ps.r2 - minR;

      const widthCols = c2 - c1;

      // --- CASO 1: SÍMBOLOS CUSTOMIZADOS OU CANETA ---
      if (el.customStrokes || el.customPoints || el.type === 'pencil' || el.points) {
        const strokes = el.customStrokes || (el.customPoints ? [el.customPoints] : (el.points ? [el.points] : []));
        const scaleX = el.initialWidth ? el.width / el.initialWidth : 1;
        const scaleY = el.initialHeight ? el.height / el.initialHeight : 1;

        strokes.forEach(stroke => {
          if (!stroke || stroke.length < 2) return;
          for (let i = 0; i < stroke.length - 1; i++) {
            const p1 = { x: el.x + stroke[i].dx * scaleX, y: el.y + stroke[i].dy * scaleY };
            const p2 = { x: el.x + stroke[i + 1].dx * scaleX, y: el.y + stroke[i + 1].dy * scaleY };

            const sc = toCol(p1.x);
            const sr = toRow(p1.y);
            const ec = toCol(p2.x);
            const er = toRow(p2.y);

            const steps = Math.max(Math.abs(ec - sc), Math.abs(er - sr), 1);
            for (let s = 0; s <= steps; s++) {
              const c = Math.round(sc + (ec - sc) * (s / steps));
              const r = Math.round(sr + (er - sr) * (s / steps));
              
              const dc = Math.abs(ec - sc);
              const dr = Math.abs(er - sr);
              let char = '*';
              if (dc > dr * 2) char = '-';
              else if (dr > dc * 2) char = '|';
              else char = (ec - sc) * (er - sr) > 0 ? '\\' : '/';

              setChar(r, c, char);
            }
          }
        });
      } 
      // --- CASO 2: FORMAS ISO PADRÃO ---
      else {
        switch (el.type) {
          case 'start-end':
          case 'terminator':
          case 'terminal':
            writeString(r1, c1, '(' + '-'.repeat(Math.max(0, widthCols - 2)) + ')');
            writeString(r2 - 1, c1, '(' + '-'.repeat(Math.max(0, widthCols - 2)) + ')');
            for (let r = r1 + 1; r < r2 - 1; r++) {
              setChar(r, c1, '|');
              setChar(r, c2 - 1, '|');
            }
            break;

          case 'condition':
          case 'decision':
            const midR = Math.floor((r1 + r2 - 1) / 2);
            const midC = Math.floor((c1 + c2 - 1) / 2);

            setChar(r1, midC, '/');
            setChar(r2 - 1, midC, '\\');
            setChar(midR, c1, '<');
            setChar(midR, c2 - 1, '>');

            for (let r = r1 + 1; r < midR; r++) {
              const offset = Math.floor((r - r1) * (midC - c1) / Math.max(1, midR - r1));
              setChar(r, midC - offset, '/');
              setChar(r, midC + offset, '\\');
            }
            for (let r = midR + 1; r < r2 - 1; r++) {
              const offset = Math.floor(((r2 - 1) - r) * (midC - c1) / Math.max(1, (r2 - 1) - midR));
              setChar(r, midC - offset, '\\');
              setChar(r, midC + offset, '/');
            }
            break;

          case 'input-output':
          case 'data-flow':
            writeString(r1, c1 + 2, '/' + '-'.repeat(Math.max(0, widthCols - 3)) + '/');
            writeString(r2 - 1, c1, '/' + '-'.repeat(Math.max(0, widthCols - 3)) + '/');
            for (let r = r1 + 1; r < r2 - 1; r++) {
              setChar(r, c1 + 1, '/');
              setChar(r, c2 - 1, '/');
            }
            break;

          case 'database':
          case 'direct-access-storage':
            writeString(r1, c1, '(' + '='.repeat(Math.max(0, widthCols - 2)) + ')');
            writeString(r2 - 1, c1, '(' + '='.repeat(Math.max(0, widthCols - 2)) + ')');
            for (let r = r1 + 1; r < r2 - 1; r++) {
              setChar(r, c1, '|');
              setChar(r, c2 - 1, '|');
            }
            break;

          case 'text':
            // Texto livre sem bordas
            break;

          default: // Retângulo e Processos
            writeString(r1, c1, '+' + '-'.repeat(Math.max(0, widthCols - 2)) + '+');
            writeString(r2 - 1, c1, '+' + '-'.repeat(Math.max(0, widthCols - 2)) + '+');
            for (let r = r1 + 1; r < r2 - 1; r++) {
              setChar(r, c1, '|');
              setChar(r, c2 - 1, '|');
            }
            break;
        }
      }

      // Escrever as linhas de texto perfeitamente centralizadas e ajustadas
      if (lines.length > 0) {
        const availableHeight = r2 - r1 - 2;
        const availableWidth = widthCols - 2 - (PADDING_X * 2);

        const startR = r1 + 1 + Math.max(0, Math.floor((availableHeight - lines.length) / 2));

        lines.forEach((line, idx) => {
          const targetR = startR + idx;
          if (targetR > r1 && targetR < r2 - 1) {
            let startC = c1 + 1 + PADDING_X + Math.floor((availableWidth - line.length) / 2);
            if (el.textAlign === 'left') startC = c1 + 1 + PADDING_X;
            if (el.textAlign === 'right') startC = c2 - 1 - PADDING_X - line.length;

            writeString(targetR, Math.max(c1 + 1, startC), line);
          }
        });
      }
    });

    // 4. Renderizar Linhas de Conexão e Setas
    connectors.forEach(el => {
      const waypoints = ShapeRenderer.getLineWaypoints(el, elements);
      if (waypoints.length < 2) return;

      for (let i = 0; i < waypoints.length - 1; i++) {
        let sc = toCol(waypoints[i].x);
        let sr = toRow(waypoints[i].y);
        let ec = toCol(waypoints[i + 1].x);
        let er = toRow(waypoints[i + 1].y);

        if (sr === er) {
          const startC = Math.min(sc, ec);
          const endC = Math.max(sc, ec);
          for (let c = startC; c <= endC; c++) {
            const curr = grid[sr]?.[c];
            if (curr === ' ' || curr === undefined) {
              setChar(sr, c, '-');
            } else if (curr === '|') {
              setChar(sr, c, '+');
            }
          }
        } else if (sc === ec) {
          const startR = Math.min(sr, er);
          const endR = Math.max(sr, er);
          for (let r = startR; r <= endR; r++) {
            const curr = grid[r]?.[sc];
            if (curr === ' ' || curr === undefined) {
              setChar(r, sc, '|');
            } else if (curr === '-') {
              setChar(r, sc, '+');
            }
          }
        } else {
          const steps = Math.max(Math.abs(ec - sc), Math.abs(er - sr));
          for (let s = 0; s <= steps; s++) {
            const c = Math.round(sc + (ec - sc) * (s / steps));
            const r = Math.round(sr + (er - sr) * (s / steps));
            const curr = grid[r]?.[c];
            if (curr === ' ' || curr === undefined) {
              setChar(r, c, '*');
            }
          }
        }
      }

      // Ponta da Seta
      if (el.type === 'arrow' && waypoints.length >= 2) {
        const pPrev = waypoints[waypoints.length - 2];
        const pLast = waypoints[waypoints.length - 1];

        const lastC = toCol(pLast.x);
        const lastR = toRow(pLast.y);
        const prevC = toCol(pPrev.x);
        const prevR = toRow(pPrev.y);

        const dc = lastC - prevC;
        const dr = lastR - prevR;

        if (Math.abs(dc) >= Math.abs(dr)) {
          setChar(lastR, lastC, dc >= 0 ? '>' : '<');
        } else {
          setChar(lastR, lastC, dr >= 0 ? 'v' : '^');
        }
      }
    });

    // 5. Unir as linhas removendo espaços desnecessários à direita e linhas em branco soltas
    return grid
      .map(row => row.join('').replace(/\s+$/, ''))
      .filter((row, idx, arr) => {
        if (row.length > 0) return true;
        const hasContentBefore = arr.slice(0, idx).some(r => r.length > 0);
        const hasContentAfter = arr.slice(idx + 1).some(r => r.length > 0);
        return hasContentBefore && hasContentAfter;
      })
      .join('\n');
  }
};