import { FAIXAS, ganhosCrossfade } from './regras.js';

export { FAIXAS };

/**
 * Trilha musical. Usa dois players: ao trocar de faixa, um sai e o outro entra em
 * potência igual (`duracao` s). Faixa igual à que toca continua sem reiniciar.
 * `criarAudio` e `relogio` existem para os testes; no jogo valem os padrões.
 */
export class Trilha {
  constructor({ base = '/', duracao = 1.5, criarAudio = () => new Audio(), relogio = globalThis, agora = () => performance.now() } = {}) {
    this.base = base;
    this.duracao = duracao;
    this.criarAudio = criarAudio;
    this.relogio = relogio;
    this.agora = agora;
    this.atual = null;       // { audio, ganho } da faixa que toca
    this.saindo = null;      // { audio, ganho, de } da faixa que está sumindo
    this.fade = null;        // { inicio } do crossfade em andamento
    this.timer = null;
    this.faixa = null;
    this.tocando = false;
    this.volume = 0;
  }

  novoCanal(faixa) {
    const audio = this.criarAudio();
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0;
    audio.src = `${this.base}assets/trilha/${FAIXAS[faixa]}`;
    return { audio, ganho: 1 };
  }

  atualizar(faixa, tocando, volume) {
    // Evita repetir play() a cada quadro caso o navegador bloqueie a reprodução.
    if (this.faixa === faixa && this.tocando === tocando && this.volume === volume) return;
    const mudou = this.faixa !== faixa;
    this.tocando = tocando;
    this.volume = volume;
    if (mudou) {
      this.faixa = faixa;
      const velho = this.atual;
      this.atual = this.novoCanal(faixa);
      // Só faz crossfade se havia música tocando: o primeiro play e a troca em pausa são diretos.
      if (velho && this.tocando && this.volume > 0 && !velho.audio.paused) this.comecarFade(velho);
      else { this.encerrarFade(); if (velho) velho.audio.pause(); }
    }
    if (!tocando && this.saindo) this.encerrarFade();   // pausa: não deixa a faixa antiga tocando
    this.aplicar();
    if (tocando && volume > 0) {
      this.atual.audio.play().catch(() => {});
      if (this.saindo) this.saindo.audio.play().catch(() => {});
    } else {
      this.atual.audio.pause();
      this.saindo?.audio.pause();
    }
  }

  comecarFade(velho) {
    if (this.saindo) this.saindo.audio.pause();
    // Se já havia um fade, a faixa que estava entrando parte do ganho em que estava.
    this.saindo = { audio: velho.audio, ganho: velho.ganho, de: velho.ganho };
    this.atual.ganho = 0;
    this.fade = { inicio: this.agora() };
    this.relogio.clearInterval(this.timer);
    this.timer = this.relogio.setInterval(() => this.avancar(this.agora()), 40);
  }

  encerrarFade() {
    this.relogio.clearInterval(this.timer);
    this.timer = null;
    this.fade = null;
    if (this.saindo) { this.saindo.audio.pause(); this.saindo = null; }
    if (this.atual) this.atual.ganho = 1;
  }

  /** Dá um passo do crossfade (chamado pelo temporizador; `agora` em ms). */
  avancar(agora) {
    if (!this.fade) return;
    const p = (agora - this.fade.inicio) / (this.duracao * 1000);
    if (p >= 1) { this.encerrarFade(); this.aplicar(); return; }
    const g = ganhosCrossfade(p);
    this.atual.ganho = g.entra;
    this.saindo.ganho = this.saindo.de * g.saida;
    this.aplicar();
  }

  aplicar() {
    const mestre = this.volume / 100 * 0.7;
    if (this.atual) this.atual.audio.volume = mestre * this.atual.ganho;
    if (this.saindo) this.saindo.audio.volume = mestre * this.saindo.ganho;
  }
}
