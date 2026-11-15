import * as THREE from 'three';
import { ANOTACOES } from '../nucleo/Inventario.js';
import { retro } from '../render/retro.js';
import { bloco, placa } from './Aderecos.js';
import { juntarPorMaterial, materiais } from './pecas.js';
import { feixeDeLuz } from './efeitosCenario.js';

const MESAS = [
  ['refeitorio', 'conta-da-mesa', -26, 1.14, -26.06, 0],
  ['cabido', 'ata-do-cabido', 26, 1.14, -26.06, 0],
  ['cripta', 'contagem-da-cripta', -19, -2.55, 34.67, Math.PI],
  ['cela', 'caderno-da-sineira', -29.7, -2.48, 31, Math.PI / 2],
  ['torre', 'inventario-do-bronze', 20.4, 9.43, 11.29, 0],
  ['galeria-oeste', 'nomes-na-passarela', -9.66, 5.52, -14.2, Math.PI / 2],
];

export function montarCenasCatedral(mundo, bronze, feixes) {
  const m = materiais();
  for (const [sala, id, x, y, z, giro] of MESAS) {
    const evento = 'catedral:' + id;
    placa(mundo.setores.get(sala), ANOTACOES[evento].nome, x,y,z,1.37,giro);
    mundo.objetos.push({ x,y,z, acao:'ler', evento });
  }
  const brasas = retro(new THREE.MeshBasicMaterial({ color: 0xffaa63 }));
  const velas = new Map();
  const porVela = (sala,x,y,z) => {
    if (!velas.has(sala)) velas.set(sala,juntarPorMaterial());
    const p = velas.get(sala);
    p.caixa(x,y+0.12,z,0.095,0.24,0.095,m.pedraMusgo);
    p.caixa(x,y+0.285,z,0.035,0.085,0.035,brasas);
  };
  for (const [sala,x,y,z] of [
    ['capela',-34,1,-13], ['arquivo',34,1,-13], ['refeitorio',-26,0.86,-26.8],
    ['cabido',26,0.86,-26.8], ['abside',1.5,1.5,-63.75], ['abside',-1.5,1.5,-63.75],
    ['cela',-28,-3.48,31], ['cripta',-23,-3.2,33.5],
  ]) {
    porVela(sala,x,y,z);
    porVela(sala,x+0.21,y,z-0.13);
  }
  for (const [sala,p] of velas) p.montar(mundo.setores.get(sala),'velas de vigília');

  const cripta = mundo.setores.get('cripta');
  const urnaGeo = new THREE.LatheGeometry([
    [0,0],[0.27,0],[0.48,0.29],[0.38,0.59],[0.31,0.66],[0.39,0.68],[0.31,0.8],[0,0.8],
  ].map(([x,y])=>new THREE.Vector2(x,y)),10);
  const urnas = new THREE.InstancedMesh(urnaGeo,m.pedraEscura,5), matriz = new THREE.Matrix4();
  for (let i=0;i<5;i++) {
    const x=-23+i*2, z=33.5+(i%2)*0.25;
    urnas.setMatrixAt(i,matriz.makeTranslation(x,-4,z));
    mundo.colisores.adicionar(x,z,0.9,0.9,-3.2,-4);
  }
  cripta.add(urnas);

  const cela = mundo.setores.get('cela');
  bloco(cela,m.madeiraEscura,-28, -3.74, 31, 1.05,0.52,2.1);
  mundo.colisores.adicionar(-28,31,1.05,2.1,-3.48,-4);

  // O bronze ocupa o alto da torre, com a corda cortada ainda presa ao badalo.
  const torre = mundo.setores.get('torre');
  const sino = new THREE.Mesh(new THREE.LatheGeometry([
    [0.81,0],[0.95,0],[0.91,0.15],[0.71,0.28],[0.46,0.93],
    [0.37,1.13],[0.19,1.26],[0,1.28],[0,1.14],[0.35,1.08],[0.48,0.53],[0.73,0.12],[0.81,0],
  ].map(([x,y])=>new THREE.Vector2(x,y)),20),bronze);
  sino.position.set(18.8,10.28,13.1);
  torre.add(sino);
  bloco(torre,m.madeiraEscura,18.8,11.97,13.1,0.24,0.8,0.24);
  bloco(torre,m.madeiraEscura,18.8,12.75,13.1,7.45,0.36,0.27);
  bloco(torre,bronze,18.8,10.29,13.1,0.18,0.48,0.18);
  bloco(torre,m.madeiraEscura,18.8,9.93,13.1,0.045,0.24,0.042);

  const poeira = [];
  for (const [i,feixe] of feixes.entries()) {
    const grupo = mundo.setores.get(i === 0 ? 'relicario' : 'abside');
    feixeDeLuz(grupo,feixe);
    const pontos = [];
    for (let n=0;n<32;n++) {
      const t = (n+1)/33;
      const [x,y,z] = feixe.origem.map((a,k)=>THREE.MathUtils.lerp(a,feixe.destino[k],t));
      pontos.push(x+Math.sin(n*5.9)*0.48,y+Math.cos(n*4.3)*0.23,z+Math.sin(n*7.1)*0.46);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pontos,3));
    const mat = new THREE.PointsMaterial({ color:0xb9cbef, size:0.06, opacity:0.47, transparent:true, depthWrite:false });
    const camada = new THREE.Points(geo,mat);
    grupo.add(camada);
    poeira.push(camada);
  }
  return poeira;
}

export function nivelCatedral(pos) {
  if (pos.y < -2.25 && pos.z > 18) return 'cripta';
  if (pos.y > 6.3 && pos.x > 14 && pos.z > 11) return 'torre';
  return pos.y > 2.45 ? 'galeria' : 'nave';
}

/** A galeria ainda enxerga a nave. Na torre e na cripta as paredes isolam
 * o andar; sem desenhar salas que só seriam vistas atravessando pedra. */
export function visivelNaCatedral(sala, pos, caixa) {
  const nivel = nivelCatedral(pos);
  if (nivel === 'cripta' && pos.z > 24) return ['cripta','cela','escada-da-cripta','claustro'].includes(sala);
  if (nivel === 'torre' && pos.y >= 7.8 && pos.z < 15.5) return ['torre','escada-da-galeria'].includes(sala);
  if (['cripta','cela'].includes(sala) && pos.z < 17) return false;
  if (sala === 'torre' && pos.z < 3) return false;
  const dx = Math.max(caixa.min.x-pos.x,0,pos.x-caixa.max.x);
  const dz = Math.max(caixa.min.z-pos.z,0,pos.z-caixa.max.z);
  return dx*dx+dz*dz <= 46*46;
}
