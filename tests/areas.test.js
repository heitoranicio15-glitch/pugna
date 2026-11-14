import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { REGISTRO, criarAreas, montarAreas, validarArea } from '../src/mundo/areas.js';
import { ANOTACOES } from '../src/nucleo/Inventario.js';
import { normalizarProgresso } from '../src/nucleo/Salvamento.js';
import { CONFIG } from '../src/config.js';
import { Atmosfera } from '../src/mundo/Atmosfera.js';
import { Ceu } from '../src/mundo/Ceu.js';
import { Navegacao } from '../src/mundo/Navegacao.js';
import { alvoProximo } from '../src/mundo/Interacoes.js';
import { criarNpcs } from '../src/entidades/Npc.js';

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

test('a triagem desvia o percurso do Portão Sul e há uma saída pelo mercado', () => {
  const { porId } = montarAsAreasReais();
  const vila = porId.get('vilarejo');
  const navega = new Navegacao(vila.colisores, vila.limites);
  const raio = CONFIG.jogador.raio;
  const rua = navega.encontrar({ x: 0, z: 42 }, { x: 0, z: 31 }, raio);
  assert.ok(rua.some(p => Math.abs(p.z - 37) < 0.7 && p.x > 4.6 && p.x < 6.5));
  for (const [origem, destino] of [
    [[5.6, 27.9], [16.4, 27.9]], [[16.4, 27.9], [16.4, 9]], [[16.4, 9], [4, 3]],
  ]) {
    const ponto = ([x, z]) => ({ x, z });
    assert.ok(navega.encontrar(ponto(origem), ponto(destino), raio).length);
  }
});

test('a Galeria dos Nomes fecha um circuito com o Ossário sem abrir a grade dos selos', () => {
  const { porId } = montarAsAreasReais();
  const catedral = porId.get('catedral');
  const navega = new Navegacao(catedral.colisores, catedral.limites);
  const raio = CONFIG.jogador.raio;
  for (const [a, b] of [
    [{ x: -4, z: 6.4 }, { x: -14.9, z: 6 }],
    [{ x: -14.9, z: 6 }, { x: -15, z: -3.7 }],
    [{ x: -15, z: -3.7 }, { x: -3, z: -4.75 }],
  ]) assert.ok(navega.encontrar(a, b, raio).length);
  assert.equal(navega.encontrar({ x: 0, z: -11 }, { x: 0, z: -21 }, raio).length, 0);
});

test('a expansão liga os bairros pelos fundos e dá duas entradas a cada ala nova da Catedral', () => {
  const { porId } = montarAsAreasReais();
  const raio = CONFIG.jogador.raio;
  const vila = porId.get('vilarejo');
  const navegaVila = new Navegacao(vila.colisores, vila.limites);
  const pontos = [[-48,32],[-47,3],[-36,-51],[-31,-84],[-28,-105],[27,-105],[43,-92],[43,-53],[48,-27],[47,4]];
  const pos = ([x,z]) => ({ x,z });
  for (let i = 1; i < pontos.length; i++) {
    assert.ok(navegaVila.encontrar(pos(pontos[i-1]), pos(pontos[i]), raio).length, pontos[i].join(', '));
  }
  const catedral = porId.get('catedral');
  const navegaCatedral = new Navegacao(catedral.colisores, catedral.limites);
  for (const lado of [-1, 1]) {
    for (const z of [-9.05, -0.95]) {
      assert.ok(navegaCatedral.livre({ x: lado * 21.1, z }, { x: lado * 24, z }, raio), `${lado}, ${z}`);
    }
    assert.ok(navegaCatedral.encontrar({ x: lado * 24, z: -9.05 }, { x: lado * 24, z: -0.95 }, raio).length);
  }
});

test('as novas anotações podem ser lidas de pontos acessíveis dos dois mapas', () => {
  const { porId } = montarAsAreasReais();
  const leituras = [
    ['vilarejo', 'edital-triagem', 0.7, 39.25, 0],
    ['vilarejo', 'contas-do-mercado', 19, 29, 0],
    ['vilarejo', 'marco-dos-ausentes', 22.1, -39.1, 0],
    ['catedral', 'lista-das-devolucoes', -12.1, 6.6, Math.PI],
    ['catedral', 'juramento-do-veu', 0, -29.1, 0],
  ];
  for (const [id, chave, x, z, yaw] of leituras) {
    const area = porId.get(id), evento = `${id}:${chave}`;
    const pos = { x, y: 0, z };
    area.colisores.resolver(pos, CONFIG.jogador.raio, 0, 0.4);
    assert.deepEqual(pos, { x, y: 0, z }, evento);
    assert.ok(ANOTACOES[evento]?.texto.length > 80, evento);
    const jogador = { pos, yaw, rumo: yaw, alturaOlhos: CONFIG.jogador.alturaOlhos };
    assert.equal(alvoProximo(area.objetos, jogador, area.colisores)?.evento, evento);
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

test('o taverneiro é um NPC: uma fala por E, e no fim repete a última', () => {
  const { porId } = montarAsAreasReais();
  const taverna = porId.get('taverna');
  const [declaracao] = taverna.npcs;
  assert.equal(declaracao.id, 'taverneiro');
  const [taverneiro] = criarNpcs(taverna);
  const falas = CONFIG.areas.taverna.taverneiro.falas;
  assert.ok(falas.length >= 3 && falas.length <= 4);
  assert.ok(falas.every((f) => f.length <= CONFIG.npc.maxLetras), 'falas curtas');
  const objeto = taverna.objetos.find((o) => o.acao === 'falar');
  assert.equal(objeto, taverneiro.objeto);
  assert.equal(objeto.nome, 'o taverneiro');   // prompt: "E — falar com o taverneiro"
  assert.deepEqual([objeto.x, objeto.z], [-2, -3.7]);   // atrás do balcão
  const lidas = Array.from({ length: falas.length + 2 }, () => objeto.falar());
  assert.deepEqual(lidas, [...falas, falas.at(-1), falas.at(-1)]);
});

test('o viajante da estrada fica fora da pista, dos colisores, das patrulhas e da lanterna', () => {
  const { porId } = montarAsAreasReais();
  const estrada = porId.get('estrada');
  const viajante = estrada.npcs.find((n) => n.id === 'viajante');
  assert.ok(viajante, 'a estrada declara o viajante');
  assert.deepEqual(validarArea(estrada), []);
  assert.ok(viajante.falas.length === 3 && viajante.falas.every((f) => f.length <= CONFIG.npc.maxLetras));
  const { minX, maxX, minZ, maxZ } = estrada.limites;
  assert.ok(viajante.x > minX + 1 && viajante.x < maxX - 1 && viajante.z > minZ + 1 && viajante.z < maxZ - 1, 'dentro dos limites');
  // Fora da pista de terra batida (centrada em x = 0) e longe de qualquer obstáculo.
  assert.ok(Math.abs(viajante.x) > CONFIG.areas.estrada.larguraDaPista / 2 + 1, 'fora da pista');
  const ponto = { x: viajante.x, z: viajante.z };
  estrada.colisores.resolver(ponto, 0.6, 0, 0.4);
  assert.ok(Math.hypot(ponto.x - viajante.x, ponto.z - viajante.z) < 0.01, 'não está dentro de um colisor');
  for (const { rota } of estrada.inimigos) {
    for (const [x, z] of rota) assert.ok(Math.hypot(x - viajante.x, z - viajante.z) > 8, 'longe das patrulhas');
  }
  for (const p of estrada.pontosDeDescanso) assert.ok(Math.hypot(p.x - viajante.x, p.z - viajante.z) > 8, 'longe da lanterna');
  // Com o colisor do NPC criado, dá para falar com ele chegando pela beira da pista.
  const [npc] = criarNpcs(estrada);
  const jogador = { pos: { x: -4.2, y: 0, z: 15.6 }, alturaOlhos: 1.7, yaw: Math.atan2(npc.x + 4.2, -(npc.z - 15.6)) + Math.PI, rumo: 0 };
  jogador.yaw = Math.atan2(-(npc.x - jogador.pos.x), -(npc.z - jogador.pos.z));
  jogador.rumo = jogador.yaw;
  assert.equal(alvoProximo(estrada.objetos, jogador, estrada.colisores), npc.objeto);
  // O colisor do NPC barra o caçador, mas só um pouco.
  const empurrado = { x: npc.x + 0.1, z: npc.z };
  estrada.colisores.resolver(empurrado, 0.4, 0, 0.4);
  assert.ok(Math.hypot(empurrado.x - npc.x, empurrado.z - npc.z) >= 0.4);
});

test('validarArea aceita `npcs` ausente e recusa NPC sem id, sem falas ou repetido', () => {
  const area = areaFalsa('a', 'b', []);
  assert.deepEqual(validarArea(area), []);
  const ok = { id: 'coveiro', nome: 'o coveiro', modelo: 'scary-doctor', x: 1, z: 2, olhar: 0, falas: ['Cave fundo.'] };
  assert.deepEqual(validarArea({ ...area, npcs: [ok] }), []);
  assert.ok(validarArea({ ...area, npcs: [{ ...ok, id: undefined }] }).some((p) => p.includes('id')));
  assert.ok(validarArea({ ...area, npcs: [{ ...ok, falas: [] }] }).some((p) => p.includes('falas')));
  assert.ok(validarArea({ ...area, npcs: [{ ...ok, falas: undefined }] }).some((p) => p.includes('falas')));
  assert.ok(validarArea({ ...area, npcs: [ok, ok] }).some((p) => p.includes('repetido')));
  assert.ok(validarArea({ ...area, npcs: 'x' }).some((p) => p.includes('npcs')));
  assert.throws(() => montarAreas([{ ...areaFalsa('a', 'b', []), npcs: [{ ...ok, falas: [] }] }, areaFalsa('b', 'a', [])]), /falas/);
  const outra = { ...areaFalsa('b', 'a', []), npcs: [ok] };
  assert.throws(() => montarAreas([{ ...areaFalsa('a', 'b', []), npcs: [ok] }, outra]), /NPC repetido/);
});
