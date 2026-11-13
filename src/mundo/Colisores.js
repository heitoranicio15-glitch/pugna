// =============================================================================
//  COLISÕES
//  O mundo é tratado como um conjunto de "caixas" vistas de cima (casas, muros...).
//  Cada caixa tem uma altura de topo: dá para subir em coisas baixas (degraus,
//  caixotes) e pular em cima delas.
// =============================================================================
export class Colisores {
  constructor() { this.caixas = []; }

  /** Adiciona uma caixa pelo centro e tamanho. topo = altura até onde ela bloqueia. */
  adicionar(x, z, largura, profundidade, topo = Infinity) {
    const caixa = {
      minX: x - largura / 2, maxX: x + largura / 2,
      minZ: z - profundidade / 2, maxZ: z + profundidade / 2, topo, ativa: true,
    };
    this.caixas.push(caixa);
    return caixa;
  }

  /**
   * Empurra um círculo (jogador ou inimigo) para fora das caixas.
   * pos: objeto com x e z (é alterado). peY: altura dos pés. degrau: altura que sobe sozinho.
   */
  resolver(pos, raio, peY = 0, degrau = 0) {
    for (const c of this.caixas) {
      if (!c.ativa || c.topo <= peY + degrau) continue; // está por cima dela (ou é só um degrau)
      const px = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const pz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      let dx = pos.x - px, dz = pos.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= raio * raio) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = px + (dx / d) * raio; pos.z = pz + (dz / d) * raio;
      } else {
        // O centro está dentro da caixa: sai pelo lado mais próximo.
        const e = pos.x - c.minX, di = c.maxX - pos.x, n = pos.z - c.minZ, s = c.maxZ - pos.z;
        const m = Math.min(e, di, n, s);
        if (m === e) pos.x = c.minX - raio; else if (m === di) pos.x = c.maxX + raio;
        else if (m === n) pos.z = c.minZ - raio; else pos.z = c.maxZ + raio;
      }
    }
  }

  /** Altura do chão num ponto, considerando caixas baixas em que dá para pisar. */
  alturaDoChao(x, z, peY, degrau = 0.4, folga = 0.2) {
    let h = 0;
    for (const c of this.caixas) {
      if (!c.ativa || c.topo > peY + degrau || c.topo <= h) continue;
      if (x > c.minX - folga && x < c.maxX + folga && z > c.minZ - folga && z < c.maxZ + folga) h = c.topo;
    }
    return h;
  }

  /** Testa visão ou alcance direto no plano horizontal, na altura indicada. */
  bloqueiaTrecho(origem, destino, altura, margem = 0) {
    return this.interceptarTrecho(origem, destino, altura, margem) !== null;
  }

  /** Fração do trecho até o primeiro obstáculo, ou null se o trajeto está livre. */
  interceptarTrecho(origem, destino, altura, margem = 0, alturaDestino = altura) {
    const dx = destino.x - origem.x, dz = destino.z - origem.z;
    const trechoMinX = Math.min(origem.x, destino.x), trechoMaxX = Math.max(origem.x, destino.x);
    const trechoMinZ = Math.min(origem.z, destino.z), trechoMaxZ = Math.max(origem.z, destino.z);
    let primeiro = 1;
    for (const c of this.caixas) {
      if (!c.ativa || c.topo <= Math.min(altura, alturaDestino)) continue;
      const minX = c.minX - margem, maxX = c.maxX + margem;
      const minZ = c.minZ - margem, maxZ = c.maxZ + margem;
      if (trechoMaxX < minX || trechoMinX > maxX || trechoMaxZ < minZ || trechoMinZ > maxZ) continue;
      let entrada = 0, saida = 1;
      for (const [inicio, delta, min, max] of [
        [origem.x, dx, minX, maxX], [origem.z, dz, minZ, maxZ],
      ]) {
        if (Math.abs(delta) < 1e-8) {
          if (inicio < min || inicio > max) { entrada = 2; break; }
          continue;
        }
        const a = (min - inicio) / delta, b = (max - inicio) / delta;
        entrada = Math.max(entrada, Math.min(a, b));
        saida = Math.min(saida, Math.max(a, b));
        if (entrada > saida) break;
      }
      if (c.topo !== Infinity && altura !== alturaDestino) {
        const cruzamento = (c.topo - altura) / (alturaDestino - altura);
        if (alturaDestino > altura) saida = Math.min(saida, cruzamento);
        else entrada = Math.max(entrada, cruzamento);
      }
      if (entrada <= saida && entrada < primeiro && saida > 0) primeiro = entrada;
    }
    return primeiro < 1 ? primeiro : null;
  }
}
