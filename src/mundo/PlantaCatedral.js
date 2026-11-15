export const MODULO = 4;
export const PAREDE = 0.5;

// [nome, xMin, xMax, zMin, zMax, pé-direito]. Todos os contornos são bordas da
// mesma grade. Cada ambiente possui seu piso e teto; cada aresta tem um dono.
export const SALAS_TERREO = [
  ['nave', -6, 6, -21, 11, 10],
  ['nave-oeste', -10, -6, -21, 11, 10],
  ['nave-leste', 6, 10, -21, 11, 10],
  ['transepto', -22, 22, -29, -21, 8],
  ['coro', -10, 10, -37, -29, 6],
  ['santuario', -14, 14, -57, -37, 12],
  ['abside', -10, 10, -65, -57, 12],
  ['ossario', -22, -10, -17, 3, 6],
  ['relicario', 10, 22, -17, 3, 6],
  ['claustro', -22, -10, 3, 11, 5],
  ['sacristia', 10, 22, 3, 11, 5],
  ['capela', -38, -22, -17, 3, 6],
  ['arquivo', 22, 38, -17, 3, 6],
  ['refeitorio', -30, -22, -29, -17, 5],
  ['cabido', 22, 30, -29, -17, 5],
];

// Centro da aresta em metros; o eixo é a normal ao vão. Os caminhos que
// continuam bloqueados pela história estão aqui e usam a mesma moldura.
const VAOS_TERREO = [
  ...[-6, 6].flatMap(x => [-15, -7, 5].map(z => [x, z, 'x'])),
  ...[-8, 0, 8].map(x => [x, -21, 'z']),
  ...[-10, 10].flatMap(x => [-11, -3].map(z => [x, z, 'x'])),
  ...[-22, 22].flatMap(x => [-11, -3, -23].map(z => [x, z, 'x'])),
  [-24, -17, 'z'], [24, -17, 'z'],
  [-10, 5, 'x'], [-16, 3, 'z'],
  [16, 3, 'z', 'porta-sacristia'], [10, 5, 'x', 'atalho-sacristia'],
  [0, -29, 'z', 'grade-selos'],
  [-4, -37, 'z'], [0, -37, 'z'], [4, -37, 'z'],
  [-4, -57, 'z'], [0, -57, 'z'], [4, -57, 'z'],
].map(([x, z, eixo, trava]) => ({ x, z, eixo, trava, largura: 3.5, altura: 4.5 }));

const chave = (x, z, eixo = '') => [x, z, eixo].join(':');

export function plantaTerreo() {
  const celulas = new Map();
  for (const [sala, minX, maxX, minZ, maxZ, altura] of SALAS_TERREO) {
    for (let x = minX + 2; x < maxX; x += MODULO) {
      for (let z = minZ + 2; z < maxZ; z += MODULO) {
        const id = chave(x, z);
        if (celulas.has(id)) throw new Error(`Célula ocupada duas vezes: ${id}`);
        celulas.set(id, { x, z, sala, altura });
      }
    }
  }
  const vaos = new Map(VAOS_TERREO.map(v => [chave(v.x, v.z, v.eixo), v]));
  const arestas = new Map();
  for (const celula of celulas.values()) {
    const { x, z } = celula;
    for (const [dx, dz, eixo] of [[-2, 0, 'x'], [2, 0, 'x'], [0, -2, 'z'], [0, 2, 'z']]) {
      const vizinha = celulas.get(chave(x + 2 * dx, z + 2 * dz));
      if (vizinha?.sala === celula.sala) continue;
      const id = chave(x + dx, z + dz, eixo);
      if (arestas.has(id)) continue;
      const vao = vaos.get(id);
      if (vao && !vizinha) throw new Error(`Vão para fora da catedral: ${id}`);
      arestas.set(id, {
        x: x + dx, z: z + dz, eixo, vao,
        salas: [celula.sala, ...(vizinha ? [vizinha.sala] : [])],
        altura: Math.max(celula.altura, vizinha?.altura ?? 0),
      });
    }
  }
  for (const id of vaos.keys()) if (!arestas.has(id)) throw new Error(`Vão sem parede: ${id}`);
  return { celulas, arestas, vaos: VAOS_TERREO };
}

/** Volumes disjuntos. Os cubos nos nós substituem as pontas das paredes,
 * fechando cantos externos, internos e encontros em T sem sobreposição. */
export function volumesTerreo({ celulas, arestas }) {
  const volumes = [], nos = new Map();
  const por = (tipo, lote, material, min, max) => volumes.push({ tipo, lote, material, min, max });
  for (const { x, z, sala, altura } of celulas.values()) {
    por('piso', sala, 'lajes', [x - 2, -0.25, z - 2], [x + 2, 0, z + 2]);
    por('teto', sala, 'pedraEscura', [x - 2, altura, z - 2], [x + 2, altura + 0.25, z + 2]);
  }
  for (const { x, z, eixo, vao, salas, altura } of arestas.values()) {
    const [dx, dz] = eixo === 'x' ? [0, 1] : [1, 0];
    for (const lado of [-2, 2]) {
      const nx = x + lado * dx, nz = z + lado * dz;
      const id = chave(nx, nz);
      if (!nos.has(id) || nos.get(id).altura < altura) nos.set(id, { nx, nz, altura, sala: salas[0] });
    }
    const [lx, lz] = eixo === 'x' ? [0.25, 1.75] : [1.75, 0.25];
    const topo = vao?.altura ?? 0;
    if (!vao) por('parede', salas[0], 'pedraMusgo', [x - lx, 0, z - lz], [x + lx, 0.5, z + lz]);
    por(vao ? 'verga' : 'parede', salas[0], 'pedra', [x - lx, Math.max(topo, 0.5), z - lz], [x + lx, altura, z + lz]);
  }
  for (const { nx, nz, altura, sala } of nos.values()) {
    por('canto', sala, 'pedraMusgo', [nx - 0.25, 0, nz - 0.25], [nx + 0.25, 0.5, nz + 0.25]);
    por('canto', sala, 'pedra', [nx - 0.25, 0.5, nz - 0.25], [nx + 0.25, altura, nz + 0.25]);
  }
  return volumes;
}
