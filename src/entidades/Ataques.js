// =============================================================================
//  BASE DOS ATAQUES
//  Uma única máquina de estados para os golpes de todos os inimigos humanos.
//
//  Cada golpe passa por 3 FASES:
//    preparo (o aviso) → ativo (a arma pode acertar) → recuperacao (ele fica aberto)
//  e tem um TIPO, que decide a melhor resposta do jogador:
//    alto      → aparar ou esquivar
//    pesado    → aparar com janela menor (abre a execução) ou esquivar
//    rasteira  → pular (é larga, não pode ser aparada nem bloqueada)
//
//  Os números de cada tipo ficam em CONFIG.combate.ataquesInimigos e multiplicam
//  os números do inimigo (CONFIG.inimigos). Este arquivo só tem REGRAS: não
//  desenha nada, por isso pode ser testado sem abrir o jogo.
// =============================================================================
import { CONFIG } from '../config.js';

const FASES = ['preparo', 'ativo', 'recuperacao'];
export const ehFaseDeAtaque = (estado) => FASES.includes(estado);

/**
 * Junta os números do inimigo com os do tipo de ataque.
 * entrada: 'alto' | 'pesado' | 'rasteira', ou { tipo, lado } para um golpe lateral.
 */
export function montarGolpe(cfg, entrada) {
  const { tipo, lado = 0 } = typeof entrada === 'string' ? { tipo: entrada } : entrada;
  const t = CONFIG.combate.ataquesInimigos[tipo];
  if (!t) throw new Error(`Tipo de ataque desconhecido: ${tipo}`);
  return {
    tipo, lado,
    dano: Math.round(cfg.dano * t.dano),
    preparo: Math.max(t.preparoMin, cfg.preparo * t.preparo),
    ativo: cfg.ativo * t.ativo,
    recuperacao: cfg.recuperacao * t.recuperacao,
    alcance: cfg.alcance * t.alcance,
    abertura: t.abertura,
    aparavel: t.aparavel,
    janelaAparar: t.janelaAparar,
    bloqueavel: t.bloqueavel,
    custoBloqueio: t.custoBloqueio,
    evitaPulando: t.evitaPulando,
    alturaPulo: t.alturaPulo,
    abreExecucao: t.abreExecucao,
    aguentaLeve: t.aguentaLeve,
    aviso: t.aviso,
  };
}

/**
 * Escolhe uma das sequências do inimigo, respeitando os pesos. Uma sequência
 * especial (que não é a primeira da lista) não sai duas vezes seguidas.
 */
export function sortearSequencia(lista, anterior = null, sorteio = Math.random) {
  const opcoes = lista.filter((s, i) => i === 0 || s !== anterior);
  let ponto = sorteio() * opcoes.reduce((soma, s) => soma + (s.peso ?? 1), 0);
  for (const s of opcoes) {
    ponto -= s.peso ?? 1;
    if (ponto < 0) return s;
  }
  return opcoes.at(-1);
}

/** O golpe alcança o alvo? d = distância, cosseno = quanto o alvo está à frente. */
export function golpeAlcanca(golpe, distancia, cosseno, desnivel = 0) {
  return distancia <= golpe.alcance + 0.35 && cosseno >= golpe.abertura && Math.abs(desnivel) <= 1.6;
}

export class MaquinaDeAtaque {
  constructor() { this.encerrar(); }

  get ativa() { return this.fase !== null; }
  /** Golpes que ainda virão depois do atual. */
  get restantes() { return this.ativa ? this.fila.length - this.indice - 1 : 0; }

  /** Começa uma sequência de golpes. emenda = como um golpe se liga ao seguinte. */
  iniciar(cfg, golpes) {
    this.fila = golpes.map((g) => montarGolpe(cfg, g));
    this.emenda = { ...CONFIG.combate.emendaInimigos, ...cfg.emenda };
    this.indice = -1;
    this.proximo(0);
  }

  proximo(adiantar) {
    this.indice++;
    this.golpe = this.fila[this.indice];
    this.fase = 'preparo';
    this.t = this.golpe.preparo * adiantar;
    this.resolvido = false;   // o golpe ativo só acerta (ou é evitado) uma vez
  }

  /** Pula direto para uma fase do golpe atual. */
  irPara(fase) { this.fase = fase; this.t = 0; }

  encerrar() {
    this.fila = []; this.indice = -1;
    this.golpe = null; this.fase = null; this.t = 0; this.resolvido = false;
  }

  /**
   * Avança o tempo. Devolve o que mudou neste instante:
   * 'preparo' (novo golpe da sequência), 'ativo', 'recuperacao', 'fim' ou null.
   */
  atualizar(dt) {
    if (!this.ativa) return null;
    this.t += dt;
    const g = this.golpe;
    if (this.fase === 'preparo') {
      if (this.t >= g.preparo) { this.irPara('ativo'); return 'ativo'; }
    } else if (this.fase === 'ativo') {
      if (this.t >= g.ativo) { this.irPara('recuperacao'); return 'recuperacao'; }
    } else {
      if (this.restantes > 0 && this.t >= this.emenda.espera) { this.proximo(this.emenda.adiantar); return 'preparo'; }
      if (this.t >= g.recuperacao) { this.encerrar(); return 'fim'; }
    }
    return null;
  }
}
