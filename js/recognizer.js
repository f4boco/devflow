// Algoritmo aprimorado de Reconhecimento de Formas Rabiscadas
const ShapeRecognizer = {
  recognize(points) {
    if (!points || points.length < 8) return null;

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;

    // Se o desenho for muito pequeno, ignora
    if (width < 15 || height < 15) return null;

    const start = points[0];
    const end = points[points.length - 1];

    // Distância entre o início e o fim do desenho
    const endDistance = Math.hypot(end.x - start.x, end.y - start.y);
    const maxDim = Math.max(width, height);

    // Se a distância do ponto final até o inicial for maior que 35% da maior dimensão, trata-se de uma Seta/Linha
    const isClosed = endDistance < maxDim * 0.35;

    if (!isClosed) {
      return {
        type: 'arrow',
        x: start.x,
        y: start.y,
        width: end.x - start.x,
        height: end.y - start.y
      };
    }

    // --- ANÁLISE GEOMÉTRICA DE FORMAS FECHADAS ---

    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    // 1. Verifica se os pontos passam perto do centro (característica forte do Losango/Decisão)
    // No losango, as bordas cortam os eixos médios e ficam distantes dos 4 cantos da Bounding Box.
    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];

    let minDistToCorners = 0;
    corners.forEach(corner => {
      let minD = Infinity;
      points.forEach(p => {
        const d = Math.hypot(p.x - corner.x, p.y - corner.y);
        if (d < minD) minD = d;
      });
      minDistToCorners += minD;
    });
    minDistToCorners /= 4; // Média de distância do traço até os 4 cantos do retângulo delimitador

    // Se a distância média dos cantos for grande em relação à forma, é um LOSANGO (Diamond)
    if (minDistToCorners > maxDim * 0.18) {
      return {
        type: 'condition',
        x: minX,
        y: minY,
        width,
        height
      };
    }

    // 2. Análise da inclinação dos lados verticais para PARALELOGRAMO (Entrada / Saída)
    // Agrupa pontos da metade esquerda e metade direita
    const leftPoints = points.filter(p => p.x < minX + width * 0.3);
    const rightPoints = points.filter(p => p.x > maxX - width * 0.3);

    let isSlanted = false;
    if (leftPoints.length > 2 && rightPoints.length > 2) {
      // Pega ponto mais alto e mais baixo da esquerda
      const topLeft = leftPoints.reduce((a, b) => a.y < b.y ? a : b);
      const bottomLeft = leftPoints.reduce((a, b) => a.y > b.y ? a : b);

      const dx = Math.abs(bottomLeft.x - topLeft.x);
      const dy = Math.abs(bottomLeft.y - topLeft.y);

      // Se houver uma inclinação horizontal consistente nos lados
      if (dy > 0 && (dx / dy) > 0.25 && (dx / dy) < 0.8) {
        isSlanted = true;
      }
    }

    if (isSlanted) {
      return {
        type: 'input-output',
        x: minX,
        y: minY,
        width,
        height
      };
    }

    // 3. Proporção (Ratio) entre Largura e Altura para PÍLULA (Início / Fim)
    const ratio = width / height;

    // Pílulas/Estádios são significativamente mais largas do que altas e têm bordas arredondadas
    if (ratio >= 2.0) {
      return {
        type: 'start-end',
        x: minX,
        y: minY,
        width,
        height
      };
    }

    // Fallback: Se for mais estendido do que alto, classifica como Pílula, senão Losango
    if (ratio > 1.4) {
      return {
        type: 'start-end',
        x: minX,
        y: minY,
        width,
        height
      };
    }

    return {
      type: 'condition',
      x: minX,
      y: minY,
      width,
      height
    };
  }
};