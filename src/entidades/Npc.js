// =============================================================================
//  NPC PARADO
//  Uma pessoa que só fala (spec 03, parte B): fica parada, respira, vira a cabeça e o
//  corpo devagar para o caçador quando ele chega perto e responde ao "E — falar".
//  Não luta, não leva dano e só ocupa um colisor pequeno. Nada é salvo.
//
//  A área declara os NPCs em `npcs: [{ id, nome, modelo, x, z, olhar, falas }]`
//  (validado por `validarArea`) e o Jogo.js chama `criarNpcs(area)` uma vez.
//  Números em CONFIG.npc. O modelo é um personagem GLB já integrado (ModeloDePersonagem.js).
//
//  Convenção de direção: `olhar` = 0 olha para +Z; a frente é (sin(olhar), cos(olhar)).
//  As funções puras (falas, ângulos, validação) não dependem de navegador e têm testes.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { modeloDePersonagem } from './ModeloDePersonagem.js';

const C = CONFIG.npc;

// Braços em repouso, calibrados para o esqueleto de cada modelo (sem isto, ficam abertos).
const BRACOS = {
  'scary-doctor': { bracoE: [-0.38, 0, -0.13], bracoD: [-0.15, 0, 0.11] },
};

// ---------- funções puras ----------

/** Conversa nova: começa na primeira fala. */
export function criarConversa(falas) {
  return { falas, indice: 0 };
}

/** A próxima fala a cada E. Depois da última, repete a última. */
export function proximaFala(conversa) {
  const ultima = conversa.falas.length - 1;
  const fala = conversa.falas[Math.min(conversa.indice, ultima)];
  conversa.indice = Math.min(conversa.indice + 1, conversa.falas.length);
  return fala;
}

/** Ângulo equivalente entre -PI e PI. */
export function normalizarAngulo(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Para onde o NPC vira para olhar o jogador. Devolve { corpo, cabeca } (radianos, relativos
 * ao `olhar` de origem) ou null se o jogador está longe demais. O corpo gira só parte do
 * caminho e a cabeça completa o resto, ambos com limite.
 */
export function olharParaJogador(npc, jogador, { distancia, limiteCorpo, limiteCabeca } = C) {
  const dx = jogador.x - npc.x, dz = jogador.z - npc.z;
  if (Math.hypot(dx, dz) > (distancia ?? C.distanciaOlhar)) return null;
  const diferenca = normalizarAngulo(Math.atan2(dx, dz) - npc.olhar);
  const limitar = (v, max) => Math.max(-max, Math.min(max, v));
  const corpo = limitar(diferenca * 0.6, limiteCorpo ?? C.limiteCorpo);
  const cabeca = limitar(diferenca - corpo, limiteCabeca ?? C.limiteCabeca);
  return { corpo, cabeca };
}

/** Problemas de uma declaração de NPC (lista vazia = ok). Usada por `validarArea`. */
export function validarNpc(npc) {
  if (!npc || typeof npc !== 'object') return ['NPC não é um objeto'];
  const problemas = [];
  const nome = typeof npc.id === 'string' && npc.id ? npc.id : '(sem id)';
  if (nome === '(sem id)') problemas.push('NPC sem `id`');
  if (typeof npc.x !== 'number' || typeof npc.z !== 'number') problemas.push(`NPC ${nome}: precisa de x e z numéricos`);
  if (!Array.isArray(npc.falas) || !npc.falas.length) {
    problemas.push(`NPC ${nome}: precisa de \`falas\` (lista não vazia)`);
  } else {
    for (const fala of npc.falas) {
      if (typeof fala !== 'string' || !fala.trim()) problemas.push(`NPC ${nome}: fala vazia`);
      else if (fala.length > C.maxLetras) problemas.push(`NPC ${nome}: fala com mais de ${C.maxLetras} letras`);
    }
  }
  return problemas;
}

// ---------- o NPC ----------

export class Npc {
  /**
   * `area` precisa de grupo, colisores e objetos. `def` é a declaração da área:
   * { id, nome, modelo, x, z, olhar, falas } e, opcionais, `tinta`, `fase`, `postura`
   * ({ tronco, cabeca }, em radianos), `corpo` (grupo provisório de peças, escondido quando
   * o modelo carrega), `armas` (como em modeloDePersonagem) e `aoAnimar(npc, tempo, rig)`.
   */
  constructor(area, def) {
    const problemas = validarNpc(def);
    if (problemas.length) throw new Error(`NPC inválido: ${problemas.join('; ')}`);
    this.id = def.id;
    this.nome = def.nome || def.id;
    this.x = def.x; this.z = def.z;
    this.olhar = def.olhar || 0;
    this.fase = def.fase || 0;
    this.postura = def.postura || { tronco: 0, cabeca: 0 };
    this.aoAnimar = def.aoAnimar || null;
    this.conversa = criarConversa(def.falas);
    this.corpo = 0;     // giro atual do corpo e da cabeça, relativos ao `olhar`
    this.cabeca = 0;
    this.respiracao = 0;
    this.bracos = BRACOS[def.modelo] || null;

    this.grupo = new THREE.Group();
    this.grupo.name = `NPC: ${this.id}`;
    this.grupo.position.set(this.x, 0, this.z);
    this.grupo.rotation.y = this.olhar;
    area.grupo.add(this.grupo);
    if (def.corpo) this.grupo.add(def.corpo);
    this.modelo = modeloDePersonagem(this.grupo, def.modelo, {
      reserva: def.corpo ? [def.corpo] : [], armas: def.armas, tinta: def.tinta,
    });

    // Colisor pequeno: o caçador não atravessa. O topo fica abaixo do ponto de interação (y),
    // para o "E" não ser barrado pelo próprio NPC.
    area.colisores.adicionar(this.x, this.z, C.colisor.lado, C.colisor.lado, C.colisor.topo);

    // E — falar: o Jogo.js trata a ação 'falar' (mostra a fala e não pausa nada).
    this.objeto = {
      x: this.x, y: 1.4, z: this.z, alcance: def.alcance || C.alcance,
      nome: this.nome, acao: 'falar',
      falar: () => this.falar(), segundos: C.segundosDaFala,
    };
    area.objetos.push(this.objeto);
  }

  falar() {
    return proximaFala(this.conversa);
  }

  /** Respira, olha de lado de vez em quando e vira devagar para o jogador quando ele chega perto. */
  atualizar(dt, tempo, jogador) {
    const t = tempo + this.fase;
    const alvo = olharParaJogador(this, jogador);
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * C.rapidezDoGiro);
    const balanco = Math.sin(t * C.balanco.velocidade) * C.balanco.amplitude;
    this.corpo += ((alvo ? alvo.corpo : 0) - this.corpo) * k;
    this.cabeca += ((alvo ? alvo.cabeca : balanco) - this.cabeca) * k;
    this.respiracao = Math.sin(t * C.respiracao.velocidade) * C.respiracao.amplitude;
    this.grupo.rotation.y = this.olhar + this.corpo;

    const rig = this.modelo.userData.pose;
    if (rig) {
      rig.tronco(this.respiracao + this.postura.tronco, 0, 0);
      rig.cabeca(0.05 + this.postura.cabeca, this.cabeca, 0);
      if (this.bracos) {
        const [be, bd] = [this.bracos.bracoE, this.bracos.bracoD];
        const sopro = Math.sin(t * 1.9) * 0.03;
        rig.bracoE(be[0] + sopro, be[1], be[2]);
        rig.bracoD(bd[0] + sopro, bd[1], bd[2]);
      }
    }
    this.aoAnimar?.(this, tempo, rig);
  }
}

/** Cria os NPCs declarados por uma área (campo opcional `npcs`). */
export function criarNpcs(area) {
  return (area.npcs || []).map((def) => new Npc(area, def));
}
