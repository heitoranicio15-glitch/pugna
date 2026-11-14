// =============================================================================
//  BASE DOS ATAQUES
//  Uma única máquina de estados para os golpes de todos os inimigos humanos.
//
//  Cada golpe passa por 3 FASES:
//    preparo (o aviso) → ativo (a arma pode acertar) → recuperacao (ele fica aberto)
//  e tem um TIPO, que decide a melhor resposta do jogador:
//    alto      → tiro de pistola no tempo certo (parry) ou esquivar
//    pesado    → parry com janela menor (abre a execução) ou esquivar
//    rasteira  → pular (é larga, não pode ser aparada)
//  Um golpe da sequência pode sobrescrever campos do tipo, por exemplo
//  { tipo: 'pesado', aparavel: false, aviso: 'inaparavel' } (fase final do
//  Guardião): pose do pesado, mas o tiro não apara e o aviso tem cor própria.
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
 * entrada: 'alto' | 'pesado' | 'rasteira', ou { tipo, lado, atraso, ...campos }
 * para um golpe lateral, atrasado ou que sobrescreve campos do tipo (aparavel,
 * aviso...). Um aviso escrito como nome ('inaparavel') vira a cor de
 * CONFIG.combate.avisosInimigos e fica guardado em nomeAviso.
 * Imprevisibilidade: o aviso (subida) varia um pouco a cada golpe, sorteado por
 * `sorteio` (0 = o mais curto, 1 = o mais longo), sem passar abaixo do preparoMin.
 * O atraso é o tempo que o inimigo SEGURA a pose final do aviso antes de bater;
 * ele soma ao preparo, então a janela do parry (presa ao fim do preparo) acompanha.
 */
export function montarGolpe(cfg, entrada, sorteio = Math.random) {
  const { tipo, lado = 0, atraso = 0, ...troca } = typeof entrada === 'string' ? { tipo: entrada } : entrada;
  const doTipo = CONFIG.combate.ataquesInimigos[tipo];
  if (!doTipo) throw new Error(`Tipo de ataque desconhecido: ${tipo}`);
  const t = { ...doTipo, ...troca };
  const nomeAviso = typeof t.aviso === 'string' ? t.aviso : null;
  if (nomeAviso && !(nomeAviso in CONFIG.combate.avisosInimigos)) throw new Error(`Aviso desconhecido: ${nomeAviso}`);
  const variacao = 1 + (sorteio() * 2 - 1) * CONFIG.combate.imprevisibilidade.variacaoPreparo;
  const subida = Math.max(t.preparoMin, cfg.preparo * t.preparo * variacao);
  return {
    tipo, lado,
    dano: Math.round(cfg.dano * t.dano),
    subida,                    // tempo erguendo a arma (a pose do aviso)
    atraso,                    // tempo segurando a pose antes de bater
    preparo: subida + atraso,  // o aviso inteiro
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
    aviso: nomeAviso ? CONFIG.combate.avisosInimigos[nomeAviso] : t.aviso,
    nomeAviso,                 // 'inaparavel' ou null (o som e o HUD usam)
  };
}

/**
 * Escolhe uma das sequências do inimigo, respeitando os pesos. Uma sequência
 * especial (que não é a primeira da lista) não sai duas vezes seguidas, e
 * nenhuma sai três vezes seguidas (penultima = a sequência antes da anterior).
 */
export function sortearSequencia(lista, anterior = null, sorteio = Math.random, penultima = null) {
  const livres = lista.filter((s, i) => s !== anterior || (i === 0 && s !== penultima));
  const opcoes = livres.length ? livres : lista;
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
  iniciar(cfg, golpes, sorteio = Math.random) {
    this.fila = golpes.map((g) => montarGolpe(cfg, g, sorteio));
    this.emenda = { ...CONFIG.combate.emendaInimigos, ...cfg.emenda };
    this.indice = -1;
    this.proximo(0);
  }

  proximo(adiantar) {
    this.indice++;
    this.golpe = this.fila[this.indice];
    this.fase = 'preparo';
    this.t = this.golpe.subida * adiantar;   // o atraso nunca é adiantado
    this.resolvido = false;   // o golpe ativo só acerta (ou é evitado) uma vez
  }

  /** Pula direto para uma fase do golpe atual. */
  irPara(fase) { this.fase = fase; this.t = 0; }

  /**
   * O tiro de pistola agora seria um parry? A janela fica presa à fase do golpe:
   * os últimos instantes do preparo (o aviso) e os primeiros do golpe ativo,
   * ambos encolhidos pelo janelaAparar do tipo (o pesado tem janela menor).
   * Golpes que não podem ser aparados (rasteira, inaparável) nunca entram na janela.
   */
  naJanelaDeAparo(cfgPistola) {
    const g = this.golpe;
    if (!g || !g.aparavel || this.resolvido) return false;
    const m = g.janelaAparar ?? 1;
    if (this.fase === 'preparo') return g.preparo - this.t <= cfgPistola.janelaNoAviso * m;
    if (this.fase === 'ativo') return this.t <= cfgPistola.janelaNoGolpe * m;
    return false;
  }

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
