// =============================================================================
//  QUADRAS DO VILAREJO
//  As casas não são mais postas uma a uma: cada rua recebe uma FILEIRA de casas em
//  cada lado, com o mesmo recuo, a porta virada para a rua e o ritmo de tipos de
//  CONFIG.vila.ritmo. As casas de uma fileira se encostam; quando algo ocupa o lote
//  (torre, abrigo, rota de patrulha, lanterna, placa), a fileira abre um vão de pelo
//  menos um beco. Nada de fresta estreita entre duas paredes.
//  Depois, os miolos de quarteirão que sobram vazios recebem ruínas, cercas e árvores
//  secas. O plano em metros está em docs/mapa.md.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LoteDeCenario, arcoOgival, arvoreSeca, casa, juntarPorMaterial, materiais } from './pecas.js';
import { sombrasDeContato } from './efeitosCenario.js';
import { criarSorteio } from '../render/texturas.js';

const V = () => CONFIG.vila;

/** Distância entre dois retângulos (0 se encostam ou se cruzam). */
export function distanciaRet(a, b) {
  const dx = Math.max(0, b.minX - a.maxX, a.minX - b.maxX);
  const dz = Math.max(0, b.minZ - a.maxZ, a.minZ - b.maxZ);
  return Math.hypot(dx, dz);
}
export function cruzam(a, b, folga = 0) {
  return a.minX < b.maxX + folga && a.maxX > b.minX - folga && a.minZ < b.maxZ + folga && a.maxZ > b.minZ - folga;
}
const retDaRua = ({ x, z, l, p }) => ({ minX: x - l / 2, maxX: x + l / 2, minZ: z - p / 2, maxZ: z + p / 2 });
function distPontoRet(px, pz, r) {
  return Math.hypot(Math.max(0, r.minX - px, px - r.maxX), Math.max(0, r.minZ - pz, pz - r.maxZ));
}
/** Distância de um segmento (rota de patrulha) a um retângulo, por amostragem a cada 0,5 m. */
function distSegRet([ax, az], [bx, bz], r) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5));
  let menor = Infinity;
  for (let i = 0; i <= n; i++) menor = Math.min(menor, distPontoRet(ax + (bx - ax) * i / n, az + (bz - az) * i / n, r));
  return menor;
}

/** Estável (sem sorteio): o mesmo lugar sempre dá o mesmo número entre 0 e 1. */
const estavel = (x, z, k = 0) => {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
};

/** Pontos e caminhos que nenhuma construção nova pode ocupar. */
function reservas(mundo) {
  const pontos = [
    ...mundo.portais, ...mundo.pontosDeDescanso, ...mundo.objetos,
    ...Object.values(mundo.chegadas), mundo.nascimento, ...(mundo.npcs ?? []),
  ].map(({ x, z }) => [x, z]);
  const rotas = [];
  for (const { rota } of mundo.inimigos) {
    for (let i = 0; i < rota.length; i++) rotas.push([rota[i], rota[(i + 1) % rota.length]]);
  }
  return { pontos, rotas };
}

/** Arcos de pedra atravessando as ruas compridas: emolduram o caminho e cortam a vista longa. */
function montarArcos(mundo, lote, reservado) {
  const m = materiais();
  const arcos = [];
  for (const rua of mundo.ruas.filter((r) => r.arcos)) {
    const aoLongoDeX = rua.l >= rua.p;
    const comp = aoLongoDeX ? rua.l : rua.p, larg = aoLongoDeX ? rua.p : rua.l;
    const n = Math.floor(comp / 34);
    for (let i = 1; i <= n; i++) {
      // Procura um lugar livre perto do ponto ideal (tochas, placas e rotas atrapalham).
      let achado = null;
      for (const desvio of [0, 3, -3, 6, -6, 9, -9, 12, -12, 15, -15]) {
        const t = -comp / 2 + (i * comp) / (n + 1) + desvio;
        const cx = aoLongoDeX ? rua.x + t : rua.x, cz = aoLongoDeX ? rua.z : rua.z + t;
        if (reservado.pontos.some(([px, pz]) => Math.hypot(px - cx, pz - cz) < 4)) continue;
        const pilares = [-1, 1].map((lado) => {
          const px = aoLongoDeX ? cx : cx + lado * (larg / 2 - 0.45);
          const pz = aoLongoDeX ? cz + lado * (larg / 2 - 0.45) : cz;
          return { minX: px - 0.45, maxX: px + 0.45, minZ: pz - 0.45, maxZ: pz + 0.45, px, pz };
        });
        if (pilares.some((r) => reservado.rotas.some(([a, b]) => distSegRet(a, b, r) < 1))) continue;
        if (pilares.some((r) => mundo.colisores.caixas.some((c) => cruzam(r, c, 0.3)))) continue;
        achado = { cx, cz, pilares };
        break;
      }
      if (!achado) continue;
      const { cx, cz, pilares } = achado;
      const kit = juntarPorMaterial();
      const vao = larg - 0.9 * 2;
      for (const lado of [-1, 1]) {
        kit.caixa(lado * (larg / 2 - 0.45), 2.4, 0, 0.9, 4.8, 0.9, m.pedra);
        kit.caixa(lado * (larg / 2 - 0.45), 0.3, 0, 1.05, 0.6, 1.05, m.pedraEscura);
      }
      kit.caixa(0, 5.4, 0, larg, 1.2, 1.0, m.pedra);
      kit.caixa(0, 6.08, 0, larg + 0.3, 0.16, 1.15, m.pedraEscura);
      const arco = arcoOgival(vao, 1.2, 0.3, 0.9, m.pedraEscura);
      arco.position.set(0, 3.6, 0);
      arco.updateMatrix();
      kit.geometria(arco.geometry.clone().applyMatrix4(arco.matrix), m.pedraEscura);
      lote.adicionar(kit, cx, cz, aoLongoDeX ? Math.PI / 2 : 0);
      for (const { px, pz } of pilares) mundo.colisores.adicionar(px, pz, 0.9, 0.9).arco = true;
      arcos.push([cx, cz]);
    }
  }
  return arcos;
}

/**
 * Casas em fileira dos dois lados de cada rua marcada com `casas: true`.
 * Devolve a lista de casas (tipo, centro, retângulo), usada nos testes.
 */
export function montarQuadras(mundo) {
  const C = V();
  const lote = new LoteDeCenario(mundo.grupo, 'Casas e ruínas', 40);
  const reservado = reservas(mundo);
  mundo.arcos = montarArcos(mundo, lote, reservado);
  const ruas = mundo.ruas.map(retDaRua);
  const { minX, maxX, minZ, maxZ } = mundo.limites;
  const casas = [];
  // Paredes de verdade (casas, muros, torres). Postes de tocha e troncos não formam fresta.
  const altos = () => mundo.colisores.caixas.filter((c) => c.topo > 2 && !c.arco
    && (c.maxX - c.minX) * (c.maxZ - c.minZ) > 1.5);
  let n = 0;

  // `atras` (opcional): função que diz se um colisor está atrás da casa; esses não contam
  // como fresta, porque a casa vai ficar mais funda até encostar neles.
  const cabe = (r, atras = null) => {
    // A casa pode passar um pouco do limite do jogador: ela encosta na muralha.
    if (r.minX < minX - 1.5 || r.maxX > maxX + 1.5 || r.minZ < minZ - 1.5 || r.maxZ > maxZ + 1.5) return false;
    if (ruas.some((rua) => cruzam(r, rua, 0.05))) return false;
    for (const c of mundo.colisores.caixas) {
      if (cruzam(r, c, c.topo > 2 ? -0.02 : 0.3)) return false;
    }
    // Nada de fresta: até outra parede alta, ou encosta (≤ 5 cm) ou deixa um beco inteiro.
    for (const c of altos()) {
      if (atras?.(c)) continue;
      const d = distanciaRet(r, c);
      if (d > 0.05 && d < C.ruas.beco - 0.01) return false;
    }
    if (reservado.pontos.some(([px, pz]) => distPontoRet(px, pz, r) < C.folga)) return false;
    if (reservado.rotas.some(([a, b]) => distSegRet(a, b, r) < C.folga)) return false;
    return true;
  };

  for (const rua of mundo.ruas.filter((r) => r.casas)) {
    const aoLongoDeX = rua.l >= rua.p;
    for (const lado of [-1, 1]) {
      const borda = aoLongoDeX ? rua.z + lado * rua.p / 2 : rua.x + lado * rua.l / 2;
      const ini = aoLongoDeX ? rua.x - rua.l / 2 : rua.z - rua.p / 2;
      const fim = aoLongoDeX ? rua.x + rua.l / 2 : rua.z + rua.p / 2;
      const perto = borda + lado * C.recuo;
      // A porta olha para a rua.
      const frente = aoLongoDeX ? (lado < 0 ? 'S' : 'N') : (lado < 0 ? 'L' : 'O');
      const lote1 = (cursor, l, p) => {
        const longe = perto + lado * p;
        const [a0, a1] = [Math.min(perto, longe), Math.max(perto, longe)];
        return aoLongoDeX ? { minX: cursor, maxX: cursor + l, minZ: a0, maxZ: a1 } : { minX: a0, maxX: a1, minZ: cursor, maxZ: cursor + l };
      };
      // Distância do fundo da casa até um colisor que está atrás dela (ou null).
      const folgaAtras = (r, c) => {
        const alinhado = aoLongoDeX ? c.maxX > r.minX && c.minX < r.maxX : c.maxZ > r.minZ && c.minZ < r.maxZ;
        if (!alinhado) return null;
        const d = aoLongoDeX ? (lado > 0 ? c.minZ - r.maxZ : r.minZ - c.maxZ) : (lado > 0 ? c.minX - r.maxX : r.minX - c.maxX);
        return d > 0.05 ? d : null;
      };
      // Tenta o tipo da vez; se não couber, os outros (do maior para o menor).
      const tentar = (cursor) => {
        const daVez = C.ritmo[n % C.ritmo.length];
        const ordem = [daVez, ...Object.keys(C.tipos).filter((t) => t !== daVez).sort((a, b) => C.tipos[b].l - C.tipos[a].l)];
        for (const tipo of ordem) {
          const T = C.tipos[tipo];
          if (cursor + T.l > fim) continue;
          const r = lote1(cursor, T.l, T.p);
          const atras = (c) => { const d = folgaAtras(r, c); return d !== null && d < C.ruas.beco; };
          if (!cabe(r, atras)) continue;
          const muros = altos().map((c) => folgaAtras(r, c)).filter((d) => d !== null && d < C.ruas.beco - 0.01);
          if (!muros.length) return { tipo, T, r, fundo: null };
          // Um muro alto logo atrás deixaria uma fresta: a casa fica mais funda e encosta nele.
          const fundo = T.p + Math.min(...muros) - 0.02;
          const funda = lote1(cursor, T.l, fundo);
          if (cabe(funda)) return { tipo, T, r: funda, fundo };
        }
        return null;
      };
      let cursor = ini, fimAnterior = -Infinity;
      while (cursor < fim) {
        const achou = tentar(cursor);
        if (achou) {
          const { tipo, T, r, fundo } = achou;
          const cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
          casa(mundo, { x: cx, z: cz, tipo, fundo, frente, acesa: n % 3 === 0, lote });
          casas.push({ tipo, x: cx, z: cz, frente, ret: r });
          n++;
          fimAnterior = cursor + T.l;
          cursor = fimAnterior;
        } else {
          // Não coube: anda 1 m. Logo depois de uma casa, o vão mínimo é um beco inteiro.
          cursor = cursor === fimAnterior ? fimAnterior + C.ruas.beco : cursor + 1;
        }
      }
    }
  }
  sombrasDeContato(mundo.grupo, casas.map(({ ret }) => [
    (ret.minX + ret.maxX) / 2, (ret.minZ + ret.maxZ) / 2, (ret.maxX - ret.minX) * 1.3, (ret.maxZ - ret.minZ) * 1.3,
  ]));
  montarMiolos(mundo, lote, reservado, ruas);
  lote.montar();
  return casas;
}

/** Ruínas de muro, cercas e árvores secas nos miolos de quarteirão que ficaram vazios. */
function montarMiolos(mundo, lote, reservado, ruas) {
  const C = V();
  const m = materiais();
  const { minX, maxX, minZ, maxZ } = mundo.limites;
  const passo = 7;
  for (let gx = minX + passo / 2; gx < maxX; gx += passo) {
    for (let gz = minZ + passo / 2; gz < maxZ; gz += passo) {
      const x = gx + (estavel(gx, gz, 1) - 0.5) * 3, z = gz + (estavel(gx, gz, 2) - 0.5) * 3;
      const sorte = estavel(gx, gz, 3);
      if (sorte < 0.3) continue;
      const giro = estavel(gx, gz, 4) < 0.5;
      const comp = 2.6 + estavel(gx, gz, 5) * 2.4;
      const ruina = sorte >= 0.62;
      const meia = ruina ? comp / 2 + 0.4 : 0.6;
      const r = { minX: x - meia, maxX: x + meia, minZ: z - meia, maxZ: z + meia };
      if (r.minX < minX + 2 || r.maxX > maxX - 2 || r.minZ < minZ + 2 || r.maxZ > maxZ - 2) continue;
      if (ruas.some((rua) => cruzam(r, rua, 3))) continue;
      if (mundo.colisores.caixas.some((c) => distanciaRet(r, c) < C.ruas.beco)) continue;
      if (reservado.pontos.some(([px, pz]) => distPontoRet(px, pz, r) < C.folga + 2)) continue;
      if (reservado.rotas.some(([a, b]) => distSegRet(a, b, r) < C.folga + 2)) continue;
      if (ruina) {
        // Pedaço de muro caído: degraus de alturas diferentes, sempre caixas fechadas.
        const kit = juntarPorMaterial();
        const alto = 1.4 + estavel(gx, gz, 6) * 1.6;
        const partes = 3;
        for (let i = 0; i < partes; i++) {
          const a = alto * (1 - i * 0.28) * (0.8 + estavel(gx, gz, 7 + i) * 0.4);
          kit.caixa(-comp / 2 + (i + 0.5) * comp / partes, a / 2, 0, comp / partes + 0.02, a, 0.6, m.pedraEscura);
        }
        kit.caixa(0, 0.15, 0.5, comp * 0.7, 0.3, 0.6, m.pedra);   // pedras caídas ao pé do muro
        lote.adicionar(kit, x, z, giro ? Math.PI / 2 : 0);
        mundo.colisores.adicionar(x, z, giro ? 0.8 : comp, giro ? comp : 0.8, alto);
      } else {
        arvoreSeca(mundo, { x, z, altura: 6 + estavel(gx, gz, 8) * 5, sorteio: criarSorteio(Math.floor(estavel(x, z, 9) * 1e6)) });
      }
    }
  }
}
