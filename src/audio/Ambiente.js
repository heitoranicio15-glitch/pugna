import { criarPlanejador, nivelDoFade, rampaCrossfade, taxasDoSom, TIPOS_DE_SOM } from './regras.js';
// =============================================================================
//  SOM AMBIENTE POR ÁREA
//  Camadas contínuas (ruído filtrado e osciladores) mais eventos esparsos
//  (grilo, sino, gota, estalo, rangido) sorteados no relógio do AudioContext.
//  Uma `Cena` é o ambiente de uma área; ao trocar de área a antiga some e a nova
//  entra em potência igual (sem estalo), e a antiga é desligada e solta.
// =============================================================================

const ADIANTE = 1.2;        // quanto o planejador agenda à frente (s)
const PERIODO = 500;        // de quanto em quanto tempo ele acorda (ms)
const NIVEL = 0.8;          // nível geral do ambiente: baixo, por baixo da música e dos efeitos
const ALEATORIO = (a, b) => a + Math.random() * (b - a);

class Cena {
  constructor(ctx, chiado, destino, som, { ativo, relogio }) {
    this.ctx = ctx;
    this.chiado = chiado;
    this.som = som;
    this.ativo = ativo;
    this.relogio = relogio;
    this.fontes = [];
    this.fade = null;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(destino);
    this.saidaEco = null;
    this.vozes = {};
    CONSTRUTORES[som.tipo](this, som);
    this.planejador = criarPlanejador(taxasDoSom(som), Math.random, ctx.currentTime);
    this.ultimo = ctx.currentTime;
    this.timer = relogio.setInterval(() => this.agendar(), PERIODO);
  }

  /** Sorteia e agenda os eventos dos próximos instantes. Não cria nada se o som está mudo. */
  agendar() {
    const agora = this.ctx.currentTime;
    if (agora - this.ultimo > 3) this.planejador.saltarPara(agora);   // aba parada: não recupera o atraso
    this.ultimo = agora;
    for (const e of this.planejador.ate(agora + ADIANTE)) {
      if (this.ativo()) this.vozes[e.nome]?.(Math.max(e.t, agora));
    }
  }

  // ---- peças para montar camadas ----
  /** Chiado contínuo filtrado, ligado ao barramento da cena. Devolve { filtro, ganho }. */
  ruido({ tipo = 'bandpass', freq = 400, q = 0.7, ganho = 0.05, destino = this.bus }) {
    const c = this.ctx;
    const fonte = c.createBufferSource(); fonte.buffer = this.chiado; fonte.loop = true;
    const filtro = c.createBiquadFilter(); filtro.type = tipo; filtro.frequency.value = freq; filtro.Q.value = q;
    const g = c.createGain(); g.gain.value = ganho;
    fonte.connect(filtro).connect(g).connect(destino);
    fonte.start(0, Math.random() * 1.5);
    this.fontes.push(fonte);
    return { filtro, ganho: g };
  }

  /** Oscilador lento que mexe num parâmetro (volume ou frequência do filtro). */
  lfo(freq, profundidade, param) {
    const o = this.ctx.createOscillator(); o.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = profundidade;
    o.connect(g).connect(param); o.start();
    this.fontes.push(o);
  }

  /** Tom curto num instante marcado. Devolve o ganho (para rampas extras). */
  tom(t, { freq, ate = freq, volume = 0.05, duracao = 0.2, forma = 'sine', destino = this.bus, ataque = 0.005 }) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = forma;
    o.frequency.setValueAtTime(freq, t);
    if (ate !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, ate), t + duracao);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(volume, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    o.connect(g).connect(destino);
    o.start(t); o.stop(t + duracao + 0.05);
    return g;
  }

  /** Estouro curto de chiado filtrado num instante marcado. */
  estouro(t, { tipo = 'highpass', freq = 3000, q = 1, volume = 0.05, duracao = 0.04, destino = this.bus }) {
    const c = this.ctx;
    const fonte = c.createBufferSource(); fonte.buffer = this.chiado;
    const filtro = c.createBiquadFilter(); filtro.type = tipo; filtro.frequency.value = freq; filtro.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    fonte.connect(filtro).connect(g).connect(destino);
    fonte.start(t, Math.random() * 1.5); fonte.stop(t + duracao + 0.02);
  }

  /** Começa a sumir (ou a entrar) em `duracao` segundos, partindo do nível de agora. */
  rampa(entrando, duracao) {
    const t = this.ctx.currentTime;
    const nivel = entrando ? NIVEL : nivelDoFade(this.fade, t);
    const p = this.bus.gain;
    p.cancelScheduledValues(t);
    const valores = rampaCrossfade(entrando, nivel);
    p.setValueAtTime(valores[0], t);
    for (let k = 1; k < valores.length; k++) p.linearRampToValueAtTime(valores[k], t + duracao * k / (valores.length - 1));
    this.fade = { t0: t, duracao, entrando, nivel };
    return t;
  }

  /** Para o sorteio e agenda o fim de todas as fontes; o resto é solto por `soltar`. */
  aposentar(duracao) {
    const t = this.rampa(false, duracao);
    this.relogio.clearInterval(this.timer);
    for (const f of this.fontes) { try { f.stop(t + duracao + 0.05); } catch { /* já parou */ } }
    this.relogio.setTimeout(() => this.bus.disconnect(), (duracao + 0.3) * 1000);
  }
}

// ---- Os tipos: cada um monta suas camadas contínuas e diz como soam seus eventos. ----
const CONSTRUTORES = {
  // Vila: vento suave, grilo esparso e um sino distante, raro.
  vila(cena, som) {
    const vento = cena.ruido({ freq: 420, q: 0.6, ganho: 0.12 * (som.vento ?? 0) });
    cena.lfo(0.11, 150, vento.filtro.frequency);
    cena.lfo(0.07, 0.05 * (som.vento ?? 0), vento.ganho.gain);
    cena.vozes.grilo = (t) => {
      const f = ALEATORIO(4100, 4600), n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) cena.tom(t + k * 0.085, { freq: f, volume: 0.025, duracao: 0.05, ataque: 0.01 });
    };
    cena.vozes.sino = (t) => {
      const base = Math.random() < 0.5 ? 196 : 247;
      const abafa = cena.ctx.createBiquadFilter(); abafa.type = 'lowpass'; abafa.frequency.value = 900;
      abafa.connect(cena.bus);
      for (const [m, v] of [[1, 1], [2.01, 0.5], [2.76, 0.3]]) {
        cena.tom(t, { freq: base * m, volume: 0.04 * v, duracao: 4.5 / Math.sqrt(m), destino: abafa, ataque: 0.02 });
      }
    };
  },

  // Pedra (catedral): ar parado, gotas e um eco que repete e se apaga.
  pedra(cena, som) {
    const ar = cena.ruido({ tipo: 'lowpass', freq: 240, q: 0.5, ganho: 0.14 * (som.vento ?? 0) });
    cena.lfo(0.06, 0.06 * (som.vento ?? 0), ar.ganho.gain);
    const eco = som.eco ?? 0;
    const entradaEco = cena.ctx.createGain(); entradaEco.gain.value = eco;
    const atraso = cena.ctx.createDelay(1); atraso.delayTime.value = 0.43;
    const retorno = cena.ctx.createGain(); retorno.gain.value = Math.min(0.6, 0.15 + eco * 0.45);   // abaixo de 1: o eco se apaga
    const abafa = cena.ctx.createBiquadFilter(); abafa.type = 'lowpass'; abafa.frequency.value = 1800;
    entradaEco.connect(atraso); atraso.connect(abafa); abafa.connect(retorno); retorno.connect(atraso);
    abafa.connect(cena.bus);
    cena.vozes.gotas = (t) => {
      const f = ALEATORIO(900, 1700);
      const g = cena.tom(t, { freq: f, ate: f * 0.7, volume: 0.07, duracao: 0.14, ataque: 0.003 });
      g.connect(entradaEco);
    };
  },

  // Taverna: fogo crepitando e um murmúrio grave de vozes.
  taverna(cena, som) {
    const fogo = som.fogo ?? 0;
    const ronco = cena.ruido({ tipo: 'lowpass', freq: 280, q: 0.5, ganho: 0.1 * fogo });
    cena.lfo(0.37, 0.035 * fogo, ronco.ganho.gain);
    cena.lfo(0.91, 0.02 * fogo, ronco.ganho.gain);
    const m = som.murmurio ?? 0;
    const vozA = cena.ruido({ freq: 190, q: 3, ganho: 0.08 * m });
    cena.lfo(0.31, 0.05 * m, vozA.ganho.gain);
    const vozB = cena.ruido({ freq: 330, q: 3, ganho: 0.06 * m });
    cena.lfo(0.23, 0.035 * m, vozB.ganho.gain);
    cena.vozes.estalo = (t) => {
      const forte = Math.random() < 0.15;
      cena.estouro(t, { freq: ALEATORIO(2200, 6000), q: ALEATORIO(0.7, 2), volume: (forte ? 0.16 : ALEATORIO(0.04, 0.09)) * (0.5 + 0.5 * fogo), duracao: forte ? 0.06 : 0.03 });
    };
  },

  // Estrada: vento mais forte, madeira que range e o riacho ao longe.
  estrada(cena, som) {
    const vento = cena.ruido({ freq: 520, q: 0.5, ganho: 0.15 * (som.vento ?? 0) });
    cena.lfo(0.13, 230, vento.filtro.frequency);
    cena.lfo(0.09, 0.06 * (som.vento ?? 0), vento.ganho.gain);
    const agua = som.agua ?? 0;
    const riacho = cena.ruido({ freq: 950, q: 1.1, ganho: 0.05 * agua });
    cena.lfo(0.7, 0.02 * agua, riacho.ganho.gain);
    const borbulha = cena.ruido({ freq: 1600, q: 2, ganho: 0.025 * agua });
    cena.lfo(1.3, 0.012 * agua, borbulha.ganho.gain);
    cena.vozes.madeira = (t) => {
      // rangido: serra grave passando por um filtro estreito que desliza
      const duracao = ALEATORIO(0.5, 0.9), f = ALEATORIO(80, 120);
      const filtro = cena.ctx.createBiquadFilter(); filtro.type = 'bandpass'; filtro.Q.value = 9;
      filtro.frequency.setValueAtTime(ALEATORIO(260, 340), t);
      filtro.frequency.linearRampToValueAtTime(ALEATORIO(380, 520), t + duracao);
      filtro.connect(cena.bus);
      cena.tom(t, { freq: f, ate: f * ALEATORIO(0.9, 1.15), volume: 0.1, duracao, forma: 'sawtooth', destino: filtro, ataque: duracao * 0.3 });
    };
  },
};

export class Ambiente {
  /**
   * @param ctx      AudioContext
   * @param chiado   buffer de ruído branco compartilhado
   * @param destino  nó de saída (já obedece ao volume de efeitos e à pausa)
   * @param ativo    função: false = não cria eventos (som pausado ou mudo)
   * @param relogio  { setInterval, clearInterval, setTimeout } (trocável nos testes)
   */
  constructor(ctx, chiado, destino, { ativo = () => true, relogio = globalThis } = {}) {
    this.ctx = ctx;
    this.chiado = chiado;
    this.destino = destino;
    this.opcoes = { ativo, relogio };
    this.atual = null;
    this.chave = null;
  }

  /** Troca o ambiente para `som` em `duracao` s. Mesmo som de antes = continua sem reiniciar. */
  entrar(som, duracao = 0.6) {
    const chave = som && TIPOS_DE_SOM[som.tipo] ? JSON.stringify(som) : null;
    if (chave === this.chave) return;
    this.chave = chave;
    this.atual?.aposentar(duracao);
    this.atual = null;
    if (!chave) return;
    this.atual = new Cena(this.ctx, this.chiado, this.destino, som, this.opcoes);
    this.atual.rampa(true, duracao);
  }
}
