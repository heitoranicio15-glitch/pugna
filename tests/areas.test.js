import test from 'node:test';
import assert from 'node:assert/strict';
import { montarAreas, validarArea } from '../src/mundo/areas.js';

// Área "de mentira": objeto simples que segue o contrato.
function areaFalsa(id, outra, pontos) {
  return {
    id,
    nome: `Área ${id}`,
    limites: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    nevoa: null,
    luzJogador: 5,
    usaCeu: false,
    portais: [{ x: 0, z: 0, raio: 2, destino: outra, texto: 'E — ir' }],
    chegadas: { [outra]: { x: 1, z: 1, yaw: 0 } },
    pontosDeDescanso: pontos.map((p) => ({ id: p, nome: p, x: 0, z: 0, olhar: 0 })),
    inimigos: [],
    grupo: {},
    colisores: {},
    objetos: [],
  };
}

test('montarAreas devolve porId, inicial, checkpoints e confere portal e chegada', () => {
  const a = areaFalsa('a', 'b', ['ponto-a']);
  const b = areaFalsa('b', 'a', ['ponto-b1', 'ponto-b2']);
  const r = montarAreas([a, b]);
  assert.deepEqual(r.areas, [a, b]);
  assert.equal(r.porId.get('b'), b);
  assert.equal(r.inicial, a);
  assert.equal(r.checkpoints.size, 3);
  assert.equal(r.checkpoints.get('ponto-b2').area, b);
  assert.equal(r.checkpoints.get('ponto-a').ponto.id, 'ponto-a');
  for (const area of r.areas) {
    for (const portal of area.portais) assert.ok(r.porId.get(portal.destino).chegadas[area.id]);
  }
});

test('montarAreas recusa id de área repetido', () => {
  assert.throws(() => montarAreas([areaFalsa('a', 'a', []), areaFalsa('a', 'a', [])]), /repetido/);
});

test('montarAreas recusa id de ponto de descanso repetido', () => {
  assert.throws(() => montarAreas([areaFalsa('a', 'b', ['x']), areaFalsa('b', 'a', ['x'])]), /ponto de descanso repetido/);
});

test('montarAreas recusa portal para destino inexistente', () => {
  assert.throws(() => montarAreas([areaFalsa('a', 'nada', [])]), /inexistente/);
});

test('montarAreas recusa portal sem chegada no destino', () => {
  const b = areaFalsa('b', 'a', []);
  b.chegadas = {};
  assert.throws(() => montarAreas([areaFalsa('a', 'b', []), b]), /chegadas/);
});

test('validarArea acusa campo faltando', () => {
  assert.deepEqual(validarArea(areaFalsa('a', 'b', [])), []);
  const ruim = areaFalsa('a', 'b', []);
  delete ruim.luzJogador;
  delete ruim.limites;
  const problemas = validarArea(ruim);
  assert.equal(problemas.length, 2);
  assert.ok(problemas.some((p) => p.includes('luzJogador')));
  assert.ok(problemas.some((p) => p.includes('limites')));
});
