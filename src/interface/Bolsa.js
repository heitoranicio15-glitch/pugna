import { ANOTACOES, CHAVE_SACRISTIA, contarFrascos, contarOssos } from '../nucleo/Inventario.js';

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
      this.atualizar();
    });
  }

  exibir() {
    el('bolsa-estado').textContent = '';
    this.atualizar();
    this.fechar.focus();
  }

  atualizar() {
    const { progresso } = this.jogo;
    const total = contarFrascos(progresso);
    el('bolsa-frascos').textContent = total ? `${total} × Frasco de cura` : 'Nenhum frasco de cura';
    this.usar.disabled = total === 0;
    const ossos = contarOssos(progresso);
    el('bolsa-ossos').textContent = ossos ? `${ossos} × Osso de Retorno` : 'Nenhum Osso de Retorno';
    this.usarOsso.disabled = ossos === 0;
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
