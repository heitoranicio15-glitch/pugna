import * as THREE from 'three';
import { arcoOgival, juntarPorMaterial, ladrilhoDe, materiais } from './pecas.js';

// A diferença de dois retângulos vira até quatro retângulos disjuntos.
export function recortar(a, b) {
  const [x0, y0, x1, y1] = a;
  const l = Math.max(x0, b[0]), t = Math.max(y0, b[1]);
  const r = Math.min(x1, b[2]), d = Math.min(y1, b[3]);
  if (l >= r || t >= d) return [a];
  return [[x0, y0, l, y1], [r, y0, x1, y1], [l, y0, r, t], [l, d, r, y1]]
    .filter(([u, v, w, h]) => w > u && h > v);
}

/** Recorta tetos baixos nos encontros com paredes de salas mais altas. */
export function fecharTetos(volumes) {
  const paredes = volumes.filter(p => ['parede', 'verga', 'canto', 'parapeito'].includes(p.tipo));
  return volumes.flatMap(v => {
    if (!['teto','patamar','piso'].includes(v.tipo)) return [v];
    let partes = [[v.min[0], v.min[2], v.max[0], v.max[2]]];
    for (const p of paredes) {
      if (p.min[1] >= v.max[1] || p.max[1] <= v.min[1]) continue;
      partes = partes.flatMap(r => recortar(r, [p.min[0], p.min[2], p.max[0], p.max[2]]));
    }
    return partes.map(([x, z, X, Z]) => ({ ...v, min: [x, v.min[1], z], max: [X, v.max[1], Z] }));
  });
}

/** Só emite a superfície externa dos sólidos, inclusive nas junções parciais.
 * Remove faces internas dos ladrilhos, dos rodapés e das junções antes do lote. */
export function facesDoKit(volumes) {
  const planos = new Map();
  for (const v of volumes) {
    for (let eixo = 0; eixo < 3; eixo++) {
      const u = (eixo + 1) % 3, w = (eixo + 2) % 3;
      for (const sinal of [-1, 1]) {
        const cota = (sinal < 0 ? v.min : v.max)[eixo];
        const id = `${eixo}:${cota}`;
        if (!planos.has(id)) planos.set(id, [[], []]);
        const face = { eixo, sinal, cota, lote: v.lote, material: v.material,
          tipo: v.tipo, topo: v.max[1], nariz: v.rumo > 0 ? v.min[2] : v.max[2], rumo: v.rumo,
          ret: [v.min[u], v.min[w], v.max[u], v.max[w]] };
        planos.get(id)[sinal > 0 ? 1 : 0].push(face);
      }
    }
  }
  const faces = [];
  for (const par of planos.values()) {
    for (const i of [0, 1]) for (const face of par[i]) {
      let partes = [face.ret];
      for (const oposta of par[1 - i]) partes = partes.flatMap(r => recortar(r, oposta.ret));
      for (const ret of partes) faces.push({ ...face, ret });
    }
  }
  return faces;
}

const MEIA_LARGURA_CORREDOR = 1.4;
const FAIXA_CORREDOR = [-29, -MEIA_LARGURA_CORREDOR, 11, MEIA_LARGURA_CORREDOR];

const MOSAICOS = {
  mosaicoOssario: [-14.25, -20.65, 0, -17.35],
  mosaicoRelicario: [-14.25, 17.35, 0, 20.65],
};
const MOSAICO_POR_ALA = { ossario: 'mosaicoOssario', relicario: 'mosaicoRelicario' };

function revestirTrecho(face, trecho, base, acabamento) {
  const [u, v, U, V] = face.ret;
  const [u0, v0, u1, v1] = trecho;
  const centro = [Math.max(u, u0), Math.max(v, v0), Math.min(U, u1), Math.min(V, v1)];
  if (centro[0] >= centro[2] || centro[1] >= centro[3]) return [{ ...face, material: base }];
  return [
    ...recortar(face.ret, centro).map(ret => ({ ...face, ret, material: base })),
    { ...face, ret: centro, material: acabamento },
  ];
}

function acabamentoDoNivel(face) {
  const [u, v, U, V] = face.ret;
  if (face.tipo === 'degrau') {
    if (face.eixo === 2 && face.sinal === -face.rumo) {
      return revestirTrecho(face, [u, face.topo - 0.045, U, face.topo], 'espelhoGaleria', 'quinaGaleria');
    }
    if (face.eixo !== 1 || face.sinal !== 1) return [{ ...face, material: 'cantariaUmidaVeu' }];
    // O nariz é a extremidade voltada ao pé da escada. Usa o próprio
    // piso de cada degrau, inclusive nas escadas que sobem para norte.
    const frente = face.nariz;
    const nariz = face.rumo > 0 ? [frente, v, frente + 0.13, V] : [frente - 0.13, v, frente, V];
    return revestirTrecho(face, nariz, 'lajesNave', 'quinaGaleria');
  }
  if (face.tipo === 'patamar' && face.eixo === 1 && face.sinal === 1) {
    return [{ ...face, material: 'lajesNave' }];
  }
  if (face.tipo !== 'parapeito') return [face];
  if (face.eixo === 1 && face.sinal === 1) return [{ ...face, material: 'quinaGaleria' }];
  // A fiada de coroamento continua pelas faces verticais dos guarda-corpos.
  const quina = face.topo - 0.12;
  if (face.eixo === 0) return revestirTrecho(face, [quina, v, face.topo, V], 'cantariaVeu', 'quinaGaleria');
  if (face.eixo === 2) return revestirTrecho(face, [u, quina, U, face.topo], 'cantariaVeu', 'quinaGaleria');
  return [face];
}

function acabamentoDoSetor(face) {
  if (face.tipo === 'degrau' || face.tipo === 'patamar' || face.tipo === 'parapeito') {
    return acabamentoDoNivel(face);
  }
  const mosaico = MOSAICO_POR_ALA[face.lote];
  if (!mosaico && !['nave', 'nave-oeste', 'nave-leste', 'transepto'].includes(face.lote)) return [face];
  if (face.material === 'pedra') return [{ ...face, material: 'cantariaVeu' }];
  if (face.material === 'pedraMusgo') return [{ ...face, material: 'cantariaUmidaVeu' }];
  if (face.material !== 'lajes' || face.eixo !== 1 || face.sinal !== 1 || face.cota !== 0) return [face];
  const piso = { ...face, material: 'lajesNave' };
  const faixa = mosaico ? MOSAICOS[mosaico] : FAIXA_CORREDOR;
  if (!mosaico && face.lote !== 'nave' && face.lote !== 'transepto') return [piso];

  // Nas faces horizontais, u é Z e v é X. O corredor ocupa parte da face
  // original, no mesmo plano, sem sobrepor lajes nem criar outro colisor.
  return revestirTrecho(face, faixa, 'lajesNave', mosaico ?? 'corredorVeu');
}

export function montarKit(mundo, volumes, vaos) {
  const m = materiais(), lotes = new Map();
  const pegar = (sala) => {
    if (!lotes.has(sala)) lotes.set(sala, juntarPorMaterial());
    return lotes.get(sala);
  };
  // UV em coordenadas globais: a mesma pedra continua no módulo vizinho.
  const malhas = new Map();
  for (const { eixo, sinal, cota, lote, material, ret: [u0, v0, u1, v1] } of facesDoKit(volumes).flatMap(acabamentoDoSetor)) {
    const id = `${lote}:${material}`;
    if (!malhas.has(id)) malhas.set(id, { lote, material, pos: [], uv: [] });
    const { pos, uv } = malhas.get(id);
    const cantos = [[u0,v0], [u1,v0], [u1,v1], [u0,v1]];
    const ladrilho = ladrilhoDe(m[material], 2);
    for (const i of (sinal > 0 ? [0,1,2,0,2,3] : [0,2,1,0,3,2])) {
      const [u, v] = cantos[i], p = [];
      p[eixo] = cota; p[(eixo + 1) % 3] = u; p[(eixo + 2) % 3] = v;
      pos.push(...p);
      if (material === 'corredorVeu') {
        uv.push((v + MEIA_LARGURA_CORREDOR) / (2 * MEIA_LARGURA_CORREDOR), u / 2.8);
      } else if (MOSAICOS[material]) {
        const [, inicio, , fim] = MOSAICOS[material];
        uv.push((v - inicio) / (fim - inicio), u / 3.3);
      } else {
        uv.push(...(eixo === 0 ? [v / ladrilho, u / ladrilho] : [u / ladrilho, v / ladrilho]));
      }
    }
  }
  for (const { lote, material, pos, uv } of malhas.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    pegar(lote).geometria(geo, m[material]);
  }
  for (const v of volumes) {
    const [x, y, z] = v.min, [X, Y, Z] = v.max;
    const piso = ['piso','patamar','degrau'].includes(v.tipo);
    mundo.colisores.adicionar((x + X) / 2, (z + Z) / 2, X - x, Z - z, Y, y, piso);
  }
  const arco = arcoOgival(3.12, 1.1, 0.18, 0.46, m.pedraEscura);
  for (const { x, y, z, eixo, sala } of vaos) {
    const geo = arco.geometry.clone();
    if (eixo === 'x') geo.rotateY(Math.PI / 2);
    pegar(sala).geometria(geo.translate(x, y + 2.46, z), m.pedraEscura);
  }
  arco.geometry.dispose();
  for (const [sala, lote] of lotes) {
    const grupo = new THREE.Group();
    grupo.name = sala;
    lote.montar(grupo, 'kit-catedral');
    mundo.grupo.add(grupo);
    mundo.setores.set(sala, grupo);
  }
}
