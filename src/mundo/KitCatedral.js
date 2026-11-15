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
  const paredes = volumes.filter(p => ['parede', 'verga', 'canto'].includes(p.tipo));
  return volumes.flatMap(v => {
    if (v.tipo !== 'teto') return [v];
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

export function montarKit(mundo, volumes, vaos) {
  const m = materiais(), lotes = new Map();
  const pegar = (sala) => {
    if (!lotes.has(sala)) lotes.set(sala, juntarPorMaterial());
    return lotes.get(sala);
  };
  // UV em coordenadas globais: a mesma pedra continua no módulo vizinho.
  const malhas = new Map();
  for (const { eixo, sinal, cota, lote, material, ret: [u0, v0, u1, v1] } of facesDoKit(volumes)) {
    const id = `${lote}:${material}`;
    if (!malhas.has(id)) malhas.set(id, { lote, material, pos: [], uv: [] });
    const { pos, uv } = malhas.get(id);
    const cantos = [[u0,v0], [u1,v0], [u1,v1], [u0,v1]];
    const ladrilho = ladrilhoDe(m[material], 2);
    for (const i of (sinal > 0 ? [0,1,2,0,2,3] : [0,2,1,0,3,2])) {
      const [u, v] = cantos[i], p = [];
      p[eixo] = cota; p[(eixo + 1) % 3] = u; p[(eixo + 2) % 3] = v;
      pos.push(...p);
      uv.push(...(eixo === 0 ? [v / ladrilho, u / ladrilho] : [u / ladrilho, v / ladrilho]));
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
    if (v.min[1] !== 0 || !['parede', 'canto'].includes(v.tipo)) continue;
    const [x, , z] = v.min, [X, , Z] = v.max;
    // O primeiro segmento é o rodapé de uma parede inteira, nunca um degrau.
    mundo.colisores.adicionar((x + X) / 2, (z + Z) / 2, X - x, Z - z);
  }
  const arco = arcoOgival(3.12, 1.1, 0.18, 0.46, m.pedraEscura);
  for (const { x, z, eixo, sala } of vaos) {
    const geo = arco.geometry.clone();
    if (eixo === 'x') geo.rotateY(Math.PI / 2);
    pegar(sala).geometria(geo.translate(x, 3.22, z), m.pedraEscura);
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
