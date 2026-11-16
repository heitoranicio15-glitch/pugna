// Pré-aquecimento dos programas de GPU. O Three.js troca de programa a cada NÚMERO novo
// de luzes de ponto visíveis; com o recorte de luzes da Catedral (0, 1 ... 19), cada
// contagem vista pela primeira vez recompilava os materiais: a pausa na subida da torre.
// Solução: contagem em degraus (o resto são luzes de intensidade 0) e compilação prévia.

/** Tamanho do degrau da contagem de luzes de ponto no render. */
export const PASSO_DE_LUZES = 4;

/** Menor contagem em degrau que comporta `n` luzes. */
export function degrauDeLuzes(n, passo = PASSO_DE_LUZES) {
  return Math.ceil(n / passo) * passo;
}

/** Todas as contagens em degrau possíveis para `n` luzes reais. */
export const degrausDeLuzes = (n) => Array.from({ length: degrauDeLuzes(n) / PASSO_DE_LUZES + 1 }, (_, i) => i * PASSO_DE_LUZES);

/** A luz só entra no render se ela e todos os pais estiverem visíveis. */
export function luzAtiva(luz) {
  for (let o = luz; o; o = o.parent) if (!o.visible) return false;
  return true;
}

const materiaisDe = (o) => (o.material ? [].concat(o.material) : []);
const compilar = (renderer, ...args) => Promise.resolve((renderer.compileAsync ?? renderer.compile).call(renderer, ...args));

/**
 * Compila os materiais da área em cada contagem de luzes que ela pode mostrar e envia as
 * texturas à GPU. Chame com a área já ativa (névoa e luzes da cena valem) e com o mesmo
 * `alvo` de render do jogo: o Three.js usa o espaço de cor do alvo na chave do programa.
 * Só os objetos da área são compilados; a visibilidade e a posição na cena voltam ao que eram.
 */
export function aquecerArea(renderer, cena, camera, area, alvo = null) {
  const salvos = [];
  area.grupo.traverse((o) => salvos.push([o, o.visible]));
  // Fora da cena, para o compile contar as luzes da área uma vez só (as da cena entram pelo 3º argumento).
  const pai = area.grupo.parent, indice = pai ? pai.children.indexOf(area.grupo) : -1;
  const alvoAnterior = renderer.getRenderTarget?.() ?? null;
  try {
    // Recipientes escondidos pelo recorte de setores precisam estar abertos para as luzes contarem.
    area.grupo.traverse((o) => { if (o.type === 'Group' || o.type === 'Object3D') o.visible = true; });
    area.grupo.traverse((o) => {
      for (const m of materiaisDe(o)) for (const v of Object.values(m)) if (v?.isTexture) renderer.initTexture?.(v);
    });
    if (pai) pai.remove(area.grupo);
    renderer.setRenderTarget?.(alvo);
    const promessas = [];
    for (const total of area.degrausDeLuz ?? [null]) {
      if (total !== null) area.fixarContagemDeLuzes(total);
      promessas.push(compilar(renderer, area.grupo, camera, cena));   // a parte síncrona já registra os programas
    }
    return Promise.all(promessas).then(() => undefined);
  } finally {
    renderer.setRenderTarget?.(alvoAnterior);
    if (pai) { pai.children.splice(indice, 0, area.grupo); area.grupo.parent = pai; }
    for (const [o, visivel] of salvos) o.visible = visivel;
  }
}
