import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { REGISTRO, criarAreas, montarAreas, validarArea } from '../src/mundo/areas.js';
import { ANOTACOES } from '../src/nucleo/Inventario.js';
import { normalizarProgresso } from '../src/nucleo/Salvamento.js';
import { CONFIG } from '../src/config.js';
import { Atmosfera } from '../src/mundo/Atmosfera.js';
import { Ceu } from '../src/mundo/Ceu.js';

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

// ---------------------------------------------------------------------------
//  Áreas de verdade (vilarejo, catedral, estrada e taverna) montadas sem navegador:
//  o `document` abaixo é um faz-de-conta que aceita qualquer desenho de textura.
// ---------------------------------------------------------------------------
function ligarDocumentoDeMentira() {
  const ctx = new Proxy(function () {}, {
    get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx),
    apply: () => ctx,
    set: () => true,
  });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
}

function montarAsAreasReais() {
  ligarDocumentoDeMentira();
  return criarAreas(new THREE.Scene(), { direcaoLua: new THREE.Vector3(0.3, 0.5, -0.8).normalize() });
}

test('o registro tem as quatro áreas, com a área inicial primeiro e IDs únicos', () => {
  const ids = REGISTRO.map((r) => r.id);
  assert.deepEqual(ids, ['vilarejo', 'catedral', 'estrada', 'taverna']);
  assert.equal(new Set(ids).size, ids.length);
});

test('as áreas de verdade passam em validarArea e em montarAreas', () => {
  const { areas, porId, inicial, checkpoints } = montarAsAreasReais();
  assert.deepEqual(areas.map((a) => a.id), REGISTRO.map((r) => r.id));
  assert.equal(inicial, porId.get('vilarejo'));
  for (const area of areas) assert.deepEqual(validarArea(area), [], area.id);
  // IDs publicados continuam, e a lanterna nova entra.
  for (const id of ['portao-sul', 'adro-da-igreja', 'nave-do-veu', 'taverna-da-estrada']) assert.ok(checkpoints.has(id), id);
  assert.equal(checkpoints.get('taverna-da-estrada').area.id, 'estrada');
  assert.equal(checkpoints.size, 4);
});

test('a atmosfera aplica os perfis e interpola o céu, a névoa e o fundo entre áreas', () => {
  ligarDocumentoDeMentira();
  const cena = new THREE.Scene();
  const ceu = new Ceu(cena);
  const { areas, porId } = criarAreas(cena, ceu);
  const luz = new THREE.PointLight();
  const atmosfera = new Atmosfera(cena, ceu, luz);
  for (const area of areas) {
    const config = CONFIG.areas[area.id];
    assert.equal(area.nevoa.color.getHex(), config.nevoa.cor);
    assert.equal(area.nevoa.density, config.nevoa.densidade);
    assert.equal(area.fundo.getHex(), config.fundo);
  }
  const vila = porId.get('vilarejo'), estrada = porId.get('estrada'), taverna = porId.get('taverna');
  atmosfera.mudarArea(vila);
  atmosfera.mudarArea(estrada, true);
  assert.equal(ceu.uniformes.uZenite.value.getHex(), vila.paletaDoCeu.zenite);
  atmosfera.atualizar(0.3);
  assert.ok(cena.fog.density > vila.nevoa.density && cena.fog.density < estrada.nevoa.density);
  assert.ok(!cena.background.equals(vila.fundo) && !cena.background.equals(estrada.fundo));
  assert.notEqual(ceu.uniformes.uZenite.value.getHex(), vila.paletaDoCeu.zenite);
  atmosfera.atualizar(0.3);
  assert.equal(ceu.uniformes.uZenite.value.getHex(), estrada.paletaDoCeu.zenite);
  assert.equal(cena.fog.color.getHex(), estrada.nevoa.color.getHex());
  assert.notEqual(cena.fog, estrada.nevoa);
  atmosfera.mudarArea(taverna, true);
  assert.equal(ceu.malha.visible, false);
  assert.equal(luz.color.getHex(), taverna.corLuzJogador);
  atmosfera.atualizar(0.2);
  atmosfera.mudarArea(vila);
  assert.equal(ceu.malha.visible, true);
  assert.equal(cena.background.getHex(), vila.fundo.getHex());
  assert.equal(atmosfera.tempo, 0);
});

test('cada portal tem a chegada no destino e a chegada fica fora do raio do portal de volta', () => {
  const { areas, porId } = montarAsAreasReais();
  for (const area of areas) {
    for (const portal of area.portais) {
      const destino = porId.get(portal.destino);
      const chegada = destino.chegadas[area.id];
      assert.ok(chegada, `${area.id} -> ${destino.id}`);
      const volta = destino.portais.find((p) => p.destino === area.id);
      assert.ok(volta, `${destino.id} precisa de um portal de volta para ${area.id}`);
      assert.ok(Math.hypot(chegada.x - volta.x, chegada.z - volta.z) > volta.raio, `chegada em ${destino.id} cai dentro do portal de volta`);
      const { minX, maxX, minZ, maxZ } = destino.limites;
      assert.ok(chegada.x > minX && chegada.x < maxX && chegada.z > minZ && chegada.z < maxZ);
      const ponto = { x: chegada.x, z: chegada.z };
      destino.colisores.resolver(ponto, 0.4, 0, 0.4);
      assert.ok(Math.hypot(ponto.x - chegada.x, ponto.z - chegada.z) < 0.01, `chegada de ${area.id} em ${destino.id} está dentro de um obstáculo`);
    }
  }
});

test('o Portão Sul do vilarejo leva à estrada, e a taverna só se alcança pela estrada', () => {
  const { porId } = montarAsAreasReais();
  const vilarejo = porId.get('vilarejo'), estrada = porId.get('estrada'), taverna = porId.get('taverna');
  const portaoSul = vilarejo.portais.find((p) => p.destino === 'estrada');
  assert.ok(portaoSul);
  assert.ok(portaoSul.z > 50, 'o portal fica no Portão Sul (ponta sul do vilarejo)');
  assert.ok(Math.hypot(portaoSul.x - vilarejo.nascimento.x, portaoSul.z - vilarejo.nascimento.z) > portaoSul.raio, 'nascer no vilarejo não acende o portal');
  assert.ok(vilarejo.chegadas.catedral && vilarejo.chegadas.estrada, 'chegadas antigas e nova');
  assert.deepEqual(estrada.portais.map((p) => p.destino).sort(), ['taverna', 'vilarejo']);
  assert.deepEqual(taverna.portais.map((p) => p.destino), ['estrada']);
  assert.equal(taverna.portais[0].texto, 'E — sair da taverna');
  assert.equal(estrada.portais.find((p) => p.destino === 'taverna').texto, 'E — entrar na taverna');
});

test('estrada e taverna declaram o contrato com os números do config', () => {
  const { porId } = montarAsAreasReais();
  const estrada = porId.get('estrada'), taverna = porId.get('taverna');
  assert.equal(estrada.usaCeu, true);
  assert.equal(taverna.usaCeu, false);
  assert.equal(estrada.luzJogador, CONFIG.areas.estrada.luzJogador);
  assert.equal(taverna.luzJogador, CONFIG.areas.taverna.luzJogador);
  const le = estrada.limites, lt = taverna.limites;
  assert.equal(le.maxZ - le.minZ, 120);
  assert.equal(le.maxX - le.minX, 30);
  assert.equal(lt.maxX - lt.minX, 12);
  assert.equal(lt.maxZ - lt.minZ, 9);
  assert.ok(estrada.inimigos.length >= 2 && estrada.inimigos.length <= 3);
  assert.equal(taverna.inimigos.length, 0);
  assert.equal(taverna.pontosDeDescanso.length, 0);
  assert.ok(estrada.nevoa && taverna.nevoa, 'as duas têm névoa');
});

test('a estrada fica aberta de ponta a ponta e fecha na carroça tombada', () => {
  const { porId } = montarAsAreasReais();
  const estrada = porId.get('estrada');
  const pos = { x: 0, z: estrada.limites.minZ + 5 };
  let y = 0;
  for (let z = pos.z; z <= estrada.limites.maxZ - 1; z += 0.05) {
    const antes = z;
    pos.x = 0; pos.z = z;
    y = estrada.colisores.alturaDoChao(pos.x, pos.z, y, 0.4);
    estrada.colisores.resolver(pos, 0.4, y, 0.4);
    if (pos.z < antes - 0.05) {
      assert.ok(antes > estrada.limites.maxZ - 8, `a estrada travou cedo demais, em z=${antes.toFixed(1)} (a ponte tem degraus de até 0,3 m)`);
      return;
    }
  }
  assert.fail('a ponta sul precisa estar bloqueada');
});

test('as patrulhas e as lanternas da estrada ficam em chão livre', () => {
  const { porId } = montarAsAreasReais();
  const estrada = porId.get('estrada');
  for (const inimigo of estrada.inimigos) {
    for (const [x, z] of inimigo.rota) {
      const ponto = { x, z };
      estrada.colisores.resolver(ponto, 0.5, 0, 0);
      assert.ok(Math.hypot(ponto.x - x, ponto.z - z) < 0.01, `${inimigo.tipo} em ${x},${z}`);
    }
  }
  const lanterna = estrada.pontosDeDescanso[0];
  assert.deepEqual([lanterna.id, lanterna.nome], ['taverna-da-estrada', 'Taverna da Estrada']);
  const renasce = { x: lanterna.x - Math.sin(lanterna.olhar) * 1.2, z: lanterna.z - Math.cos(lanterna.olhar) * 1.2 };
  const antes = { ...renasce };
  estrada.colisores.resolver(renasce, 0.4, 0, 0.4);
  assert.ok(Math.hypot(renasce.x - antes.x, renasce.z - antes.z) < 0.01, 'o ponto de renascer não pode ficar dentro de um obstáculo');
});

test('o bilhete da mesa é uma anotação persistente no formato area:evento', () => {
  const { porId } = montarAsAreasReais();
  const taverna = porId.get('taverna');
  const bilhete = taverna.objetos.find((o) => o.acao === 'ler');
  assert.equal(bilhete.evento, 'taverna:bilhete-da-mesa');
  assert.ok(ANOTACOES[bilhete.evento].nome && ANOTACOES[bilhete.evento].texto);
  assert.deepEqual(normalizarProgresso({ eventos: [bilhete.evento] }).eventos, [bilhete.evento]);
});

test('o taverneiro reveza 3 ou 4 falas curtas, em rodízio', () => {
  const { porId } = montarAsAreasReais();
  const taverneiro = porId.get('taverna').objetos.find((o) => o.acao === 'falar');
  const falas = CONFIG.areas.taverna.taverneiro.falas;
  assert.ok(falas.length >= 3 && falas.length <= 4);
  assert.ok(falas.every((f) => f.length <= 80), 'falas curtas');
  assert.equal(taverneiro.nome, 'o taverneiro');
  const lidas = Array.from({ length: falas.length * 2 }, () => taverneiro.falar());
  assert.deepEqual(lidas, [...falas, ...falas]);
});
