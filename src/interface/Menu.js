const el = (id) => document.getElementById(id);

export class Menu {
  constructor(jogo) {
    this.jogo = jogo;
    this.form = el('preferencias');
    this.dialogo = el('confirmar-reset');
    this.botaoComecar = el('botao-comecar');
    this.opcoesAbertas = false;

    this.botaoComecar.addEventListener('click', () => jogo.comecar());
    el('continuar').addEventListener('click', () => jogo.retomar());
    el('voltar-titulo').addEventListener('click', () => jogo.voltarAoTitulo());
    for (const id of ['opcoes-titulo', 'opcoes-pausa']) {
      el(id).addEventListener('click', () => {
        this.origemOpcoes = el(id);
        this.opcoesAbertas = true;
        jogo.hud.mostrarTela('opcoes');
        this.form.elements.musica.focus();
      });
    }
    el('fechar-opcoes').addEventListener('click', () => this.fecharOpcoes());
    for (const id of ['reset-titulo', 'reset-pausa']) {
      el(id).addEventListener('click', () => {
        this.dialogo.returnValue = '';
        this.dialogo.showModal();
      });
    }
    this.dialogo.addEventListener('close', () => {
      if (this.dialogo.returnValue === 'apagar') jogo.apagarProgresso();
    });
    this.form.addEventListener('submit', (evento) => evento.preventDefault());
    this.form.addEventListener('input', (evento) => {
      const campo = evento.target;
      jogo.preferencias[campo.name] = campo.type === 'checkbox' ? campo.checked : Number(campo.value);
      this.exibirPreferencias();
      jogo.aplicarPreferencias();
    });
    this.exibirPreferencias();
  }

  fecharOpcoes() {
    this.opcoesAbertas = false;
    this.jogo.hud.mostrarTela(this.jogo.estado === 'titulo' ? 'titulo' : 'pausa');
    this.origemOpcoes.focus();
  }

  exibirPreferencias() {
    for (const campo of this.form.querySelectorAll('input, select')) {
      const valor = this.jogo.preferencias[campo.name];
      if (campo.type === 'checkbox') campo.checked = valor;
      else campo.value = valor;
      const saida = campo.parentElement.querySelector('output');
      if (saida) saida.value = `${valor}%`;
    }
  }

  atualizarProgresso(progresso, nome) {
    const temProgresso = !!progresso.descanso || progresso.eventos.length > 0;
    this.botaoComecar.textContent = temProgresso ? 'Continuar' : 'Começar';
    el('reset-titulo').classList.toggle('oculto', !temProgresso);
    // Não existe salvar manualmente: o jogo grava sozinho e avisa onde o caçador renasce.
    el('estado-titulo').textContent = nome ? `Última lanterna: ${nome}` : '';
    el('estado-pausa').textContent = `Última lanterna: ${nome || 'Portão Sul'} · o jogo salva sozinho`;
  }

  avisar(texto, estado) {
    el(estado === 'titulo' ? 'estado-titulo' : 'estado-pausa').textContent = texto;
  }
}
