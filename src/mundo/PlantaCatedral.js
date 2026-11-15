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
  ['escada-da-galeria', 6, 14, 11, 27, 9],
  ['torre', 14, 22, 11, 27, 13],
  ['escada-da-cripta', -22, -14, 11, 27, 5, -4],
  ['cripta', -26, -10, 27, 35, 0, -4],
  ['cela', -30, -26, 27, 35, 0, -4],
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
  [8, 11, 'z', undefined, 0, 7.75],
  [14, 25, 'x', undefined, 4, 3.75],
  [-16, 11, 'z', undefined, 0, 3.75],
  [-20, 27, 'z', undefined, -4, 3.75],
  [-16, 27, 'z', undefined, -4, 3.75],
  [-26, 33, 'x', undefined, -4, 3.75],
].map(([x, z, eixo, trava, y = 0, altura = 4.5]) => ({ x, z, eixo, trava, y, largura: 3.5, altura }));

const chave = (x, z, eixo = '') => [x, z, eixo].join(':');

export function plantaTerreo() {
  const celulas = new Map();
  for (const [sala, minX, maxX, minZ, maxZ, altura, base = 0] of SALAS_TERREO) {
    for (let x = minX + 2; x < maxX; x += MODULO) {
      for (let z = minZ + 2; z < maxZ; z += MODULO) {
        const id = chave(x, z);
        if (celulas.has(id)) throw new Error(`Célula ocupada duas vezes: ${id}`);
        celulas.set(id, { x, z, sala, altura, base });
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
      const xA = x + dx, zA = z + dz;
      const galeria = (eixo === 'x' && Math.abs(xA) === 6 && zA >= -19 && zA <= 9)
        || (eixo === 'z' && zA === -21 && Math.abs(xA) === 8);
      arestas.set(id, {
        x: x + dx, z: z + dz, eixo, vao,
        salas: [celula.sala, ...(vizinha ? [vizinha.sala] : [])],
        altura: galeria ? 3.75 : Math.max(celula.altura, vizinha?.altura ?? celula.altura),
        base: Math.min(celula.base, vizinha?.base ?? celula.base),
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
  for (const { x, z, sala, altura, base } of celulas.values()) {
    por('piso', sala, 'lajes', [x - 2, base - 0.25, z - 2], [x + 2, base, z + 2]);
    por('teto', sala, 'pedraEscura', [x - 2, altura, z - 2], [x + 2, altura + 0.25, z + 2]);
  }
  for (const { x, z, eixo, vao, salas, altura, base } of arestas.values()) {
    const [dx, dz] = eixo === 'x' ? [0, 1] : [1, 0];
    for (const lado of [-2, 2]) {
      const nx = x + lado * dx, nz = z + lado * dz;
      const id = chave(nx, nz);
      const anterior = nos.get(id);
      if (!anterior) nos.set(id, { nx, nz, altura, base, sala: salas[0] });
      else { anterior.altura = Math.max(anterior.altura, altura); anterior.base = Math.min(anterior.base, base); }
    }
    const [lx, lz] = eixo === 'x' ? [0.25, 1.75] : [1.75, 0.25];
    const bloco = (tipo, material, y, Y) => {
      if (Y > y) por(tipo, salas[0], material, [x - lx, y, z - lz], [x + lx, Y, z + lz]);
    };
    if (!vao || vao.y > base) {
      // O módulo de piso de 25 cm forma a soleira acima da parede de apoio.
      const Y = vao ? vao.y - 0.25 : altura;
      bloco('parede', 'pedraMusgo', base, Math.min(base + 0.5, Y));
      bloco('parede', 'pedra', base + 0.5, Y);
    }
    if (vao) bloco('verga', 'pedra', vao.y + Math.min(vao.altura, altura - vao.y), altura);
  }
  for (const { nx, nz, altura, base, sala } of nos.values()) {
    por('canto', sala, 'pedraMusgo', [nx - 0.25, base, nz - 0.25], [nx + 0.25, base + 0.5, nz + 0.25]);
    por('canto', sala, 'pedra', [nx - 0.25, base + 0.5, nz - 0.25], [nx + 0.25, altura, nz + 0.25]);
  }
  return volumes;
}
