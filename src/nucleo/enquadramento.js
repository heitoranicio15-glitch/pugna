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

/**
 * Câmera com peso (spec 10, CAM2): faz `ponto` perseguir `alvo` com atraso exponencial.
 * Regra pura: muda e devolve `ponto` ({ x, y, z }).
 *
 * - `alvoAnterior` é onde o alvo estava no quadro passado. Com ele a conta é exata para um
 *   alvo em linha reta, então o resultado é o mesmo a 30 ou a 144 quadros por segundo.
 * - `limites`: { seguirPlano, seguirVertical } (rapidez, por segundo) e
 *   { atrasoMaxPlano, atrasoMaxVertical } (distância máxima, em metros, que o ponto pode ficar para trás).
 * - dt <= 0 encaixa o ponto no alvo na hora (teletransporte, pausa).
 */
export function seguirPonto(ponto, alvoAnterior, alvo, dt, limites = CONFIG.camera) {
  if (!(dt > 0)) { ponto.x = alvo.x; ponto.y = alvo.y; ponto.z = alvo.z; return ponto; }
  const eixo = (atual, antes, agora, rapidez) => {
    if (!(rapidez > 0) || rapidez === Infinity) return agora;
    const resto = Math.exp(-dt * rapidez);
    // Solução exata de "andar em direção a um alvo que se move em linha reta durante o quadro".
    return agora - (agora - antes) * (1 - resto) / (dt * rapidez) + (atual - antes) * resto;
  };
  ponto.x = eixo(ponto.x, alvoAnterior.x, alvo.x, limites.seguirPlano);
  ponto.z = eixo(ponto.z, alvoAnterior.z, alvo.z, limites.seguirPlano);
  ponto.y = eixo(ponto.y, alvoAnterior.y, alvo.y, limites.seguirVertical);
  // Atraso máximo: no plano é um círculo em volta do alvo; na vertical, uma faixa.
  const dx = ponto.x - alvo.x, dz = ponto.z - alvo.z, atraso = Math.hypot(dx, dz);
  const maxPlano = limites.atrasoMaxPlano ?? Infinity, maxVertical = limites.atrasoMaxVertical ?? Infinity;
  if (atraso > maxPlano) { ponto.x = alvo.x + dx / atraso * maxPlano; ponto.z = alvo.z + dz / atraso * maxPlano; }
  ponto.y = Math.max(alvo.y - maxVertical, Math.min(alvo.y + maxVertical, ponto.y));
  return ponto;
}
