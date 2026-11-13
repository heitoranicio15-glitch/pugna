const FAIXAS = {
  vilarejo: 'vilarejo.mp3',
  catedral: 'catedral.mp3',
  guardiao: 'guardiao.mp3',
  'guardiao-final': 'guardiao-fase-final.mp3',
};

export class Trilha {
  constructor() {
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.preload = 'none';
    this.audio.volume = 0;
    this.faixa = null;
    this.volume = 0;
  }

  atualizar(faixa, tocando, volume) {
    // Evita repetir play() a cada quadro caso o navegador bloqueie a reprodução.
    if (this.faixa === faixa && this.tocando === tocando && this.volume === volume) return;
    if (this.faixa !== faixa) {
      this.faixa = faixa;
      this.audio.src = `${import.meta.env.BASE_URL}assets/trilha/${FAIXAS[faixa]}`;
    }
    this.tocando = tocando;
    this.volume = volume;
    this.audio.volume = volume / 100 * 0.7;
    if (tocando && volume > 0) this.audio.play().catch(() => {});
    else this.audio.pause();
  }
}
