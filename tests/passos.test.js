import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { criarAreas } from '../src/mundo/areas.js';
import { Colisores } from '../src/mundo/Colisores.js';
import { SUPERFICIES, perfilDePasso, superficieDoTipo } from '../src/audio/regras.js';

function ligarDocumentoDeMentira() {
  const ctx = new Proxy(function () {}, {
    get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx),
    apply: () => ctx,
    set: () => true,
  });
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
}

test('a superfície vem do piso real sob os pés, não só do tipo da área', () => {
  ligarDocumentoDeMentira();
  const { areas } = criarAreas(new THREE.Scene(), { direcaoLua: new THREE.Vector3(0.3, 0.5, -0.8).normalize() });
  // Consulta como o jogador faz: pés no chão (y = 0), degrau de 0,4.
  const sob = (id, x, z, semReserva = false) => {
    const col = areas.find((a) => a.id === id).colisores;
    const reserva = col.superficiePadrao;
    if (semReserva) col.superficiePadrao = null;   // sem a reserva por tipo, só a marca do piso vale
    col.alturaDoChao(x, z, 0, 0.4);
    col.superficiePadrao = reserva;
    return col.superficie;
  };
  assert.equal(sob('estrada', 0, 22), 'pedra', 'ponte de pedra da estrada');
  assert.equal(sob('estrada', 0, 0), 'terra', 'trilha da estrada');
  assert.equal(sob('taverna', 0, 0, true), 'madeira', 'assoalho da taverna');
  assert.equal(sob('catedral', 0, 0, true), 'pedra', 'nave da Catedral');
  // Com a reserva por tipo de área ligada, o resultado continua o mesmo.
  assert.equal(sob('taverna', 0, 0), 'madeira', 'assoalho da taverna (reserva)');
  assert.equal(sob('catedral', 0, 0), 'pedra', 'nave da Catedral');
  assert.equal(sob('vilarejo', 0, 20.5), 'pedra', 'rua do vilarejo');
  assert.equal(sob('vilarejo', 60, -60), 'terra', 'terra batida fora das ruas');
});

test('caixa alta sem marca sobre rua marcada não herda a rua', () => {
  const col = new Colisores();
  col.superficiePadrao = 'terra';
  col.marcarSuperficie(0, 0, 10, 10, 'pedra');
  col.adicionar(0, 0, 1, 1, 0.3);                       // caixote sem marca sobre a rua
  col.alturaDoChao(0, 0, 0, 0.4);
  assert.equal(col.superficie, 'terra');
  col.alturaDoChao(3, 3, 0, 0.4);
  assert.equal(col.superficie, 'pedra');
});

test('cada superfície tem um perfil de passo próprio', () => {
  const chave = (s) => JSON.stringify(perfilDePasso(s));
  assert.equal(new Set(SUPERFICIES.map(chave)).size, SUPERFICIES.length);
  assert.equal(chave('desconhecida'), chave('terra'));
  assert.notEqual(perfilDePasso('pedra').tipo, perfilDePasso('terra').tipo);
  assert.equal(superficieDoTipo('taverna'), 'madeira');
});
