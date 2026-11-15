import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { Catedral } from '../src/mundo/Catedral.js';
import { facesDoKit } from '../src/mundo/KitCatedral.js';
import { Navegacao } from '../src/mundo/Navegacao.js';
import { atualizarObjetos } from '../src/mundo/Interacoes.js';
import { ANOTACOES, ATALHO_SACRISTIA, PORTA_SACRISTIA } from '../src/nucleo/Inventario.js';

const ctx = new Proxy(function () {}, {
  get: (_, k) => k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx,
  apply: () => ctx,
  set: () => true,
});
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
const c = new Catedral(new THREE.Scene());
const sobrepoe = (a, A, b, B) => Math.min(A, B) > Math.max(a, b);

test('o kit não sobrepõe volumes nem emite faces coplanares em duplicata', () => {
  const volumes = c.volumes;
  for (const [i, a] of volumes.entries()) for (let j = i + 1; j < volumes.length; j++) {
    const b = volumes[j];
    assert.ok(!a.min.every((v, k) => sobrepoe(v, a.max[k], b.min[k], b.max[k])), JSON.stringify([a, b]));
  }
  const planos = new Map();
  for (const a of facesDoKit(volumes)) {
    const id = a.eixo + ':' + a.cota, [x, y, X, Y] = a.ret;
    if (!planos.has(id)) planos.set(id, []);
    for (const { ret: [u,v,U,V] } of planos.get(id)) {
      assert.ok(!(sobrepoe(x, X, u, U) && sobrepoe(y, Y, v, V)), JSON.stringify(a));
    }
    planos.get(id).push(a);
  }
});

test('cada borda externa fecha a sala e os vãos de combate têm mais de 3 m', () => {
  const raio = CONFIG.jogador.raio;
  for (const { x, z, eixo, vao, salas } of c.planta.arestas.values()) {
    const dx = eixo === 'x' ? 1 : 0, dz = 1 - dx;
    if (salas.length === 1) assert.equal(vao, undefined);
    for (const s of [-1.6, 0, 1.6]) {
      if (vao?.trava) continue;
      const a = { x: x - dx + s * dz, z: z - dz + s * dx };
      const b = { x: x + dx + s * dz, z: z + dz + s * dx };
      assert.equal(c.colisores.bloqueiaTrecho(a,b,1.6), !vao, JSON.stringify({ x,z,eixo,s }));
    }
    if (vao) assert.ok(vao.largura >= 3 && vao.altura >= 2.5);
    if (salas.length === 1) {
      assert.ok(c.colisores.bloqueiaTrecho({ x:x-dx,z:z-dz }, { x:x+dx,z:z+dz }, 0, raio));
    }
  }
});

test('chegada, lanterna, patrulhas e interações da Catedral ficam no piso e fora de bloqueios', () => {
  const points = [...Object.values(c.chegadas), ...c.portais, ...c.pontosDeDescanso,
    ...c.objetos, ...c.inimigos.flatMap(i => i.rota.map(([x,z]) => ({ x,z })))];
  for (const p of points) {
    assert.ok([...c.planta.celulas.values()].some(a => Math.abs(a.x - p.x) <= 2 && Math.abs(a.z - p.z) <= 2), JSON.stringify(p));
    assert.ok(!c.colisores.bloqueiaTrecho(p,p,p.y ?? 0), JSON.stringify(p));
  }
});

test('as duas alas são acessíveis antes dos selos e a grade controla a rota até o Guardião', () => {
  const nav = new Navegacao(c.colisores, c.limites), raio = CONFIG.jogador.raio;
  const [x,z] = c.inimigos.find(i => i.tipo === 'guardiao').rota[0];
  const destino = { x,z };
  for (const selo of c.selos) assert.ok(nav.encontrar(c.entrada, { x: selo.x - Math.sign(selo.x) * 1.4, z:selo.z }, raio).length);
  assert.equal(nav.encontrar(c.entrada, destino, raio).length, 0);
  c.aplicarProgresso({ selos: ['ossario','relicario'] });
  nav.invalidar();
  assert.ok(nav.encontrar(c.entrada, destino, raio).length);
  c.aplicarProgresso({ selos: [] });
});

test('os IDs antigos do térreo e a abertura da sacristia sobrevivem ao progresso salvo', () => {
  assert.ok(c.pontosDeDescanso.some(p => p.id === 'nave-do-veu'));
  assert.equal(c.inimigos.find(i => i.tipo === 'guardiao').eventoDeDerrota, 'catedral:guardiao-derrotado');
  assert.deepEqual(c.selos.map(s => s.id), ['ossario','relicario']);
  const eventos = new Set(c.objetos.map(o => o.evento));
  for (const id of Object.keys(ANOTACOES).filter(id => id.startsWith('catedral:'))) assert.ok(eventos.has(id), id);
  for (const id of [PORTA_SACRISTIA, ATALHO_SACRISTIA, 'catedral:frasco-sacristia']) assert.ok(eventos.has(id), id);
  const a = { x: 9,z:5 }, b = { x: 11,z:5 };
  assert.ok(c.colisores.bloqueiaTrecho(a,b,1.6));
  atualizarObjetos(c, [PORTA_SACRISTIA, ATALHO_SACRISTIA]);
  assert.ok(!c.colisores.bloqueiaTrecho(a,b,1.6));
});
