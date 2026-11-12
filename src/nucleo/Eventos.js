// "Quadro de avisos" do jogo. Uma parte avisa ("o jogador deu um passo") e outras
// partes escutam (o som toca o passo). Assim as partes não dependem umas das outras,
// e no futuro o multiplayer pode escutar os mesmos avisos para enviar pela rede.
export class Eventos {
  constructor() { this.ouvintes = new Map(); }

  /** Escuta um aviso. Ex.: eventos.em('jogador:passo', () => ...) */
  em(nome, funcao) {
    if (!this.ouvintes.has(nome)) this.ouvintes.set(nome, []);
    this.ouvintes.get(nome).push(funcao);
  }

  /** Dispara um aviso para todos que estão escutando. */
  emitir(nome, dados) {
    const lista = this.ouvintes.get(nome);
    if (lista) for (const f of lista) f(dados);
  }
}
