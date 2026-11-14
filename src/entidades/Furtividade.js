// =============================================================================
//  FURTIVIDADE (Etapa D)
//  Regras puras de percepção, golpe pelas costas, alerta e pisada. Não desenham
//  nada, por isso podem ser testadas sem abrir o jogo. Números em
//  CONFIG.combate.furtividade, costas e pisada.
//  Convenção dos inimigos: o ângulo a olha para (sin a, cos a) no plano do chão.
// =============================================================================
import { CONFIG } from '../config.js';

/** Cosseno entre a frente de quem olha (ângulo) e a direção até o ponto (dx, dz). */
export function cossenoDaFrente(angulo, dx, dz) {
  const d = Math.hypot(dx, dz) || 1e-4;
  return (Math.sin(angulo) * dx + Math.cos(angulo) * dz) / d;
}

/** Metros em que o inimigo "ouve" o caçador. */
export function raioDeBarulho({ agachado = false, correndo = false } = {}) {
  const F = CONFIG.combate.furtividade;
  return agachado ? F.raioAgachado : correndo ? F.raioCorrendo : F.raioAndando;
}

/**
 * O inimigo que patrulha percebe o caçador? dist em metros, cosFrente = quanto
 * o caçador está à frente dele (1 = bem na frente), visao = a do inimigo.
 * Agachado: cone de anguloVisao e alcance visao × visaoNoEscuro. Em pé: o cone
 * largo e a visao inteira de antes. Em qualquer caso, perto demais ele ouve.
 */
export function percebe({ dist, cosFrente, visao, agachado = false, correndo = false }) {
  const F = CONFIG.combate.furtividade;
  const cone = agachado ? Math.cos(F.anguloVisao * Math.PI / 360) : F.coneEmPe;
  const alcance = agachado ? visao * F.visaoNoEscuro : visao;
  return (cosFrente > cone && dist < alcance) || dist < raioDeBarulho({ agachado, correndo });
}

/** O caçador (dx, dz a partir do inimigo) está nas costas do inimigo, perto o bastante? */
export function pelasCostas(angulo, dx, dz) {
  const K = CONFIG.combate.costas;
  return Math.hypot(dx, dz) <= K.alcance && cossenoDaFrente(angulo, dx, dz) <= -Math.cos(K.cone * Math.PI / 360);
}

/** Vizinhos (vivos, patrulhando, não chefes) a até raioAlerta de quem passou a perseguir. */
export function vizinhosParaAlertar(origem, inimigos) {
  const R = CONFIG.combate.furtividade.raioAlerta;
  return inimigos.filter((o) => o !== origem && !o.morto && o.estado === 'patrulha' && !o.cfg?.chefe &&
    Math.hypot(o.pos.x - origem.pos.x, o.pos.z - origem.pos.z) <= R);
}

/** Ao cair depois de pular a rasteira: pisa no atacante? (tempo = segundos desde o pulo do golpe) */
export function alcancaPisada(tempo, distancia) {
  const P = CONFIG.combate.pisada;
  return tempo <= P.janela && distancia <= P.alcance;
}
