import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { criarConversa, proximaFala, olharParaJogador, normalizarAngulo, validarNpc } from '../src/entidades/Npc.js';

test('cada E mostra a próxima fala e, no fim, repete a última', () => {
  const conversa = criarConversa(['um', 'dois', 'três']);
  const lidas = Array.from({ length: 6 }, () => proximaFala(conversa));
  assert.deepEqual(lidas, ['um', 'dois', 'três', 'três', 'três', 'três']);
  const unica = criarConversa(['só esta']);
  assert.deepEqual([proximaFala(unica), proximaFala(unica)], ['só esta', 'só esta']);
});

test('o NPC só olha para o jogador quando ele chega a uns 6 m', () => {
  const npc = { x: 0, z: 0, olhar: 0 };   // olha para +Z
  assert.equal(olharParaJogador(npc, { x: 0, z: 7 }), null);
  const defronte = olharParaJogador(npc, { x: 0, z: 5 });
  assert.ok(Math.abs(defronte.corpo) < 1e-9 && Math.abs(defronte.cabeca) < 1e-9);
  const lado = olharParaJogador(npc, { x: 4, z: 0 });   // 90° à esquerda do olhar (lado +X)
  assert.ok(lado.corpo > 0 && lado.corpo <= CONFIG.npc.limiteCorpo);
  assert.ok(lado.cabeca > 0 && lado.cabeca <= CONFIG.npc.limiteCabeca);
  assert.ok(Math.abs(lado.corpo + lado.cabeca - Math.PI / 2) < 1e-9);
  const atras = olharParaJogador(npc, { x: 0, z: -4 });   // às costas: gira até o limite, sem dar a volta
  assert.ok(Math.abs(atras.corpo) <= CONFIG.npc.limiteCorpo && Math.abs(atras.cabeca) <= CONFIG.npc.limiteCabeca);
});

test('normalizarAngulo mantém o ângulo entre -PI e PI', () => {
  assert.ok(Math.abs(normalizarAngulo(3 * Math.PI / 2) + Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(normalizarAngulo(-5 * Math.PI / 2) + Math.PI / 2) < 1e-9);
});

test('validarNpc exige id, x, z e falas curtas', () => {
  const ok = { id: 'a', x: 0, z: 0, falas: ['Oi.'] };
  assert.deepEqual(validarNpc(ok), []);
  assert.equal(validarNpc({ ...ok, id: '' }).length, 1);
  assert.equal(validarNpc({ ...ok, falas: [] }).length, 1);
  assert.equal(validarNpc({ ...ok, falas: ['x'.repeat(CONFIG.npc.maxLetras + 1)] }).length, 1);
  assert.equal(validarNpc({ ...ok, x: undefined }).length, 1);
  assert.equal(validarNpc(null).length, 1);
});
