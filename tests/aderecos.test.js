import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { criarAreas } from '../src/mundo/areas.js';

// ---------------------------------------------------------------------------
//  Todo adereço precisa de motivo e de lugar: nada flutuando, nada enfiado numa
//  parede, nada fora do terreno. Os modelos não carregam no Node, mas o encaixe de
//  cada um (userData.modelo, em src/render/modelos.js) fica no lugar certo, e as
//  peças feitas no código (mesas, muros, pedestais) servem de apoio.
// ---------------------------------------------------------------------------
function ligarDocumentoDeMentira() {
  const ctx = new Proxy(function () {}, {
    get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx),
    apply: () => ctx,
    set: () => true,
  });
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
}

// Presos na parede: podem encostar num colisor alto, mas não ficar soltos no meio da sala.
const DE_PAREDE = /^(torch_mounted|banner_|shelf_small_candles)/;
// Itens pequenos de cena que seguem o personagem ou o jogador (armas, chave) não são cenário;
// o fogareiro `torch` é encaixado no alto do poste da própria tocha.
const IGNORAR = /^(key|Sword|Helmet\d?|Hammer_Double|pistola-pugna|torch)$/;
// Feitos para ficar na água do riacho (o colisor da água tem `agua: true`).
const NA_AGUA = /^(Lilypad|cais-madeira|estaca-cais|barco-rio|banco-peixes|ancora-rio|WoodLog_Moss)$/;

export function listarAderecos(area) {
  area.grupo.updateMatrixWorld(true);
  const lista = [];
  area.grupo.traverse((o) => {
    const modelo = o.userData.modelo;
    if (!modelo || IGNORAR.test(modelo.id)) return;
    const p = o.getWorldPosition(new THREE.Vector3());
    lista.push({ id: modelo.id, x: p.x, y: p.y, z: p.z, tamanho: modelo.tamanho, objeto: o });
  });
  return lista;
}

/** Há uma superfície logo abaixo do adereço (chão, mesa, pedestal, prateleira)? */
function temApoio(area, a, raycaster, malhas, aderecos) {
  const outro = aderecos.find((b) => b !== a && Math.abs(b.x - a.x) < Math.max(b.tamanho[0], b.tamanho[2]) / 2
    && Math.abs(b.z - a.z) < Math.max(b.tamanho[0], b.tamanho[2]) / 2 && Math.abs(b.y + b.tamanho[1] - a.y) < 0.12);
  if (outro) return true;
  const caixa = area.colisores.caixas.find((c) => a.x > c.minX && a.x < c.maxX && a.z > c.minZ && a.z < c.maxZ
    && Math.abs(c.topo - a.y) < 0.15);
  if (caixa) return true;
  raycaster.set(new THREE.Vector3(a.x, a.y + 0.05, a.z), new THREE.Vector3(0, -1, 0));
  raycaster.far = 0.2;
  const alvos = raycaster.intersectObjects(malhas, false).filter((h) => !isAncestral(a.objeto, h.object));
  return alvos.length > 0;
}

function isAncestral(pai, filho) {
  for (let o = filho; o; o = o.parent) if (o === pai) return true;
  return false;
}

/** Colisor alto (parede, casa) que engole o centro do adereço; ignora o colisor do próprio adereço. */
function paredeEmVolta(area, a) {
  const [l = 0, , p = 0] = a.tamanho;
  const pegada = Math.max(l, p) + 0.6;
  return area.colisores.caixas.find((c) => {
    if (c.topo <= a.y + 0.3 || (c.agua && NA_AGUA.test(a.id))) return false;
    const proprio = Math.abs((c.minX + c.maxX) / 2 - a.x) < 0.35 && Math.abs((c.minZ + c.maxZ) / 2 - a.z) < 0.35
      && c.maxX - c.minX <= pegada && c.maxZ - c.minZ <= pegada;
    if (proprio) return false;
    const folga = 0.12;
    return a.x > c.minX + folga && a.x < c.maxX - folga && a.z > c.minZ + folga && a.z < c.maxZ - folga;
  });
}

function distanciaAoColisorAlto(area, a) {
  let menor = Infinity;
  for (const c of area.colisores.caixas) {
    if (c.topo < a.y + 0.3) continue;
    const dx = Math.max(c.minX - a.x, 0, a.x - c.maxX), dz = Math.max(c.minZ - a.z, 0, a.z - c.maxZ);
    menor = Math.min(menor, Math.hypot(dx, dz));
  }
  return menor;
}

export function problemasDosAderecos(area) {
  const raycaster = new THREE.Raycaster();
  const malhas = [];
  area.grupo.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) malhas.push(o); });
  const problemas = [];
  const nome = (a) => `${area.id}: ${a.id} em (${a.x.toFixed(2)}; ${a.y.toFixed(2)}; ${a.z.toFixed(2)})`;
  const aderecos = listarAderecos(area);
  for (const a of aderecos) {
    if (DE_PAREDE.test(a.id)) {
      // Encostado: o fundo da peça a no máximo 25 cm de uma parede, coluna ou casa.
      if (distanciaAoColisorAlto(area, a) > a.tamanho[2] / 2 + 0.25) problemas.push(`${nome(a)} é de parede mas está solto, longe da parede`);
      continue;
    }
    // Ruas, becos e travessas ficam livres: adereço só na beira (até 1 m da borda).
    const rua = (area.ruas ?? []).find((r) => ['principal', 'secundaria', 'beco'].includes(r.classe)
      && Math.abs(a.x - r.x) < r.l / 2 - 1 && Math.abs(a.z - r.z) < r.p / 2 - 1);
    if (rua) problemas.push(`${nome(a)} está no meio da rua (${rua.classe} em ${rua.x}; ${rua.z})`);
    const apoiado = temApoio(area, a, raycaster, malhas, aderecos);
    if (!apoiado) problemas.push(`${nome(a)} está ${a.y < 0.06 ? 'fora do terreno (sem chão embaixo)' : 'flutuando'}`);
    // Quem está em cima de um móvel ou da cornija pode ficar dentro do colisor desse móvel.
    const parede = (a.y < 0.06 || !apoiado) && paredeEmVolta(area, a);
    if (parede) problemas.push(`${nome(a)} está dentro de um colisor (${parede.minX.toFixed(1)}..${parede.maxX.toFixed(1)}; ${parede.minZ.toFixed(1)}..${parede.maxZ.toFixed(1)})`);
  }
  return problemas;
}

test('nenhum adereço flutua, fica dentro de parede ou fora do terreno', () => {
  ligarDocumentoDeMentira();
  const { areas } = criarAreas(new THREE.Scene(), { direcaoLua: new THREE.Vector3(0.3, 0.5, -0.8).normalize() });
  const problemas = areas.flatMap(problemasDosAderecos);
  assert.deepEqual(problemas, []);
});
