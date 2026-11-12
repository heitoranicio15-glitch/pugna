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
    this.caixas.push({
      minX: x - largura / 2, maxX: x + largura / 2,
      minZ: z - profundidade / 2, maxZ: z + profundidade / 2, topo,
    });
  }

  /**
   * Empurra um círculo (jogador ou inimigo) para fora das caixas.
   * pos: objeto com x e z (é alterado). peY: altura dos pés. degrau: altura que sobe sozinho.
   */
  resolver(pos, raio, peY = 0, degrau = 0) {
    for (const c of this.caixas) {
      if (c.topo <= peY + degrau) continue; // está por cima dela (ou é só um degrau)
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
      if (c.topo > peY + degrau || c.topo <= h) continue;
      if (x > c.minX - folga && x < c.maxX + folga && z > c.minZ - folga && z < c.maxZ + folga) h = c.topo;
    }
    return h;
  }
}
