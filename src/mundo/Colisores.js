// =============================================================================
//  COLISÕES
//  O mundo é tratado como um conjunto de "caixas" vistas de cima (casas, muros...).
//  Cada caixa tem uma altura de topo: dá para subir em coisas baixas (degraus,
//  caixotes) e pular em cima delas.
// =============================================================================
export class Colisores {
  constructor(chaoPadrao = 0) {
    this.caixas = []; this.chaoPadrao = chaoPadrao;
    this.zonas = [];              // retângulos de chão sem colisão, só com a superfície (ruas, trilhas)
    this.superficiePadrao = null; // reserva: vem do tipo da área (areas.js)
    this.superficie = null;       // superfície achada pela última alturaDoChao
  }

  /** Marca a superfície do chão num retângulo (sem colisão). Vale a última marca que cobrir o ponto. */
  marcarSuperficie(x, z, largura, profundidade, superficie) {
    this.zonas.push({ minX: x - largura / 2, maxX: x + largura / 2, minZ: z - profundidade / 2, maxZ: z + profundidade / 2, superficie });
  }

  /** Adiciona uma caixa pelo centro e tamanho. topo = altura até onde ela bloqueia. */
  adicionar(x, z, largura, profundidade, topo = Infinity, base = -Infinity, piso = true) {
    const caixa = {
      minX: x - largura / 2, maxX: x + largura / 2,
      minZ: z - profundidade / 2, maxZ: z + profundidade / 2, topo, base, piso, ativa: true,
    };
    this.caixas.push(caixa);
    return caixa;
  }

  adicionarCilindro(x,z,raio,topo = Infinity,base = 0) {
    return Object.assign(this.adicionar(x,z,raio*2,raio*2,topo,base,false),{ x,z,raio });
  }

  /**
   * Empurra um círculo (jogador ou inimigo) para fora das caixas.
   * pos: objeto com x e z (é alterado). peY: altura dos pés. degrau: altura que sobe sozinho.
   */
  resolver(pos, raio, peY = 0, degrau = 0, corpo = 1.75) {
    for (const c of this.caixas) {
      if (!c.ativa || c.topo <= peY + (c.piso ? degrau : 0) || c.base >= peY + corpo) continue;
      if (c.raio) {
        const dx = pos.x-c.x, dz = pos.z-c.z, limite=raio+c.raio;
        const d2 = dx*dx+dz*dz;
        if (d2 < limite*limite) {
          const d = Math.sqrt(d2);
          pos.x = c.x+(d>1e-8 ? dx/d : 1)*limite;
          pos.z = c.z+(d>1e-8 ? dz/d : 0)*limite;
        }
        continue;
      }
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
    let h = this.chaoPadrao, sup = null;
    for (const c of this.caixas) {
      if (!c.ativa || !c.piso || c.topo > peY + degrau || c.topo <= h) continue;
      if (x > c.minX - folga && x < c.maxX + folga && z > c.minZ - folga && z < c.maxZ + folga) { h = c.topo; sup = c.superficie ?? null; }
    }
    // Mesma consulta: caixa marcada > zona marcada (só no chão padrão) > tipo da área.
    // Caixa sem marca (mesa, caixote) não herda a zona de baixo e não varre as zonas.
    if (!sup && h === this.chaoPadrao) for (const z0 of this.zonas) if (x >= z0.minX && x <= z0.maxX && z >= z0.minZ && z <= z0.maxZ) sup = z0.superficie;
    this.superficie = sup ?? this.superficiePadrao;
    return h;
  }

  /** Limite dos pés ao pular embaixo de um piso suspenso ou de uma verga. */
  alturaDoTeto(x, z, peY, corpo, raio) {
    let h = Infinity;
    for (const c of this.caixas) {
      if (!c.ativa || c.base < peY + corpo - 0.001 || c.base - corpo >= h) continue;
      const dx = Math.max(c.minX - x, 0, x - c.maxX);
      const dz = Math.max(c.minZ - z, 0, z - c.maxZ);
      if (dx * dx + dz * dz < raio * raio) h = c.base - corpo;
    }
    return h;
  }

  /** Testa visão ou alcance direto no plano horizontal, na altura indicada. */
  bloqueiaTrecho(origem, destino, altura, margem = 0) {
    return this.interceptarTrecho(origem, destino, altura, margem) !== null;
  }

  /**
   * Fração do trecho até o primeiro obstáculo, ou null se o trajeto está livre.
   * tamanhoMinimo ignora obstáculos finos (postes, tochas): a câmera passa por eles.
   */
  interceptarTrecho(origem, destino, altura, margem = 0, alturaDestino = altura, tamanhoMinimo = 0) {
    const dx = destino.x - origem.x, dz = destino.z - origem.z;
    const trechoMinX = Math.min(origem.x, destino.x), trechoMaxX = Math.max(origem.x, destino.x);
    const trechoMinZ = Math.min(origem.z, destino.z), trechoMaxZ = Math.max(origem.z, destino.z);
    let primeiro = 1;
    for (const c of this.caixas) {
      if (!c.ativa || c.topo <= Math.min(altura, alturaDestino) || c.base > Math.max(altura, alturaDestino)) continue;
      if (c.maxX - c.minX < tamanhoMinimo && c.maxZ - c.minZ < tamanhoMinimo) continue;
      const minX = c.minX - margem, maxX = c.maxX + margem;
      const minZ = c.minZ - margem, maxZ = c.maxZ + margem;
      if (trechoMaxX < minX || trechoMinX > maxX || trechoMaxZ < minZ || trechoMinZ > maxZ) continue;
      let entrada = 0, saida = 1;
      if (c.raio) {
        const x=origem.x-c.x, z=origem.z-c.z, r=c.raio+margem;
        const A=dx*dx+dz*dz, B=x*dx+z*dz, C=x*x+z*z-r*r;
        if (A < 1e-12) {
          if (C > 0) continue;
        } else {
          const det=B*B-A*C;
          if (det < 0) continue;
          const delta=Math.sqrt(det);
          entrada=Math.max(0,(-B-delta)/A);
          saida=Math.min(1,(-B+delta)/A);
        }
      } else for (const [inicio, delta, min, max] of [
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
      if (Number.isFinite(c.base) && altura !== alturaDestino) {
        const cruzamento = (c.base - altura) / (alturaDestino - altura);
        if (alturaDestino > altura) entrada = Math.max(entrada, cruzamento);
        else saida = Math.min(saida, cruzamento);
      }
      if (entrada <= saida && entrada < primeiro && saida > 0) primeiro = entrada;
    }
    return primeiro < 1 ? primeiro : null;
  }
}
