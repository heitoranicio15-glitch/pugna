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

export function montarCenasCatedral(mundo, feixes) {
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
    ['cabido',26,0.86,-26.8],
    ['cela',-28,-3.48,31],
  ]) {
    porVela(sala,x,y,z);
    porVela(sala,x+0.21,y,z-0.13);
  }
  for (const [sala,p] of velas) p.montar(mundo.setores.get(sala),'velas de vigília');

  const cela = mundo.setores.get('cela');
  bloco(cela,m.madeiraEscura,-28, -3.74, 31, 1.05,0.52,2.1);
  mundo.colisores.adicionar(-28,31,1.05,2.1,-3.48,-4);

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
