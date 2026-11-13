// Teclado, mouse e toque. As ações de jogo compartilham o mesmo estado de entrada.
export class Entrada {
  constructor(elemento) {
    this.elemento = elemento;
    this.teclas = new Set();        // teclas seguradas agora
    this.apertadas = new Set();     // teclas apertadas neste quadro
    this.botoes = [false, false, false];
    this.botoesApertados = [false, false, false];
    this.botoesSoltos = [false, false, false];
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.toque = false;
    this.ladoToque = 0;
    this.frenteToque = 0;
    this.corridaToque = false;
    this.travado = false;           // true quando o mouse está "preso" no jogo
    this.ignorarTrava = false;      // usado só nos testes automáticos
    this.habilitada = false;

    addEventListener('keydown', (e) => {
      // Impede atalhos do navegador de atrapalhar (Ctrl+S, Ctrl+D, Alt abre menu...).
      if (this.ativo() && (e.ctrlKey || e.altKey || e.code === 'Space' || e.code === 'Tab')) e.preventDefault();
      if (!e.repeat) this.apertadas.add(e.code);
      this.teclas.add(e.code);
    });
    addEventListener('keyup', (e) => {
      if (this.ativo() && (e.code.startsWith('Alt') || e.code.startsWith('Control'))) e.preventDefault();
      this.teclas.delete(e.code);
    });
    addEventListener('blur', () => this.soltarTudo());
    addEventListener('mousedown', (e) => {
      if (!this.ativo() || this.toque || e.button > 2) return;
      if (e.button === 1) e.preventDefault();   // botão do meio trava a mira (sem rolagem automática)
      this.pressionarBotao(e.button);
    });
    addEventListener('mouseup', (e) => {
      if (this.toque || e.button > 2) return;
      this.soltarBotao(e.button);
    });
    addEventListener('mousemove', (e) => {
      if (!this.habilitada || !this.travado) return;
      // Alguns navegadores mandam "saltos" absurdos de vez em quando: ignoramos.
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      this.mouseDX += e.movementX; this.mouseDY += e.movementY;
    });
    addEventListener('contextmenu', (e) => e.preventDefault()); // clique direito = bloquear
    document.addEventListener('pointerlockchange', () => {
      this.travado = document.pointerLockElement === this.elemento;
      if (!this.travado) this.soltarTudo();
    });
  }

  podeJogar() { return this.travado || this.ignorarTrava || this.toque; }

  ativo() { return this.habilitada && this.podeJogar(); }

  pressionarBotao(indice) {
    this.botoes[indice] = true;
    this.botoesApertados[indice] = true;
  }

  soltarBotao(indice) {
    if (this.botoes[indice]) this.botoesSoltos[indice] = true;
    this.botoes[indice] = false;
  }

  moverToque(lado, frente, corrida = false) {
    this.ladoToque = lado;
    this.frenteToque = frente;
    this.corridaToque = corrida;
  }

  /** Prende o mouse no jogo (o navegador exige que venha de um clique). */
  travarMouse() {
    this.elemento.requestPointerLock?.()?.catch(() => {});
  }

  soltarTudo() {
    this.teclas.clear();
    this.botoes.fill(false);
    this.moverToque(0, 0);
    this.limparQuadro();
  }

  segurando(codigo) { return this.teclas.has(codigo); }
  apertou(codigo) { return this.apertadas.has(codigo); }

  /** Chamar no fim de cada quadro. */
  limparQuadro() {
    this.apertadas.clear();
    this.botoesApertados.fill(false);
    this.botoesSoltos.fill(false);
    this.mouseDX = 0; this.mouseDY = 0;
  }
}
