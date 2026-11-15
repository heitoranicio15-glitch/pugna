import { bloco, placa } from './Aderecos.js';
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
  const por = (tipo, lote, material, min, max) => volumes.push({ tipo, lote, material, min, max });
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
    por('degrau', lote, 'lajes', [x-1.75,base,Math.min(z0,z1)], [x+1.75,y,Math.max(z0,z1)]);
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

export function montarAtalhoCripta(mundo) {
  const g = mundo.setores.get('escada-da-cripta'), m = materiais();
  const grade = new THREE.Group();
  grade.position.set(-20, -0.25, 15);
  g.add(grade);
  const barras = juntarPorMaterial();
  for (const x of [-1.6,-1.07,-0.54,0,0.54,1.07,1.6]) barras.caixa(x,1.5,0,0.13,3,0.18,m.metal);
  for (const y of [0.42,2.1]) barras.caixa(0,y,0.14,3.48,0.13,0.09,m.metal);
  barras.montar(grade, 'ferrolho da cripta');
  const col = mundo.colisores.adicionar(-20, 15, 3.5, 0.42, 2.75, -0.25, false);
  bloco(g, m.metal, -21.59, 0.92, 16.25, 0.31, 0.38, 0.33);
  placa(g, 'Ferrolho do claustro', -20, 2.4, 15.29, 1.6);
  mundo.objetos.push({
    x: -21.4, y: 0.95, z: 16.25, acao: 'acionar', nome: 'ferrolho da cripta', evento: ATALHO_CRIPTA,
    atualizar(aberto) { grade.visible = !aberto; col.ativa = !aberto; },
  }, {
    x: -20, y: 1.5, z: 14.76, acao: 'informar', evento: ATALHO_CRIPTA,
    mensagem: 'O bronze só cede do lado de baixo.',
  });
}
