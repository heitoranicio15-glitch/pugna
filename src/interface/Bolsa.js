import { ANOTACOES, ARMAS, ITENS, armaDisponivel, contarFrascos, contarMunicao } from '../nucleo/Inventario.js';

const el = (id) => document.getElementById(id);

export class Bolsa {
  constructor(jogo) {
    this.jogo = jogo;
    this.usar = el('usar-frasco');
    this.usarOsso = el('usar-osso');
    this.usarMunicao = el('usar-municao');
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
    this.usarMunicao.addEventListener('click', () => this.informar(jogo.usarMunicao()));
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
    const reserva = contarMunicao(progresso);
    el('bolsa-municao').textContent = reserva ? 'Munição de reserva: ' + reserva : 'Sem munição de reserva';
    this.usarMunicao.disabled = reserva === 0;
    const item = texto => {
      const linha = document.createElement('li');
      linha.textContent = texto;
      return linha;
    };
    for (const [id,chave,vazio] of [
      ['bolsa-chaves',true,'Nenhum item-chave'], ['bolsa-reliquias',false,'Nenhuma relíquia ou melhoria'],
    ]) {
      const linhas = Object.entries(ITENS)
        .filter(([id,d])=>!!d.chave===chave && progresso.eventos.includes(id))
        .map(([,d])=>item(d.nome+' · '+d.descricao));
      el(id).replaceChildren(...(linhas.length ? linhas : [item(vazio)]));
    }
    const armas=el('bolsa-armas');
    armas.replaceChildren();
    for (const [id,arma] of Object.entries(ARMAS)) {
      if (!armaDisponivel(id,progresso.eventos)) continue;
      const linha=document.createElement('li'), botao=document.createElement('button');
      botao.type='button';
      botao.id='bolsa-arma-'+id;
      botao.textContent=arma.nome+(progresso.arma===id ? ' · equipada' : '');
      botao.setAttribute('aria-pressed',String(progresso.arma===id));
      const desc=document.createElement('p');
      desc.className='descricao-item';
      desc.textContent=arma.descricao;
      botao.addEventListener('click',()=>{
        this.informar(this.jogo.trocarArma(id));
        el(botao.id)?.focus();
      });
      linha.append(botao,desc); armas.append(linha);
    }
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
