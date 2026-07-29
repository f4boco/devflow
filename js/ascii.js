/**
 * ASCIIConverter - Conversor cartesiano 2D fidedigno para ASCII Art.
 * Suporta padding interno automático, mapeamento de símbolos ISO,
 * preservação total de textos nas extremidades e formas customizadas.
 */
const ASCIIConverter = {
  generate(elements) {
    if (!elements || elements.length === 0) {
      return " ( Canvas Vazio - Nenhum elemento para exportar ) ";
    }

    // Proporção típica do caractere monoespaçado (largura / altura aproximadamente 1:2)
    const CHAR_W = 10;
    const CHAR_H = 20;

    // PADDING INTERNO PADRÃO (em número de caracteres/linhas na matriz ASCII)
    const PADDING_X = 2; // Espaço em caracteres de cada lado do texto
    const PADDING_Y = 0; // Espaço em linhas acima e abaixo do texto

    // 1. Calcular os limites do desenho no Canvas estendendo para garantir padding
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

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

    const marginCanvas = 30;
    minX -= marginCanvas;
    minY -= marginCanvas;
    maxX += marginCanvas;
    maxY += marginCanvas;

    // 2. Mapear dimensão do canvas para tamanho da matriz em caracteres
    const cols = Math.max(Math.ceil((maxX - minX) / CHAR_W), 35);
    const rows = Math.max(Math.ceil((maxY - minY) / CHAR_H), 18);

    const toCol = (x) => Math.floor((x - minX) / CHAR_W);
    const toRow = (y) => Math.floor((y - minY) / CHAR_H);

    // Inicializa a grade 2D preenchida com espaços em branco
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

    const shapes = elements.filter(el => !['line', 'arrow'].includes(el.type));
    const connectors = elements.filter(el => ['line', 'arrow'].includes(el.type));

    // 3. Renderizar Símbolos com Padding e Proteção de Texto
    shapes.forEach(el => {
      const lines = el.text ? el.text.split('\n') : [];
      
      // Encontra a maior linha de texto para calcular o padding exato
      let maxLineLength = 0;
      lines.forEach(l => {
        if (l.length > maxLineLength) maxLineLength = l.length;
      });

      let c1 = toCol(el.x);
      let r1 = toRow(el.y);
      let c2 = toCol(el.x + el.width);
      let r2 = toRow(el.y + el.height);

      // Garante que o bloco ASCII seja grande o suficiente para conter o texto + PADDING_X
      const requiredWidth = maxLineLength > 0 ? maxLineLength + (PADDING_X * 2) + 2 : 4;
      const requiredHeight = lines.length > 0 ? lines.length + (PADDING_Y * 2) + 2 : 3;

      if ((c2 - c1) < requiredWidth) {
        const diff = requiredWidth - (c2 - c1);
        c1 = Math.max(0, c1 - Math.floor(diff / 2));
        c2 = c1 + requiredWidth;
      }

      if ((r2 - r1) < requiredHeight) {
        const diff = requiredHeight - (r2 - r1);
        r1 = Math.max(0, r1 - Math.floor(diff / 2));
        r2 = r1 + requiredHeight;
      }

      const widthCols = c2 - c1;

      // --- CASO 1: SÍMBOLOS DESENHADOS À MÃO (CUSTOM) ---
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
            writeString(r2, c1, '(' + '-'.repeat(Math.max(0, widthCols - 2)) + ')');
            for (let r = r1 + 1; r < r2; r++) {
              setChar(r, c1, '|');
              setChar(r, c2 - 1, '|');
            }
            break;

          case 'condition':
          case 'decision':
            const midR = Math.floor((r1 + r2) / 2);
            const midC = Math.floor((c1 + c2) / 2);

            setChar(r1, midC, '/');
            setChar(r2, midC, '\\');
            setChar(midR, c1, '<');
            setChar(midR, c2 - 1, '>');

            for (let r = r1 + 1; r < midR; r++) {
              const offset = Math.floor((r - r1) * (midC - c1) / (midR - r1));
              setChar(r, midC - offset, '/');
              setChar(r, midC + offset, '\\');
            }
            for (let r = midR + 1; r < r2; r++) {
              const offset = Math.floor((r2 - r) * (midC - c1) / (r2 - midR));
              setChar(r, midC - offset, '\\');
              setChar(r, midC + offset, '/');
            }
            break;

          case 'input-output':
          case 'data-flow':
            writeString(r1, c1 + 2, '/' + '-'.repeat(Math.max(0, widthCols - 3)) + '/');
            writeString(r2, c1, '/' + '-'.repeat(Math.max(0, widthCols - 3)) + '/');
            for (let r = r1 + 1; r < r2; r++) {
              setChar(r, c1 + 1, '/');
              setChar(r, c2 - 1, '/');
            }
            break;

          case 'database':
          case 'direct-access-storage':
            writeString(r1, c1, '(' + '='.repeat(Math.max(0, widthCols - 2)) + ')');
            writeString(r2, c1, '(' + '='.repeat(Math.max(0, widthCols - 2)) + ')');
            for (let r = r1 + 1; r < r2; r++) {
              setChar(r, c1, '|');
              setChar(r, c2 - 1, '|');
            }
            break;

          case 'text':
            // Texto Livre sem moldura
            break;

          default:
            writeString(r1, c1, '+' + '-'.repeat(Math.max(0, widthCols - 2)) + '+');
            writeString(r2, c1, '+' + '-'.repeat(Math.max(0, widthCols - 2)) + '+');
            for (let r = r1 + 1; r < r2; r++) {
              setChar(r, c1, '|');
              setChar(r, c2 - 1, '|');
            }
            break;
        }
      }

      // 4. Escrever o Texto Garantindo Espaçamento e Proteção nas Pontas
      if (lines.length > 0) {
        const boxInnerHeight = r2 - r1 - 1;
        const availableWidth = widthCols - 2 - (PADDING_X * 2);

        const startR = Math.max(r1 + 1, r1 + 1 + Math.floor((boxInnerHeight - lines.length) / 2));

        lines.forEach((line, idx) => {
          const targetR = startR + idx;
          if (targetR > r1 && targetR < r2) {
            const cleanLine = line.substring(0, Math.max(1, availableWidth + PADDING_X));
            
            let startC = c1 + 1 + PADDING_X + Math.floor((availableWidth - cleanLine.length) / 2);
            if (el.textAlign === 'left') startC = c1 + 1 + PADDING_X;
            if (el.textAlign === 'right') startC = c2 - 1 - PADDING_X - cleanLine.length;

            writeString(targetR, Math.max(c1 + 1, startC), cleanLine);
          }
        });
      }
    });

    // 5. Renderizar Conectores e Setas
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

    // 6. Limpar e retornar resultado final
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