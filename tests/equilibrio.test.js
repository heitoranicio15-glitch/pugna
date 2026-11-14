// Teste rápido do equilíbrio (E1): poucas lutas do simulador de tests/equilibrio.mjs.
// A conta completa (60 lutas por cenário) roda à mão: node tests/equilibrio.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { lutar, rodarCenario } from './equilibrio.mjs';

const LUTAS = 8;

test('equilíbrio: quem só aperta o leve não vence o Guardião na maioria; quem apara e esquiva vence', () => {
  const spam = rodarCenario('guardiao', 'spam', LUTAS);
  const habil = rodarCenario('guardiao', 'habil', LUTAS);
  assert.ok(spam.vitorias <= 3, `spam venceu ${spam.vitorias} de ${LUTAS}`);
  assert.ok(habil.vitorias >= 6, `hábil venceu só ${habil.vitorias} de ${LUTAS}`);
});

test('equilíbrio: contra três inimigos o spam perde na maioria e o hábil vence', () => {
  const spam = rodarCenario('mistos3', 'spam', LUTAS);
  const habil = rodarCenario('mistos3', 'habil', LUTAS);
  assert.ok(spam.vitorias <= 4, `spam venceu ${spam.vitorias} de ${LUTAS}`);
  assert.ok(habil.vitorias >= 6, `hábil venceu só ${habil.vitorias} de ${LUTAS}`);
});

test('equilíbrio: a mesma semente repete a mesma luta', () => {
  const a = lutar({ cenario: 'cavaleiros2', jogador: 'habil', semente: 5 });
  const b = lutar({ cenario: 'cavaleiros2', jogador: 'habil', semente: 5 });
  assert.deepEqual(a, b);
});
