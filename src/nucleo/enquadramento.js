import { CONFIG } from '../config.js';

/**
 * Abertura vertical da câmera, em graus, para a situação atual.
 * - Menu inicial e primeira pessoa: larga (CONFIG.render.campoDeVisao).
 * - Terceira pessoa: fechada, estilo Souls (CONFIG.camera.campoDeVisao).
 * - Celular em pé: bem larga, senão a tela estreita não mostra os lados.
 */
export function campoDeVisao({ titulo = false, primeiraPessoa = false, toque = false, proporcao = 16 / 9 } = {}) {
  if (toque && proporcao < 1) return CONFIG.render.campoDeVisaoCelularEmPe;
  if (titulo || primeiraPessoa) return CONFIG.render.campoDeVisao;
  return CONFIG.camera.campoDeVisao;
}
