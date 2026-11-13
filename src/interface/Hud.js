// Barras de vida/estamina, avisos e telas (tudo em HTML por cima do 3D).
const el = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.hud = el('hud'); this.vida = el('barra-vida'); this.estamina = el('barra-estamina');
    this.aviso = el('aviso'); this.dano = el('dano'); this.veu = el('veu');
    this.mira = el('mira');
    this.destaque = el('destaque');
    this.tContato = 0;
    this.guardiao = el('guardiao'); this.nomeGuardiao = el('nome-guardiao'); this.vidaGuardiao = el('barra-guardiao');
    this.telas = {
      titulo: el('tela-titulo'), pausa: el('tela-pausa'), morte: el('tela-morte'),
      opcoes: el('tela-opcoes'), bolsa: el('tela-bolsa'), leitura: el('tela-leitura'),
    };
    this.tAviso = 0; this.avisoFixo = '';
  }

  mostrarTela(nome) {
    for (const [n, t] of Object.entries(this.telas)) t.classList.toggle('oculto', n !== nome);
    this.hud.classList.toggle('oculto', nome !== null && nome !== 'morte');
  }

  limparAviso() {
    this.tAviso = 0;
    this.avisoFixo = '';
    this.aviso.classList.remove('visivel');
    this.aviso.textContent = '';
  }

  /** Mensagem temporária no meio da tela. */
  avisar(texto, segundos = 2.5) { this.aviso.textContent = texto; this.aviso.classList.add('visivel'); this.tAviso = segundos; }

  /** Mensagem que fica enquanto a condição valer (ex.: "E — descansar"). Passe '' para tirar. */
  fixar(texto) {
    if (texto === this.avisoFixo) return;
    this.avisoFixo = texto;
    if (this.tAviso <= 0) { this.aviso.textContent = texto; this.aviso.classList.toggle('visivel', !!texto); }
  }

  piscarDano() { this.dano.classList.add('ativo'); setTimeout(() => this.dano.classList.remove('ativo'), 90); }
  fecharVeu(fechado) { this.veu.classList.toggle('fechado', fechado); }

  mostrarContato(tipo) {
    this.mira.dataset.contato = tipo;
    this.tContato = 0.22;
  }

  mostrarAlvo(ativo) { this.mira.classList.toggle('interagivel', ativo); }

  /** Marcador da mira travada. ponto = { x, y } em % da tela, ou null para soltar. */
  mostrarTrava(ponto) {
    this.mira.classList.toggle('travada', !!ponto);
    this.mira.classList.toggle('aberto', !!ponto?.aberto);
    this.mira.style.left = ponto ? ponto.x + '%' : '';
    this.mira.style.top = ponto ? ponto.y + '%' : '';
  }

  /** Palavra curta que pisca no alto da tela (aparo, golpe crítico). */
  destacar(tipo) {
    this.destaque.textContent = { aparou: 'APARADO', critico: 'GOLPE CRÍTICO' }[tipo];
    this.destaque.dataset.tipo = tipo;
    this.destaque.classList.remove('visivel');
    void this.destaque.offsetWidth;   // reinicia a animação
    this.destaque.classList.add('visivel');
  }

  mostrarFrascos(total) {
    el('total-frascos').textContent = total;
    el('frascos-hud').classList.toggle('oculto', total === 0);
  }

  mostrarGuardiao(inimigo) {
    this.guardiao.classList.toggle('oculto', !inimigo);
    if (!inimigo) return;
    this.nomeGuardiao.textContent = inimigo.cfg.nome;
    this.vidaGuardiao.style.width = (100 * inimigo.vida / inimigo.cfg.vida) + '%';
  }

  atualizar(dt, jogador, maxVida, maxEstamina) {
    this.mira.classList.toggle('carregada', jogador.carregando && jogador.avisouCarga);
    if (this.tContato > 0) {
      this.tContato -= dt;
      if (this.tContato <= 0) delete this.mira.dataset.contato;
    }
    this.vida.style.width = (100 * jogador.vida / maxVida) + '%';
    this.estamina.style.width = (100 * jogador.estamina / maxEstamina) + '%';
    this.estamina.style.opacity = jogador.exausto ? 0.45 : 1;
    if (this.tAviso > 0) {
      this.tAviso -= dt;
      if (this.tAviso <= 0) { this.aviso.textContent = this.avisoFixo; this.aviso.classList.toggle('visivel', !!this.avisoFixo); }
    }
  }
}
