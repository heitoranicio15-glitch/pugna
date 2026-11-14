import { CONFIG } from '../config.js';
// =============================================================================
//  SONS
//  Efeitos sintetizados em tempo real (ruído, filtros e osciladores).
// =============================================================================
export class Som {
  constructor(eventos, jogo) {
    this.ctx = null;
    this.jogo = jogo;
    this.volume = 0.8;
    this.pausado = false;
    // Liga cada aviso do jogo ao seu som.
    eventos.em('jogador:passo', (d) => this.passo(d?.correndo ? 0.5 : 0.32));
    eventos.em('jogador:pouso', () => this.passo(0.7, 0.7));
    eventos.em('jogador:pulo', () => this.passo(0.25, 1.3));
    eventos.em('jogador:golpe', (d) => this.zunido(d.forte ? 0.5 : 0.35, d.forte ? 0.32 : 0.2, d.forte ? 500 : 900));
    // O quickstep tem um zunido mais curto (dura o mesmo que o passo).
    eventos.em('jogador:esquiva', (d) => this.zunido(0.25, d?.quickstep ? CONFIG.combate.quickstep.duracao : 0.25, 350));
    eventos.em('jogador:carregando', () => this.sino(294, 0.33, 0.11));
    eventos.em('jogador:sem-estamina', () => this.tom({ volume: 0.13, duracao: 0.12, de: 95, ate: 57 }));
    eventos.em('golpe:acertou', (d) => {
      this.impacto(d.critico ? 1.1 : d.forte ? 0.9 : 0.6);
      if (d.critico) this.sino(196, 0.7, 0.2);
    });
    eventos.em('golpe:parede', () => {
      this.metal(0.42, 0.22);
      this.ruido({ volume: 0.27, duracao: 0.13, tipo: 'bandpass', de: 1250, ate: 370 });
    });
    eventos.em('jogador:tiro', () => this.tiro());
    eventos.em('jogador:sem-bala', () => this.ruido({ volume: 0.16, duracao: 0.04, tipo: 'highpass', de: 2600 }));   // clique seco
    eventos.em('jogador:visceral', () => this.zunido(0.4, 0.22, 420));
    // Visceral: impacto grave e um sino; a execução é mais grave e mais longa.
    eventos.em('golpe:visceral', ({ execucao }) => {
      this.impacto(execucao ? 1.4 : 1.2);
      this.tom({ volume: execucao ? 0.5 : 0.4, duracao: execucao ? 0.7 : 0.45, de: execucao ? 90 : 120, ate: 30 });
      this.sino(execucao ? 98 : 147, execucao ? 2.4 : 1.4, execucao ? 0.3 : 0.24);
    });
    eventos.em('jogador:aparou', () => { this.metal(0.75, 0.6); this.sino(880, 0.5, 0.16); });
    eventos.em('mira:travou', () => this.tom({ volume: 0.08, duracao: 0.07, de: 620, ate: 880 }));
    eventos.em('jogador:ferido', () => { this.impacto(0.8); this.gemido(); });
    eventos.em('jogador:morreu', () => this.sino(55, 4, 0.5));
    eventos.em('jogador:pulou-golpe', () => this.zunido(0.3, 0.2, 520));
    eventos.em('inimigo:golpe', (i) => {
      const perto = this.perto(i), tipo = i.golpe?.tipo;
      if (tipo === 'rasteira') this.zunido(0.45 * perto, 0.34, 210);          // varrida grave e longa
      else if (tipo === 'pesado') { this.zunido(0.5 * perto, 0.3, 240); this.tom({ volume: 0.2 * perto, duracao: 0.3, de: 120, ate: 45 }); }
      else this.zunido(0.4 * perto, 0.25, i.tipo === 'cavaleiro' ? 320 : 800);
    });
    // O aviso sonoro muda com o tipo do golpe: dá para reagir de ouvido.
    eventos.em('inimigo:preparo', (i) => {
      const perto = this.perto(i), g = i.golpe;
      if (g?.tipo === 'pesado') {            // sino grave e um ronco que cresce
        this.sino(98, 0.9, 0.24 * perto);
        this.ruido({ volume: 0.26 * perto, duracao: Math.min(0.9, g.preparo), tipo: 'lowpass', de: 90, ate: 420, ataque: 0.3 });
      } else if (g?.tipo === 'rasteira') {   // aço raspando no chão e dois estalos agudos
        this.ruido({ volume: 0.3 * perto, duracao: 0.36, tipo: 'highpass', de: 2200, ate: 5200, ataque: 0.12 });
        this.tom({ volume: 0.11 * perto, duracao: 0.08, de: 1500, ate: 1900, forma: 'triangle' });
        setTimeout(() => this.tom({ volume: 0.11 * perto, duracao: 0.08, de: 1500, ate: 1900, forma: 'triangle' }), 110);
      } else if (g?.lado) {                  // golpes laterais do Guardião: uma nota por lado
        this.sino(g.lado > 0 ? 165 : 220, 0.5, 0.22 * perto);
        this.ruido({ volume: 0.24 * perto, duracao: 0.38, de: 135, ate: 460, ataque: 0.14 });
      } else this.metal(0.12 * perto, 0.5);
    });
    eventos.em('inimigo:aguentou', (i) => this.metal(0.4 * this.perto(i)));   // o golpe não fez cambalear
    eventos.em('jogador:interrompido', () => this.tom({ volume: 0.12, duracao: 0.1, de: 180, ate: 90 }));
    eventos.em('jogador:rally', () => this.tom({ volume: 0.07, duracao: 0.09, de: 520, ate: 780 }));
    eventos.em('inimigo:alerta', (i) => this.rosnado(0.3 * this.perto(i), i.tipo === 'cavaleiro' ? 70 : 120));
    eventos.em('inimigo:morreu', (i) => { this.rosnado(0.35 * this.perto(i), 50); this.passo(0.6 * this.perto(i), 0.5, 0.45); });
    eventos.em('descanso', () => this.sino(392, 2.5, 0.25));
    eventos.em('item:cura', () => this.sino(330, 0.58, 0.13));
    eventos.em('item:retorno', () => this.sino(262, 1.8, 0.2));
    eventos.em('objeto:interagiu', (acao) => {
      if (acao === 'recolher') this.sino(440, 0.32, 0.1);
      else this.ruido({ volume: 0.21, duracao: 0.32, de: 400, ate: 165, ataque: 0.06 });
    });
  }

  /** Volume conforme a distância do inimigo até o jogador. */
  perto(inimigo) {
    const d = inimigo.pos.distanceTo(this.jogo.jogador.pos);
    return Math.max(0, 1 - d / 28);
  }

  /** Precisa ser chamado depois de um clique (regra dos navegadores). */
  ligar() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.saida = this.ctx.createGain();
    this.saida.gain.value = this.pausado ? 0 : this.volume;
    this.saida.connect(this.ctx.destination);
    // Um segundo de chiado, reaproveitado por quase todos os sons.
    const n = this.ctx.sampleRate * 2;
    this.chiado = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const dados = this.chiado.getChannelData(0);
    for (let i = 0; i < n; i++) dados[i] = Math.random() * 2 - 1;
    this.vento();
    this.zumbido();
  }

  definirVolume(volume, pausado) {
    if (volume === this.volume && pausado === this.pausado) return;
    this.volume = volume;
    this.pausado = pausado;
    if (this.ctx) this.saida.gain.setTargetAtTime(pausado ? 0 : volume, this.ctx.currentTime, 0.08);
  }

  /** Estouro de chiado filtrado: a base de passos, zunidos e impactos. */
  ruido({ volume = 0.5, duracao = 0.2, tipo = 'bandpass', de = 800, ate = de, q = 1, ataque = 0.005 }) {
    if (!this.ctx || volume <= 0.001) return;
    const t = this.ctx.currentTime;
    const fonte = this.ctx.createBufferSource(); fonte.buffer = this.chiado; fonte.loop = true;
    const filtro = this.ctx.createBiquadFilter(); filtro.type = tipo; filtro.Q.value = q;
    filtro.frequency.setValueAtTime(de, t); filtro.frequency.exponentialRampToValueAtTime(Math.max(20, ate), t + duracao);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(volume, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    fonte.connect(filtro).connect(g).connect(this.saida);
    fonte.start(t, Math.random()); fonte.stop(t + duracao + 0.05);
  }

  tom({ volume = 0.3, duracao = 0.3, de = 200, ate = de, forma = 'sine' }) {
    if (!this.ctx || volume <= 0.001) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = forma;
    o.frequency.setValueAtTime(de, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, ate), t + duracao);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    o.connect(g).connect(this.saida); o.start(t); o.stop(t + duracao + 0.05);
  }

  passo(volume = 0.3, tomRel = 1, duracao = 0.11) {
    const f = (500 + Math.random() * 250) * tomRel;
    this.ruido({ volume, duracao, tipo: 'lowpass', de: f * 2.2, ate: f * 0.5 });
    this.tom({ volume: volume * 0.5, duracao: 0.07, de: 90 * tomRel, ate: 45 });
  }
  zunido(volume, duracao, freq) { this.ruido({ volume, duracao, de: freq * 0.5, ate: freq * 2.4, q: 2.2, ataque: duracao * 0.4 }); }
  impacto(volume = 0.6) {
    this.tom({ volume, duracao: 0.2, de: 150, ate: 38 });
    this.ruido({ volume: volume * 0.8, duracao: 0.14, tipo: 'lowpass', de: 2600, ate: 300 });
  }
  metal(volume = 0.5, duracao = 0.45) {
    for (const f of [523, 1187, 1723, 2917]) this.tom({ volume: volume * 0.22, duracao: duracao * (0.6 + Math.random() * 0.6), de: f * (0.97 + Math.random() * 0.06), forma: 'square' });
    this.ruido({ volume: volume * 0.5, duracao: 0.07, tipo: 'highpass', de: 3000 });
  }
  /** Estampido seco da pistola, com um eco curto e abafado logo depois. */
  tiro() {
    this.ruido({ volume: 0.9, duracao: 0.16, tipo: 'lowpass', de: 5200, ate: 260, ataque: 0.002 });
    this.tom({ volume: 0.45, duracao: 0.12, de: 170, ate: 42 });
    setTimeout(() => this.ruido({ volume: 0.22, duracao: 0.3, tipo: 'lowpass', de: 1400, ate: 180 }), 110);
  }
  gemido() { this.tom({ volume: 0.22, duracao: 0.28, de: 190, ate: 95, forma: 'sawtooth' }); }
  rosnado(volume, freq) { this.tom({ volume, duracao: 0.6, de: freq, ate: freq * 0.6, forma: 'sawtooth' }); this.ruido({ volume: volume * 0.5, duracao: 0.5, tipo: 'lowpass', de: 500, ate: 150 }); }
  sino(freq, duracao, volume) { for (const [m, v] of [[1, 1], [2.01, 0.5], [2.76, 0.3], [5.4, 0.15]]) this.tom({ volume: volume * v, duracao: duracao / Math.sqrt(m), de: freq * m }); }

  /** Vento: chiado grave contínuo que sobe e desce sozinho. */
  vento() {
    const c = this.ctx;
    const fonte = c.createBufferSource(); fonte.buffer = this.chiado; fonte.loop = true;
    const filtro = c.createBiquadFilter(); filtro.type = 'bandpass'; filtro.frequency.value = 380; filtro.Q.value = 0.7;
    const g = c.createGain(); g.gain.value = 0.11;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
    const lfoG = c.createGain(); lfoG.gain.value = 190; lfo.connect(lfoG).connect(filtro.frequency);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.15;
    const lfo2G = c.createGain(); lfo2G.gain.value = 0.055; lfo2.connect(lfo2G).connect(g.gain);
    fonte.connect(filtro).connect(g).connect(this.saida);
    fonte.start(); lfo.start(); lfo2.start();
  }

  /** Um zumbido grave e distante: a presença da lua. */
  zumbido() {
    const c = this.ctx;
    const g = c.createGain(); g.gain.value = 0.035; g.connect(this.saida);
    for (const f of [55, 55.7, 82.4]) { const o = c.createOscillator(); o.frequency.value = f; o.connect(g); o.start(); }
  }
}
