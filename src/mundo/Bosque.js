import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { retro } from '../render/retro.js';
import { criarSorteio } from '../render/texturas.js';
import { materiais } from './pecas.js';
import { xEmZ } from './PaisagemExterior.js';

const CIMA = new THREE.Vector3(0,1,0);

// Matrizes/UVs das cinco formas são feitas uma vez. De uma mesma forma saem
// tronco, galhos e raízes num lote, folhas em outro lote (quando há folhas).
function formasDoBosque() {
  return [0,1,2,3,4].map(v => {
    const r = criarSorteio(19+v*381), madeira=[], copas=[];
    const fibra = (inicio,fim,base,ponta) => {
      const a=new THREE.Vector3(...inicio), b=new THREE.Vector3(...fim);
      const dir=b.clone().sub(a);
      const g=new THREE.CylinderGeometry(ponta,base,dir.length(),5,1).toNonIndexed();
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(CIMA,dir.normalize()));
      g.translate(...a.lerp(b,0.5).toArray());
      madeira.push(g);
    };
    const curva=(v%2?1:-1)*(0.14+v*0.037);
    fibra([0,0,0],[curva,0.54,0.03],0.35+0.028*v,0.2);
    fibra([curva,0.54,0.03],[curva*1.33,0.98,-0.06],0.22,0.028);
    for (let i=0;i<4;i++) {
      const a=(i/4)*Math.PI*2+r()*0.25;
      fibra([0,0.105,0],[Math.cos(a)*(0.95+r()*0.42),0.018,Math.sin(a)*1.09],0.15,0.02);
    }
    const quantidade = v===4 ? 5 : 4;
    for (let i=0;i<quantidade;i++) {
      const a=2.39996*i+r()*0.4;
      const s=0.7+r()*0.58+(v===3?0.48:0);
      const ponta=[Math.cos(a)*s,0.67+r()*0.2,Math.sin(a)*s];
      const junta=[ponta[0]*0.7,ponta[1]-0.12,ponta[2]*0.7];
      fibra([curva,0.42+i*0.065,0.02],junta,0.115,0.057);
      fibra(junta,ponta,0.062,0.018);
      if (v!==4) {
        const f=new THREE.IcosahedronGeometry(1,0);
        f.scale(0.82+r()*0.57,v===1?0.2:0.15,0.78+r()*0.61);
        f.rotateY(a);
        f.translate(ponta[0],ponta[1]+0.07,ponta[2]);
        copas.push(f);
      }
    }
    const juntar = gs => {
      const g=mergeGeometries(gs);
      gs.forEach(p => p.dispose());
      return g;
    };
    return { tronco:juntar(madeira), folhas:copas.length ? juntar(copas) : null };
  });
}
let FORMAS;

export function plantarBosque(mundo,C,reservas) {
  const {minX,maxX,minZ,maxZ}=mundo.limites;
  const {semente,passo,setor}=C.vegetacao, r=criarSorteio(semente);
  const arvoredos=new Map(), arvores=[];
  const senderos=[[C.caminho,C.larguraDoCaminho],[C.desvio,4.1],[C.desvioLeste,4.1]];
  const livre=(x,z,raio) => {
    if (reservas.some(([a,b,f])=>Math.hypot(a-x,b-z)<f+raio)) return false;
    if (mundo.colisores.bloqueiaTrecho({x,z},{x,z},0,raio+0.3)) return false;
    for (const [c,l] of senderos) {
      if (z < c[0][1]-1 || z > c.at(-1)[1]+1) continue;
      if (Math.abs(x-xEmZ(c,z)) < l/2+raio+0.85) return false;
    }
    return !arvores.some(t=>Math.hypot(t.x-x,t.z-z)<t.raio+raio+1.2);
  };
  const plantar=(x,z,a,l,v) => {
    const raio=0.43*l;
    if (!livre(x,z,raio)) return;
    const ix=Math.floor((x-minX)/setor), iz=Math.floor((z-minZ)/setor), k=ix+':'+iz;
    const info={x,z,a,l,raio,v,giro:r()*Math.PI*2,tinta:0.63+r()*0.37};
    if (!arvoredos.has(k)) arvoredos.set(k,{ix,iz,variantes:[[],[],[],[],[]]});
    arvoredos.get(k).variantes[v].push(info);
    arvores.push(info);
    mundo.colisores.adicionarCilindro(x,z,raio,a);
  };
  // Exemplares de escala monumental enquadram as curvas; as clareiras têm o
  // céu aberto entre os troncos, a mata fechada tem copa em ambos os lados.
  for (const [x,z,h,l,v] of [[-7,-25,18,3.3,1],[10,-17,22,3.6,3],[-10,11,18,3.3,0],
    [-20,34,17,2.9,4],[17,33,23,3.7,1],[7,61,18,3.6,2],[-17,78,22,3.5,3],[9,96,19,3.6,0]]) plantar(x,z,h,l,v);
  for(let z=minZ+5;z<maxZ-3;z+=passo) for(let x=minX+2.3;x<maxX-2;x+=passo) {
    if (r()<0.19 && Math.abs(x)<32) continue;
    const a=5.7+r()*5.1, l=1.16+r()*0.87;
    plantar(x+(r()-0.5)*2.6,z+(r()-0.5)*2.8,a,l,Math.floor(r()*5));
  }

  FORMAS ??= formasDoBosque();
  const m=materiais(), folha=retro(new THREE.MeshLambertMaterial({color:0x263c3b,flatShading:true}));
  const objeto=new THREE.Object3D(), tom=new THREE.Color();
  const setores=[];
  for (const {ix,iz,variantes} of arvoredos.values()) {
    const g=new THREE.Group();
    g.name='Bosque '+ix+':'+iz;
    for (const [v,especies] of variantes.entries()) {
      if(!especies.length) continue;
      for (const [geo,mat] of [[FORMAS[v].tronco,m.tronco],[FORMAS[v].folhas,folha]]) {
        if (!geo) continue;
        const lote=new THREE.InstancedMesh(geo,mat,especies.length);
        for (const [i,t] of especies.entries()) {
          objeto.position.set(t.x,0,t.z); objeto.rotation.y=t.giro;
          objeto.scale.set(t.l,t.a,t.l); objeto.updateMatrix();
          lote.setMatrixAt(i,objeto.matrix);
          lote.setColorAt(i,tom.setRGB(t.tinta,t.tinta,t.tinta));
        }
        g.add(lote);
      }
    }
    mundo.grupo.add(g);
    setores.push({ g,x:minX+ix*setor,z:minZ+iz*setor,t:setor });
  }
  return { arvores, setores };
}

export function recortarBosque(setores,pos,alcance) {
  for (const {g,x,z,t} of setores) {
    const dx=Math.max(x-pos.x,0,pos.x-x-t), dz=Math.max(z-pos.z,0,pos.z-z-t);
    g.visible=dx*dx+dz*dz<=alcance*alcance;
  }
}
