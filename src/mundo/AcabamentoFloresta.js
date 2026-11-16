import { juntarPorMaterial, materiais } from './pecas.js';
import { criarSorteio } from '../render/texturas.js';
import { CONFIG } from '../config.js';
import { xEmZ } from './PaisagemExterior.js';
import { manchaDeLuz } from './AcabamentoPortao.js';

// Acabamento da Floresta Seca: entrada vinda da estrada, bordas da trilha em S,
// marcos dos desvios e os pontos já existentes (clareira, ruína, cabana, poço, ponte).
// Só visual: nenhum colisor, ID ou luz nova. Tudo é juntado por material (poucos objetos)
// e fica fora da faixa de 5,2 m da trilha, exceto as lajes baixas da entrada.
const C = CONFIG.areas.floresta;

// Trechos onde as bordas ficam livres: encontros dos desvios e a ponte de toras.
const LIVRES = [[5, 12], [25, 31], [53, 60], [72, 79]];

export function acabarFloresta(area) {
  const m = materiais(), g = area.grupo, r = criarSorteio(3391);
  const k = juntarPorMaterial();
  const trilhaX = z => xEmZ(C.caminho, z);
  const meia = C.larguraDoCaminho / 2;

  // --- Entrada: lajes baixas e gastas da estrada até a clareira, abrindo em leque
  //     (mesma linguagem da calçada da taverna, para a rota ligar às vizinhas).
  const zN = C.portaNorte.z;
  for (let zz = zN - 0.2; zz < zN + 4.6; zz += 0.8) {
    const m2 = 1.2 + 0.5 * (zz - zN) / 4.8;
    let x = -m2;
    while (x < m2 - 0.05) {
      let l = 0.6 + r() * 0.5;
      if (m2 - x - l < 0.45) l = m2 - x;
      const p = 0.62 + r() * 0.15;
      k.caixa(x + l / 2, 0.03, zz + p / 2 + (r() - 0.5) * 0.06, l - 0.08, 0.05, p - 0.08,
        r() < 0.4 ? m.pedraMusgo : m.lajes, (r() - 0.5) * 0.08);
      x += l;
    }
  }

  // --- Margens da trilha: pedras baixas e raízes que cruzam a borda.
  for (let z = zN + 5.5, n = 0; z < C.barricadaSul.z - 4; z += 2.6 + r() * 1.8, n++) {
    if (LIVRES.some(([a, b]) => z > a && z < b)) continue;
    for (const lado of [-1, 1]) {
      if (r() < 0.35) continue;
      const x = trilhaX(z) + lado * (meia + 0.25 + r() * 0.3);
      const l = 0.32 + r() * 0.32, a = 0.12 + r() * 0.16, p = 0.3 + r() * 0.22;
      k.caixa(x, a / 2 - 0.02, z, l, a, p, r() < 0.45 ? m.pedraEscura : m.pedraMusgo, r() * 3);
      if (r() < 0.4) k.caixa(x + lado * 0.28, 0.09, z + 0.2, 0.4, 0.08, 0.3, m.pedraMusgo, r() * 3);
    }
    if (n % 3 === 1) {   // raiz grossa que sai de fora e entra um palmo na terra batida
      const lado = n % 2 ? 1 : -1, x = trilhaX(z) + lado * (meia + 0.2);
      k.caixa(x, 0.05, z, 1.5, 0.1, 0.13, m.madeiraEscura, 1.25 + (r() - 0.5) * 0.6);
      k.caixa(x + lado * 0.5, 0.08, z + 0.1, 0.7, 0.14, 0.18, m.madeiraEscura, 0.4 + r() * 0.5);
    }
  }

  // --- Marcos dos desvios: pequenos montes de pedra empilhada na ponta de cada ramal.
  const monte = (x, z) => {
    k.caixa(x, 0.1, z, 0.7, 0.2, 0.62, m.pedraMusgo, 0.4);
    k.caixa(x + 0.04, 0.29, z - 0.03, 0.5, 0.18, 0.46, m.pedraEscura, 1.1);
    k.caixa(x - 0.02, 0.45, z + 0.02, 0.3, 0.15, 0.28, m.pedraMusgo, 2.1);
  };
  monte(trilhaX(9) - meia - 0.55, 8.6);      // ramal oeste, rumo à ruína
  monte(trilhaX(27) + meia + 0.9, 27);    // ramal leste, rumo à cabana

  // --- Clareira: anel de pedras baixas ao redor da lanterna.
  const lan = C.lanterna;
  for (let i = 0; i < 9; i++) {
    const t = i / 9 * Math.PI * 2;
    k.caixa(lan.x + Math.cos(t) * 1.7, 0.07, lan.z + Math.sin(t) * 1.7, 0.42, 0.12, 0.3, i % 2 ? m.pedraEscura : m.pedraMusgo, -t);
  }

  // --- Ruína das urnas: entulho caído ao redor, fora do caminho do desvio.
  for (const [x, z, l, a] of [[-31.2, 12.9, 0.7, 0.3], [-29.6, 12.5, 0.5, 0.22], [-32.4, 13.8, 0.6, 0.26],
    [-31, 21.9, 0.6, 0.24], [-29.7, 22.1, 0.45, 0.2]]) {
    k.caixa(x, a / 2, z, l, a, l * 0.8, m.pedraMusgo, x * 2.3);
  }

  // --- Cabana: assoalho de tábuas gastas e restos de fogueira apagada na frente.
  const cx = 33.15, cz = 46.15;
  for (let i = 0; i < 9; i++) {
    k.caixa(cx - 1.95 + i * 0.47, 0.02, cz, 0.43, 0.04, 4.8, i % 3 === 1 ? m.madeiraEscura : m.madeira);
  }
  const fx = 30.6, fz = 50.6;
  for (let i = 0; i < 8; i++) {
    const t = i / 8 * Math.PI * 2;
    k.caixa(fx + Math.cos(t) * 0.62, 0.1, fz + Math.sin(t) * 0.62, 0.32, 0.2, 0.26, m.pedraEscura, -t);
  }
  k.caixa(fx, 0.03, fz, 0.8, 0.06, 0.8, m.pedraEscura, 0.5);   // cinza
  k.caixa(fx - 0.05, 0.1, fz, 0.9, 0.12, 0.14, m.madeiraEscura, 0.6);   // toras queimadas
  k.caixa(fx + 0.1, 0.1, fz + 0.05, 0.8, 0.12, 0.14, m.madeiraEscura, -0.7);
  k.caixa(fx - 1.7, 0.2, fz + 0.3, 1.5, 0.4, 0.3, m.madeiraEscura, 0.35);   // tronco-assento
  const luzLanterna = manchaDeLuz(2.6);
  luzLanterna.position.set(C.lanternaDaCabana.x, 0.06, C.lanternaDaCabana.z);
  g.add(luzLanterna);

  // --- Poço: cavalete de madeira com viga, corda e balde sobre a borda de pedra.
  const px = 8.9, pz = 85;
  for (const s of [-1, 1]) {
    k.caixa(px, 1.35, pz + s * 1.45, 0.18, 1.9, 0.18, m.madeiraEscura);
  }
  k.caixa(px, 2.34, pz, 0.2, 0.2, 3.3, m.madeiraEscura);
  k.caixa(px, 1.75, pz + 0.2, 0.025, 1.2, 0.025, m.metal);   // corda
  k.caixa(px, 1.05, pz + 0.2, 0.32, 0.26, 0.32, m.madeiraEscura);   // balde

  // --- Ponte de toras: balizas nas pontas dos dois lados, só nas margens do convés.
  for (const x of [-2.3, 2.7]) {
    for (const s of [-1, 1]) k.caixa(x, 0.45, 75.8 + s * 1.4, 0.15, 0.9, 0.15, m.madeiraEscura);
    k.caixa(x, 0.85, 75.8, 0.1, 0.1, 2.9, m.madeiraEscura);
  }

  k.montar(g, 'Acabamento da floresta');
}
