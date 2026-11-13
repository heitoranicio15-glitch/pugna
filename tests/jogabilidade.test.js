import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { Jogador } from '../src/entidades/Jogador.js';
import { Eventos } from '../src/nucleo/Eventos.js';
import { normalizarProgresso, SalvamentoLocal } from '../src/nucleo/Salvamento.js';
import { Colisores } from '../src/mundo/Colisores.js';
import { Navegacao } from '../src/mundo/Navegacao.js';
import { alvoDaMira, alvoProximo } from '../src/mundo/Interacoes.js';
import { contarFrascos } from '../src/nucleo/Inventario.js';
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

test('aparar na janela anula o dano e desequilibra o atacante; fora dela o golpe entra', () => {
  const { jogador, entrada, eventos, alvo } = arena();
  let aparados = 0;
  alvo.serAparado = () => aparados++;
  let sinais = 0;
  eventos.em('jogador:aparou', () => sinais++);
  entrada.apertou = (codigo) => codigo === 'KeyC';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  assert.equal(jogador.acao, 'aparar');
  assert.equal(jogador.estamina, 100 - CONFIG.combate.aparar.custo);
  jogador.atualizar(0.1);
  assert.equal(jogador.receberDano(34, alvo.pos, alvo), 'aparou');
  assert.deepEqual([jogador.vida, aparados, sinais, jogador.acao], [100, 1, 1, 'livre']);

  // Cedo demais: o gesto termina antes do golpe e o dano entra inteiro.
  jogador.invencivel = 0;
  entrada.apertou = (codigo) => codigo === 'KeyC';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  for (let i = 0; i < 6; i++) jogador.atualizar(0.05);
  assert.equal(jogador.acao, 'aparar');
  assert.equal(jogador.receberDano(34, alvo.pos, alvo), 'ferido');
  assert.deepEqual([jogador.vida, aparados], [66, 1]);
});

test('aparar só vale de frente e o golpe em inimigo desequilibrado é crítico', () => {
  const { jogador, entrada, eventos, alvo } = arena();
  entrada.apertou = (codigo) => codigo === 'KeyC';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  jogador.atualizar(0.1);
  assert.equal(jogador.receberDano(10, { x: 0, z: 3 }), 'ferido');

  const golpes = [];
  eventos.em('golpe:acertou', (g) => golpes.push(g.critico));
  alvo.receberDano = () => 'critico';
  jogador.acao = 'livre';
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
