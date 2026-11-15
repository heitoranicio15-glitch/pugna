// Estimativa de geometria do cenário em Node, sem abrir o jogo ou baixar modelos.
// Uso: node tests/medir-cenario.mjs [id da área]
import * as THREE from 'three';
import { criarAreas } from '../src/mundo/areas.js';
const ctx = new Proxy(function () {}, {
  get: (_, k) => k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx,
  apply: () => ctx,
  set: () => true,
});
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
const { areas } = criarAreas(new THREE.Scene(), { direcaoLua: new THREE.Vector3(0.3, 0.5, -0.8).normalize() });
for (const area of areas) {
  if (process.argv[2] && process.argv[2] !== area.id) continue;
  const contagem = { area: area.id, triangulos: 0, chamadas: 0, instancias: 0 };
  area.grupo.traverseVisible(m => {
    if (!m.isMesh) return;
    const instancias = m.isInstancedMesh ? m.count : 1;
    const vertices = Array.isArray(m.material)
      ? m.geometry.groups.reduce((s, g) => s + g.count, 0)
      : m.geometry.index?.count ?? m.geometry.attributes.position.count;
    contagem.triangulos += vertices * instancias / 3;
    contagem.chamadas += Array.isArray(m.material) ? m.geometry.groups.length : 1;
    if (m.isInstancedMesh) contagem.instancias += instancias;
  });
  console.log(contagem);
}
