// Teclado e mouse. O resto do jogo só pergunta "a tecla está apertada?".
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
    this.travado = false;           // true quando o mouse está "preso" no jogo
    this.ignorarTrava = false;      // usado só nos testes automáticos

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
    addEventListener('blur', () => { this.teclas.clear(); this.botoes.fill(false); });
    addEventListener('mousedown', (e) => {
      if (!this.ativo() || e.button > 2) return;
      this.botoes[e.button] = true; this.botoesApertados[e.button] = true;
    });
    addEventListener('mouseup', (e) => {
      if (e.button > 2) return;
      if (this.botoes[e.button]) this.botoesSoltos[e.button] = true;
      this.botoes[e.button] = false;
    });
    addEventListener('mousemove', (e) => {
      if (!this.travado) return;
      // Alguns navegadores mandam "saltos" absurdos de vez em quando: ignoramos.
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      this.mouseDX += e.movementX; this.mouseDY += e.movementY;
    });
    addEventListener('contextmenu', (e) => e.preventDefault()); // clique direito = bloquear
    document.addEventListener('pointerlockchange', () => {
      this.travado = document.pointerLockElement === this.elemento;
      if (!this.travado) { this.teclas.clear(); this.botoes.fill(false); }
    });
  }

  ativo() { return this.travado || this.ignorarTrava; }

  /** Prende o mouse no jogo (o navegador exige que venha de um clique). */
  travarMouse() {
    const p = this.elemento.requestPointerLock?.();
    if (p && p.catch) p.catch(() => {});
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
