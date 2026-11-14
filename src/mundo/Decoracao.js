import { modeloPronto } from '../render/modelos.js';
import { bloco } from './Aderecos.js';
import { materiais } from './pecas.js';

// Medidas em metros. Peças pequenas ficam fora dos corredores principais.
const ACERVO = {
  Bags: [[0.88, 0.78, 0.65], 0xa29a88],
  Hay: [[1.4, 0.7, 0.85], 0x8f8259],
  Package_1: [[0.75, 0.53, 0.56], 0x988676],
  Cauldron: [[0.64, 0.62, 0.64], 0xa6a1aa],
  Rock_Moss_2: [[1.9, 0.76, 1.2], 0x849970],
  Rock_Moss_4: [[1.2, 0.57, 0.95], 0x929d8b],
  Plant_3: [[0.71, 0.56, 0.76], 0x83917b],
  Grass_2: [[0.6, 0.54, 0.59], 0x84956c],
  WoodLog_Moss: [[2.4, 0.54, 0.85], 0x827e6e],
  Willow_Dead_3: [[5, 7.5, 5.1], 0xa19599],
  Lilypad: [[0.44, 0.048, 0.44], 0x697e6f],
  Book2_Open: [[0.39, 0.095, 0.29], 0xb5aaa1],
  Book3_Closed: [[0.23, 0.085, 0.32], 0xb8a9a7],
  Chalice: [[0.145, 0.23, 0.145], 0xbaad87],
  Scroll: [[0.36, 0.12, 0.19], 0xc4b69e],
  Pouch: [[0.22, 0.27, 0.19], 0x9b8277],
  bottle_A_green: [[0.15, 0.33, 0.15], 0x9aa68c],
  bottle_B_brown: [[0.17, 0.3, 0.17], 0xb89d89],
  plate_food_A: [[0.34, 0.12, 0.34], 0xc0a791],
  plate_food_B: [[0.34, 0.12, 0.34], 0xb3a293],
  plate_stack: [[0.34, 0.14, 0.34], 0xbcb4ac],
  candle_triple: [[0.35, 0.46, 0.26], 0xd0b99d],
  box_stacked: [[0.84, 0.94, 0.78], 0x9e8d86],
  banner_patternC_brown: [[1.25, 2.5, 0.16], 0xaba2ac],
  shelf_small_candles: [[0.78, 0.42, 0.29], 0xc2a599],
  'banco-peixes': [[0.53, 0.65, 0.53], 0xaba6ac],
  'ancora-rio': [[0.8, 0.23, 1.0], 0x8c8f99],
};

export function decorar(grupo, pecas) {
  for (const [id, x, y, z, rotacao = 0, escala = 1] of pecas) {
    const [tamanho, tinta] = ACERVO[id];
    modeloPronto(grupo, id, { pos: [x, y, z], tamanho: tamanho.map(v => v * escala), tinta, rotacao });
  }
}

export function decorarVilarejo({ grupo, igreja, colisores }) {
  const frente = igreja.porta.z - igreja.grupo.position.z;
  decorar(igreja.grupo, [-1, 1].flatMap(lado => [
    ['banner_patternC_brown', lado * 7.6, 7.6, frente - 0.47, 0, 1.55],   // encostado na torre
    ['shelf_small_candles', lado * 2.55, 1.3, frente - 1.68, 0, 1.15],   // pregado na fachada
    ['Rock_Moss_2', lado * 9.85, 0, frente + 0.2, lado * 0.7, 0.8],
    ['Plant_3', lado * 10.6, 0, frente + 0.4],
    ['Grass_2', lado * 8.85, 0, frente + 1.3],
    // Entre os contrafortes, embaixo dos vitrais (nunca dentro da pedra).
    ...[3.2, 8, 13, -13.2].map((z, i) => ['Plant_3', lado * (9.3 + i % 2), 0, z, lado * z, 1 + (i % 3) * 0.22]),
  ]));
  for (const lado of [-1, 1]) {
    const x = lado * 6.7, z = igreja.porta.z + 4.0;
    bloco(grupo, materiais().pedraEscura, x, 0.76, z, 1.1, 1.52, 1.1);   // pedestal das velas
    decorar(grupo, [['candle_triple', x, 1.52, z], ['Pouch', x + 0.28, 1.53, z + 0.22, lado * 0.7]]);
    colisores.adicionar(x, z, 1.1, 1.1, 1.52);
  }
  decorar(grupo, [
    ['Bags', -4.6, 0, 44.4, 1.7], ['Package_1', -4.65, 0, 43.4, -0.3], ['Hay', 6.8, 0, 38.9, 0.4],
    ['Cauldron', -19.2, 0, 12.15, 0.3], ['box_stacked', -16.5, 0, 12.7, -0.2],
    ['Bags', 8.4, 0, 7.9, 0.6], ['Package_1', 8.9, 0, 7.45, -0.3], ['Pouch', 8.82, 0.53, 7.45],
    ['Hay', -45.4, 0, 26.35, 1.4], ['Bags', -47, 0, 26.9, -0.3], ['box_stacked', -49.7, 0, 25.5, 0.3],
    ['Rock_Moss_4', -6, 0, -35, 0.6], ['Grass_2', -6.5, 0, -34.8, 0, 1.2],
    ['Plant_3', 6.4, 0, -32.9, 1.7], ['Rock_Moss_4', 6.7, 0, -33.4, 0.7],
    ['Grass_2', 36.3, 0, -80.4, 0.8, 1.3], ['WoodLog_Moss', 37.5, 0, -83, 1.25],
    ['Rock_Moss_2', 32.8, 0, -92.4, 1.9], ['Plant_3', 33.3, 0, -92.7],
    ['Bags', 51.8, 0, -25.4, 1.2], ['Package_1', 51.1, 0, -25.9],
  ]);
}

export function decorarCatedral({ grupo }) {
  decorar(grupo, [
    ...[-1, 1].flatMap(lado => [
      ['banner_patternC_brown', lado * 6.8, 2.63, 5.56],   // na face sul da coluna, não dentro dela
      ['banner_patternC_brown', lado * 6.8, 2.63, -9.43],
      ['candle_triple', lado * 2.1, 1.33, -31.42, lado * 0.5],
      ['Chalice', lado * 1.32, 1.33, -31.42, lado * 0.9],
      ['candle_triple', lado * 5.55, 0.37, -31.82, lado, 1.1],
      ['shelf_small_candles', lado * 6.8, 1.25, -10.62, Math.PI],
    ]),
    ['Book2_Open', -0.65, 1.33, -31.38, -0.18], ['Scroll', 0.68, 1.33, -31.43, 0.6],
    ['Book3_Closed', 18.06, 1.22, -9.43, 0.18], ['Chalice', 18.62, 1.22, -9.37],
    ['candle_triple', 19.06, 1.22, -9.42], ['Scroll', 19, 1.22, -0.58, 1.2],
    ['candle_triple', -20.15, 0.83, -10.55], ['candle_triple', -20.16, 0.83, 0.76],
    ['shelf_small_candles', -34.5, 1.65, -3.3, Math.PI / 2],
    ['shelf_small_candles', 34.47, 1.65, -3.3, -Math.PI / 2],
    // Papéis caídos junto ao entulho do Arquivo.
    ['Scroll', 32.45, 0, 0.15, 0.66], ['Book3_Closed', 32.2, 0, -0.35, 0.4],
  ]);
}
