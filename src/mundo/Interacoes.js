/** Objetos usam um ponto visível de interação e uma tolerância para a mira. */
export function alvoDaMira(objetos, origem, direcao, colisores) {
  let melhor = null;
  let melhorErro = Infinity;
  for (const objeto of objetos) {
    if (objeto.oculto) continue;
    const { x, y, z, alcance = 2.75, tolerancia = 0.37 } = objeto;
    const dx = x - origem.x, dy = y - origem.y, dz = z - origem.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > alcance * alcance) continue;
    const frente = dx * direcao.x + dy * direcao.y + dz * direcao.z;
    if (frente <= 0) continue;
    const erro = Math.sqrt(Math.max(0, d2 - frente * frente)) / tolerancia;
    if (erro > 1 || erro >= melhorErro || colisores.interceptarTrecho(origem, objeto, origem.y, 0, y) !== null) continue;
    melhor = objeto;
    melhorErro = erro;
  }
  return melhor;
}

/**
 * Terceira pessoa: escolhe o objeto mais próximo que esteja ao alcance, à vista
 * e à frente do caçador (pela direção do corpo ou da câmera).
 */
export function alvoProximo(objetos, jogador, colisores) {
  const origem = { x: jogador.pos.x, y: jogador.pos.y + jogador.alturaOlhos, z: jogador.pos.z };
  let melhor = null;
  let menor = Infinity;
  for (const objeto of objetos) {
    if (objeto.oculto) continue;
    const { x, y, z, alcance = 2.75 } = objeto;
    const dx = x - origem.x, dz = z - origem.z;
    const d = Math.hypot(dx, dz);
    if (d > alcance || Math.abs(y - origem.y) > alcance) continue;
    // Colado no objeto qualquer direção serve; mais longe é preciso estar virado para ele.
    const frente = d < 0.6 ? 1 : Math.max(
      (-Math.sin(jogador.rumo) * dx - Math.cos(jogador.rumo) * dz) / d,
      (-Math.sin(jogador.yaw) * dx - Math.cos(jogador.yaw) * dz) / d,
    );
    if (frente < 0.55) continue;
    const nota = d * (2 - frente);
    if (nota >= menor || colisores.interceptarTrecho(origem, objeto, origem.y, 0, y) !== null) continue;
    melhor = objeto;
    menor = nota;
  }
  return melhor;
}

export function atualizarObjetos(mundo, eventos) {
  let mudou = false;
  for (const objeto of mundo.objetos) {
    const ativo = eventos.includes(objeto.evento);
    if (objeto.ativo === ativo) continue;
    objeto.ativo = ativo;
    objeto.oculto = ativo && ['recolher', 'abrir', 'informar'].includes(objeto.acao);
    objeto.atualizar?.(ativo);
    if (objeto.acao === 'abrir' || objeto.acao === 'acionar') mudou = true;
  }
  if (mudou) mundo.navegacao?.invalidar();
}
