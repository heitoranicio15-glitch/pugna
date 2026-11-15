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

// ---------------------------------------------------------------------------
//  Mira travada estilo Souls (spec 10, CAM3). Três contas puras, só da terceira pessoa.
// ---------------------------------------------------------------------------

/**
 * Inclinação da câmera com a mira travada, em radianos (negativo = olhando de cima).
 * Parte de `mira.inclinacao` e soma uma fração do ângulo entre o ponto de giro e o peito do alvo:
 * alvo mais alto (chefe grande, inimigo numa escada) levanta o olhar; alvo mais baixo ou colado abaixa.
 * `alturaGiro` e `alturaAlvo` são alturas no mundo (m); `distancia` é a distância no chão.
 */
export function inclinacaoDaMira(alturaGiro, alturaAlvo, distancia, mira = CONFIG.mira, camera = CONFIG.camera) {
  const angulo = Math.atan2(alturaAlvo - alturaGiro, Math.max(distancia, mira.inclinacaoDistMin ?? 0));
  const inclinacao = mira.inclinacao + (mira.inclinacaoFracao ?? 0) * angulo;
  return Math.max(camera.inclinacaoMin, Math.min(camera.inclinacaoMax, inclinacao));
}

/**
 * Para onde a câmera olha com a mira travada: devolve o deslocamento { x, z } do ponto de foco
 * em relação ao caçador. O foco fica no caminho até o alvo (`focoFracao` do caminho, no máximo `focoMax`),
 * para o caçador e o alvo caberem os dois na tela.
 */
export function focoDaMira(origem, alvo, mira = CONFIG.mira, saida = { x: 0, z: 0 }) {
  const dx = alvo.x - origem.x, dz = alvo.z - origem.z, distancia = Math.hypot(dx, dz);
  if (distancia < 1e-6) { saida.x = 0; saida.z = 0; return saida; }
  const passo = Math.min(distancia * (mira.focoFracao ?? 0), mira.focoMax ?? Infinity);
  saida.x = dx / distancia * passo; saida.z = dz / distancia * passo;
  return saida;
}

/**
 * Metros a mais de distância da câmera com a mira travada: cresce com o tamanho do alvo
 * (escala acima de 1) e um pouco quando o alvo está colado no caçador.
 */
export function distanciaDaMira(escala, distancia, mira = CONFIG.mira) {
  const tamanho = Math.max(0, (escala ?? 1) - 1) * (mira.distPorEscala ?? 0);
  const perto = mira.pertoDistancia > 0 ? Math.max(0, Math.min(1, 1 - distancia / mira.pertoDistancia)) : 0;
  return tamanho + perto * (mira.pertoExtra ?? 0);
}

/**
 * Leva `estado.valor` até `alvo` como uma mola sem balanço: começa devagar, acelera e chega devagar
 * (sem tranco na saída nem na chegada). `estado` é { valor, vel }; `rapidez` é por segundo.
 * A conta é exata para um alvo parado, então dá o mesmo resultado a 30 ou a 144 quadros por segundo.
 * dt <= 0 encaixa na hora (teletransporte, pausa).
 */
export function acomodar(estado, alvo, dt, rapidez) {
  if (!(dt > 0) || !(rapidez > 0) || rapidez === Infinity) { estado.valor = alvo; estado.vel = 0; return estado; }
  const falta = estado.valor - alvo, resto = Math.exp(-rapidez * dt);
  const impulso = (estado.vel + rapidez * falta) * dt;
  estado.vel = (estado.vel - rapidez * impulso) * resto;
  estado.valor = alvo + (falta + impulso) * resto;
  return estado;
}
