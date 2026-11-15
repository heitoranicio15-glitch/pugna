import { CONFIG } from '../config.js';

/**
 * Abertura vertical da câmera, em graus, para a situação atual.
 * - Menu inicial e primeira pessoa: larga (CONFIG.render.campoDeVisao).
 * - Terceira pessoa: fechada, estilo Souls (CONFIG.camera.campoDeVisao), ou a `abertura` escolhida
 *   em Configurações (CAM4), presa entre CONFIG.camera.aberturaMin e aberturaMax.
 * - Celular em pé: bem larga, senão a tela estreita não mostra os lados.
 */
export function campoDeVisao({ titulo = false, primeiraPessoa = false, toque = false, proporcao = 16 / 9, abertura } = {}) {
  if (toque && proporcao < 1) return CONFIG.render.campoDeVisaoCelularEmPe;
  if (titulo || primeiraPessoa) return CONFIG.render.campoDeVisao;
  const C = CONFIG.camera;
  if (!Number.isFinite(abertura)) return C.campoDeVisao;
  return Math.max(C.aberturaMin ?? C.campoDeVisao, Math.min(C.aberturaMax ?? C.campoDeVisao, abertura));
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
  // CAM3b: com o alvo colado, um pouco mais para baixo (a câmera sobe e vê por cima do ombro).
  const inclinacao = mira.inclinacao + (mira.inclinacaoFracao ?? 0) * angulo
    + (mira.coladoInclinacao ?? 0) * fatorColado(distancia, mira);
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

// ---------------------------------------------------------------------------
//  CAM3b: alvo colado e caçador transparente.
// ---------------------------------------------------------------------------
const entre0e1 = (v) => Math.max(0, Math.min(1, v));

/**
 * Quanto o alvo travado está "colado" no caçador: 0 a partir de `coladoDistancia`, 1 em `coladoCheio`
 * ou mais perto, com entrada e saída macias (sem degrau).
 */
export function fatorColado(distancia, mira = CONFIG.mira) {
  const de = mira.coladoDistancia, cheio = mira.coladoCheio ?? 0;
  if (!(de > cheio)) return 0;
  const t = entre0e1((de - distancia) / (de - cheio));
  return t * t * (3 - 2 * t);
}

/**
 * Quanto o caçador tapa o alvo travado na tela, de 0 (não tapa) a 1 (o ponto do marcador está bem dentro
 * da silhueta). `ponto` é { x, y } e `silhueta` é { x0, x1, y0, y1 }, todos na mesma unidade
 * (fração da altura da tela). A transparência entra aos poucos numa faixa de `margem` em volta da borda.
 */
export function coberturaDoAlvo(ponto, silhueta, margem = CONFIG.mira.tapaMargem) {
  const dentro = Math.min(ponto.x - silhueta.x0, silhueta.x1 - ponto.x, ponto.y - silhueta.y0, silhueta.y1 - ponto.y);
  if (!(margem > 0)) return dentro >= 0 ? 1 : 0;
  return entre0e1((dentro + margem) / (2 * margem));
}

/**
 * Quanto do caçador é desenhado, de 0 (invisível) a 1 (inteiro).
 * - Pela distância: inteiro a partir de `camera.transparenteDe`, some em `camera.sumirBoneco`
 *   (câmera encostada nele por causa de uma parede).
 * - Pela cobertura (0 a 1): quando ele tapa o alvo travado, cai até `mira.tapaOpacidade`.
 * Vale o menor dos dois.
 */
export function opacidadeDoCacador(distancia, cobertura = 0, camera = CONFIG.camera, mira = CONFIG.mira) {
  const de = camera.transparenteDe ?? camera.sumirBoneco;
  const perto = de > camera.sumirBoneco
    ? entre0e1((distancia - camera.sumirBoneco) / (de - camera.sumirBoneco))
    : (distancia > camera.sumirBoneco ? 1 : 0);
  return Math.min(perto, 1 - entre0e1(cobertura) * (1 - (mira.tapaOpacidade ?? 1)));
}

// ---------------------------------------------------------------------------
//  CAM4: opções de câmera (recentralizar sozinha e desviar de paredes). Só na terceira pessoa.
// ---------------------------------------------------------------------------
/** Menor diferença entre dois ângulos (a - b), entre -PI e PI. */
export const difAngulo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * "Recentralizar sozinha": devolve o novo yaw (para onde a câmera olha).
 * Andando ou correndo sem mexer o mouse por `recentrarEspera` segundos, o olhar volta devagar para
 * trás do corpo (`rumo`). Mexer o mouse, parar, travar a mira ou desligar a opção zera a espera na hora.
 * Andando de frente para a câmera (corpo virado mais que `recentrarSemVolta`) ela não gira.
 * `estado` é { tempo } (segundos andando sem mexer o mouse); `s` é { yaw, rumo, andando, mouse, travada, ligada }.
 */
export function recentralizar(estado, s, dt, camera = CONFIG.camera) {
  if (!(dt > 0)) return s.yaw;
  if (!s.ligada || s.travada || s.mouse || !s.andando) { estado.tempo = 0; return s.yaw; }
  estado.tempo += dt;
  const passou = estado.tempo - camera.recentrarEspera;
  if (passou <= 0) return s.yaw;
  const falta = difAngulo(s.rumo, s.yaw);
  if (Math.abs(falta) > (camera.recentrarSemVolta ?? Math.PI)) return s.yaw;
  const entrada = camera.recentrarEntrada > 0 ? Math.min(1, passou / camera.recentrarEntrada) : 1;
  const passo = Math.min(Math.abs(falta) * (1 - Math.exp(-dt * camera.recentrarRapidez)), camera.recentrarVelMax * dt);
  return s.yaw + Math.sign(falta) * passo * entrada;
}

/**
 * "Desviar de paredes": velocidade de giro do yaw (radianos por segundo) para afastar a câmera de uma parede.
 * `livreMais` e `livreMenos` dizem quanto do caminho até a câmera está livre (0 = parede colada, 1 = livre)
 * se o yaw fosse um pouco maior ou um pouco menor. O giro vai para o lado mais livre, mais rápido quanto
 * maior a diferença. Lados iguais (campo aberto, ou parede bem atrás): 0, vale só o encurtar da CAM2.
 */
export function desvioDeParede(livreMais, livreMenos, camera = CONFIG.camera) {
  const diferenca = entre0e1(livreMais) - entre0e1(livreMenos), margem = camera.desviarMargem ?? 0;
  if (Math.abs(diferenca) <= margem) return 0;
  return Math.sign(diferenca) * (Math.abs(diferenca) - margem) / (1 - margem) * camera.desviarVel;
}
