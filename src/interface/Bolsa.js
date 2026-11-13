import { ANOTACOES, CHAVE_SACRISTIA, contarFrascos } from '../nucleo/Inventario.js';

const el = (id) => document.getElementById(id);

export class Bolsa {
  constructor(jogo) {
    this.jogo = jogo;
    this.usar = el('usar-frasco');
    this.usarOsso = el('usar-osso');
    this.fechar = el('fechar-bolsa');
    this.fecharLeitura = el('fechar-leitura');
    el('abrir-bolsa').addEventListener('click', () => jogo.abrirBolsa());
    this.fechar.addEventListener('click', () => jogo.fecharPainel());
    this.fecharLeitura.addEventListener('click', () => jogo.fecharPainel());
    this.usar.addEventListener('click', () => {
      el('bolsa-estado').textContent = jogo.usarFrasco();
      this.atualizar();
    });
    this.usarOsso.addEventListener('click', () => {
      el('bolsa-estado').textContent = jogo.usarOsso();
    });
  }

  exibir() {
    el('bolsa-estado').textContent = '';
    // Durante a partida a bolsa não pausa o jogo: avisa para ninguém ser pego de surpresa.
    el('bolsa-ao-vivo').textContent = this.jogo.painelAoVivo ? 'O jogo não pausa com a bolsa aberta. I volta à luta, Esc pausa.' : '';
    this.atualizar();
    this.fechar.focus();
  }

  /** Mostra um recado na bolsa e atualiza as quantidades (ex.: o gole do frasco terminou). */
  informar(texto) {
    el('bolsa-estado').textContent = texto;
    this.atualizar();
  }

  atualizar() {
    const { progresso } = this.jogo;
    const total = contarFrascos(progresso);
    el('bolsa-frascos').textContent = total ? `${total} × Frasco de cura` : 'Nenhum frasco de cura';
    this.usar.disabled = total === 0;
    const chaves = el('bolsa-chaves');
    const item = document.createElement('li');
    item.textContent = progresso.eventos.includes(CHAVE_SACRISTIA) ? 'Chave da sacristia' : 'Nenhum item-chave';
    chaves.replaceChildren(item);
    const anotacoes = el('bolsa-anotacoes');
    anotacoes.replaceChildren();
    for (const [id, nota] of Object.entries(ANOTACOES)) {
      if (!progresso.eventos.includes(id)) continue;
      const linha = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.textContent = nota.nome;
      botao.addEventListener('click', () => this.jogo.abrirLeitura(id));
      linha.append(botao);
      anotacoes.append(linha);
    }
    if (!anotacoes.childElementCount) {
      const vazio = document.createElement('li');
      vazio.textContent = 'Nenhuma anotação encontrada';
      anotacoes.append(vazio);
    }
  }

  ler(nota) {
    el('titulo-leitura').textContent = nota.nome;
    el('texto-leitura').textContent = nota.texto;
    this.fecharLeitura.focus();
  }
}
