// Barras de vida/estamina, avisos e telas (tudo em HTML por cima do 3D).
const el = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.hud = el('hud'); this.vida = el('barra-vida'); this.estamina = el('barra-estamina');
    this.aviso = el('aviso'); this.dano = el('dano'); this.veu = el('veu');
    this.telas = { titulo: el('tela-titulo'), pausa: el('tela-pausa'), morte: el('tela-morte') };
    this.tAviso = 0; this.avisoFixo = '';
  }

  mostrarTela(nome) {   // nome: 'titulo', 'pausa', 'morte' ou null (nenhuma)
    for (const [n, t] of Object.entries(this.telas)) t.classList.toggle('oculto', n !== nome);
    this.hud.classList.toggle('oculto', nome === 'titulo');
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

  atualizar(dt, jogador, maxVida, maxEstamina) {
    this.vida.style.width = (100 * jogador.vida / maxVida) + '%';
    this.estamina.style.width = (100 * jogador.estamina / maxEstamina) + '%';
    this.estamina.style.opacity = jogador.exausto ? 0.45 : 1;
    if (this.tAviso > 0) {
      this.tAviso -= dt;
      if (this.tAviso <= 0) { this.aviso.textContent = this.avisoFixo; this.aviso.classList.toggle('visivel', !!this.avisoFixo); }
    }
  }
}
