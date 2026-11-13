const PASSO = 0.75;
const VIZINHOS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** Busca em grade, usando os mesmos obstáculos que limitam o movimento. */
export class Navegacao {
  constructor(colisores, { minX, maxX, minZ, maxZ }) {
    this.colisores = colisores;
    this.minX = minX; this.minZ = minZ;
    this.largura = Math.floor((maxX - minX) / PASSO) + 1;
    this.profundidade = Math.floor((maxZ - minZ) / PASSO) + 1;
    this.grades = new Map();
  }

  invalidar() { this.grades.clear(); }

  livre(a, b, raio) {
    return !this.colisores.bloqueiaTrecho(a, b, 0, raio + 0.04);
  }

  encontrar(origem, destino, raio, limiteZ = Infinity) {
    if (destino.z > limiteZ) return [];
    if (this.livre(origem, destino, raio)) return [{ x: destino.x, z: destino.z }];

    const { largura, profundidade, minX, minZ } = this;
    const ponto = (id) => ({ x: minX + id % largura * PASSO, z: minZ + Math.floor(id / largura) * PASSO });
    let grade = this.grades.get(raio);
    if (!grade) {
      grade = new Uint8Array(largura * profundidade);
      this.grades.set(raio, grade);
    }
    const transitavel = (id, p) => {
      if (p.z > limiteZ) return false;
      if (!grade[id]) grade[id] = this.livre(p, p, raio) ? 1 : 2;
      return grade[id] === 1;
    };
    const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const celula = (p) => {
      const x0 = Math.round((p.x - minX) / PASSO), z0 = Math.round((p.z - minZ) / PASSO);
      let escolhido = -1, menor = Infinity;
      for (let z = Math.max(0, z0 - 3); z <= Math.min(profundidade - 1, z0 + 3); z++) {
        for (let x = Math.max(0, x0 - 3); x <= Math.min(largura - 1, x0 + 3); x++) {
          const id = z * largura + x, q = ponto(id), d = distancia(p, q);
          if (d < menor && transitavel(id, q) && this.livre(p, q, Math.max(0, raio - 0.09))) {
            escolhido = id; menor = d;
          }
        }
      }
      return escolhido;
    };
    const inicio = celula(origem), fim = celula(destino);
    if (inicio < 0 || fim < 0) return [];
    const alvo = ponto(fim);
    const abertos = new Map([[inicio, distancia(ponto(inicio), alvo)]]);
    const custos = new Map([[inicio, 0]]);
    const anteriores = new Map();
    for (let tentativas = 0; abertos.size && tentativas < 1800; tentativas++) {
      let atual = -1, menor = Infinity;
      for (const [id, nota] of abertos) if (nota < menor) { atual = id; menor = nota; }
      if (atual === fim) {
        const rota = [alvo];
        for (let id = fim; anteriores.has(id);) {
          id = anteriores.get(id);
          rota.push(ponto(id));
        }
        rota.reverse();
        if (this.livre(alvo, destino, raio)) rota.push({ x: destino.x, z: destino.z });
        return rota;
      }
      abertos.delete(atual);
      const x = atual % largura, z = Math.floor(atual / largura), p = ponto(atual);
      for (const [dx, dz] of VIZINHOS) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nx >= largura || nz < 0 || nz >= profundidade) continue;
        const id = nz * largura + nx, q = ponto(id);
        const custo = custos.get(atual) + distancia(p, q);
        if (custo >= (custos.get(id) ?? Infinity) || !transitavel(id, q) || !this.livre(p, q, raio)) continue;
        custos.set(id, custo);
        anteriores.set(id, atual);
        abertos.set(id, custo + distancia(q, alvo));
      }
    }
    return [];
  }
}
