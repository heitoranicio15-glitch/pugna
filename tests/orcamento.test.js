import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import { criarAreas } from '../src/mundo/areas.js';
import { texturas } from '../src/render/texturas.js';

// ---------------------------------------------------------------------------
//  Orçamento por área, medido em Node (sem WebGL): triângulos das peças feitas no
//  código, objetos desenháveis, encaixes de modelo e densidade de textura por metro.
//  A linha de base fica em tests/orcamento-base.json. Para gravar uma nova base
//  (decisão consciente, registrada no PR): ATUALIZAR_ORCAMENTO=1 npm test
// ---------------------------------------------------------------------------
const BASE = new URL('./orcamento-base.json', import.meta.url);
const FOLGA = 0.15; // um polimento pode crescer até 15 % por área antes de exigir nova base
const TOL_TEXTURA = 0.10; // densidade de textura por metro: ±10 % da base

function ligarDocumentoDeMentira() {
  const ctx = new Proxy(function () {}, {
    get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx),
    apply: () => ctx,
    set: () => true,
  });
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
}

const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
const ua = new THREE.Vector2(), ub = new THREE.Vector2(), uc = new THREE.Vector2();

// Repetições de textura por metro (raiz de área UV ÷ área no mundo), por malha.
function densidade(malha) {
  const g = malha.geometry, pos = g.attributes.position, uv = g.attributes.uv;
  if (!pos || !uv) return null;
  const idx = g.index, n = idx ? idx.count : pos.count;
  let mundo = 0, tex = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    const [i0, i1, i2] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
    a.fromBufferAttribute(pos, i0).applyMatrix4(malha.matrixWorld);
    b.fromBufferAttribute(pos, i1).applyMatrix4(malha.matrixWorld);
    c.fromBufferAttribute(pos, i2).applyMatrix4(malha.matrixWorld);
    mundo += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
    ua.fromBufferAttribute(uv, i0); ub.fromBufferAttribute(uv, i1); uc.fromBufferAttribute(uv, i2);
    tex += Math.abs((ub.x - ua.x) * (uc.y - ua.y) - (uc.x - ua.x) * (ub.y - ua.y)) / 2;
  }
  return mundo > 0.01 ? { mundo, tex } : null;
}

// Clones (com outra repetição) dividem a mesma imagem: o nome vem da textura-mãe.
let nomes;
function nomeDaTextura(tex) {
  nomes ??= new Map(Object.entries(texturas()).map(([n, t]) => [t.source, n]));
  return nomes.get(tex.source);
}

export function medirArea(area) {
  area.grupo.updateMatrixWorld(true);
  const r = { triangulos: 0, objetos: 0, modelos: 0, texturas: {} };
  const porTextura = {};
  area.grupo.traverse((o) => {
    if (o.userData.modelo) r.modelos++;
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const vezes = o.isInstancedMesh ? o.count : 1;
    const g = o.geometry;
    r.objetos++;
    r.triangulos += vezes * Math.floor((g.index ? g.index.count : g.attributes.position.count) / 3);
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const nome = mat?.map && nomeDaTextura(mat.map);
    if (!nome || o.isInstancedMesh) return;
    const d = densidade(o);
    if (!d) return;
    const t = (porTextura[nome] ??= { mundo: 0, tex: 0 });
    t.mundo += d.mundo; t.tex += d.tex;
  });
  for (const [nome, t] of Object.entries(porTextura)) {
    if (t.mundo >= 4) r.texturas[nome] = +Math.sqrt(t.tex / t.mundo).toFixed(4);
  }
  return r;
}

export function medirTudo() {
  ligarDocumentoDeMentira();
  const { areas } = criarAreas(new THREE.Scene(), { direcaoLua: new THREE.Vector3(0.3, 0.5, -0.8).normalize() });
  return Object.fromEntries(areas.map((area) => [area.id, medirArea(area)]));
}

const atual = medirTudo();
if (process.env.ATUALIZAR_ORCAMENTO || !existsSync(BASE)) {
  writeFileSync(BASE, JSON.stringify(atual, null, 2) + '\n');
}
const base = JSON.parse(readFileSync(BASE, 'utf8'));

for (const [id, m] of Object.entries(atual)) {
  test(`orçamento: ${id} cabe no teto de triângulos, objetos e modelos`, () => {
    const ref = base[id];
    assert.ok(ref, `área nova ${id}: grave a base com ATUALIZAR_ORCAMENTO=1`);
    for (const k of ['triangulos', 'objetos', 'modelos']) {
      const teto = Math.ceil(ref[k] * (1 + FOLGA)) + 2;
      assert.ok(m[k] <= teto, `${id}.${k}: ${m[k]} > teto ${teto} (base ${ref[k]})`);
    }
  });
  test(`orçamento: ${id} mantém a densidade de textura por metro`, () => {
    for (const [nome, d] of Object.entries(m.texturas)) {
      const ref = base[id]?.texturas?.[nome];
      if (ref == null) continue; // textura nova na área: entra na próxima base
      assert.ok(Math.abs(d - ref) <= ref * TOL_TEXTURA, `${id}/${nome}: ${d} repetições/m, base ${ref} (±10 %)`);
    }
  });
}
