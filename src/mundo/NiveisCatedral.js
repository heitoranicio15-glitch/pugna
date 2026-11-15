import { placa } from './Aderecos.js';
import { alavancaDeAtalho, gradeDeAtalho } from './FerragensCatedral.js';
import { juntarPorMaterial, materiais } from './pecas.js';
import * as THREE from 'three';

export const ATALHO_CRIPTA = 'catedral:atalho-cripta';
export const ANDARES = { cripta: -4, nave: 0, galeria: 4, torre: 8 };

// Escadas retas em meias células, unidas por patamares de 4 m. A torre ocupa
// a ala de serviço: a escada da galeria sobe para sul, a da torre volta a norte.
export const ESCADAS = [
  { id: 'subida-galeria', lote: 'escada-da-galeria', x: 12, z: 15, rumo: 1, base: 0, alto: 4 },
  { id: 'subida-torre', lote: 'torre', x: 16, z: 23, rumo: -1, base: 4, alto: 8 },
  { id: 'descida-cripta', lote: 'escada-da-cripta', x: -16, z: 23, rumo: -1, base: -4, alto: 0 },
  { id: 'retorno-cripta', lote: 'escada-da-cripta', x: -20, z: 23, rumo: -1, base: -4, alto: 0 },
];
const PASSOS = 16;

export function volumesDosNiveis() {
  const volumes = [];
  const por = (tipo, lote, material, min, max, rumo) => volumes.push({ tipo, lote, material, min, max, rumo });
  const patamar = (lote, x, X, z, Z, y) => por('patamar', lote, 'lajes', [x,y-0.25,z], [X,y,Z]);
  for (const [lote, x, X, z, Z, y] of [
    ['galeria-oeste', -10, -6, -21, 11, 4], ['galeria-leste', 6, 10, -21, 11, 4],
    ['galeria-ponte', -10, 10, -25, -21, 4],
    ['escada-da-galeria', 6, 10, 11, 23, 4],
    ['escada-da-galeria', 6, 14, 23, 27, 4],
    ['torre', 14, 22, 23, 27, 4], ['torre', 14, 22, 11, 15, 8],
    ['escada-da-cripta', -22, -14, 11, 15, 0],
  ]) patamar(lote, x, X, z, Z, y);

  for (const { lote, x, z, rumo, base, alto } of ESCADAS) for (let i = 0; i < PASSOS; i++) {
    const z0 = z + rumo * i * 0.5, z1 = z0 + rumo * 0.5;
    const y = base + (alto - base) * (i + 1) / PASSOS;
    por('degrau', lote, 'lajes', [x-1.75,base,Math.min(z0,z1)], [x+1.75,y,Math.max(z0,z1)], rumo);
  }

  const guarda = (lote, x, X, z, Z, y, Y) => por('parapeito', lote, 'pedraEscura', [x,y,z], [X,Y,Z]);
  guarda('galeria-oeste', -6.25, -6, -20.75, 10.75, 4, 5.22);
  guarda('galeria-leste', 6, 6.25, -20.75, 10.75, 4, 5.22);
  guarda('galeria-ponte', -10, 10, -25, -24.75, 4, 5.22);
  guarda('galeria-ponte', -10, -9.75, -24.75, -21.25, 4, 5.22);
  guarda('galeria-ponte', 9.75, 10, -24.75, -21.25, 4, 5.22);
  guarda('escada-da-galeria', 9.75, 10.25, 15, 23, 0, 5.22);
  // A passarela de retorno fica por cima da entrada oeste da caixa da escada.
  guarda('escada-da-galeria', 9.75, 10, 11.25, 15, 4, 5.22);
  guarda('torre', 17.75, 18.25, 15, 23, 0, 9.25);
  guarda('torre', 18.25, 21.75, 22.75, 23, 4, 5.22);
  guarda('escada-da-cripta', -18.25, -17.75, 15, 23, -4, 1.22);
  return volumes;
}

export function montarLuzesDaGaleria(mundo, m, bronze, luzes) {
  for (const { lote, x, y, z, parede, cor, intensidade, alcance } of luzes) {
    const lanterna = new THREE.Group();
    lanterna.position.set(x, y, z);
    const pecas = juntarPorMaterial();
    if (parede) {
      lanterna.rotation.y = -Math.PI / 2;
      pecas.caixa(0, -0.04, 0.04, 0.24, 0.38, 0.08, m.pedraEscura);
      pecas.caixa(0, -0.12, 0.19, 0.07, 0.07, 0.33, bronze);
    }
    const dz = parede ? 0.35 : 0;
    pecas.geometria(new THREE.CylinderGeometry(0.128, 0.097, 0.13, 6).translate(0, 0.065, dz), bronze);
    pecas.geometria(new THREE.ConeGeometry(0.132, 0.13, 6).translate(0, 0.47, dz), bronze);
    for (const dx of [-0.082, 0.082]) for (const pz of [-0.064, 0.064]) {
      pecas.caixa(dx, 0.276, dz + pz, 0.021, 0.28, 0.021, bronze);
    }
    pecas.caixa(0, 0.214, dz, 0.066, 0.168, 0.066, m.cantariaVeu);
    const chama = new THREE.OctahedronGeometry(0.055).scale(0.7, 1.35, 0.7);
    pecas.geometria(chama.translate(0, 0.33, dz), m.chama);
    pecas.montar(lanterna, 'Lanterna da galeria');

    // A luz fica à frente da armação para iluminar os degraus e o caminho.
    const luz = new THREE.PointLight(cor, intensidade, alcance);
    luz.position.set(0, 0.38, parede ? 0.76 : 0.16);
    lanterna.add(luz);
    mundo.setores.get(lote).add(lanterna);
  }
}

export function montarAtalhoCripta(mundo, bronze) {
  const g = mundo.setores.get('escada-da-cripta'), m = materiais();
  const grade = gradeDeAtalho(g, { x: -20, y: -0.25, z: 15, largura: 3.5, altura: 3 }, m, bronze);
  const col = mundo.colisores.adicionar(-20, 15, 3.5, 0.42, 2.75, -0.25, false);
  const atualizarFerrolho = alavancaDeAtalho(g, -21.47, 0.92, 16.25, m, bronze);
  placa(g, 'Ferrolho do claustro', -20, 2.4, 15.29, 1.6);
  mundo.objetos.push({
    x: -21.4, y: 0.95, z: 16.25, acao: 'acionar', nome: 'ferrolho da cripta', evento: ATALHO_CRIPTA,
    atualizar(aberto) {
      grade.visible = !aberto;
      col.ativa = !aberto;
      atualizarFerrolho(aberto);
    },
  }, {
    x: -20, y: 1.5, z: 14.76, acao: 'informar', evento: ATALHO_CRIPTA,
    mensagem: 'O bronze só cede do lado de baixo.',
  });
}
