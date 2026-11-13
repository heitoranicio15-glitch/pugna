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
import { MaquinaDeAtaque, golpeAlcanca, montarGolpe, sortearSequencia } from '../src/entidades/Ataques.js';
import { Inimigo } from '../src/entidades/Inimigo.js';
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
  const cav = CONFIG.inimigos.cavaleiro;
  const alto = montarGolpe(cav, 'alto'), pesado = montarGolpe(cav, 'pesado'), rasteira = montarGolpe(cav, 'rasteira');
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

test('regra de ouro: a rasteira pede pulo; aparar e bloquear não servem contra ela', () => {
  const { jogador, entrada, eventos, alvo } = arena();
  const rasteira = montarGolpe(CONFIG.inimigos.cavaleiro, 'rasteira');
  const erros = [];
  eventos.em('jogador:resposta-errada', (e) => erros.push(e.resposta));
  let pulos = 0;
  eventos.em('jogador:pulou-golpe', () => pulos++);
  alvo.serAparado = () => assert.fail('a rasteira não pode ser aparada');

  // No ar, acima da lâmina: nenhum dano.
  jogador.noChao = false; jogador.pos.y = 0.5;
  assert.equal(jogador.receberDano(rasteira.dano, alvo.pos, alvo, rasteira), 'pulou');
  assert.deepEqual([jogador.vida, pulos], [100, 1]);
  // Um golpe alto acerta quem está no ar do mesmo jeito.
  assert.equal(jogador.receberDano(10, alvo.pos, alvo, montarGolpe(CONFIG.inimigos.cavaleiro, 'alto')), 'ferido');
  jogador.noChao = true; jogador.pos.y = 0; jogador.vel.set(0, 0, 0); jogador.vida = 100;

  // Aparar no tempo certo não adianta.
  entrada.apertou = (codigo) => codigo === 'KeyC';
  jogador.atualizar(0.01);
  entrada.apertou = () => false;
  jogador.atualizar(0.1);
  assert.equal(jogador.receberDano(rasteira.dano, alvo.pos, alvo, rasteira), 'ferido');
  assert.equal(jogador.vida, 100 - rasteira.dano);

  // Bloquear também não: o dano entra inteiro e a estamina não é gasta.
  jogador.acao = 'livre'; jogador.bloqueando = true; jogador.vida = 100;
  const estamina = jogador.estamina;
  assert.equal(jogador.receberDano(rasteira.dano, alvo.pos, alvo, rasteira), 'ferido');
  assert.deepEqual([jogador.vida, jogador.estamina], [100 - rasteira.dano, estamina]);
  assert.deepEqual(erros, ['aparar', 'bloquear']);
});

test('regra de ouro: o golpe pesado tem janela de aparo menor e pesa mais no bloqueio', () => {
  const { jogador, entrada, alvo } = arena();
  const pesado = montarGolpe(CONFIG.inimigos.cavaleiro, 'pesado');
  const alto = montarGolpe(CONFIG.inimigos.cavaleiro, 'alto');
  const recebidos = [];
  alvo.serAparado = (g) => recebidos.push(g.tipo);
  const aparar = (espera) => {
    jogador.reiniciar(0, 0, 0);
    entrada.apertou = (codigo) => codigo === 'KeyC';
    jogador.atualizar(0.01);
    entrada.apertou = () => false;
    jogador.atualizar(espera);
  };
  const ap = CONFIG.combate.aparar;
  // No fim da janela comum: o alto é aparado, o pesado entra.
  const tarde = ap.preparo + ap.janela * 0.9;
  aparar(tarde);
  assert.equal(jogador.receberDano(alto.dano, alvo.pos, alvo, alto), 'aparou');
  aparar(tarde);
  assert.equal(jogador.receberDano(pesado.dano, alvo.pos, alvo, pesado), 'ferido');
  // No começo da janela o pesado também é aparado.
  aparar(ap.preparo + ap.janela * pesado.janelaAparar * 0.5);
  assert.equal(jogador.receberDano(pesado.dano, alvo.pos, alvo, pesado), 'aparou');
  assert.deepEqual(recebidos, ['alto', 'pesado']);

  jogador.reiniciar(0, 0, 0);
  jogador.bloqueando = true;
  assert.equal(jogador.receberDano(alto.dano, alvo.pos, alvo, alto), 'bloqueou');
  const gastoAlto = 100 - jogador.estamina;
  jogador.estamina = 100;
  assert.equal(jogador.receberDano(pesado.dano, alvo.pos, alvo, pesado), 'bloqueou');
  assert.ok(100 - jogador.estamina > gastoAlto * 2);
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

test('aparar mantém o desequilíbrio e o crítico; o pesado aparado deixa o gancho da execução', () => {
  const { jogador, entrada, inimigo, rodar } = duelo();
  const aparar = (tipo) => {
    jogador.reiniciar(0, 0, 0);
    inimigo.mudar('perseguir');
    inimigo.atacar([tipo]);
    const ap = CONFIG.combate.aparar;
    rodar(() => inimigo.golpe.preparo - inimigo.ataque.t <= ap.preparo + 0.03);
    entrada.apertou = (codigo) => codigo === 'KeyC';
    jogador.atualizar(0.01);
    entrada.apertou = () => false;
    for (let i = 0; i < 12 && inimigo.estado !== 'desequilibrado'; i++) { jogador.atualizar(0.01); inimigo.atualizar(0.01); }
  };
  aparar('alto');
  assert.deepEqual([inimigo.estado, inimigo.abertoParaExecucao, jogador.vida], ['desequilibrado', false, 100]);
  const vida = inimigo.vida;
  assert.equal(inimigo.receberDano(10, { x: 0, z: -1 }, 0, false), 'critico');
  assert.equal(inimigo.vida, vida - 10 * CONFIG.combate.critico.multiplicador);

  inimigo.reiniciar();
  inimigo.angulo = 0;
  aparar('pesado');
  assert.deepEqual([inimigo.estado, inimigo.abertoParaExecucao, jogador.vida], ['desequilibrado', true, 100]);
  rodar(() => inimigo.estado !== 'desequilibrado');
  assert.equal(inimigo.abertoParaExecucao, false);
});
