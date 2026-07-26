// Gerador de ASCII Art em Matriz 2D Baseado nas Coordenadas Espaciais do Canvas
const ASCIIConverter = {
  generate(elements) {
    if (!elements || elements.length === 0) {
      return '<!-- Diagrama Vazio -->';
    }

    // Filtra apenas formas e linhas com tamanho válido
    const validElements = elements.filter(el => el.width !== 0 || el.height !== 0);
    if (validElements.length === 0) return '<!-- Diagrama Vazio -->';

    // Normalização de Coordenadas (Bounding Box do Canvas)
    const xs = [];
    const ys = [];

    validElements.forEach(el => {
      xs.push(el.x, el.x + el.width);
      ys.push(el.y, el.y + el.height);
    });

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    // Fator de escala para converter pixels do canvas em células de caracteres (Grade ASCII)
    const CHAR_WIDTH = 12;  // 1 caractere a cada 12px de largura
    const CHAR_HEIGHT = 20; // 1 caractere a cada 20px de altura

    // Calcula dimensões da matriz de caracteres
    const gridWidth = Math.max(Math.ceil((Math.max(...xs) - minX) / CHAR_WIDTH) + 10, 40);
    const gridHeight = Math.max(Math.ceil((Math.max(...ys) - minY) / CHAR_HEIGHT) + 6, 15);

    // Cria a matriz vazia preenchida com espaços
    const grid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(' '));

    // Função auxiliar para desenhar string na grade
    const drawTextAt = (text, gx, gy) => {
      for (let i = 0; i < text.length; i++) {
        if (gy >= 0 && gy < gridHeight && (gx + i) >= 0 && (gx + i) < gridWidth) {
          grid[gy][gx + i] = text[i];
        }
      }
    };

    // 1. Renderiza primeiro as conexões (Linhas e Setas) na matriz
    validElements.filter(el => ['line', 'arrow'].includes(el.type)).forEach(line => {
      const startX = Math.round((line.x - minX) / CHAR_WIDTH);
      const startY = Math.round((line.y - minY) / CHAR_HEIGHT);
      const endX = Math.round(((line.x + line.width) - minX) / CHAR_WIDTH);
      const endY = Math.round(((line.y + line.height) - minY) / CHAR_HEIGHT);

      const dx = Math.abs(endX - startX);
      const dy = Math.abs(endY - startY);
      const sx = startX < endX ? 1 : -1;
      const sy = startY < endY ? 1 : -1;
      let err = dx - dy;

      let cx = startX;
      let cy = startY;

      while (true) {
        if (cy >= 0 && cy < gridHeight && cx >= 0 && cx < gridWidth) {
          if (grid[cy][cx] === ' ') {
            grid[cy][cx] = dx > dy ? '-' : '|';
          }
        }

        if (cx === endX && cy === endY) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
      }

      // Desenha ponta da seta no destino
      if (line.type === 'arrow' && endY >= 0 && endY < gridHeight && endX >= 0 && endX < gridWidth) {
        if (Math.abs(line.width) > Math.abs(line.height)) {
          grid[endY][endX] = line.width > 0 ? '>' : '<';
        } else {
          grid[endY][endX] = line.height > 0 ? 'v' : '^';
        }
      }
    });

    // 2. Renderiza as Formas Geométricas por cima
    validElements.filter(el => !['line', 'arrow'].includes(el.type)).forEach(el => {
      const gx = Math.round((el.x - minX) / CHAR_WIDTH);
      const gy = Math.round((el.y - minY) / CHAR_HEIGHT);
      const label = el.text ? el.text.replace(/\n/g, ' ') : '';

      const shapeAscii = this.getShapeBox(el.type, label);

      shapeAscii.forEach((row, rIdx) => {
        drawTextAt(row, gx, gy + rIdx);
      });
    });

    // Converte a matriz de caracteres em string final Markdown
    const rawAscii = grid.map(row => row.join('').trimEnd()).join('\n').trimEnd();

    return rawAscii || '<!-- Erro ao gerar ASCII -->';
  },

  // Retorna o molde ASCII específico para cada tipo de símbolo
  getShapeBox(type, text) {
    const label = text.length > 18 ? text.substring(0, 15) + '...' : text;
    const padLen = Math.max(label.length, 10);
    const centeredLabel = label.padStart(Math.floor((padLen + label.length) / 2)).padEnd(padLen);
    const dashes = '-'.repeat(padLen + 2);
    const spaces = ' '.repeat(padLen + 2);

    switch (type) {
      case 'start-end':
      case 'terminator':
      case 'terminal':
        return [
          `  (${dashes})  `,
          ` (  ${centeredLabel}  ) `,
          `  (${dashes})  `
        ];

      case 'condition':
      case 'decision':
        return [
          `   /${spaces}\\   `,
          `  <  ${centeredLabel}  >  `,
          `   \\${spaces}/   `
        ];

      case 'input-output':
      case 'data-flow':
        return [
          `  /${dashes}/  `,
          ` /  ${centeredLabel}  / `,
          `/${dashes}/   `
        ];

      case 'database':
      case 'direct-access-storage':
        return [
          ` .${dashes}. `,
          `(   ${centeredLabel}   )`,
          ` \` ${dashes} ' `
        ];

      case 'document':
      case 'printed-output':
      case 'print':
        return [
          `+${dashes}+`,
          `| ${centeredLabel} |`,
          `+~~${'~'.repeat(padLen)}~+`
        ];

      case 'predefined-process':
      case 'routine-call':
        return [
          `+||${dashes}||+`,
          `||| ${centeredLabel} |||`,
          `+||${dashes}||+`
        ];

      case 'preparation':
      case 'loop':
        return [
          ` /${dashes}\\ `,
          `<  ${centeredLabel}  >`,
          ` \\${dashes}/ `
        ];

      case 'display':
      case 'screen-display':
        return [
          ` /${dashes}\\ `,
          `|  ${centeredLabel}  > `,
          ` \\${dashes}/ `
        ];

      case 'manual-input':
      case 'keyboard-input':
        return [
          `  /${dashes}+`,
          ` /  ${centeredLabel} |`,
          `+${dashes}+`
        ];

      case 'delay':
      case 'wait':
        return [
          `+${dashes}\\ `,
          `| ${centeredLabel}  ) `,
          `+${dashes}/ `
        ];

      case 'comment':
      case 'annotation':
        return [
          `| ${label}`,
          `| ${'-'.repeat(label.length)}`
        ];

      case 'process':
      default:
        return [
          `+${dashes}+`,
          `| ${centeredLabel} |`,
          `+${dashes}+`
        ];
    }
  }
};