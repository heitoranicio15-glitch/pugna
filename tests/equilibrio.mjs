// =============================================================================
//  SIMULADOR DE EQUILÍBRIO (Etapa E, item E1)
//  Roda lutas inteiras numa arena vazia, sem WebGL, com o Jogador e os Inimigos
//  de verdade (as mesmas regras do jogo), e conta quem vence.
//
//  É lento demais para o `npm test`: rode à mão com
//      node tests/equilibrio.mjs                 (60 lutas por cenário)
//      node tests/equilibrio.mjs --lutas 20      (menos lutas, mais rápido)
//      node tests/equilibrio.mjs --cenario guardiao --jogador habil
//  Os testes rápidos (tests/equilibrio.test.js) importam as funções daqui.
//
//  Tudo é determinístico: cada luta usa uma semente fixa (1, 2, 3...). O
//  Math.random do jogo é trocado por um gerador com semente durante a luta, e
//  o tempo anda em passos fixos de 1/60 s. A pausa de impacto ("hit stop") do
//  Jogo.js não entra (ela congela os dois lados igual).
//
//  Jogadores simulados:
//    spam    só aperta o ataque leve a cada 0,08 s, parado, com a ajuda de
//            mira do jogo (o golpe se volta ao inimigo mais perto). Não bebe.
//    habil   o mais simples que apara e esquiva. Trava a mira no inimigo mais
//            perto. Só "vê" um golpe depois de um tempo de reação sorteado
//            (0,15 a 0,25 s depois de o aviso começar). Aí decide:
//              aparável (alto, pesado) e tem bala → atira mirando o meio da
//                janela do parry, com erro de mira no tempo (desvio 0,045 s);
//              rasteira → pula um pouco antes do golpe;
//              inaparável (ou sem bala) → quickstep para trás bem na hora.
//            Inimigo desequilibrado por perto → ataca (vira visceral/execução).
//            Senão, ataca leve quando nenhum golpe que ele já viu vai cair nos
//            próximos 0,6 s. Com pouca vida, corre para longe e só bebe o
//            frasco (3 por luta, 42 de cura) com todo mundo a mais de 7,5 m.
//    esquiva o "esquiva e bate": igual ao hábil, mas nunca atira nem pula:
//            responde a todo golpe com o quickstep.
// =============================================================================
import * as THREE from 'three';
import { pathToFileURL } from 'node:url';
import { CONFIG } from '../src/config.js';
import { Jogador } from '../src/entidades/Jogador.js';
import { Inimigo } from '../src/entidades/Inimigo.js';
import { Fichas } from '../src/entidades/Fichas.js';
import { Eventos } from '../src/nucleo/Eventos.js';
import { CURA_FRASCO } from '../src/nucleo/Inventario.js';
import { Colisores } from '../src/mundo/Colisores.js';
import { Navegacao } from '../src/mundo/Navegacao.js';

export const PASSO = 1 / 60;          // segundos por passo da simulação
export const LIMITE = 240;            // segundos: passou disso, a luta conta como derrota
export const REACAO = [0.15, 0.25];   // tempo de reação do jogador hábil (sorteado por golpe)
export const ERRO_TIRO = 0.045;       // desvio (s) do momento do tiro em relação ao meio da janela
export const FRASCOS = 3;             // frascos do jogador hábil por luta

// Cenários: [tipo, x, z] de cada inimigo; o caçador começa em (0, 0) olhando para -z.
export const CENARIOS = {
  guardiao: [['guardiao', 0, -4]],
  cavaleiros2: [['cavaleiro', -1.5, -5], ['cavaleiro', 1.5, -5]],
  cavaleiros3: [['cavaleiro', -2.2, -5], ['cavaleiro', 0, -5.6], ['cavaleiro', 2.2, -5]],
  mistos3: [['cavaleiro', -2.2, -5], ['cacador', 0, -5.6], ['penitente', 2.2, -5]],
};
export const JOGADORES = ['spam', 'habil', 'esquiva'];

/** Gerador de números com semente (mulberry32): mesma semente, mesma luta. */
export function geradorComSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tela de mentira: fora do navegador, as texturas do inimigo só precisam existir.
function semNavegador() {
  globalThis.document ??= { createElement: () => ({
    getContext: () => ({ createImageData: (l, a) => ({ data: new Uint8ClampedArray(l * a * 4) }), putImageData() {} }),
  }) };
}

/** Teclado e mouse de mentira, apertados pelo jogador simulado. */
function entradaFalsa() {
  const seguradas = new Set(), apertadas = new Set();
  return {
    seguradas, apertadas,
    botoes: [false, false, false], botoesApertados: [false, false, false],
    mouseDX: 0, mouseDY: 0,
    segurando: (codigo) => seguradas.has(codigo),
    apertou: (codigo) => apertadas.has(codigo),
    limpar() { apertadas.clear(); this.botoesApertados.fill(false); },
  };
}

/** Monta a arena vazia com o caçador e os inimigos do cenário. */
function montarArena(cenario) {
  semNavegador();
  const colisores = new Colisores();
  const eventos = new Eventos();
  const entrada = entradaFalsa();
  const jogo = {
    entrada, eventos, mundo: { colisores }, inimigos: [],
    preferencias: { sensibilidade: 100 }, camera: new THREE.PerspectiveCamera(),
    pausaDeImpacto() {},
  };
  const jogador = new Jogador(jogo);
  jogo.jogador = jogador;
  const mundo = {
    grupo: new THREE.Group(), colisores, entidades: [], fichas: new Fichas(),
    navegacao: new Navegacao(colisores, { minX: -60, maxX: 60, minZ: -60, maxZ: 60 }),
  };
  for (const [tipo, x, z] of CENARIOS[cenario]) {
    const inimigo = new Inimigo(jogo, mundo, { tipo, rota: [[x, z]] });
    inimigo.angulo = Math.PI;   // virado para o caçador (que está em z = 0)
    inimigo.mudar('perseguir');
    mundo.entidades.push(inimigo);
    jogo.inimigos.push(inimigo);
  }
  return { jogo, jogador, entrada, eventos, inimigos: jogo.inimigos };
}

const distancia = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
const normal = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

// -----------------------------------------------------------------------------
//  Os cérebros dos jogadores simulados. Cada um recebe o estado e aperta teclas.
// -----------------------------------------------------------------------------

/** Só aperta o ataque leve a cada 0,08 s. */
function cerebroSpam() {
  let espera = 0;
  return ({ entrada, dt }) => {
    espera -= dt;
    if (espera <= 0) { entrada.botoesApertados[0] = true; espera += 0.08; }
  };
}

/**
 * O jogador que responde aos golpes. respostas: 'certa' (apara, pula, esquiva o
 * inaparável) ou 'esquiva' (responde tudo com o quickstep).
 */
function cerebroHabil(r, respostas = 'certa') {
  const vistos = new Map();   // golpe → plano { visto, impacto, acao, quando, feito }
  let frascos = FRASCOS, fugindo = false;
  return ({ jogador, inimigos, entrada, t }) => {
    const vivos = inimigos.filter((i) => !i.morto);
    if (!vivos.length) return;
    let perto = vivos[0];
    for (const i of vivos) if (distancia(i, jogador) < distancia(perto, jogador)) perto = i;
    if (jogador.alvo !== perto && (!jogador.alvo || jogador.alvo.morto ||
        distancia(jogador.alvo, jogador) > distancia(perto, jogador) + 1)) jogador.travar(perto);
    const alvo = jogador.alvo ?? perto;

    // Golpes novos: o plano só passa a valer depois do tempo de reação.
    for (const i of vivos) {
      const g = i.ataque.golpe;
      if (!g || i.ataque.fase !== 'preparo' || vistos.has(g)) continue;
      const impacto = t + (g.preparo - i.ataque.t);
      const reacao = REACAO[0] + r() * (REACAO[1] - REACAO[0]);
      let acao, quando;
      if (respostas === 'certa' && g.aparavel && jogador.balas > 0) {
        const P = CONFIG.combate.pistola, m = g.janelaAparar ?? 1;
        acao = 'tiro'; quando = impacto - (P.janelaNoAviso * m - P.janelaNoGolpe * m) / 2 + normal(r) * ERRO_TIRO;
      } else if (respostas === 'certa' && g.evitaPulando) {
        acao = 'pulo'; quando = impacto - 0.12 + normal(r) * 0.035;
      } else {
        acao = 'esquiva'; quando = impacto - 0.04 + normal(r) * 0.03;
      }
      vistos.set(g, { inimigo: i, visto: t + reacao, impacto, acao, quando, feito: false });
    }
    for (const [g, p] of vistos) if (p.impacto < t - 2) vistos.delete(g);

    // O que ele já viu e vai cair logo, perto o bastante para acertar.
    const conhecidos = [...vistos.values()].filter((p) => p.visto <= t && !p.feito && !p.inimigo.morto &&
      p.inimigo.ataque.golpe && distancia(p.inimigo, jogador) <= p.inimigo.ataque.golpe.alcance + 1.6);
    const proximoImpacto = Math.min(Infinity, ...conhecidos.map((p) => p.impacto));

    entrada.seguradas.clear();
    for (const p of conhecidos) {
      if (t < p.quando || t > p.impacto + 0.1) continue;
      p.feito = true;
      if (p.acao === 'tiro') { if (p.inimigo !== jogador.alvo) jogador.travar(p.inimigo); entrada.apertadas.add('KeyC'); }
      else if (p.acao === 'pulo') entrada.apertadas.add('Space');
      else entrada.apertadas.add('KeyQ');   // com a mira travada e parado: quickstep para trás
      return;
    }

    // Frasco: com pouca vida, foge e só bebe com todo mundo longe.
    if (jogador.vida < 40 && frascos > 0) fugindo = true;
    if (fugindo) {
      const longe = vivos.every((i) => distancia(i, jogador) > 7.5);
      if (longe && jogador.acao === 'livre' && jogador.tEsquiva <= 0) {
        jogador.comecarCura(); frascos--; fugindo = false;
      } else if (!longe && proximoImpacto - t > 0.35) {
        entrada.seguradas.add('KeyS'); entrada.seguradas.add('ShiftLeft');
      }
      return;
    }

    // Inimigo aberto por perto: o ataque vira visceral (ou execução).
    const aberto = vivos.find((i) => i.estado === 'desequilibrado' && distancia(i, jogador) < 3.5);
    if (aberto) {
      if (jogador.alvo !== aberto) jogador.travar(aberto);
      if (distancia(aberto, jogador) > 2) entrada.seguradas.add('KeyW');
      else entrada.botoesApertados[0] = true;
      return;
    }

    // Distância: nem longe demais para bater, nem colado.
    const d = distancia(alvo, jogador);
    const seguro = proximoImpacto - t > 0.6;
    if (d > 2.3 && seguro) entrada.seguradas.add('KeyW');
    else if (d < 1.3) entrada.seguradas.add('KeyS');
    const L = CONFIG.combate.leve, E = CONFIG.combate.quickstep;
    if (seguro && d <= L.alcance + alvo.raio && !jogador.exausto && jogador.estamina >= L.custo + E.custo) {
      entrada.botoesApertados[0] = true;
    }
  };
}

/**
 * Uma luta inteira. Devolve { venceu, vida, tempo, mortos, frascos }.
 * jogador: 'spam' | 'habil' | 'esquiva'.
 */
export function lutar({ cenario, jogador: tipoJogador, semente, passo = PASSO, limite = LIMITE }) {
  const original = Math.random;
  Math.random = geradorComSemente(semente);   // o sorteio dos inimigos fica fixo
  try {
    const { jogador, entrada, eventos, inimigos } = montarArena(cenario);
    let curas = 0;
    const conta = { aparou: 0, ferido: 0, visceral: 0, esquiva: 0, pulou: 0 };
    eventos.em('jogador:aparou', () => conta.aparou++);
    eventos.em('jogador:ferido', () => conta.ferido++);
    eventos.em('jogador:visceral', () => conta.visceral++);
    eventos.em('jogador:esquiva', () => conta.esquiva++);
    eventos.em('jogador:pulou-golpe', () => conta.pulou++);
    eventos.em('jogador:curou', () => {   // o que o Jogo.concluirCura faz
      curas++;
      jogador.vida = Math.min(CONFIG.jogador.vidaMax, jogador.vida + CURA_FRASCO);
      jogador.recuperavel = Math.min(jogador.recuperavel, CONFIG.jogador.vidaMax - jogador.vida);
    });
    const r = geradorComSemente(semente * 7919 + 13);   // sorteio do jogador, separado do jogo
    const cerebro = tipoJogador === 'spam' ? cerebroSpam()
      : cerebroHabil(r, tipoJogador === 'esquiva' ? 'esquiva' : 'certa');
    let t = 0;
    while (t < limite && !jogador.morto && inimigos.some((i) => !i.morto)) {
      cerebro({ jogador, inimigos, entrada, t, dt: passo });
      jogador.atualizar(passo);
      entrada.limpar();
      for (const i of inimigos) i.atualizar(passo);
      t += passo;
    }
    const venceu = !jogador.morto && inimigos.every((i) => i.morto);
    return { venceu, vida: venceu ? jogador.vida : 0, tempo: t, mortos: inimigos.filter((i) => i.morto).length, frascos: curas, conta };
  } finally {
    Math.random = original;
  }
}

const mediana = (lista) => {
  if (!lista.length) return 0;
  const o = [...lista].sort((a, b) => a - b), m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

/** Roda as sementes 1..lutas de um cenário e resume. */
export function rodarCenario(cenario, tipoJogador, lutas = 60) {
  const resultados = [];
  for (let semente = 1; semente <= lutas; semente++) resultados.push(lutar({ cenario, jogador: tipoJogador, semente }));
  const vitorias = resultados.filter((x) => x.venceu);
  return {
    cenario, jogador: tipoJogador, lutas,
    vitorias: vitorias.length,
    taxa: vitorias.length / lutas,
    medianaVida: Math.round(mediana(vitorias.map((x) => x.vida))),
    tempoMedio: Math.round(resultados.reduce((s, x) => s + x.tempo, 0) / lutas * 10) / 10,
  };
}

// ---- Rodando direto pelo terminal ----
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (nome, padrao) => {
    const i = process.argv.indexOf(`--${nome}`);
    return i >= 0 ? process.argv[i + 1] : padrao;
  };
  const lutas = Number(arg('lutas', 60));
  const cenarios = arg('cenario', null)?.split(',') ?? Object.keys(CENARIOS);
  const jogadores = arg('jogador', null)?.split(',') ?? JOGADORES;
  console.log(`Equilíbrio: ${lutas} lutas por cenário, passo de ${PASSO.toFixed(4)} s, limite de ${LIMITE} s`);
  console.log('cenário      jogador   vitórias   mediana de vida   tempo médio');
  for (const c of cenarios) {
    for (const j of jogadores) {
      const inicio = Date.now();
      const s = rodarCenario(c, j, lutas);
      console.log(`${c.padEnd(12)} ${j.padEnd(9)} ${`${s.vitorias}/${lutas}`.padStart(7)} (${String(Math.round(s.taxa * 100)).padStart(3)}%)` +
        `   ${String(s.medianaVida).padStart(6)}            ${String(s.tempoMedio).padStart(6)} s   [${((Date.now() - inicio) / 1000).toFixed(1)} s]`);
    }
  }
}
