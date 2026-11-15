import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import {
  campoDeVisao, seguirPonto, inclinacaoDaMira, focoDaMira, distanciaDaMira, acomodar,
  fatorColado, coberturaDoAlvo, opacidadeDoCacador, recentralizar, desvioDeParede,
} from '../src/nucleo/enquadramento.js';
import { carregarPreferencias, salvarPreferencias } from '../src/nucleo/Preferencias.js';
import { pontilhar } from '../src/render/retro.js';
import { Jogador } from '../src/entidades/Jogador.js';
import { Eventos } from '../src/nucleo/Eventos.js';
import { normalizarProgresso, SalvamentoLocal } from '../src/nucleo/Salvamento.js';
import { Colisores } from '../src/mundo/Colisores.js';
import { Navegacao } from '../src/mundo/Navegacao.js';
import { alvoDaMira, alvoProximo } from '../src/mundo/Interacoes.js';
import { contarFrascos } from '../src/nucleo/Inventario.js';
import { MaquinaDeAtaque, golpeAlcanca, montarGolpe, sortearSequencia } from '../src/entidades/Ataques.js';
import { Inimigo } from '../src/entidades/Inimigo.js';
import { Fichas } from '../src/entidades/Fichas.js';
import { alcancaPisada, pelasCostas, percebe, raioDeBarulho, vizinhosParaAlertar } from '../src/entidades/Furtividade.js';
import * as THREE from 'three';

test('a mira escolhe o objeto visível no alcance e respeita a altura dos obstáculos', () => {
  const col = new Colisores();
  const origem = { x: 0, y: 1.7, z: 0 };
  const alvo = { x: 0, y: 0.3, z: -1.9 };
  const direcao = new THREE.Vector3(0, -1.4, -1.9).normalize();
  assert.equal(alvoDaMira([alvo], origem, direcao, col), alvo);
  assert.equal(alvoDaMira([alvo], origem, { x: 1, y: 0, z: 0 }, col), null);
  const caixa = col.adicionar(0, -1.4, 1, 0.4, 0.85);
  assert.equal(alvoDaMira([alvo], origem, direcao, col), null);
  caixa.ativa = false;
  assert.equal(alvoDaMira([alvo], origem, direcao, col), alvo);
});

test('frascos são derivados de recompensas únicas e descontados após uso', () => {
  const eventos = ['vilarejo:bau-casa', 'vilarejo:bau-casa', 'catedral:frasco-sacristia'];
  assert.equal(contarFrascos(normalizarProgresso({ eventos })), 3);
  assert.equal(contarFrascos(normalizarProgresso({ eventos, frascosUsados: 1 })), 2);
  assert.equal(contarFrascos(normalizarProgresso({ eventos, frascosUsados: 99 })), 0);
  assert.equal(contarFrascos(normalizarProgresso({ descanso: 'nave-do-veu' })), 0);
});

test('saves da versão com ossos contados continuam válidos sem o contador', () => {
  const salvo = normalizarProgresso({ descanso: 'portao-sul', frascosUsados: 0, ossosUsados: 2, eventos: ['vilarejo:ossos-cemiterio'] });
  assert.equal('ossosUsados' in salvo, false);
  assert.equal(salvo.descanso, 'portao-sul');
  assert.deepEqual(salvo.eventos, ['vilarejo:ossos-cemiterio']);
});

function arena() {
  const colisores = new Colisores();
  const eventos = new Eventos();
  const entrada = {
    botoes: [false, false, false], botoesApertados: [false, false, false],
    mouseDX: 0, mouseDY: 0, segurando: () => false, apertou: () => false,
  };
  const jogo = {
    entrada, eventos, mundo: { colisores }, inimigos: [],
    preferencias: { sensibilidade: 100 }, camera: new THREE.PerspectiveCamera(),
    pausaDeImpacto() {},
  };
  const jogador = new Jogador(jogo);
  const alvo = {
    pos: new THREE.Vector3(0, 0, -2), raio: 0.44, vida: 100,
    receberDano(dano) { this.vida -= dano; },
  };
  jogo.inimigos.push(alvo);
  return { colisores, eventos, entrada, jogador, alvo };
}

test('toque rápido prepara o golpe leve e a passagem acerta cada alvo uma vez', () => {
  const { jogador, entrada, alvo } = arena();
  entrada.botoesApertados[0] = true;
  jogador.atualizar(0.01);
  entrada.botoesApertados[0] = false;
  assert.equal(jogador.ataque, 'leve');
  jogador.atualizar(0.06);
  assert.equal(alvo.vida, 100);
  jogador.atualizar(0.08);
  assert.equal(alvo.vida, 78);
  jogador.atualizar(0.08);
  assert.equal(alvo.vida, 78);
});

test('carga tem sinal, custo integral e mantém o tipo ao soltar', () => {
  const { jogador, entrada, eventos } = arena();
  let sinais = 0;
  eventos.em('jogador:carregando', () => sinais++);
  entrada.botoesApertados[0] = true;
  entrada.botoes[0] = true;
  jogador.atualizar(0.05);
  entrada.botoesApertados[0] = false;
  for (let i = 0; i < 8; i++) jogador.atualizar(0.05);
  assert.equal(sinais, 1);
  entrada.botoes[0] = false;
  jogador.atualizar(0.01);
  assert.equal(jogador.ataque, 'forte');
  assert.equal(jogador.estamina, 68);
});

test('a parede interrompe a lâmina e impede dano atrás dela', () => {
  const { colisores, eventos, jogador, alvo } = arena();
  colisores.adicionar(0, -1, 6, 0.25);
  let contatos = 0;
  eventos.em('golpe:parede', (p) => { contatos++; assert.ok(p.z > -1); });
  jogador.iniciarAtaque('leve');
  for (let i = 0; i < 25; i++) jogador.atualizar(0.02);
  assert.equal(contatos, 1);
  assert.equal(alvo.vida, 100);
});

test('um toque na recuperação entra na fila e sai como golpe leve', () => {
  const { jogador, entrada } = arena();
  jogador.iniciarAtaque('forte');
  jogador.acao = 'recuperacao';
  jogador.tAcao = CONFIG.combate.forte.recuperacao - 0.09;
  entrada.botoesApertados[0] = true;
  jogador.atualizar(0.01);
  entrada.botoesApertados[0] = false;
  assert.equal(jogador.ataque, 'forte');
  jogador.atualizar(0.045);
  jogador.atualizar(0.045);
  assert.equal(jogador.ataque, 'leve');
  assert.equal(jogador.acao, 'preparo');
});

test('esquiva fica na fila durante a recuperação e respeita o custo', () => {
  const { jogador, entrada } = arena();
  jogador.iniciarAtaque('leve');
  jogador.acao = 'recuperacao';
  jogador.tAcao = 0;
  entrada.apertou = (codigo) => codigo === 'KeyQ';
  jogador.atualizar(0.02);
  entrada.apertou = () => false;
  assert.equal(jogador.tEsquiva, 0);
  jogador.atualizar(0.05);
  assert.ok(jogador.tEsquiva > 0);
  assert.equal(jogador.ataque, null);
  assert.equal(jogador.receberDano(10, { x: 0, z: -1 }), 'esquivou');
  jogador.reiniciar(0, 0, 0);
  jogador.estamina = CONFIG.combate.esquiva.custo - 1;
  entrada.apertou = (codigo) => codigo === 'KeyQ';
  jogador.atualizar(0.01);
  assert.equal(jogador.tEsquiva, 0);
});

test('sem mira a esquiva é o rolamento, com invencibilidade de 0,22 s', () => {
  const { jogador, entrada, eventos } = arena();
  const E = CONFIG.combate.esquiva;
  assert.equal(E.invencivel, 0.22);
  const avisos = [];
  eventos.em('jogador:esquiva', (d) => avisos.push(d));
  entrada.segurando = (codigo) => codigo === 'KeyD';
  entrada.apertou = (codigo) => codigo === 'KeyQ';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  assert.equal(jogador.quickstep, false);
  assert.equal(jogador.rolando, true);
  assert.equal(jogador.estamina, 100 - E.custo);
  assert.ok(Math.abs(jogador.invencivel - E.invencivel) < 1e-9);
  assert.deepEqual(avisos, [{ quickstep: false }]);
});

test('com a mira travada a esquiva vira quickstep: mais barato, sem rolar e com menos invencibilidade', () => {
  const { jogador, entrada, eventos, alvo } = arena();
  const Q = CONFIG.combate.quickstep, E = CONFIG.combate.esquiva;
  assert.ok(Q.invencivel < E.invencivel);
  assert.ok(Q.custo < E.custo);
  const avisos = [];
  eventos.em('jogador:esquiva', (d) => avisos.push(d));
  jogador.alvo = alvo;
  entrada.segurando = (codigo) => codigo === 'KeyD';
  entrada.apertou = (codigo) => codigo === 'KeyQ';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  assert.equal(jogador.quickstep, true);
  assert.equal(jogador.rolando, false);
  assert.equal(jogador.estamina, 100 - Q.custo);
  assert.ok(Math.abs(jogador.invencivel - Q.invencivel) < 1e-9);
  assert.deepEqual(avisos, [{ quickstep: true }]);
  // Passo de lado: o corpo continua virado para o alvo e o passo dura pouco.
  assert.ok(jogador.vel.x > 0);
  assert.ok(Math.abs(jogador.vel.z) < 1e-6);
  for (let i = 0; i < 5; i++) jogador.atualizar(0.05);
  assert.ok(jogador.tEsquiva <= 0);
  assert.ok(jogador.invencivel <= 0);
  assert.equal(jogador.receberDano(10, { x: 0, z: -1 }) === 'esquivou', false);
});

test('quickstep parado recua, afastando-se do alvo', () => {
  const { jogador, entrada, alvo } = arena();
  jogador.alvo = alvo;
  jogador.rumo = 0;   // de frente para o alvo (em -z)
  entrada.apertou = (codigo) => codigo === 'KeyQ';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  assert.equal(jogador.quickstep, true);
  assert.ok(jogador.vel.z > 0);
});

test('navegação contorna parede, respeita raio e reage à abertura da grade', () => {
  const col = new Colisores();
  col.adicionar(0, -3, 0.35, 4.1);
  col.adicionar(0, 3, 0.35, 4.1);
  const grade = col.adicionar(0, 0, 0.35, 2);
  const nav = new Navegacao(col, { minX: -5, maxX: 5, minZ: -4.5, maxZ: 4.5 });
  const a = { x: -3, z: -2 }, b = { x: 3, z: 0.5 };
  assert.deepEqual(nav.encontrar(a, b, 0.42), []);
  grade.ativa = false;
  nav.invalidar();
  const rota = nav.encontrar(a, b, 0.42);
  assert.ok(rota.length > 1);
  assert.deepEqual(rota.at(-1), b);
  assert.ok(rota.every((p, i) => nav.livre(i ? rota[i - 1] : a, p, 0.42)));
  assert.deepEqual(nav.encontrar(a, b, 0.42, 0), []);
});

test('saves antigos migram, eventos novos sobrevivem e o reset remove apenas o progresso', async () => {
  const progresso = normalizarProgresso({
    descanso: 'nave-do-veu', selos: ['ossario', 'relicario'], guardiaoDerrotado: true,
  });
  assert.deepEqual(progresso.eventos, [
    'catedral:selo-ossario', 'catedral:selo-relicario', 'catedral:guardiao-derrotado',
  ]);
  const registros = new Map([['pugna-preferencias-v1', '{"musica":55}']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => registros.get(key) ?? null,
    setItem: (key, value) => registros.set(key, value),
    removeItem: (key) => registros.delete(key),
  } });
  try {
    const saves = new SalvamentoLocal();
    await saves.salvar({ ...progresso, eventos: [...progresso.eventos, 'futuro:missao', 'futuro:missao', 'inválido'] });
    assert.deepEqual((await saves.carregar()).eventos, ['futuro:missao', ...progresso.eventos]);
    assert.equal(saves.apagar(), true);
    assert.deepEqual(await saves.carregar(), normalizarProgresso());
    assert.ok(registros.has('pugna-preferencias-v1'));
  } finally {
    delete globalThis.localStorage;
  }
});

test('naJanelaDeAparo: a janela fica presa ao fim do aviso e ao começo do golpe', () => {
  const P = CONFIG.combate.pistola;
  const cav = CONFIG.inimigos.cavaleiro;
  const m = new MaquinaDeAtaque();
  const eps = 1e-6;
  assert.equal(m.naJanelaDeAparo(P), false);   // sem golpe
  for (const tipo of ['alto', 'pesado']) {
    m.iniciar(cav, [tipo]);
    const g = m.golpe, k = g.janelaAparar;
    m.t = g.preparo - P.janelaNoAviso * k - 0.001; assert.equal(m.naJanelaDeAparo(P), false, tipo);
    m.t = g.preparo - P.janelaNoAviso * k + eps;   assert.equal(m.naJanelaDeAparo(P), true, tipo);
    m.irPara('ativo');                               assert.equal(m.naJanelaDeAparo(P), true, tipo);
    m.t = P.janelaNoGolpe * k - eps;                 assert.equal(m.naJanelaDeAparo(P), true, tipo);
    m.t = P.janelaNoGolpe * k + 0.001;               assert.equal(m.naJanelaDeAparo(P), false, tipo);
    m.t = 0; m.resolvido = true;                     assert.equal(m.naJanelaDeAparo(P), false, tipo);
    m.irPara('recuperacao'); m.resolvido = false;    assert.equal(m.naJanelaDeAparo(P), false, tipo);
  }
  // Janela total: uns 0,13 s no alto e 0,08 s no pesado.
  const total = (tipo) => (P.janelaNoAviso + P.janelaNoGolpe) * CONFIG.combate.ataquesInimigos[tipo].janelaAparar;
  assert.ok(Math.abs(total('alto') - 0.13) < 1e-9);
  assert.ok(Math.abs(total('pesado') - 0.08) < 0.003);
  // A rasteira nunca entra na janela.
  m.iniciar(cav, ['rasteira']);
  m.t = m.golpe.preparo - 0.01; assert.equal(m.naJanelaDeAparo(P), false);
  m.irPara('ativo');            assert.equal(m.naJanelaDeAparo(P), false);
});

test('o tiro sai com clique direito ou C, gasta bala acertando ou errando e sem bala só dá clique seco', () => {
  const { jogador, entrada, eventos, alvo } = arena();
  const P = CONFIG.combate.pistola;
  alvo.ataque = new MaquinaDeAtaque();
  alvo.levarTiro = function (dano) { this.vida -= dano; };
  const tiros = [];
  let secos = 0;
  eventos.em('jogador:tiro', (t) => tiros.push(t.acertou));
  eventos.em('jogador:sem-bala', () => secos++);
  assert.equal(jogador.balas, P.balasMax);

  // Clique direito: acerta o inimigo à frente, sem gastar estamina.
  entrada.botoesApertados[2] = true;
  jogador.atualizar(0.01);
  entrada.botoesApertados[2] = false;
  assert.deepEqual([jogador.acao, jogador.balas, alvo.vida, jogador.estamina], ['tiro', P.balasMax - 1, 100 - P.dano, 100]);
  // C perto do fim da recuperação fica na fila e sai assim que ele se libera.
  jogador.tAcao = P.recuperacao - 0.05;
  entrada.apertou = (codigo) => codigo === 'KeyC';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  assert.equal(jogador.balas, P.balasMax - 1);
  for (let i = 0; i < 5; i++) jogador.atualizar(0.02);
  assert.deepEqual([jogador.balas, alvo.vida], [P.balasMax - 2, 100 - 2 * P.dano]);

  // Errar também gasta bala: é o anti-spam.
  for (let i = 0; i < 20; i++) jogador.atualizar(0.02);
  alvo.pos.set(0, 0, 5);
  assert.deepEqual(jogador.atirar(), { acertou: false, aparou: false });
  assert.equal(jogador.balas, P.balasMax - 3);
  assert.deepEqual(tiros, [true, true, false]);

  // Sem bala: só o clique seco, e o caçador continua livre.
  jogador.acao = 'livre';
  jogador.balas = 0;
  assert.equal(jogador.atirar(), null);
  assert.deepEqual([secos, tiros.length, jogador.acao], [1, 3, 'livre']);
  // Renascer (lanterna, morte ou Osso) começa com as balas cheias.
  jogador.reiniciar(0, 0, 0);
  assert.equal(jogador.balas, P.balasMax);
});

test('a parede no caminho bloqueia o tiro, e o tiro tem alcance curto', () => {
  const { colisores, jogador, alvo } = arena();
  const P = CONFIG.combate.pistola;
  alvo.ataque = new MaquinaDeAtaque();
  alvo.levarTiro = function (dano) { this.vida -= dano; };
  const parede = colisores.adicionar(0, -1, 6, 0.25);
  assert.deepEqual(jogador.atirar(), { acertou: false, aparou: false });
  // Mesmo com a mira travada.
  jogador.acao = 'livre';
  jogador.alvo = alvo;
  assert.deepEqual(jogador.atirar(), { acertou: false, aparou: false });
  assert.deepEqual([alvo.vida, jogador.balas], [100, P.balasMax - 2]);
  // Sem parede, mas longe demais.
  parede.ativa = false;
  jogador.acao = 'livre';
  jogador.alvo = null;
  alvo.pos.set(0, 0, -(P.alcance + 1));
  assert.deepEqual(jogador.atirar(), { acertou: false, aparou: false });
  jogador.acao = 'livre';
  alvo.pos.set(0, 0, -(P.alcance - 1));
  assert.deepEqual(jogador.atirar(), { acertou: true, aparou: false });
});

test('não existe mais bloqueio: segurar o clique direito não reduz o dano', () => {
  const { jogador, entrada, alvo } = arena();
  alvo.ataque = new MaquinaDeAtaque();
  alvo.levarTiro = () => {};
  entrada.botoes[2] = true;
  for (let i = 0; i < 10; i++) jogador.atualizar(0.05);
  assert.equal(jogador.bloqueando, false);
  const alto = montarGolpe(CONFIG.inimigos.cavaleiro, 'alto');
  assert.equal(jogador.receberDano(alto.dano, alvo.pos, alvo, alto), 'ferido');
  assert.equal(jogador.vida, 100 - alto.dano);
  assert.equal(jogador.exportarEstado().bloqueando, false);
  assert.equal('bloqueio' in CONFIG.combate, false);
  assert.equal('aparar' in CONFIG.combate, false);
});

test('o golpe em inimigo desequilibrado é crítico', () => {
  const { jogador, eventos, alvo } = arena();
  const golpes = [];
  eventos.em('golpe:acertou', (g) => golpes.push(g.critico));
  alvo.receberDano = () => 'critico';
  jogador.iniciarAtaque('leve');
  for (let i = 0; i < 10; i++) jogador.atualizar(0.02);
  assert.deepEqual(golpes, [true]);
});

test('a mira trava no inimigo à frente, ignora quem está atrás de parede e passa adiante quando o alvo cai', () => {
  const { colisores, jogador, entrada, alvo } = arena();
  const outro = { pos: new THREE.Vector3(3, 0, -6), raio: 0.44 };
  const atras = { pos: new THREE.Vector3(0, 0, 5), raio: 0.44 };
  jogador.jogo.inimigos.push(outro, atras);
  alvo.receberDano = () => {};
  assert.equal(jogador.escolherAlvo(), alvo);

  entrada.apertou = (codigo) => codigo === 'Tab';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  assert.equal(jogador.alvo, alvo);
  // Um movimento rápido do mouse para a direita troca para o alvo da direita.
  entrada.mouseDX = CONFIG.mira.trocaMouse + 40;
  jogador.atualizar(0.01);
  entrada.mouseDX = 0;
  assert.equal(jogador.alvo, outro);
  // Com a trava, o corpo e o golpe se voltam para o alvo.
  for (let i = 0; i < 30; i++) jogador.atualizar(0.02);
  const esperado = Math.atan2(jogador.pos.x - outro.pos.x, jogador.pos.z - outro.pos.z);
  assert.ok(Math.abs(jogador.rumo - esperado) < 0.01);

  outro.morto = true;
  jogador.atualizar(0.01);
  assert.equal(jogador.alvo, alvo);
  const parede = colisores.adicionar(0, -1, 6, 0.25);
  for (let i = 0; i < 40; i++) jogador.atualizar(0.05);
  assert.equal(jogador.alvo, null);
  assert.equal(jogador.escolherAlvo(), null);
  parede.ativa = false;
  assert.equal(jogador.escolherAlvo(), alvo);
});

test('a câmera fica atrás do caçador, encurta na parede e ignora postes finos', () => {
  const { colisores, jogador } = arena();
  const camera = jogador.jogo.camera;
  jogador.atualizarCamera(0);
  const livre = Math.hypot(camera.position.x, camera.position.z);
  assert.ok(camera.position.z > 3 && camera.position.y > CONFIG.camera.alturaPivo);
  assert.ok(Math.abs(jogador.distCamera - CONFIG.camera.distancia) < 1e-9);

  const poste = colisores.adicionar(0, 1.5, 0.3, 0.3);
  jogador.atualizarCamera(0);
  assert.equal(Math.hypot(camera.position.x, camera.position.z), livre);
  poste.ativa = false;
  colisores.adicionar(0, 2.5, 8, 1);
  jogador.atualizarCamera(0);
  assert.ok(camera.position.z < 2 - CONFIG.camera.folga + 1e-6 && camera.position.z > 0.3);
});

test('a terceira pessoa tem abertura própria; primeira pessoa, menu inicial e celular em pé não mudam', () => {
  assert.equal(campoDeVisao({}), CONFIG.camera.campoDeVisao);
  assert.equal(campoDeVisao({ toque: true, proporcao: 16 / 9 }), CONFIG.camera.campoDeVisao);
  assert.equal(campoDeVisao({ primeiraPessoa: true }), 72);
  assert.equal(campoDeVisao({ titulo: true }), 72);
  assert.equal(campoDeVisao({ titulo: true, primeiraPessoa: true }), 72);
  assert.equal(campoDeVisao({ toque: true, proporcao: 0.5 }), 88);
  assert.equal(campoDeVisao({ toque: true, proporcao: 0.5, titulo: true }), 88);
  assert.ok(CONFIG.camera.campoDeVisao < CONFIG.render.campoDeVisao);
});

test('o giro da câmera fica no peito, ela não entra no chão olhando para cima e o boneco some de perto', () => {
  const { colisores, jogador } = arena();
  const camera = jogador.jogo.camera;
  // Ponto de giro abaixo dos olhos (peito) e acima da cintura.
  assert.ok(CONFIG.camera.alturaPivo < CONFIG.jogador.alturaOlhos && CONFIG.camera.alturaPivo > 1);
  for (const pitch of [0.2, 0.5, CONFIG.camera.inclinacaoMax]) {
    jogador.pitch = pitch;
    jogador.distCamera = CONFIG.camera.distancia;
    jogador.atualizarCamera(0);
    assert.ok(camera.position.y >= jogador.pos.y + CONFIG.camera.folgaDoChao - 1e-9, `no chão com inclinação ${pitch}`);
  }
  // No limite de cima a câmera chega perto, mas o boneco ainda aparece.
  assert.ok(jogador.distCamera > CONFIG.camera.sumirBoneco);
  // Parede colada nas costas: a câmera encosta e o boneco deixa de ser desenhado.
  jogador.pitch = CONFIG.camera.inclinacaoInicial;
  colisores.adicionar(0, 1.2, 8, 0.4);
  jogador.atualizarCamera(0);
  assert.ok(jogador.distCamera < CONFIG.camera.sumirBoneco && jogador.distCamera >= 0.35);
});

// ---- Câmera com peso (spec 10, CAM2) ----
const PESO = { seguirPlano: 6, seguirVertical: 3, atrasoMaxPlano: 0.6, atrasoMaxVertical: 0.4 };
/** Anda o alvo em linha reta por `segundos`, a `qps` quadros por segundo, e devolve o ponto que o persegue. */
function perseguir(qps, segundos, vel, limites = PESO) {
  const ponto = { x: 0, y: 0, z: 0 }, alvo = { x: 0, y: 0, z: 0 }, antes = { x: 0, y: 0, z: 0 };
  const quadros = Math.round(qps * segundos), dt = segundos / quadros;
  for (let i = 0; i < quadros; i++) {
    Object.assign(antes, alvo);
    alvo.x += vel.x * dt; alvo.y += vel.y * dt; alvo.z += vel.z * dt;
    seguirPonto(ponto, antes, alvo, dt, limites);
  }
  return { ponto, alvo };
}

test('o ponto de giro segue o caçador com atraso, mais lento na vertical, e encaixa na hora com dt 0', () => {
  // Alvo parado: o ponto chega nele, mais devagar na vertical.
  const ponto = { x: 0.5, y: 0.3, z: 0 }, alvo = { x: 0, y: 0, z: 0 };
  seguirPonto(ponto, alvo, alvo, 0.1, PESO);
  assert.ok(Math.abs(ponto.x - 0.5 * Math.exp(-0.6)) < 1e-12 && Math.abs(ponto.y - 0.3 * Math.exp(-0.3)) < 1e-12);
  assert.ok(ponto.x / 0.5 < ponto.y / 0.3, 'a vertical deveria ser mais lenta');
  for (let i = 0; i < 100; i++) seguirPonto(ponto, alvo, alvo, 0.05, PESO);
  assert.ok(Math.hypot(ponto.x, ponto.y, ponto.z) < 1e-6);
  // Andando a 2,9 m/s o ponto fica para trás velocidade / rapidez, sem passar do alvo.
  const andando = perseguir(60, 3, { x: 2.9, y: 0, z: 0 });
  assert.ok(Math.abs(andando.alvo.x - andando.ponto.x - 2.9 / 6) < 1e-3);
  // dt 0 (teletransporte, pausa): encaixa no alvo.
  const longe = { x: 40, y: 2, z: -30 };
  assert.deepEqual(seguirPonto({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, longe, 0, PESO), longe);
});

test('o ponto de giro respeita o atraso máximo no rolamento e na queda', () => {
  // Rolamento a 9,5 m/s na diagonal e queda rápida: sem limite o atraso seria 1,6 m e 3,3 m.
  const { ponto, alvo } = perseguir(60, 2, { x: 6.7, y: -10, z: 6.7 });
  assert.ok(Math.abs(Math.hypot(alvo.x - ponto.x, alvo.z - ponto.z) - PESO.atrasoMaxPlano) < 1e-9);
  assert.ok(Math.abs(ponto.y - alvo.y - PESO.atrasoMaxVertical) < 1e-9);
  // Um salto de posição de um quadro para o outro também fica dentro do limite.
  const salto = seguirPonto({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 30 }, 1 / 60, PESO);
  assert.ok(30 - salto.z <= PESO.atrasoMaxPlano + 1e-9 && 5 - salto.y <= PESO.atrasoMaxVertical + 1e-9);
});

test('o ponto de giro dá o mesmo resultado a 30 e a 144 quadros por segundo', () => {
  for (const vel of [{ x: 2.9, y: 0, z: 0 }, { x: -1.5, y: 0.6, z: 2 }, { x: 9.5, y: 0, z: 0 }]) {
    for (const segundos of [0.25, 1]) {
      const a = perseguir(30, segundos, vel), b = perseguir(144, segundos, vel);
      for (const eixo of ['x', 'y', 'z']) {
        assert.ok(Math.abs(a.ponto[eixo] - b.ponto[eixo]) < 1e-6, `${eixo} difere: ${a.ponto[eixo]} e ${b.ponto[eixo]}`);
      }
    }
  }
});

test('a câmera com peso: o caçador anda e a câmera vem atrás; teletransporte e parede não deixam atraso', () => {
  const { colisores, jogador } = arena();
  const camera = jogador.jogo.camera;
  jogador.atualizarCamera(0);
  const z0 = camera.position.z;
  // O caçador dá um passo de 0,3 m para a frente num quadro: a câmera anda menos que ele.
  jogador.pos.z -= 0.3;
  jogador.atualizarCamera(1 / 60);
  const andou = z0 - camera.position.z;
  assert.ok(andou > 0 && andou < 0.1, `a câmera andou ${andou}`);
  // Parado, ela alcança.
  for (let i = 0; i < 240; i++) jogador.atualizarCamera(1 / 60);
  assert.ok(Math.abs(z0 - 0.3 - camera.position.z) < 1e-3);
  // Renascer longe (lanterna, Osso de Retorno, começar a partida) encaixa a câmera na hora.
  jogador.reiniciar(30, -20, 0);
  jogador.atualizarCamera(1 / 60);
  assert.ok(Math.abs(camera.position.x - 30) < 1e-9 && Math.abs(jogador.pivo.z + 20) < 1e-9);
  // Atravessar um portal muda a posição e chama atualizarCamera(0, 0): também encaixa.
  jogador.pos.set(-12, 0, 7);
  jogador.atualizarCamera(0, 0);
  assert.deepEqual([jogador.pivo.x, jogador.pivo.z], [-12, 7]);
  // Parede entre o caçador e o ponto atrasado: o ponto encosta no lado do caçador.
  jogador.reiniciar(0, 0, 0);
  jogador.atualizarCamera(0);
  colisores.adicionar(0, -0.6, 8, 0.2);     // parede fina entre z -0,5 e -0,7
  jogador.pos.z = -1.2;                      // o caçador passa para o outro lado num quadro
  jogador.atualizarCamera(1 / 60);
  assert.ok(jogador.pivo.z < -0.7 - CONFIG.camera.folga + 1e-9, `giro ficou em ${jogador.pivo.z}`);
  // A rotação continua imediata: girar não depende do atraso.
  jogador.yaw = 1;
  jogador.atualizarCamera(1 / 60);
  assert.equal(camera.rotation.y, 1);
});

test('depois de encostar numa parede a câmera se afasta devagar, e encurta na hora', () => {
  const { colisores, jogador } = arena();
  jogador.atualizarCamera(0);
  const parede = colisores.adicionar(0, 2.5, 8, 1);
  jogador.atualizarCamera(1 / 60);
  const curta = jogador.distCamera;
  assert.ok(curta < 2, 'encurta no mesmo quadro');
  parede.ativa = false;
  jogador.atualizarCamera(0.1);
  const falta = CONFIG.camera.distancia - curta;
  assert.ok(Math.abs(jogador.distCamera - (curta + falta * (1 - Math.exp(-0.1 * CONFIG.camera.voltaDistancia)))) < 1e-9);
  assert.ok(CONFIG.camera.voltaDistancia < 6, 'mais lenta que antes da CAM2');
});

test('a primeira pessoa acompanha os olhos e usa o olhar para orientar o ataque sem trava', () => {
  const { jogador, colisores } = arena();
  const { camera, preferencias, entrada } = jogador.jogo;
  preferencias.perspectiva = 'primeira';
  jogador.pos.set(3, 0.4, -2);
  jogador.yaw = 0;
  jogador.rumo = Math.PI;
  jogador.entradaDir = Math.PI;
  colisores.adicionar(3, 0.5, 8, 1);
  jogador.atualizarCamera(0);
  assert.deepEqual(camera.position.toArray(), [3, jogador.pos.y + jogador.alturaOlhos, -2]);
  assert.equal(jogador.distCamera, 0);
  jogador.orientarParaGolpe();
  assert.equal(jogador.rumo, jogador.yaw);

  entrada.toque = true;
  jogador.atualizarCamera(0);
  assert.equal(jogador.primeiraPessoa, false);
  assert.ok(camera.position.z > jogador.pos.z && camera.position.z < 0);
  entrada.toque = false;
  preferencias.perspectiva = 'terceira';
  jogador.atualizarCamera(0);
  assert.ok(jogador.distCamera > 0);
});

test('em terceira pessoa a interação vale para o objeto próximo e à frente do corpo ou da câmera', () => {
  const col = new Colisores();
  const objeto = { x: 0, y: 0.5, z: -1.8 };
  const jogador = { pos: new THREE.Vector3(), alturaOlhos: 1.7, rumo: 0, yaw: 0 };
  assert.equal(alvoProximo([objeto], jogador, col), objeto);
  jogador.rumo = Math.PI;
  assert.equal(alvoProximo([objeto], jogador, col), objeto);   // a câmera ainda aponta para ele
  jogador.yaw = Math.PI;
  assert.equal(alvoProximo([objeto], jogador, col), null);
  jogador.rumo = 0;
  col.adicionar(0, -1, 4, 0.3);
  assert.equal(alvoProximo([objeto], jogador, col), null);
});

// ---------------------------------------------------------------------------
//  Base dos ataques: fases, tipos e a regra de ouro
// ---------------------------------------------------------------------------
test('todo golpe passa por preparo, ativo e recuperação, e a sequência emenda o próximo', () => {
  const cfg = CONFIG.inimigos.cacador;
  const m = new MaquinaDeAtaque();
  m.iniciar(cfg, ['alto', 'rasteira']);
  const fases = [];
  for (let i = 0; i < 400 && m.ativa; i++) {
    const mudou = m.atualizar(0.01);
    if (mudou) fases.push(mudou === 'preparo' ? `preparo:${m.golpe.tipo}` : mudou);
  }
  assert.deepEqual(fases, ['ativo', 'recuperacao', 'preparo:rasteira', 'ativo', 'recuperacao', 'fim']);
  assert.equal(m.golpe, null);
});

test('cada tipo de ataque tem números próprios e todo inimigo só usa tipos conhecidos', () => {
  const cav = CONFIG.inimigos.cavaleiro, meio = () => 0.5;   // sorteio no meio = sem variação
  const alto = montarGolpe(cav, 'alto', meio), pesado = montarGolpe(cav, 'pesado', meio), rasteira = montarGolpe(cav, 'rasteira', meio);
  assert.deepEqual([alto.dano, alto.preparo, alto.alcance], [cav.dano, cav.preparo, cav.alcance]);
  assert.ok(pesado.dano > alto.dano && pesado.preparo > alto.preparo && pesado.janelaAparar < 1 && pesado.abreExecucao);
  assert.ok(!rasteira.aparavel && !rasteira.bloqueavel && rasteira.evitaPulando);
  // A rasteira é larga: pega quem está de lado, onde o golpe alto passa direto.
  assert.equal(golpeAlcanca(alto, 2, 0), false);
  assert.equal(golpeAlcanca(rasteira, 2, 0), true);
  assert.equal(golpeAlcanca(rasteira, rasteira.alcance + 1, 1), false);
  // O aviso mínimo vale até para o inimigo mais rápido.
  assert.ok(montarGolpe(CONFIG.inimigos.cacador, 'rasteira').preparo >= CONFIG.combate.ataquesInimigos.rasteira.preparoMin);
  const avisos = Object.values(CONFIG.combate.ataquesInimigos).map((t) => t.aviso);
  assert.equal(new Set(avisos).size, avisos.length);
  for (const inimigo of Object.values(CONFIG.inimigos)) {
    for (const lista of [inimigo.ataques, inimigo.faseFinal?.ataques ?? []]) {
      for (const sequencia of lista) for (const g of sequencia.golpes) montarGolpe(inimigo, g);
    }
    assert.ok(inimigo.ataques.length > 0);
  }
});

test('o sorteio respeita os pesos e não repete a sequência especial', () => {
  const lista = CONFIG.inimigos.cavaleiro.ataques;
  assert.equal(sortearSequencia(lista, null, () => 0), lista[0]);
  assert.equal(sortearSequencia(lista, null, () => 0.999), lista.at(-1));
  assert.notEqual(sortearSequencia(lista, lista.at(-1), () => 0.999), lista.at(-1));
  assert.equal(sortearSequencia(lista, lista[0], () => 0), lista[0]);
});

test('imprevisibilidade: o aviso varia de -12% a +12% conforme o sorteio, sem passar do preparoMin', () => {
  const v = CONFIG.combate.imprevisibilidade.variacaoPreparo;
  assert.equal(v, 0.12);
  const cav = CONFIG.inimigos.cavaleiro;
  const perto = (a, b) => Math.abs(a - b) < 1e-9;
  for (const [sorteio, fator] of [[0, 1 - v], [0.5, 1], [1, 1 + v]]) {
    const g = montarGolpe(cav, 'alto', () => sorteio);
    assert.ok(perto(g.preparo, cav.preparo * fator), `sorteio ${sorteio}`);
    assert.equal(g.atraso, 0);
  }
  // O caçador é rápido: a rasteira dele cai no mínimo mesmo com o sorteio mais curto.
  const t = CONFIG.combate.ataquesInimigos;
  for (const inimigo of Object.values(CONFIG.inimigos)) {
    for (const tipo of Object.keys(t)) {
      assert.ok(montarGolpe(inimigo, tipo, () => 0).preparo >= t[tipo].preparoMin, tipo);
    }
  }
  assert.equal(montarGolpe(CONFIG.inimigos.cacador, 'rasteira', () => 0).preparo, t.rasteira.preparoMin);
  // Critério de aceite: nenhum golpe tem sempre o mesmo aviso (no mínimo a variação aparece em algum inimigo).
  for (const tipo of Object.keys(t)) {
    const tempos = new Set(Object.values(CONFIG.inimigos).flatMap((i) => [0, 1].map((s) => montarGolpe(i, tipo, () => s).preparo)));
    assert.ok(tempos.size > Object.keys(CONFIG.inimigos).length, tipo);
  }
});

test('golpe atrasado: segura a pose e só fica ativo depois de preparo + atraso; a janela do tiro acompanha', () => {
  const cav = CONFIG.inimigos.cavaleiro, P = CONFIG.combate.pistola, meio = () => 0.5;
  const normal = montarGolpe(cav, 'pesado', meio);
  const atrasado = montarGolpe(cav, { tipo: 'pesado', atraso: 0.35 }, meio);
  assert.ok(Math.abs(atrasado.preparo - (normal.preparo + 0.35)) < 1e-9);
  assert.equal(atrasado.subida, normal.preparo);
  const m = new MaquinaDeAtaque();
  m.iniciar(cav, [{ tipo: 'pesado', atraso: 0.35 }], meio);
  // No fim do aviso normal ele ainda está segurando: nada de golpe nem de janela.
  m.atualizar(normal.preparo + 0.01);
  assert.equal(m.fase, 'preparo');
  assert.equal(m.naJanelaDeAparo(P), false);
  // A janela do tiro fica no fim do aviso inteiro (preparo + atraso).
  m.t = atrasado.preparo - P.janelaNoAviso * atrasado.janelaAparar * 0.5;
  assert.equal(m.naJanelaDeAparo(P), true);
  assert.equal(m.atualizar(atrasado.preparo - m.t - 0.001), null);
  assert.equal(m.atualizar(0.002), 'ativo');
  // Na sequência, o adiantamento da emenda nunca come o atraso.
  m.iniciar(cav, ['alto', { tipo: 'alto', atraso: 0.35 }], meio);
  while (m.indice === 0 && m.ativa) m.atualizar(0.01);
  assert.ok(m.golpe.preparo - m.t >= 0.35);
});

test('golpe atrasado no inimigo: a pose trava no fim da subida e o aviso sonoro toca no começo', () => {
  const { eventos, inimigo } = duelo('penitente');
  const avisos = [];
  eventos.em('inimigo:preparo', () => avisos.push(inimigo.ataque.t));
  inimigo.sorteio = () => 0.5;
  inimigo.mudar('perseguir');
  inimigo.atacar([{ tipo: 'alto', atraso: 0.35 }]);
  assert.deepEqual(avisos, [0]);
  const g = inimigo.golpe;
  // A arma chega ao alto no tempo da subida (como num golpe sem atraso) e fica lá.
  while (inimigo.ataque.t < g.subida) inimigo.atualizar(0.02);
  const braco = inimigo.bracoD.rotation.x;
  while (inimigo.ataque.t < g.subida + 0.3) inimigo.atualizar(0.02);
  assert.equal(inimigo.estado, 'preparo');
  assert.ok(braco < -2.5, `braço em ${braco}`);
  assert.ok(Math.abs(inimigo.bracoD.rotation.x - braco) < 0.15);
  while (inimigo.estado === 'preparo') inimigo.atualizar(0.02);
  assert.equal(inimigo.estado, 'ativo');
  assert.ok(inimigo.tEstado >= 0 && avisos.length === 1);
});

test('nenhuma sequência sai três vezes seguidas', () => {
  for (const inimigo of Object.values(CONFIG.inimigos)) {
    for (const lista of [inimigo.ataques, inimigo.faseFinal?.ataques ?? []]) {
      if (lista.length < 2) continue;
      // sorteio forçado: sempre a primeira (a mais comum) ...
      assert.notEqual(sortearSequencia(lista, lista[0], () => 0, lista[0]), lista[0]);
      // ... e em uma luta longa nunca aparecem três iguais seguidas
      let a = null, b = null, semente = 7;
      const sorteio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 500; i++) {
        const s = sortearSequencia(lista, a, sorteio, b);
        assert.ok(!(s === a && a === b));
        b = a; a = s;
      }
    }
  }
  // No inimigo de verdade: com o sorteio preso no zero, a terceira sequência muda.
  const { inimigo } = duelo('cavaleiro');
  inimigo.sorteio = () => 0;
  const saidas = [];
  for (let i = 0; i < 3; i++) { inimigo.atacar(); saidas.push(inimigo.ultimaSequencia); inimigo.ataque.encerrar(); }
  assert.equal(saidas[0], saidas[1]);
  assert.notEqual(saidas[2], saidas[0]);
});

test('regra de ouro: a rasteira pede pulo; o tiro não a apara, gasta bala e avisa', () => {
  const { jogador, eventos, inimigo, rodar } = duelo();
  const erros = [];
  eventos.em('jogador:resposta-errada', (e) => erros.push([e.resposta, e.tipo]));
  let pulos = 0;
  eventos.em('jogador:pulou-golpe', () => pulos++);
  inimigo.mudar('perseguir');
  inimigo.atacar(['rasteira']);
  const rasteira = inimigo.golpe;
  inimigo.ataque.t = rasteira.preparo - 0.03;   // onde um golpe alto seria aparado
  assert.deepEqual(jogador.atirar(), { acertou: true, aparou: false });
  assert.equal(jogador.balas, CONFIG.combate.pistola.balasMax - 1);
  assert.notEqual(inimigo.estado, 'desequilibrado');
  assert.deepEqual(erros, [['aparar', 'rasteira']]);
  rodar(() => inimigo.estado === 'recuperacao');
  assert.equal(jogador.vida, 100 - rasteira.dano);

  // No ar, acima da lâmina: nenhum dano. Pular continua valendo.
  jogador.vida = 100; jogador.noChao = false; jogador.pos.y = 0.5;
  assert.equal(jogador.receberDano(rasteira.dano, inimigo.pos, inimigo, rasteira), 'pulou');
  assert.deepEqual([jogador.vida, pulos], [100, 1]);
  // Um golpe alto acerta quem está no ar do mesmo jeito.
  assert.equal(jogador.receberDano(10, inimigo.pos, inimigo, montarGolpe(CONFIG.inimigos.cavaleiro, 'alto')), 'ferido');
});

test('golpe inaparável: aviso branco-violeta, o tiro não apara, gasta bala e avisa; a esquiva evita', () => {
  const { jogador, eventos, inimigo, rodar, entrada } = duelo('guardiao');
  const P = CONFIG.combate.pistola, cor = CONFIG.combate.avisosInimigos.inaparavel;
  // a cor é própria: não é a do pesado nem a da rasteira
  assert.ok(!Object.values(CONFIG.combate.ataquesInimigos).some((t) => t.aviso === cor));
  const erros = [];
  eventos.em('jogador:resposta-errada', (e) => erros.push([e.resposta, e.tipo, e.aviso]));
  const pesadoInaparavel = { tipo: 'pesado', aparavel: false, aviso: 'inaparavel' };
  const g = montarGolpe(CONFIG.inimigos.guardiao, pesadoInaparavel);
  // sobrescreve só o que pediu: o resto continua sendo do pesado
  assert.deepEqual([g.tipo, g.aparavel, g.aviso, g.nomeAviso, g.aguentaLeve], ['pesado', false, cor, 'inaparavel', true]);

  inimigo.mudar('perseguir');
  inimigo.atacar([pesadoInaparavel]);
  inimigo.atualizar(0.2);
  assert.deepEqual([inimigo.olho.color.getHex(), inimigo.aco.emissive.getHex() > 0], [cor, true]);
  // Tiro onde o pesado comum seria aparado: não desequilibra, só arranha e avisa (sem texto).
  inimigo.ataque.t = inimigo.golpe.preparo - P.janelaNoAviso * inimigo.golpe.janelaAparar * 0.5;
  assert.deepEqual(jogador.atirar(), { acertou: true, aparou: false });
  assert.equal(jogador.balas, P.balasMax - 1);
  assert.deepEqual([inimigo.estado, inimigo.vida], ['preparo', CONFIG.inimigos.guardiao.vida - P.dano]);
  assert.deepEqual(erros, [['aparar', 'pesado', 'inaparavel']]);
  rodar(() => inimigo.estado === 'recuperacao');
  assert.equal(jogador.vida, 100 - inimigo.golpe.dano);

  // A esquiva no fim do aviso evita o golpe.
  jogador.reiniciar(0, 0, 0);
  inimigo.mudar('perseguir');
  inimigo.atacar([pesadoInaparavel]);
  rodar(() => inimigo.ataque.t + 0.05 >= inimigo.golpe.preparo);
  entrada.apertou = (codigo) => codigo === 'KeyQ';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  assert.ok(jogador.invencivel > 0);
  rodar(() => inimigo.estado === 'recuperacao');
  assert.equal(jogador.vida, 100);
});

test('fase final do Guardião: sequências da lista nova, metade do peso inaparável e desequilíbrio de 0,9 s', () => {
  const { inimigo } = duelo('guardiao');
  const F = CONFIG.inimigos.guardiao.faseFinal;
  const inaparavel = (s) => s.golpes.some((e) => montarGolpe(CONFIG.inimigos.guardiao, e).nomeAviso === 'inaparavel');
  const total = F.ataques.reduce((soma, s) => soma + s.peso, 0);
  const semParry = F.ataques.filter(inaparavel).reduce((soma, s) => soma + s.peso, 0);
  assert.ok(semParry >= total / 2, `${semParry} de ${total}`);
  assert.ok(F.ataques.every((s) => s.golpes.length <= 3));
  assert.equal(F.desequilibrio, 0.9);

  inimigo.receberDano(CONFIG.inimigos.guardiao.vida / 2 + 1, { x: 0, z: -1 }, 0, true);
  assert.equal(inimigo.emFaseFinal, true);
  let semente = 11;
  inimigo.sorteio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
  const vistas = new Set();
  for (let i = 0; i < 200; i++) {
    inimigo.mudar('perseguir');
    inimigo.atacar();
    assert.ok(F.ataques.includes(inimigo.ultimaSequencia));
    vistas.add(inimigo.ultimaSequencia);
  }
  assert.equal(vistas.size, F.ataques.length);

  // Aparado na fase final, ele se recompõe em 0,9 s.
  inimigo.mudar('perseguir');
  inimigo.serAparado();
  let t = 0;
  while (inimigo.estado === 'desequilibrado' && t < 3) { inimigo.atualizar(0.02); t += 0.02; }
  assert.ok(Math.abs(t - 0.9) < 0.05, `durou ${t}`);
});

test('virada de fase: rugido, 1 s de invencibilidade e um passo para trás', () => {
  const { eventos, inimigo, rodar } = duelo('guardiao');
  const V = CONFIG.inimigos.guardiao.faseFinal.virada;
  assert.equal(V.invencivel, 1);
  let rugidos = 0;
  eventos.em('guardiao:fase-final', () => rugidos++);
  inimigo.mudar('perseguir');
  inimigo.atacar(['alto']);
  const zAntes = inimigo.pos.z;
  inimigo.receberDano(CONFIG.inimigos.guardiao.vida / 2 + 1, { x: 0, z: -1 }, 0, true);
  const vida = inimigo.vida;
  assert.deepEqual([rugidos, inimigo.estado, inimigo.golpe, inimigo.emFaseFinal], [1, 'virada', null, true]);
  // Invencível: golpe, tiro e visceral não tiram vida.
  inimigo.receberDano(50, { x: 0, z: -1 }, 0, true);
  inimigo.levarTiro(6);
  inimigo.receberVisceral(80, { x: 0, z: -1 });
  assert.deepEqual([inimigo.vida, inimigo.estado], [vida, 'virada']);
  rodar(() => false, 45);   // 0,9 s
  assert.deepEqual([inimigo.vida, inimigo.estado], [vida, 'virada']);
  assert.ok(zAntes - inimigo.pos.z > V.passo * 0.8, `andou ${zAntes - inimigo.pos.z}`);   // se afastou do jogador (em z = 0)
  inimigo.receberDano(10, { x: 0, z: -1 }, 0, false);
  assert.equal(inimigo.vida, vida);
  rodar(() => false, 10);   // passou de 1 s
  assert.notEqual(inimigo.estado, 'virada');
  inimigo.receberDano(10, { x: 0, z: -1 }, 0, false);
  assert.equal(inimigo.vida, vida - 10);
  assert.equal(rugidos, 1);
});

test('regra de ouro: a janela do parry do pesado é menor que a do alto', () => {
  const { jogador, inimigo } = duelo();
  const P = CONFIG.combate.pistola;
  const atirarFaltando = (tipo, falta) => {
    jogador.reiniciar(0, 0, 0);
    inimigo.reiniciar(); inimigo.angulo = 0;
    inimigo.mudar('perseguir');
    inimigo.atacar([tipo]);
    inimigo.ataque.t = inimigo.golpe.preparo - falta;
    return jogador.atirar();
  };
  // Um instante que vale para o alto e não para o pesado.
  const falta = P.janelaNoAviso * 0.8;
  assert.ok(falta > P.janelaNoAviso * CONFIG.combate.ataquesInimigos.pesado.janelaAparar);
  assert.deepEqual(atirarFaltando('alto', falta), { acertou: true, aparou: true });
  assert.deepEqual(atirarFaltando('pesado', falta), { acertou: true, aparou: false });
  // Mais perto do golpe, o pesado também é aparado.
  assert.deepEqual(atirarFaltando('pesado', P.janelaNoAviso * 0.3), { acertou: true, aparou: true });
});

// Tela de mentira: fora do navegador, as texturas do inimigo só precisam existir.
function semNavegador() {
  globalThis.document ??= { createElement: () => ({
    getContext: () => ({ createImageData: (l, a) => ({ data: new Uint8ClampedArray(l * a * 4) }), putImageData() {} }),
  }) };
}

function duelo(tipo = 'cavaleiro') {
  semNavegador();
  const a = arena();
  const jogo = a.jogador.jogo;
  jogo.jogador = a.jogador;
  jogo.inimigos.length = 0;
  const mundo = {
    grupo: new THREE.Group(), colisores: a.colisores, entidades: [],
    navegacao: new Navegacao(a.colisores, { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }),
  };
  const inimigo = new Inimigo(jogo, mundo, { tipo, rota: [[0, -2]] });
  mundo.entidades.push(inimigo);
  jogo.inimigos.push(inimigo);
  inimigo.angulo = 0;   // virado para o jogador, que está em z = 0
  const rodar = (ate, limite = 400) => { for (let i = 0; i < limite && !ate(); i++) inimigo.atualizar(0.02); };
  return { ...a, inimigo, rodar };
}

test('todos os inimigos usam a mesma máquina: avisam o tipo, acertam na fase ativa e voltam a perseguir', () => {
  for (const tipo of Object.keys(CONFIG.inimigos)) {
    const { jogador, eventos, inimigo, rodar } = duelo(tipo);
    const avisos = [];
    eventos.em('inimigo:preparo', (i) => avisos.push(i.golpe.tipo));
    inimigo.pos.z = -CONFIG.inimigos[tipo].alcance * 0.7;
    inimigo.mudar('perseguir');
    inimigo.sorteio = () => 0;
    inimigo.atualizar(0.02);
    assert.equal(inimigo.estado, 'preparo', tipo);
    const esperados = CONFIG.inimigos[tipo].ataques[0].golpes;
    rodar(() => inimigo.estado === 'ativo');
    assert.equal(jogador.vida, 100 - inimigo.golpe.dano, tipo);
    rodar(() => !['preparo', 'ativo', 'recuperacao'].includes(inimigo.estado));
    assert.deepEqual(avisos, esperados, tipo);
    assert.ok(['perseguir', 'recuar'].includes(inimigo.estado), tipo);
    assert.equal(inimigo.golpe, null);
  }
});

test('o aviso visual muda com o tipo e o golpe é resolvido uma única vez', () => {
  const { jogador, inimigo, rodar } = duelo();
  const cores = {};
  for (const tipo of ['alto', 'pesado', 'rasteira']) {
    inimigo.mudar('perseguir');
    inimigo.atacar([tipo]);
    inimigo.atualizar(0.2);
    cores[tipo] = { olho: inimigo.olho.color.getHex(), arma: inimigo.aco.emissive.getHex() > 0, agachado: inimigo.corpo.position.y < -0.05 };
  }
  assert.deepEqual(cores.alto, { olho: CONFIG.paleta.magia, arma: false, agachado: false });
  assert.deepEqual(cores.pesado, { olho: CONFIG.combate.ataquesInimigos.pesado.aviso, arma: true, agachado: false });
  assert.deepEqual(cores.rasteira, { olho: CONFIG.combate.ataquesInimigos.rasteira.aviso, arma: true, agachado: true });

  // Esquivar no começo da fase ativa resolve o golpe: ele não acerta depois.
  inimigo.mudar('perseguir');
  inimigo.atacar(['pesado']);
  rodar(() => inimigo.ataque.t + 0.02 >= inimigo.golpe.preparo);
  jogador.invencivel = 0.03;
  rodar(() => inimigo.estado === 'ativo');
  jogador.invencivel = 0;
  rodar(() => inimigo.estado === 'recuperacao');
  assert.equal(jogador.vida, 100);
  rodar(() => inimigo.estado === 'perseguir' || inimigo.estado === 'preparo');
  assert.equal(inimigo.olho.color.getHex(), CONFIG.paleta.magia);
});

test('tiro na janela desequilibra sem dano; antes e depois só arranha e o golpe entra', () => {
  const { jogador, eventos, inimigo, rodar } = duelo();
  const P = CONFIG.combate.pistola;
  let aparos = 0;
  eventos.em('jogador:aparou', () => aparos++);
  const preparar = (tipo) => {
    jogador.reiniciar(0, 0, 0);
    inimigo.reiniciar(); inimigo.angulo = 0;
    inimigo.mudar('perseguir');
    inimigo.atacar([tipo]);
    return inimigo.golpe;
  };

  // Na janela: o inimigo fica desequilibrado, não perde vida e o golpe não entra.
  let g = preparar('alto');
  inimigo.ataque.t = g.preparo - P.janelaNoAviso * 0.5;
  assert.deepEqual(jogador.atirar(), { acertou: true, aparou: true });
  assert.deepEqual([inimigo.estado, inimigo.abertoParaExecucao, inimigo.vida, aparos], ['desequilibrado', false, inimigo.cfg.vida, 1]);
  assert.ok(jogador.invencivel > 0);
  for (let i = 0; i < 30; i++) { jogador.atualizar(0.02); inimigo.atualizar(0.02); }
  assert.deepEqual([jogador.vida, inimigo.estado], [100, 'desequilibrado']);
  // O golpe seguinte é crítico.
  assert.equal(inimigo.receberDano(10, { x: 0, z: -1 }, 0, false), 'critico');
  assert.equal(inimigo.vida, inimigo.cfg.vida - 10 * CONFIG.combate.critico.multiplicador);

  // Cedo demais: só arranha, ele não cambaleia e o golpe entra.
  g = preparar('alto');
  inimigo.ataque.t = g.preparo - P.janelaNoAviso - 0.1;
  assert.deepEqual(jogador.atirar(), { acertou: true, aparou: false });
  assert.deepEqual([inimigo.vida, inimigo.estado], [inimigo.cfg.vida - P.dano, 'preparo']);
  rodar(() => inimigo.estado === 'recuperacao');
  assert.equal(jogador.vida, 100 - g.dano);

  // Tarde demais (passou o começo do golpe): o golpe entra do mesmo jeito.
  g = preparar('alto');
  inimigo.ataque.irPara('ativo'); inimigo.estado = 'ativo';
  inimigo.ataque.t = P.janelaNoGolpe + 0.01;
  assert.deepEqual(jogador.atirar(), { acertou: true, aparou: false });
  rodar(() => inimigo.estado === 'recuperacao');
  assert.equal(jogador.vida, 100 - g.dano);

  // O pesado aparado liga o gancho da execução, que some com o desequilíbrio.
  g = preparar('pesado');
  inimigo.ataque.t = g.preparo - P.janelaNoAviso * g.janelaAparar * 0.5;
  assert.deepEqual(jogador.atirar(), { acertou: true, aparou: true });
  assert.deepEqual([inimigo.estado, inimigo.abertoParaExecucao, jogador.vida], ['desequilibrado', true, 100]);
  rodar(() => inimigo.estado !== 'desequilibrado');
  assert.equal(inimigo.abertoParaExecucao, false);
});

test('o tiro fora da janela não faz cambalear, não gasta o desequilíbrio e acorda quem patrulha', () => {
  const { jogador, inimigo } = duelo();
  const P = CONFIG.combate.pistola;
  const vida = inimigo.cfg.vida;
  assert.equal(inimigo.estado, 'patrulha');
  jogador.atirar();
  assert.deepEqual([inimigo.estado, inimigo.vida], ['perseguir', vida - P.dano]);
  // Desequilibrado: o tiro não é crítico e o desequilíbrio continua.
  inimigo.serAparado();
  jogador.acao = 'livre';
  jogador.atirar();
  assert.deepEqual([inimigo.estado, inimigo.vida], ['desequilibrado', vida - 2 * P.dano]);
  assert.equal(inimigo.receberDano(10, { x: 0, z: -1 }, 0, false), 'critico');
});

// -----------------------------------------------------------------------------
//  Etapa A: contra o spam
// -----------------------------------------------------------------------------

test('apanhar interrompe o ataque leve; a parte final do forte aguenta um golpe fraco', () => {
  const { jogador, eventos, alvo } = arena();
  const I = CONFIG.combate.interrupcao;
  const fraco = I.armaduraForte.danoMax, pesado = fraco + 10;
  const interrompidos = [];
  eventos.em('jogador:interrompido', (d) => interrompidos.push(d.cura));

  // Leve: qualquer golpe corta o ataque, e a lâmina não chega a acertar.
  jogador.iniciarAtaque('leve');
  jogador.atualizar(0.03);
  assert.equal(jogador.receberDano(fraco, alvo.pos, alvo), 'ferido');
  assert.deepEqual([jogador.acao, jogador.ataque], ['atordoado', null]);
  for (let i = 0; i < 10; i++) jogador.atualizar(0.02);
  assert.equal(alvo.vida, 100, 'trocar golpe não compensa: o leve interrompido não acerta');
  jogador.atualizar(I.cambaleio);
  assert.equal(jogador.acao, 'livre');

  // Forte no começo do preparo: é interrompido.
  jogador.reiniciar(0, 0, 0);
  jogador.iniciarAtaque('forte');
  jogador.atualizar(CONFIG.combate.forte.preparo * 0.2);
  jogador.receberDano(fraco, alvo.pos, alvo);
  assert.equal(jogador.acao, 'atordoado');

  // Forte na parte final: aguenta o golpe fraco (leva o dano, mas o golpe sai)...
  jogador.reiniciar(0, 0, 0);
  jogador.iniciarAtaque('forte');
  jogador.atualizar(CONFIG.combate.forte.preparo * 0.8);
  jogador.receberDano(fraco, alvo.pos, alvo);
  assert.deepEqual([jogador.acao, jogador.ataque, jogador.vida], ['preparo', 'forte', 100 - fraco]);
  for (let i = 0; i < 12; i++) jogador.atualizar(0.02);
  assert.equal(alvo.vida, 100 - CONFIG.combate.forte.dano);

  // ...mas não aguenta um golpe forte do inimigo.
  jogador.reiniciar(0, 0, 0);
  jogador.iniciarAtaque('forte');
  jogador.atualizar(CONFIG.combate.forte.preparo * 0.8);
  jogador.receberDano(pesado, alvo.pos, alvo);
  assert.equal(jogador.acao, 'atordoado');
  assert.deepEqual(interrompidos, [false, false, false]);
});

test('firmeza: o caçador corrompido não pode ser travado até morrer e revida no meio do spam', () => {
  const AT = CONFIG.combate.atordoamentoInimigo;
  const cfg = CONFIG.inimigos.cacador;

  // Direto na regra: o segundo golpe não reinicia o cambaleio e quase não empurra.
  {
    const { inimigo, eventos } = duelo('cacador');
    let aguentou = 0;
    eventos.em('inimigo:aguentou', () => aguentou++);
    inimigo.mudar('perseguir');
    inimigo.receberDano(10, { x: 0, z: -1 }, 2.5, false);
    assert.equal(inimigo.estado, 'atordoado');
    const empurraoCheio = inimigo.empurrao.length();
    inimigo.atualizar(0.1);
    inimigo.receberDano(10, { x: 0, z: -1 }, 2.5, false);
    assert.ok(inimigo.tEstado > 0.05, 'o cambaleio não recomeça');
    assert.equal(aguentou, 1);
    assert.ok(inimigo.empurrao.length() < empurraoCheio * 0.3, 'sem cambalear ele quase não recua');
    // Um golpe crítico (inimigo aparado) passa por cima do fôlego.
    inimigo.mudar('desequilibrado');
    inimigo.receberDano(1, { x: 0, z: -1 }, 0, false);
    assert.equal(inimigo.estado, 'atordoado');
    // Passado o fôlego, ele volta a cambalear.
    inimigo.jogo.jogador.morto = true;   // isola a regra do combate
    for (let t = 0; t < (cfg.atordoamento ?? AT.duracao) + (cfg.folego ?? AT.folego) + 0.1; t += 0.05) inimigo.atualizar(0.05);
    inimigo.receberDano(10, { x: 0, z: -1 }, 2.5, false);
    assert.equal(inimigo.estado, 'atordoado');
  }

  // Na prática: o jogador só aperta o ataque leve sem parar, colado no inimigo.
  const { jogador, entrada, inimigo } = duelo('cacador');
  inimigo.pos.z = -1.6;
  inimigo.mudar('perseguir');
  let cambaleios = 0, anterior = inimigo.estado, feridoEm = null, mortoEm = null;
  for (let i = 0; i < 400 && !jogador.morto; i++) {
    entrada.botoesApertados[0] = i % 4 === 0;   // aperta e solta o tempo todo
    jogador.atualizar(0.02);
    inimigo.atualizar(0.02);
    if (inimigo.estado === 'atordoado' && anterior !== 'atordoado') cambaleios++;
    anterior = inimigo.estado;
    if (feridoEm === null && jogador.vida < 100) feridoEm = i * 0.02;
    if (inimigo.morto) { mortoEm = i * 0.02; break; }
  }
  assert.notEqual(feridoEm, null, 'o caçador corrompido precisa conseguir revidar');
  assert.ok(mortoEm === null || feridoEm < mortoEm, 'ele acerta o jogador antes de cair');
  assert.ok(cambaleios <= 1 + Math.floor((mortoEm ?? 8) / ((cfg.atordoamento ?? AT.duracao) + (cfg.folego ?? AT.folego))),
    `cambaleou ${cambaleios} vezes`);
});

test('rally: parte do dano fica recuperável por um tempo e cada acerto devolve vida', () => {
  const { jogador, eventos, alvo } = arena();
  const R = CONFIG.combate.rally;
  const curas = [];
  eventos.em('jogador:rally', (d) => curas.push(d.cura));

  jogador.receberDano(40, alvo.pos, alvo);
  assert.equal(jogador.vida, 60);
  assert.equal(jogador.recuperavel, 40 * R.parte);

  // Um golpe leve acertado devolve vida, descontando da parte recuperável.
  jogador.iniciarAtaque('leve');
  for (let i = 0; i < 10; i++) jogador.atualizar(0.02);
  const devolvido = Math.min(40 * R.parte, CONFIG.combate.leve.dano * R.porDano);
  assert.equal(jogador.vida, 60 + devolvido);
  assert.equal(jogador.recuperavel, 40 * R.parte - devolvido);
  assert.deepEqual(curas, [devolvido]);

  // Passado o tempo, o que sobrou some e bater não devolve mais nada.
  for (let t = 0; t < R.duracao + 1.5; t += 0.05) jogador.atualizar(0.05);
  assert.equal(jogador.recuperavel, 0);
  const vida = jogador.vida;
  jogador.iniciarAtaque('leve');
  for (let i = 0; i < 10; i++) jogador.atualizar(0.02);
  assert.equal(jogador.vida, vida);

  // A vida nunca passa do máximo; a morte zera.
  jogador.reiniciar(0, 0, 0);
  jogador.receberDano(4, alvo.pos, alvo);
  assert.equal(jogador.recuperarComGolpe(999), 4 * R.parte);
  assert.ok(jogador.vida <= CONFIG.jogador.vidaMax);
  jogador.receberDano(1000, alvo.pos, alvo);
  assert.deepEqual([jogador.morto, jogador.recuperavel], [true, 0]);
});

test('frasco: a cura leva tempo, o caçador anda devagar e apanhar interrompe', () => {
  const { jogador, entrada, eventos, alvo } = arena();
  const F = CONFIG.combate.frasco;
  const avisos = [];
  eventos.em('jogador:curou', () => avisos.push('curou'));
  eventos.em('jogador:interrompido', (d) => avisos.push(d.cura ? 'cura interrompida' : 'interrompido'));

  // Sem apanhar: a cura só sai no fim do gole.
  jogador.comecarCura();
  jogador.atualizar(F.tempo * 0.5);
  assert.deepEqual([jogador.acao, avisos.length], ['curando', 0]);
  jogador.atualizar(F.tempo * 0.6);
  assert.deepEqual([jogador.acao, avisos], ['livre', ['curou']]);

  // Bebendo ele anda devagar e não ataca.
  jogador.comecarCura();
  entrada.segurando = (codigo) => codigo === 'KeyW';
  entrada.botoesApertados[0] = true;
  for (let i = 0; i < 10; i++) { jogador.atualizar(0.02); entrada.botoesApertados[0] = false; }
  entrada.segurando = () => false;
  assert.equal(jogador.ataque, null);
  assert.ok(Math.hypot(jogador.vel.x, jogador.vel.z) <= CONFIG.jogador.velAndar * F.velocidade + 1e-6);

  // Apanhou no meio do gole: a cura não acontece.
  jogador.reiniciar(0, 0, 0);
  jogador.comecarCura();
  jogador.atualizar(F.tempo * 0.5);
  jogador.receberDano(10, alvo.pos, alvo);
  assert.equal(jogador.acao, 'atordoado');
  for (let i = 0; i < 40; i++) jogador.atualizar(0.05);
  assert.deepEqual(avisos, ['curou', 'cura interrompida']);
});

// -----------------------------------------------------------------------------
//  Etapa B, PR B2: visceral, execução e ataque forte carregado
// -----------------------------------------------------------------------------

/** Roda o caçador e o inimigo juntos por "segundos". */
function rodarJuntos(jogador, inimigo, segundos) {
  for (let t = 0; t < segundos; t += 0.02) { jogador.atualizar(0.02); inimigo.atualizar(0.02); }
}

test('visceral: atacar de frente o inimigo desequilibrado dá 3,5× o leve, com invencibilidade e rally cheio', () => {
  const { jogador, eventos, inimigo } = duelo();
  const V = CONFIG.combate.visceral;
  const viscerais = [];
  eventos.em('golpe:visceral', (d) => viscerais.push(d.execucao));
  inimigo.mudar('perseguir');
  jogador.receberDano(40, inimigo.pos, inimigo);   // deixa vida recuperável (rally)
  jogador.acao = 'livre';
  const recuperavel = jogador.recuperavel;
  assert.ok(recuperavel > 0);
  inimigo.serAparado(null);
  const estamina = jogador.estamina;

  jogador.iniciarAtaque('leve');
  assert.equal(jogador.acao, 'visceral');
  assert.equal(jogador.estamina, estamina);           // não gasta estamina
  assert.ok(jogador.invencivel >= V.duracao - 1e-9);
  assert.equal(jogador.receberDano(30, inimigo.pos, inimigo), 'esquivou');

  // Preso no desequilíbrio até a lâmina entrar, mesmo passando do tempo normal.
  inimigo.tEstado = 99;
  rodarJuntos(jogador, inimigo, V.momento - 0.05);
  assert.deepEqual([inimigo.estado, inimigo.vida], ['desequilibrado', inimigo.cfg.vida]);

  rodarJuntos(jogador, inimigo, 0.1);
  assert.ok(Math.abs(inimigo.vida - (inimigo.cfg.vida - CONFIG.combate.leve.dano * V.multiplicador)) < 1e-9);
  assert.equal(inimigo.estado, 'atordoado');
  assert.deepEqual(viscerais, [false]);
  assert.deepEqual([jogador.vida, jogador.recuperavel], [60 + recuperavel, 0]);   // rally cheio

  rodarJuntos(jogador, inimigo, V.duracao);
  assert.equal(jogador.acao, 'livre');
});

test('execução: o pesado aparado vira execução de 5× o leve', () => {
  const { jogador, eventos, inimigo } = duelo();
  const P = CONFIG.combate.pistola;
  const viscerais = [];
  eventos.em('golpe:visceral', (d) => viscerais.push(d.execucao));
  inimigo.mudar('perseguir');
  inimigo.atacar(['pesado']);
  const g = inimigo.golpe;
  inimigo.ataque.t = g.preparo - P.janelaNoAviso * g.janelaAparar * 0.5;
  assert.equal(jogador.atirar().aparou, true);
  assert.equal(inimigo.abertoParaExecucao, true);
  jogador.acao = 'livre';
  jogador.iniciarAtaque('forte');
  assert.deepEqual([jogador.acao, jogador.execucao], ['visceral', true]);
  rodarJuntos(jogador, inimigo, CONFIG.combate.visceral.duracao);
  assert.ok(Math.abs(inimigo.vida - (inimigo.cfg.vida - CONFIG.combate.leve.dano * CONFIG.combate.execucao.multiplicador)) < 1e-9);
  assert.deepEqual(viscerais, [true]);
});

test('golpe comum de lado no inimigo desequilibrado continua sendo o crítico de 2,6×', () => {
  const { jogador, eventos, inimigo } = duelo();
  const criticos = [];
  eventos.em('golpe:acertou', (d) => criticos.push(d.critico));
  inimigo.pos.set(-2, 0, 0);   // o caçador está do lado dele (ele olha para +Z)
  inimigo.mudar('perseguir');
  inimigo.serAparado(null);
  jogador.iniciarAtaque('leve');
  assert.equal(jogador.acao, 'preparo');
  for (let i = 0; i < 12; i++) jogador.atualizar(0.02);
  assert.deepEqual(criticos, [true]);
  assert.ok(Math.abs(inimigo.vida - (inimigo.cfg.vida - CONFIG.combate.leve.dano * CONFIG.combate.critico.multiplicador)) < 1e-9);

  // De longe também não vira visceral.
  const longe = duelo();
  longe.inimigo.pos.set(0, 0, -(CONFIG.combate.visceral.alcance + 0.1));
  longe.inimigo.mudar('perseguir');
  longe.inimigo.serAparado(null);
  longe.jogador.iniciarAtaque('leve');
  assert.equal(longe.jogador.acao, 'preparo');
});

test('o dano do ataque forte cresce com a carga', () => {
  const CB = CONFIG.combate;
  const danoCom = (tCarga) => {
    const { jogador, alvo } = arena();
    jogador.tCarga = tCarga;
    jogador.iniciarAtaque('forte');
    for (let i = 0; i < 20; i++) jogador.atualizar(0.02);
    return 100 - alvo.vida;
  };
  const meio = (CB.tempoSegurarForte + CB.tempoMaximoCarga) / 2;
  assert.equal(danoCom(CB.tempoSegurarForte), CB.forte.dano);
  assert.ok(Math.abs(danoCom(meio) - CB.forte.dano * (1 + (CB.carga.multiplicadorMax - 1) / 2)) < 1e-9);
  assert.ok(Math.abs(danoCom(CB.tempoMaximoCarga) - CB.forte.dano * CB.carga.multiplicadorMax) < 1e-9);

  // Segurando o botão até a carga máxima, o golpe sai sozinho com o dano cheio.
  const { jogador, entrada, alvo } = arena();
  entrada.botoesApertados[0] = true; entrada.botoes[0] = true;
  jogador.atualizar(0.01);
  entrada.botoesApertados[0] = false;
  for (let i = 0; i < 40 && jogador.ataque !== 'forte'; i++) jogador.atualizar(0.05);
  entrada.botoes[0] = false;
  assert.equal(jogador.cargaGolpe, 1);
  for (let i = 0; i < 20; i++) jogador.atualizar(0.02);
  assert.ok(Math.abs(100 - alvo.vida - CB.forte.dano * CB.carga.multiplicadorMax) < 1e-9);
});

test('carga completa pelas costas desequilibra (sem execução) e abre o visceral', () => {
  const CB = CONFIG.combate;
  const golpeForte = (angulo, tCarga) => {
    const d = duelo();
    d.inimigo.angulo = angulo;
    d.inimigo.mudar('perseguir');
    d.jogador.tCarga = tCarga;
    d.jogador.iniciarAtaque('forte');
    for (let i = 0; i < 20; i++) d.jogador.atualizar(0.02);
    return d;
  };
  // Pelas costas (o inimigo olha para longe do caçador), carga completa.
  const { jogador, inimigo } = golpeForte(Math.PI, CB.tempoMaximoCarga);
  assert.deepEqual([inimigo.estado, inimigo.visceralPelasCostas, inimigo.abertoParaExecucao], ['desequilibrado', true, false]);
  for (let i = 0; i < 40 && jogador.acao !== 'livre'; i++) jogador.atualizar(0.02);
  jogador.iniciarAtaque('leve');
  assert.deepEqual([jogador.acao, jogador.execucao], ['visceral', false]);

  // De frente, ou pelas costas sem carga completa, só cambaleia.
  assert.equal(golpeForte(0, CB.tempoMaximoCarga).inimigo.estado, 'atordoado');
  assert.equal(golpeForte(Math.PI, CB.tempoMaximoCarga * 0.7).inimigo.estado, 'atordoado');
});

// -----------------------------------------------------------------------------
//  Etapa C, PR C3: pressão em grupo e punição do frasco
// -----------------------------------------------------------------------------

/** Vários inimigos na mesma área, com um conjunto de fichas (limite do config). */
function bando(tipo, posicoes) {
  const d = duelo(tipo);
  const mundo = d.inimigo.mundo;
  mundo.fichas = new Fichas();
  d.inimigo.pos.set(posicoes[0][0], 0, posicoes[0][1]);
  const inimigos = [d.inimigo];
  for (const [x, z] of posicoes.slice(1)) {
    const i = new Inimigo(d.jogador.jogo, mundo, { tipo, rota: [[x, z]] });
    mundo.entidades.push(i);
    d.jogador.jogo.inimigos.push(i);
    inimigos.push(i);
  }
  return { ...d, mundo, inimigos };
}

test('fichas: com limite 2 e 3 inimigos, só 2 atacam ao mesmo tempo e o terceiro ronda', () => {
  assert.equal(CONFIG.combate.grupo.atacantesSimultaneos, 2);
  const { jogador, mundo, inimigos } = bando('cavaleiro', [[-1.5, -2], [0, -2.5], [1.5, -2]]);
  jogador.vida = jogador.vidaMax = 1e6;   // isola a regra: o caçador não morre
  for (const i of inimigos) { i.sorteio = () => 0.3; i.mudar('perseguir'); }
  let maxAtacando = 0;
  const atacaram = new Set();
  let rondou = false;
  for (let k = 0; k < 600; k++) {
    for (const i of inimigos) i.atualizar(0.02);
    const atacando = inimigos.filter((i) => ['preparo', 'ativo', 'recuperacao'].includes(i.estado));
    for (const i of atacando) atacaram.add(i);
    maxAtacando = Math.max(maxAtacando, atacando.length);
    assert.ok(mundo.fichas.donos.size <= 2);
    if (inimigos.some((i) => i.estado === 'perseguir' && mundo.fichas.fila.includes(i))) rondou = true;
  }
  assert.equal(maxAtacando, 2, 'nunca três atacando juntos');
  assert.ok(rondou, 'quem ficou sem ficha esperou rondando');
  assert.equal(atacaram.size, 3, 'a ficha passa adiante: o terceiro também chega a atacar');

  // O chefe não usa ficha: ataca mesmo com as fichas ocupadas.
  const fichas = new Fichas(2);
  assert.ok(fichas.pedir(inimigos[0]) && fichas.pedir(inimigos[1]));
  assert.equal(fichas.pedir(inimigos[2]), false);
  assert.equal(fichas.pedir({ cfg: CONFIG.inimigos.guardiao }), true);
  assert.equal(fichas.donos.size, 2);
});

test('fichas: a ficha volta quando o inimigo morre, cambaleia ou é aparado', () => {
  for (const caso of ['morre', 'cambaleia', 'aparado', 'fim da sequência']) {
    const { jogador, mundo, inimigos } = bando('cavaleiro', [[0, -2], [1.5, -2], [-1.5, -2]]);
    jogador.vida = jogador.vidaMax = 1e6;
    const [a] = inimigos;
    a.sorteio = () => 0;
    a.mudar('perseguir');
    a.atualizar(0.02);
    assert.equal(a.estado, 'preparo', caso);
    assert.ok(mundo.fichas.tem(a), caso);
    if (caso === 'morre') a.receberDano(9999, { x: 0, z: -1 }, 0, false);
    else if (caso === 'cambaleia') a.receberDano(10, { x: 0, z: -1 }, 2.5, true);
    else if (caso === 'aparado') a.serAparado();
    else for (let k = 0; k < 300 && a.estado !== 'perseguir'; k++) a.atualizar(0.02);
    assert.equal(mundo.fichas.tem(a), false, caso);
  }
});

test('frasco: beber a 5 m de um inimigo livre dispara o ataque mais rápido; a 10 m, não', () => {
  const P = CONFIG.combate.punirFrasco;
  for (const [distancia, pune] of [[5, true], [10, false]]) {
    const { jogador, inimigo } = duelo('cavaleiro');
    inimigo.mundo.fichas = new Fichas();
    inimigo.pos.set(0, 0, -distancia);
    inimigo.sorteio = () => 0;   // o sorteio da chance sempre passa
    inimigo.mudar('perseguir');
    jogador.comecarCura();
    inimigo.atualizar(P.reacao * 0.5);
    assert.equal(inimigo.estado, 'perseguir', 'reage só depois do tempo de reação');
    inimigo.atualizar(P.reacao * 0.6);
    assert.equal(inimigo.estado === 'preparo', pune, `${distancia} m`);
    if (pune) {
      assert.deepEqual(inimigo.ataque.fila.map((g) => g.tipo), ['alto'], 'a sequência mais rápida do cavaleiro');
      const antes = inimigo.pos.z;
      inimigo.atualizar(0.1);
      assert.ok(inimigo.pos.z > antes, 'avança durante o aviso');
    }
  }

  // A chance falhou: não pune. O Guardião sempre pune (chance 1).
  const { jogador, inimigo } = duelo('cavaleiro');
  inimigo.pos.set(0, 0, -5);
  inimigo.sorteio = () => 0.99;
  inimigo.mudar('perseguir');
  jogador.comecarCura();
  inimigo.atualizar(P.reacao + 0.01);
  assert.equal(inimigo.estado, 'perseguir');
  assert.equal(CONFIG.inimigos.guardiao.punirFrasco.chance, 1);

  // Respeita as fichas: sem ficha livre, não pune.
  const b = bando('cavaleiro', [[0, -4], [2, -1], [-2, -1]]);
  b.mundo.fichas.pedir(b.inimigos[1]);
  b.mundo.fichas.pedir(b.inimigos[2]);
  b.inimigo.sorteio = () => 0;
  b.inimigo.mudar('perseguir');
  b.jogador.comecarCura();
  b.inimigo.atualizar(P.reacao + 0.01);
  assert.notEqual(b.inimigo.estado, 'preparo');
});

test('estilo de imagem: padrão PS1, preferência antiga vira PS1, escolha persiste e sobrevive a apagar o progresso', async () => {
  const { carregarPreferencias, salvarPreferencias } = await import('../src/nucleo/Preferencias.js');
  const registros = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => registros.get(key) ?? null,
    setItem: (key, value) => registros.set(key, value),
    removeItem: (key) => registros.delete(key),
  } });
  try {
    assert.equal(CONFIG.render.estiloPadrao, 'ps1');
    assert.ok(CONFIG.render.estilos.ps1 && CONFIG.render.estilos.hd);
    // Primeira vez: PS1.
    assert.equal(carregarPreferencias().estiloGrafico, 'ps1');
    // Preferência antiga, sem o campo novo: PS1, e o resto continua igual.
    registros.set('pugna-preferencias-v1', '{"musica":30,"resolucao":180,"tremor":false}');
    const antiga = carregarPreferencias();
    assert.equal(antiga.estiloGrafico, 'ps1');
    assert.equal(antiga.resolucaoHd, 720);
    assert.equal(antiga.perspectiva, 'terceira');
    assert.deepEqual([antiga.musica, antiga.resolucao, antiga.tremor], [30, 180, false]);
    // Valor desconhecido também volta ao PS1.
    registros.set('pugna-preferencias-v1', '{"estiloGrafico":"ultra"}');
    assert.equal(carregarPreferencias().estiloGrafico, 'ps1');
    // Escolher HD persiste ao "recarregar" e guarda os valores do PS1.
    salvarPreferencias({ ...antiga, estiloGrafico: 'hd', resolucaoHd: 2160, perspectiva: 'primeira' });
    const recarregada = carregarPreferencias();
    assert.equal(recarregada.estiloGrafico, 'hd');
    assert.equal(recarregada.resolucaoHd, 2160);
    assert.equal(recarregada.perspectiva, 'primeira');
    assert.deepEqual([recarregada.resolucao, recarregada.tremor], [180, false]);
    // Apagar o progresso não mexe nas preferências.
    const saves = new SalvamentoLocal();
    await saves.salvar(normalizarProgresso({ descanso: 'adro-da-igreja' }));
    assert.equal(saves.apagar(), true);
    assert.equal(carregarPreferencias().estiloGrafico, 'hd');
    assert.equal(carregarPreferencias().perspectiva, 'primeira');
  } finally {
    delete globalThis.localStorage;
  }
});

// -----------------------------------------------------------------------------
//  Etapa D: agachar, golpe pelas costas e pulo contra a rasteira
// -----------------------------------------------------------------------------

test('percepção: em pé vale a regra de antes; agachado, cone estreito, menos alcance e quase nenhum barulho', () => {
  const F = CONFIG.combate.furtividade;
  // Em pé: idêntico ao antigo "de frente enxerga a visao; de costas, só a 5 m".
  const antiga = (dist, cos, visao) => dist < (cos > -0.15 ? visao : 5);
  for (const visao of [12, 15, 19, 20]) {
    for (let dist = 0.5; dist < 25; dist += 0.75) {
      for (let cos = -1; cos <= 1; cos += 0.1) {
        assert.equal(percebe({ dist, cosFrente: cos, visao }), antiga(dist, cos, visao), `${visao} ${dist} ${cos}`);
      }
    }
  }
  const visao = 15, cone = Math.cos(F.anguloVisao * Math.PI / 360);
  assert.equal(percebe({ dist: 5, cosFrente: 1, visao, agachado: true }), true);                       // bem na frente
  assert.equal(percebe({ dist: visao * F.visaoNoEscuro + 0.1, cosFrente: 1, visao, agachado: true }), false);
  assert.equal(percebe({ dist: 5, cosFrente: cone - 0.05, visao, agachado: true }), false);             // fora do cone
  assert.equal(percebe({ dist: 2, cosFrente: -1, visao, agachado: true }), false);                      // atrás, agachado
  assert.equal(percebe({ dist: F.raioAgachado * 0.9, cosFrente: -1, visao, agachado: true }), true);    // perto demais
  // Por trás: andando (ou parado em pé) ouve a 5 m; correndo, mais longe.
  assert.deepEqual([raioDeBarulho({}), raioDeBarulho({ correndo: true }), raioDeBarulho({ agachado: true })],
    [F.raioAndando, F.raioCorrendo, F.raioAgachado]);
  assert.equal(percebe({ dist: 6, cosFrente: -1, visao }), false);
  assert.equal(percebe({ dist: 6, cosFrente: -1, visao, correndo: true }), true);
});

test('regras puras: cone das costas, alcance da pisada e vizinhos do alerta', () => {
  const K = CONFIG.combate.costas, P = CONFIG.combate.pisada;
  // Inimigo olhando para +Z: as costas ficam em -Z.
  assert.equal(pelasCostas(0, 0, -1.4), true);
  assert.equal(pelasCostas(0, 0, -(K.alcance + 0.1)), false);
  assert.equal(pelasCostas(0, 1, -1), false);    // 45° de lado: fora do cone de 60°
  assert.equal(pelasCostas(0, 0, 1.2), false);   // de frente
  assert.equal(pelasCostas(Math.PI, 0, 1.2), true);
  assert.equal(alcancaPisada(0.5, 1.5), true);
  assert.equal(alcancaPisada(P.janela + 0.05, 1.5), false);
  assert.equal(alcancaPisada(0.5, P.alcance + 0.1), false);
  const R = CONFIG.combate.furtividade.raioAlerta;
  const ini = (x, estado = 'patrulha', extra = {}) => ({ pos: { x, z: 0 }, estado, morto: false, cfg: {}, ...extra });
  const origem = ini(0, 'perseguir');
  const perto = ini(R - 1), longe = ini(R + 1), lutando = ini(2, 'perseguir'), morto = ini(2, 'patrulha', { morto: true });
  const chefe = ini(3, 'patrulha', { cfg: { chefe: true } });
  assert.deepEqual(vizinhosParaAlertar(origem, [origem, perto, longe, lutando, morto, chefe]), [perto]);
});

/** Caçador na origem olhando para -Z; inimigos de costas para ele (olhando para -Z). */
function emboscada(tipo, posicoes, agachado) {
  const d = bando(tipo, posicoes);
  for (const i of d.inimigos) { i.angulo = Math.PI; i.rota = [[i.pos.x, i.pos.z]]; }
  d.jogador.agachado = agachado;
  const rodar = (segundos) => {
    for (let t = 0; t < segundos; t += 0.02) { d.jogador.atualizar(0.02); for (const i of d.inimigos) i.atualizar(0.02); }
  };
  return { ...d, rodar };
}

test('golpe pelas costas: agachado atrás do desatento, mata em silêncio, sem pausa nem tremor, e ninguém reage', () => {
  const { jogador, eventos, inimigos, rodar } = emboscada('cavaleiro', [[0, -1.4], [6, -6]], true);
  const [alvo, vizinho] = inimigos;
  const ev = { costas: 0, visceral: 0, alerta: 0 };
  eventos.em('golpe:costas', () => ev.costas++);
  eventos.em('golpe:visceral', () => ev.visceral++);
  eventos.em('inimigo:alerta', () => ev.alerta++);
  let pausas = 0;
  jogador.jogo.pausaDeImpacto = () => pausas++;
  jogador.receberDano(20, { x: 5, y: 0, z: 5 });   // deixa vida recuperável (rally)
  jogador.agachado = true; jogador.acao = 'livre'; jogador.tremor = 0;
  rodar(0.1);
  assert.deepEqual([alvo.estado, vizinho.estado], ['patrulha', 'patrulha']);   // agachado, ninguém percebe
  jogador.iniciarAtaque('leve');
  assert.deepEqual([jogador.acao, jogador.costas, jogador.agachado], ['visceral', true, true]);
  assert.ok(jogador.invencivel >= CONFIG.combate.visceral.duracao - 1e-9);
  rodar(CONFIG.combate.visceral.duracao + 1);
  assert.deepEqual([alvo.morto, alvo.silencioso], [true, true]);
  assert.deepEqual(ev, { costas: 1, visceral: 0, alerta: 0 });
  assert.deepEqual([pausas, jogador.tremor < 1e-3, jogador.recuperavel], [0, true, 0]);   // rally cheio
  assert.equal(vizinho.estado, 'patrulha');
});

test('visto, os vizinhos passam a perseguir depois de 0,4 s; em pé, quem está atrás ouve a 5 m', () => {
  const F = CONFIG.combate.furtividade;
  const { jogador, inimigos } = emboscada('cavaleiro', [[0, -1.4], [6, -6]], false);
  const [alvo, vizinho] = inimigos;
  alvo.atualizar(0.02);
  assert.deepEqual([alvo.estado, vizinho.estado, vizinho.alertaEm], ['perseguir', 'patrulha', F.atrasoAlerta]);
  for (let t = 0; t < F.atrasoAlerta - 0.1; t += 0.02) vizinho.atualizar(0.02);
  assert.equal(vizinho.estado, 'patrulha');
  for (let t = 0; t < 0.2; t += 0.02) vizinho.atualizar(0.02);
  assert.ok(['perseguir', 'procurar'].includes(vizinho.estado));
  // Quem já percebeu não leva o golpe pelas costas: vale o ataque comum.
  jogador.acao = 'livre';
  alvo.angulo = Math.PI; alvo.mudar('perseguir');
  jogador.iniciarAtaque('leve');
  assert.equal(jogador.acao, 'preparo');
});

test('o Guardião não morre pelas costas, e agachar não muda quem já está em combate', () => {
  const { jogador, inimigos } = emboscada('guardiao', [[0, -1.4]], true);
  jogador.iniciarAtaque('leve');
  assert.equal(jogador.acao, 'preparo');
  assert.equal(inimigos[0].vida > 0, true);
});

test('agachar: Z alterna, anda devagar, não corre nem pula, abaixa os olhos e atacar levanta', () => {
  const { jogador, entrada } = arena();
  const F = CONFIG.combate.furtividade;
  const teclas = new Set();
  entrada.apertou = (k) => teclas.has(k);
  entrada.segurando = (k) => k === 'KeyW' || k === 'ShiftLeft';
  teclas.add('KeyZ'); jogador.atualizar(0.02); teclas.clear();
  assert.equal(jogador.agachado, true);
  for (let i = 0; i < 100; i++) jogador.atualizar(0.02);
  assert.equal(jogador.correndo, false);
  assert.ok(Math.abs(Math.hypot(jogador.vel.x, jogador.vel.z) - CONFIG.jogador.velAndar * F.velocidade) < 0.05);
  assert.ok(Math.abs(jogador.alturaOlhos - CONFIG.jogador.alturaOlhos * F.alturaOlhos) < 0.01);
  teclas.add('Space'); jogador.atualizar(0.02); teclas.clear();
  assert.equal(jogador.noChao, true);
  teclas.add('KeyZ'); jogador.atualizar(0.02); teclas.clear();
  assert.equal(jogador.agachado, false);
  teclas.add('KeyZ'); jogador.atualizar(0.02); teclas.clear();
  jogador.iniciarAtaque('leve');
  assert.equal(jogador.agachado, false);
});

test('pisada: pular a rasteira e cair perto pisa no atacante e abre o visceral; longe ou tarde, nada', () => {
  const P = CONFIG.combate.pisada;
  const cair = (distancia, demora = 0) => {
    const d = duelo('cavaleiro');
    const { jogador, inimigo } = d;
    inimigo.pos.z = -distancia;
    inimigo.mudar('perseguir');
    inimigo.atacar(['rasteira']);
    const rasteira = inimigo.golpe;
    jogador.noChao = false; jogador.pos.y = 0.5; jogador.vel.y = 0;
    assert.equal(jogador.receberDano(rasteira.dano, inimigo.pos, inimigo, rasteira), 'pulou');
    jogador.tPisada = demora;
    jogador.pos.y = 0.05; jogador.vel.y = -3;
    jogador.atualizar(0.02);
    return d;
  };
  const { jogador, inimigo } = cair(1.5);
  assert.ok(Math.abs(inimigo.vida - (inimigo.cfg.vida - CONFIG.combate.leve.dano * P.multiplicador)) < 1e-9);
  assert.deepEqual([inimigo.estado, inimigo.tempoDesequilibrio], ['desequilibrado', P.desequilibrio]);
  assert.ok(jogador.vel.y > 0 && !jogador.noChao);   // quicou
  jogador.iniciarAtaque('leve');
  assert.equal(jogador.acao, 'visceral');
  // Longe demais ou depois da janela: nada acontece.
  for (const d of [cair(P.alcance + 0.5), cair(1.5, P.janela + 0.1)]) {
    assert.equal(d.inimigo.vida, d.inimigo.cfg.vida);
    assert.notEqual(d.inimigo.estado, 'desequilibrado');
  }
});

test('pisada: o desequilíbrio dura o tempo próprio e depois ele volta a perseguir', () => {
  const { inimigo } = duelo('cavaleiro');
  inimigo.desequilibrar({ duracao: 0.5 });
  for (let t = 0; t < 0.45; t += 0.02) inimigo.atualizar(0.02);
  assert.equal(inimigo.estado, 'desequilibrado');
  for (let t = 0; t < 0.1; t += 0.02) inimigo.atualizar(0.02);
  assert.notEqual(inimigo.estado, 'desequilibrado');
  assert.equal(inimigo.tempoDesequilibrio, null);
});

test('pular contra golpe alto custa dano extra; no chão, ou contra o pesado, não', () => {
  const X = CONFIG.combate.danoExtraNoAr;
  const alto = montarGolpe(CONFIG.inimigos.cavaleiro, 'alto'), pesado = montarGolpe(CONFIG.inimigos.cavaleiro, 'pesado');
  const caso = (golpe, altura) => {
    const { jogador } = arena();
    jogador.noChao = altura === 0; jogador.pos.y = altura;
    jogador.receberDano(golpe.dano, { x: 0, y: 0, z: -1 }, null, golpe);
    return 100 - jogador.vida;
  };
  assert.equal(caso(alto, 0.6), alto.dano * X.multiplicador);
  assert.equal(caso(alto, 0), alto.dano);
  assert.equal(caso(alto, X.alturaMin / 2), alto.dano);
  assert.equal(caso(pesado, 0.6), pesado.dano);
});

// ---------------------------------------------------------------------------
//  CAM3: mira travada estilo Souls (spec 10)
// ---------------------------------------------------------------------------
const MIRA = {
  inclinacao: -0.27, inclinacaoFracao: 0.6, inclinacaoDistMin: 1, focoFracao: 0.3, focoMax: 1.5,
  distPorEscala: 0.5, pertoDistancia: 2, pertoExtra: 1,
};
const LIMITES = { inclinacaoMin: -1.2, inclinacaoMax: 0.85 };

test('CAM3: a inclinação da mira parte da base e acompanha 60% da altura do alvo, dentro dos limites', () => {
  const perto = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  // Peito do alvo na altura do ponto de giro: fica na base.
  perto(inclinacaoDaMira(1.55, 1.55, 4, MIRA, LIMITES), -0.27);
  // Alvo mais alto levanta o olhar; mais baixo, abaixa. Sempre 60% do ângulo.
  perto(inclinacaoDaMira(1.55, 5.55, 4, MIRA, LIMITES), -0.27 + 0.6 * Math.PI / 4);
  perto(inclinacaoDaMira(1.55, -2.45, 4, MIRA, LIMITES), -0.27 - 0.6 * Math.PI / 4);
  // O Guardião (peito a 1,25 × 1,65) levanta o olhar mais de perto que de longe.
  const peito = 1.25 * CONFIG.inimigos.guardiao.escala;
  assert.ok(inclinacaoDaMira(1.55, peito, 2, MIRA, LIMITES) > inclinacaoDaMira(1.55, peito, 8, MIRA, LIMITES));
  assert.ok(inclinacaoDaMira(1.55, peito, 8, MIRA, LIMITES) > -0.27);
  // Alvo colado: a distância conta como 1 m, o ângulo não dispara.
  perto(inclinacaoDaMira(1.55, 1.25, 0.05, MIRA, LIMITES), inclinacaoDaMira(1.55, 1.25, 1, MIRA, LIMITES));
  // Nunca passa dos limites da câmera.
  assert.equal(inclinacaoDaMira(0, 500, 1, { ...MIRA, inclinacaoFracao: 1 }, LIMITES), 0.85);
  assert.equal(inclinacaoDaMira(0, -500, 1, { ...MIRA, inclinacaoFracao: 1 }, LIMITES), -1.2);
  // Os valores do jogo: fração entre 0 e 1 e a base de sempre.
  assert.ok(CONFIG.mira.inclinacaoFracao > 0 && CONFIG.mira.inclinacaoFracao < 1);
  assert.equal(CONFIG.mira.inclinacao, -0.27);
});

test('CAM3: o foco fica a 30% do caminho até o alvo, no máximo a 1,5 m', () => {
  const perto = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  let foco = focoDaMira({ x: 0, z: 0 }, { x: 0, z: -4 }, MIRA);
  perto(foco.x, 0); perto(foco.z, -1.2);
  foco = focoDaMira({ x: 1, z: 1 }, { x: 4, z: 5 }, MIRA);          // 5 m na diagonal: 1,5 m na mesma direção
  perto(foco.x, 0.9); perto(foco.z, 1.2);
  foco = focoDaMira({ x: 0, z: 0 }, { x: 12, z: 0 }, MIRA);         // longe: para em 1,5 m
  perto(foco.x, 1.5); perto(foco.z, 0);
  foco = focoDaMira({ x: 2, z: 3 }, { x: 2, z: 3 }, MIRA);          // em cima do alvo: sem direção, sem desvio
  assert.deepEqual(foco, { x: 0, z: 0 });
  // Reaproveita o objeto de saída, se vier.
  const saida = { x: 9, z: 9 };
  assert.equal(focoDaMira({ x: 0, z: 0 }, { x: 0, z: 2 }, MIRA, saida), saida);
  perto(saida.z, 0.6);
});

test('CAM3: a câmera se afasta com o tamanho do alvo e um pouco com o alvo colado', () => {
  const perto = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  perto(distanciaDaMira(1, 4, MIRA), 0);                       // alvo comum, longe: nada muda
  perto(distanciaDaMira(0.8, 4, MIRA), 0);                     // alvo pequeno não aproxima a câmera
  perto(distanciaDaMira(1.65, 5, MIRA), 0.325);                // Guardião: +0,5 m por ponto de escala
  perto(distanciaDaMira(1, 2, MIRA), 0);                       // a 2 m ainda não conta como colado
  perto(distanciaDaMira(1, 1.5, MIRA), 0.25);
  perto(distanciaDaMira(1, 1, MIRA), 0.5);
  perto(distanciaDaMira(1.65, 1, MIRA), 0.825);                // as duas coisas somam
  perto(distanciaDaMira(undefined, 0, MIRA), 1);
});

test('CAM3: travar, trocar de alvo e destravar movem a câmera sem salto, e destravar não volta para as costas', () => {
  const { jogador, entrada, alvo, colisores } = arena();
  const camera = jogador.jogo.camera;
  alvo.pos.set(3, 0, -3); alvo.cfg = { escala: 1.65 }; alvo.receberDano = () => {};
  const outro = { pos: new THREE.Vector3(-3, 0, -3), raio: 0.44, cfg: { escala: 1 } };
  jogador.jogo.inimigos.push(outro);
  jogador.atualizar(0.01);
  const antes = camera.position.clone();
  // Anda n quadros de 1/60 s e devolve o maior passo da câmera (m) e do olhar (rad) num quadro.
  const quadros = (n) => {
    let passo = 0, giro = 0;
    for (let i = 0; i < n; i++) {
      antes.copy(camera.position);
      const yaw = jogador.yaw, pitch = jogador.pitch;
      jogador.atualizar(1 / 60);
      passo = Math.max(passo, antes.distanceTo(camera.position));
      giro = Math.max(giro, Math.abs(jogador.yaw - yaw), Math.abs(jogador.pitch - pitch));
    }
    return { passo, giro };
  };
  // O primeiro quadro depois de cada mudança é o que daria o tranco: tem de ser pequeno.
  // (Sem a entrada suave, travar 45° ao lado girava 0,09 rad e andava mais de 0,4 m logo no primeiro quadro.)
  const semTranco = (nome) => {
    const { passo, giro } = quadros(1);
    assert.ok(passo < 0.1 && giro < 0.02, `${nome}: ${passo.toFixed(3)} m e ${giro.toFixed(4)} rad no primeiro quadro`);
  };
  jogador.travar(alvo);
  semTranco('travar');
  quadros(240);
  // Assentou: atrás do caçador, na linha do alvo, mais longe que o normal (alvo grande) e olhando para o foco.
  const paraAlvo = Math.atan2(-alvo.pos.x, -alvo.pos.z);
  assert.ok(Math.abs(jogador.yaw - paraAlvo) < 1e-3);
  const dist = Math.hypot(3, 3);
  const esperada = CONFIG.camera.distancia + distanciaDaMira(1.65, dist) + Math.hypot(...Object.values(focoDaMira(jogador.pos, alvo.pos)));
  assert.ok(Math.abs(jogador.distCamera - esperada) < 1e-3, `distância ${jogador.distCamera}`);
  assert.ok(Math.abs(jogador.pitch - inclinacaoDaMira(CONFIG.camera.alturaPivo, 1.25 * 1.65, dist)) < 1e-3);
  assert.ok(camera.position.x < 0 && camera.position.z > 0, 'a câmera fica do lado oposto ao alvo');
  // A câmera não chega mais perto do caçador do que sem a mira.
  assert.ok(jogador.distBoneco >= CONFIG.camera.distancia - 1e-6);

  jogador.travar(outro);            // troca de alvo: 90° para o lado
  semTranco('trocar de alvo');
  quadros(240);
  assert.ok(Math.abs(jogador.yaw - Math.atan2(3, 3)) < 1e-3);
  assert.ok(camera.position.x > 0, 'passou para trás do caçador em relação ao novo alvo');

  const yaw = jogador.yaw, pitch = jogador.pitch;
  jogador.soltarMira();             // destravar: o olhar fica onde está, só a posição se acomoda
  semTranco('destravar');
  quadros(240);
  assert.equal(jogador.yaw, yaw); assert.equal(jogador.pitch, pitch);
  assert.ok(Math.abs(jogador.distCamera - CONFIG.camera.distancia) < 1e-3);
  assert.ok(Math.hypot(jogador.focoMira.x, jogador.focoMira.z) < 1e-3 && jogador.extraMira < 1e-3);

  // Perder o alvo atrás de uma parede (mira.semVisao) também não dá tranco.
  jogador.travar(outro);
  quadros(240);
  colisores.adicionar(-1.5, -1.5, 3, 0.2);
  let pior = 0;
  for (let i = 0; i < (CONFIG.mira.semVisao + 0.5) * 60; i++) pior = Math.max(pior, quadros(1).passo);
  assert.equal(jogador.alvo, null);
  assert.ok(pior < 0.1, `perder o alvo: ${pior.toFixed(3)} m num quadro`);
  assert.ok(Math.abs(jogador.yaw - yaw) < 1e-6, 'o olhar não volta para as costas');
  void entrada;
});

test('CAM3: a mola do foco e da distância sai e chega devagar e não depende dos quadros por segundo', () => {
  const lenta = { valor: 0, vel: 0 }, rapida = { valor: 0, vel: 0 };
  acomodar(lenta, 1, 1 / 60, 6);
  assert.ok(lenta.valor > 0 && lenta.valor < 0.01, 'sai devagar');
  for (let i = 1; i < 30; i++) acomodar(lenta, 1, 1 / 60, 6);
  for (let i = 0; i < 72; i++) acomodar(rapida, 1, 1 / 144, 6);
  assert.ok(Math.abs(lenta.valor - rapida.valor) < 1e-9 && lenta.valor > 0.7 && lenta.valor < 1, 'sem passar do alvo');
  for (let i = 0; i < 300; i++) acomodar(lenta, 1, 1 / 60, 6);
  assert.ok(Math.abs(lenta.valor - 1) < 1e-6 && Math.abs(lenta.vel) < 1e-6);
  // dt 0 encaixa na hora (teletransporte).
  assert.deepEqual(acomodar({ valor: 3, vel: 9 }, -2, 0, 6), { valor: -2, vel: 0 });
});

test('CAM3: com a mira travada a câmera continua sem atravessar parede, e a primeira pessoa não muda', () => {
  const { jogador, alvo, colisores } = arena();
  const camera = jogador.jogo.camera;
  alvo.pos.set(0, 0, -1.2); alvo.cfg = { escala: 1.65 }; alvo.receberDano = () => {};
  colisores.adicionar(0, 2.5, 8, 1);            // parede atrás do caçador, de z 2 a z 3
  jogador.travar(alvo);
  for (let i = 0; i < 200; i++) jogador.atualizar(1 / 60);
  assert.ok(camera.position.z < 2 - CONFIG.camera.folga + 1e-6, `câmera em z ${camera.position.z}`);

  // Primeira pessoa: mira na altura do ponto marcado, câmera nos olhos, sem desvio nem distância extra.
  jogador.jogo.preferencias.perspectiva = 'primeira';
  for (let i = 0; i < 300; i++) jogador.atualizar(1 / 60);
  const esperado = Math.atan2(1.25 * 1.65 - jogador.alturaOlhos, 1.2);
  assert.ok(Math.abs(jogador.pitch - esperado) < 1e-3);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(jogador.pos.x, jogador.pos.y + jogador.alturaOlhos, jogador.pos.z)) < 1e-6);
});

// ---------------------------------------------------------------------------
//  CAM3b: alvo colado e caçador transparente (spec 10)
// ---------------------------------------------------------------------------
test('CAM3b: com o alvo colado a câmera inclina um pouco mais para baixo, aos poucos e sem exagero', () => {
  const COLADO = { ...MIRA, coladoDistancia: 2.5, coladoCheio: 1.2, coladoInclinacao: -0.1 };
  assert.equal(fatorColado(2.5, COLADO), 0);
  assert.equal(fatorColado(8, COLADO), 0);
  assert.equal(fatorColado(1.2, COLADO), 1);
  assert.equal(fatorColado(0.3, COLADO), 1);
  assert.ok(Math.abs(fatorColado(1.85, COLADO) - 0.5) < 1e-9);
  // Sem degrau: de 2,6 m a 1 m, em passos de 1 cm, o fator nunca pula mais que 2%.
  for (let d = 2.6; d > 1; d -= 0.01) assert.ok(Math.abs(fatorColado(d, COLADO) - fatorColado(d - 0.01, COLADO)) < 0.02);
  // Longe, a inclinação é a da CAM3; colado, soma só a inclinação extra.
  assert.equal(inclinacaoDaMira(1.55, 1.55, 4, COLADO, LIMITES), inclinacaoDaMira(1.55, 1.55, 4, MIRA, LIMITES));
  assert.ok(Math.abs(inclinacaoDaMira(1.55, 1.55, 1.2, COLADO, LIMITES) - (-0.27 - 0.1)) < 1e-9);
  assert.ok(inclinacaoDaMira(1.55, 1.25, 1.5, COLADO, LIMITES) < inclinacaoDaMira(1.55, 1.25, 1.5, MIRA, LIMITES));
  // Os valores do jogo: começa perto de 2,5 m e sobe pouco (a queixa dos Souls é câmera alta demais de perto).
  assert.ok(CONFIG.mira.coladoDistancia >= 2 && CONFIG.mira.coladoDistancia <= 3);
  assert.ok(CONFIG.mira.coladoInclinacao < 0 && CONFIG.mira.coladoInclinacao >= -0.15);
});

test('CAM3b: o caçador fica transparente aos poucos perto da câmera e quando tapa o alvo travado', () => {
  const CAMERA = { sumirBoneco: 1.25, transparenteDe: 2.4 }, TAPA = { tapaOpacidade: 0.3 };
  const perto = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  // Pela distância: inteiro de 2,4 m para cima, invisível de 1,25 m para baixo, gradual no meio.
  assert.equal(opacidadeDoCacador(4.2, 0, CAMERA, TAPA), 1);
  assert.equal(opacidadeDoCacador(2.4, 0, CAMERA, TAPA), 1);
  assert.equal(opacidadeDoCacador(1.25, 0, CAMERA, TAPA), 0);
  assert.equal(opacidadeDoCacador(0.4, 0, CAMERA, TAPA), 0);
  perto(opacidadeDoCacador(1.825, 0, CAMERA, TAPA), 0.5);
  for (let d = 2.6; d > 1; d -= 0.01) {
    assert.ok(opacidadeDoCacador(d, 0, CAMERA, TAPA) - opacidadeDoCacador(d - 0.01, 0, CAMERA, TAPA) < 0.01, 'sem degrau');
  }
  // Tapando o alvo: cai até 30%, na proporção da cobertura; vale o menor dos dois motivos.
  perto(opacidadeDoCacador(4.2, 1, CAMERA, TAPA), 0.3);
  perto(opacidadeDoCacador(4.2, 0.5, CAMERA, TAPA), 0.65);
  perto(opacidadeDoCacador(4.2, 7, CAMERA, TAPA), 0.3);
  perto(opacidadeDoCacador(1.4, 1, CAMERA, TAPA), opacidadeDoCacador(1.4, 0, CAMERA, TAPA));
  // Sem a faixa de transparência no config, volta a ser "aparece ou some".
  assert.equal(opacidadeDoCacador(1.3, 0, { sumirBoneco: 1.25 }, TAPA), 1);
  assert.equal(opacidadeDoCacador(1.2, 0, { sumirBoneco: 1.25 }, TAPA), 0);
  // Os valores do jogo.
  assert.ok(CONFIG.camera.transparenteDe > CONFIG.camera.sumirBoneco && CONFIG.camera.transparenteDe < CONFIG.camera.distancia);
  assert.ok(CONFIG.mira.tapaOpacidade > 0 && CONFIG.mira.tapaOpacidade < 1);

  // Cobertura: o ponto do marcador dentro da silhueta do caçador na tela (unidades: fração da altura da tela).
  const silhueta = { x0: -0.1, x1: 0.1, y0: -0.6, y1: 0.1 };
  assert.equal(coberturaDoAlvo({ x: 0, y: -0.2 }, silhueta, 0.05), 1);      // bem atrás do caçador
  assert.equal(coberturaDoAlvo({ x: 0, y: 0.3 }, silhueta, 0.05), 0);       // acima do chapéu
  assert.equal(coberturaDoAlvo({ x: 0.4, y: -0.2 }, silhueta, 0.05), 0);    // ao lado
  perto(coberturaDoAlvo({ x: 0, y: 0.1 }, silhueta, 0.05), 0.5);            // na borda: metade
  perto(coberturaDoAlvo({ x: 0, y: 0.125 }, silhueta, 0.05), 0.25);         // um pouco fora: já começa
  assert.equal(coberturaDoAlvo({ x: 0, y: 0.09 }, silhueta, 0), 1);
  assert.equal(coberturaDoAlvo({ x: 0, y: 0.11 }, silhueta, 0), 0);
});

test('CAM3b: o pontilhado entra no material sem tirar o que ele já fazia, uma vez só', () => {
  const chamadas = [];
  const material = new THREE.MeshLambertMaterial();
  material.onBeforeCompile = (shader) => { chamadas.push('antes'); shader.fragmentShader = `// retro\n${shader.fragmentShader}`; };
  material.customProgramCacheKey = () => 'retro';
  const uSumir = { value: 1 };
  assert.equal(pontilhar(material, uSumir), material);
  const gancho = material.onBeforeCompile;
  pontilhar(material, { value: 0.2 });                 // de novo: não empilha
  assert.equal(material.onBeforeCompile, gancho);
  assert.equal(material.customProgramCacheKey(), 'retro|pontilhado');

  const shader = { uniforms: {}, vertexShader: '', fragmentShader: 'uniform float x;\nvoid main() {\n  gl_FragColor = vec4(1.0);\n}' };
  material.onBeforeCompile(shader);
  assert.deepEqual(chamadas, ['antes']);
  assert.equal(shader.uniforms.uSumir, uSumir);        // o mesmo objeto: mudar o valor não recompila nada
  assert.ok(shader.fragmentShader.includes('// retro') && shader.fragmentShader.includes('discard'));
  assert.ok(shader.fragmentShader.indexOf('discard') > shader.fragmentShader.indexOf('void main() {'));
  // Material sem "void main() {" (não é dos prontos do Three): fica como estava.
  const estranho = { uniforms: {}, vertexShader: '', fragmentShader: 'void main(){}' };
  material.onBeforeCompile(estranho);
  assert.equal(estranho.fragmentShader, '// retro\nvoid main(){}');
  assert.equal(pontilhar(null, uSumir), null);
});

// ---------------------------------------------------------------------------
//  CAM4: opções de câmera em Configurações (spec 10)
// ---------------------------------------------------------------------------
function comPreferenciasSalvas(texto, fn) {
  const antes = globalThis.localStorage;
  const dados = new Map(texto === undefined ? [] : [['pugna-preferencias-v1', texto]]);
  globalThis.localStorage = {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
  };
  try { return fn(dados); } finally { globalThis.localStorage = antes; }
}

test('CAM4: as opções da câmera são preferências com padrão, faixa e proteção contra valor inválido', () => {
  const CAM = CONFIG.camera;
  const padrao = { cameraRecentrar: false, cameraDesviar: true, cameraAbertura: CAM.campoDeVisao };
  const opcoes = (p) => ({ cameraRecentrar: p.cameraRecentrar, cameraDesviar: p.cameraDesviar, cameraAbertura: p.cameraAbertura });
  assert.ok(CAM.aberturaMin === 40 && CAM.aberturaMax === 60 && CAM.campoDeVisao >= 40 && CAM.campoDeVisao <= 60);
  // Nada salvo, texto quebrado e preferência antiga (de antes da CAM4): tudo no padrão.
  comPreferenciasSalvas(undefined, () => assert.deepEqual(opcoes(carregarPreferencias()), padrao));
  comPreferenciasSalvas('{quebrado', () => assert.deepEqual(opcoes(carregarPreferencias()), padrao));
  comPreferenciasSalvas(JSON.stringify({ musica: 10, perspectiva: 'primeira' }), () => {
    const p = carregarPreferencias();
    assert.deepEqual(opcoes(p), padrao);
    assert.deepEqual([p.musica, p.perspectiva], [10, 'primeira']);   // os campos antigos continuam valendo
  });
  // Valor inválido volta ao padrão; abertura fora da faixa fica na ponta da faixa.
  comPreferenciasSalvas(JSON.stringify({ cameraRecentrar: 'sim', cameraDesviar: 0, cameraAbertura: 'larga' }),
    () => assert.deepEqual(opcoes(carregarPreferencias()), padrao));
  comPreferenciasSalvas(JSON.stringify({ cameraAbertura: 20 }), () => assert.equal(carregarPreferencias().cameraAbertura, 40));
  comPreferenciasSalvas(JSON.stringify({ cameraAbertura: 999 }), () => assert.equal(carregarPreferencias().cameraAbertura, 60));
  comPreferenciasSalvas(JSON.stringify({ cameraAbertura: 52.4 }), () => assert.equal(carregarPreferencias().cameraAbertura, 52));
  // Salvar e carregar devolve o que foi escolhido, só na chave de preferências (o progresso tem outra chave).
  comPreferenciasSalvas(undefined, (dados) => {
    salvarPreferencias({ ...carregarPreferencias(), cameraRecentrar: true, cameraDesviar: false, cameraAbertura: 57 });
    assert.deepEqual([...dados.keys()], ['pugna-preferencias-v1']);
    assert.deepEqual(opcoes(carregarPreferencias()), { cameraRecentrar: true, cameraDesviar: false, cameraAbertura: 57 });
  });
});

test('CAM4: a abertura escolhida vale só na terceira pessoa e fica dentro da faixa', () => {
  assert.equal(campoDeVisao({ abertura: 55 }), 55);
  assert.equal(campoDeVisao({ abertura: 10 }), 40);
  assert.equal(campoDeVisao({ abertura: 200 }), 60);
  assert.equal(campoDeVisao({ abertura: undefined }), CONFIG.camera.campoDeVisao);
  assert.equal(campoDeVisao({ abertura: NaN }), CONFIG.camera.campoDeVisao);
  assert.equal(campoDeVisao({ abertura: 55, primeiraPessoa: true }), CONFIG.render.campoDeVisao);
  assert.equal(campoDeVisao({ abertura: 55, titulo: true }), CONFIG.render.campoDeVisao);
  assert.equal(campoDeVisao({ abertura: 55, toque: true, proporcao: 0.5 }), CONFIG.render.campoDeVisaoCelularEmPe);
});

test('CAM4: recentralizar sozinha espera 1,5 s andando sem mouse, volta devagar e o mouse cancela na hora', () => {
  const CAM = CONFIG.camera;
  const rodar = (segundos, s, fps = 60, estado = { tempo: 0 }) => {
    let yaw = s.yaw;
    for (let i = 0; i < Math.round(segundos * fps); i++) yaw = recentralizar(estado, { ...s, yaw }, 1 / fps, CAM);
    return { yaw, estado };
  };
  const andando = { yaw: 0, rumo: 1, andando: true, mouse: false, travada: false, ligada: true };
  // Antes da espera não gira; depois gira na direção do corpo, sem passar da velocidade máxima, e chega lá.
  assert.equal(rodar(CAM.recentrarEspera - 0.1, andando).yaw, 0);
  const meio = rodar(CAM.recentrarEspera + 1, andando).yaw;
  assert.ok(meio > 0.05 && meio <= CAM.recentrarVelMax * 1 + 1e-9, `yaw ${meio}`);
  assert.ok(Math.abs(rodar(12, andando).yaw - 1) < 0.01);
  // Começa devagar: no primeiro quadro depois da espera o giro é quase nada.
  const estado = { tempo: CAM.recentrarEspera };
  assert.ok(recentralizar(estado, andando, 1 / 60, CAM) < CAM.recentrarVelMax / 60 * 0.1);
  // Vai pelo caminho mais curto (corpo à direita: o yaw diminui) e dá quase o mesmo a 30 e a 144 quadros.
  assert.ok(rodar(4, { ...andando, rumo: -1 }).yaw < -0.3);
  assert.ok(Math.abs(rodar(4, andando, 30).yaw - rodar(4, andando, 144).yaw) < 0.02);
  // Desligada, parado, mira travada ou mouse mexendo: não gira nunca.
  for (const troca of [{ ligada: false }, { andando: false }, { travada: true }, { mouse: true }]) {
    assert.equal(rodar(6, { ...andando, ...troca }).yaw, 0, JSON.stringify(troca));
  }
  // Mexer o mouse cancela na hora e a espera recomeça do zero.
  const girando = rodar(3, andando);
  assert.ok(girando.yaw > 0);
  assert.equal(recentralizar(girando.estado, { ...andando, yaw: girando.yaw, mouse: true }, 1 / 60, CAM), girando.yaw);
  assert.equal(girando.estado.tempo, 0);
  assert.equal(rodar(CAM.recentrarEspera - 0.1, { ...andando, yaw: girando.yaw }, 60, girando.estado).yaw, girando.yaw);
  // Andando de frente para a câmera (corpo virado ao contrário do olhar): ela não gira.
  assert.equal(rodar(6, { ...andando, rumo: Math.PI }).yaw, 0);
  assert.equal(rodar(6, { ...andando, rumo: 3 }).yaw, 0);
  // Pausa (dt 0) não mexe em nada.
  assert.equal(recentralizar({ tempo: 9 }, andando, 0, CAM), 0);
});

test('CAM4: desviar de paredes gira para o lado livre, devagar, e fica parado com os lados iguais', () => {
  const CAM = CONFIG.camera;
  assert.equal(desvioDeParede(1, 1, CAM), 0);              // campo aberto
  assert.equal(desvioDeParede(0.4, 0.4, CAM), 0);          // parede bem atrás: só o encurtar da CAM2
  assert.equal(desvioDeParede(1, 1 - CAM.desviarMargem / 2, CAM), 0);   // diferença pequena demais
  assert.ok(desvioDeParede(1, 0.5, CAM) > 0 && desvioDeParede(0.5, 1, CAM) < 0);   // vai para o lado mais livre
  assert.equal(desvioDeParede(1, 0.5, CAM), -desvioDeParede(0.5, 1, CAM));
  assert.ok(desvioDeParede(1, 0.2, CAM) > desvioDeParede(1, 0.6, CAM));            // parede mais perto: mais rápido
  assert.ok(Math.abs(desvioDeParede(1, 0, CAM) - CAM.desviarVel) < 1e-9);          // nunca passa do máximo
  assert.ok(Math.abs(desvioDeParede(5, -3, CAM) - CAM.desviarVel) < 1e-9);
});

test('CAM4: na partida, a câmera se afasta da parede ao lado só com a opção ligada, sem mira e sem mouse', () => {
  const montar = (preferencias) => {
    const { jogador, colisores, entrada, alvo } = arena();
    Object.assign(jogador.jogo.preferencias, preferencias);
    alvo.pos.set(0, 0, -30);
    colisores.adicionar(1.8, 3, 1, 12);            // parede comprida à direita da câmera (x de 1,3 a 2,3)
    jogador.reiniciar(0, 0, 0);
    return { jogador, entrada, alvo };
  };
  const rodar = (jogador, quadros = 240) => { for (let i = 0; i < quadros; i++) jogador.atualizar(1 / 60); };

  const ligada = montar({ cameraDesviar: true });
  rodar(ligada.jogador, 1);
  assert.equal(ligada.jogador.yaw, 0);              // espera um instante antes de agir
  rodar(ligada.jogador);
  assert.ok(ligada.jogador.yaw < -0.02 && ligada.jogador.yaw > -CONFIG.camera.desviarAngulo, `yaw ${ligada.jogador.yaw}`);
  assert.ok(ligada.jogador.jogo.camera.position.x < 0);   // a câmera foi para o lado livre
  const parou = ligada.jogador.yaw;
  rodar(ligada.jogador, 120);
  assert.ok(Math.abs(ligada.jogador.yaw - parou) < 0.01); // gira "um pouco" e para

  const desligada = montar({ cameraDesviar: false });
  rodar(desligada.jogador);
  assert.equal(desligada.jogador.yaw, 0);

  const comMira = montar({ cameraDesviar: true });
  comMira.alvo.pos.set(0, 0, -4);
  comMira.jogador.travar(comMira.alvo);
  rodar(comMira.jogador);
  assert.ok(Math.abs(comMira.jogador.yaw) < 1e-6);

  const primeira = montar({ cameraDesviar: true, cameraRecentrar: true, perspectiva: 'primeira' });
  rodar(primeira.jogador);
  assert.equal(primeira.jogador.yaw, 0);
});
