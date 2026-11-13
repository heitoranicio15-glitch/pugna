const CONTROLE = '(pointer: coarse)';
const ZONA_MORTA = 0.12;
const GANHO_CAMERA = 2.45;

export function eixoDoDirecional(dx, dy, raio) {
  const distancia = Math.hypot(dx, dy);
  if (distancia <= raio * ZONA_MORTA) return { lado: 0, frente: 0, corrida: false };
  const escala = (Math.min(1, distancia / raio) - ZONA_MORTA) / (1 - ZONA_MORTA) / distancia;
  const frente = -dy * escala;
  return { lado: dx * escala, frente, corrida: distancia >= raio * 0.94 && frente > 0.58 };
}

export class Toque {
  constructor(jogo) {
    this.jogo = jogo;
    this.entrada = jogo.entrada;
    this.painel = document.getElementById('controles-toque');
    this.olhar = document.getElementById('olhar-toque');
    this.direcional = document.getElementById('direcional-toque');
    this.manopla = this.direcional.firstElementChild;
    this.interagir = document.getElementById('toque-interagir');
    this.cura = document.getElementById('toque-cura');
    this.ponteiros = new Map();
    this.tipoPrincipal = matchMedia(CONTROLE);

    this.definirModo(this.tipoPrincipal.matches);
    // Dispositivos híbridos entram no modo toque quando o jogador inicia com o dedo.
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && this.jogo.estado !== 'jogando') this.definirModo(true);
      else if (e.pointerType === 'mouse' && this.jogo.estado === 'titulo' &&
          !this.tipoPrincipal.matches && !e.sourceCapabilities?.firesTouchEvents) this.definirModo(false);
    }, { capture: true });

    this.ligarPonteiro(this.direcional, 'movimento');
    this.ligarPonteiro(this.olhar, 'camera');
    for (const botao of this.painel.querySelectorAll('[data-tecla], [data-botao]')) this.ligarPonteiro(botao, 'acao');
    document.getElementById('toque-bolsa').addEventListener('click', () => jogo.abrirBolsa());
    document.getElementById('toque-pausa').addEventListener('click', () => jogo.pausar());
    addEventListener('blur', () => this.limpar());
    addEventListener('resize', () => this.limpar());
  }

  definirModo(ativo) {
    this.entrada.toque = ativo;
    document.body.classList.toggle('modo-toque', ativo);
    this.exibir();
  }

  exibir() {
    this.painel.classList.toggle('oculto', !this.entrada.toque || this.jogo.estado !== 'jogando');
  }

  atualizarAcoes(interacao, cura) {
    this.interagir.classList.toggle('oculto', !interacao);
    this.cura.classList.toggle('oculto', !cura);
  }

  ligarPonteiro(elemento, tipo) {
    elemento.addEventListener('pointerdown', (e) => {
      if (!this.entrada.ativo() || !this.entrada.toque ||
          [...this.ponteiros.values()].some((p) => p.elemento === elemento)) return;
      e.preventDefault();
      elemento.setPointerCapture(e.pointerId);
      this.ponteiros.set(e.pointerId, { elemento, tipo, x: e.clientX, y: e.clientY });
      if (tipo === 'movimento') this.mover(e);
      if (tipo === 'acao') {
        elemento.classList.add('pressionado');
        if (elemento.dataset.tecla) this.entrada.apertadas.add(elemento.dataset.tecla);
        else this.entrada.pressionarBotao(Number(elemento.dataset.botao));
      }
    });
    elemento.addEventListener('pointermove', (e) => this.mover(e));
    elemento.addEventListener('pointerup', (e) => this.soltar(e.pointerId));
    elemento.addEventListener('pointercancel', (e) => this.soltar(e.pointerId, true));
    elemento.addEventListener('lostpointercapture', (e) => this.soltar(e.pointerId, true));
  }

  mover(e) {
    const ponteiro = this.ponteiros.get(e.pointerId);
    if (!ponteiro) return;
    if (ponteiro.tipo === 'movimento') {
      const caixa = this.direcional.getBoundingClientRect();
      const raio = caixa.width * 0.38;
      const dx = e.clientX - caixa.left - caixa.width / 2;
      const dy = e.clientY - caixa.top - caixa.height / 2;
      const { lado, frente, corrida } = eixoDoDirecional(dx, dy, raio);
      this.entrada.moverToque(lado, frente, corrida);
      this.manopla.style.translate = `${lado * raio}px ${-frente * raio}px`;
      this.direcional.classList.toggle('correndo', corrida);
    } else if (ponteiro.tipo === 'camera') {
      this.entrada.mouseDX += (e.clientX - ponteiro.x) * GANHO_CAMERA;
      this.entrada.mouseDY += (e.clientY - ponteiro.y) * GANHO_CAMERA;
      ponteiro.x = e.clientX;
      ponteiro.y = e.clientY;
    }
  }

  soltar(id, cancelado = false) {
    const ponteiro = this.ponteiros.get(id);
    if (!ponteiro) return;
    this.ponteiros.delete(id);
    const { elemento, tipo } = ponteiro;
    if (tipo === 'movimento') {
      this.entrada.moverToque(0, 0);
      this.manopla.style.translate = '';
      this.direcional.classList.remove('correndo');
    }
    if (tipo === 'acao') {
      elemento.classList.remove('pressionado');
      if (elemento.dataset.botao !== undefined) {
        const indice = Number(elemento.dataset.botao);
        this.entrada.soltarBotao(indice);
        if (cancelado && indice === 0) {
          this.entrada.botoesApertados[0] = false;
          this.jogo.jogador.carregando = false;
          this.jogo.jogador.avisouCarga = false;
        }
      } else if (cancelado) this.entrada.apertadas.delete(elemento.dataset.tecla);
    }
    if (elemento.hasPointerCapture(id)) elemento.releasePointerCapture(id);
  }

  limpar() {
    for (const id of this.ponteiros.keys()) this.soltar(id, true);
  }
}
