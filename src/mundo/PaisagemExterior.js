import * as THREE from 'three';
import { retro } from '../render/retro.js';
import { criarSorteio, texturas } from '../render/texturas.js';
import { ladrilhoDe, materiais } from './pecas.js';

export function xEmZ(pontos, z) {
  for (let i=1;i<pontos.length;i++) {
    const [a,za]=pontos[i-1], [b,zb]=pontos[i];
    if (z>zb) continue;
    const t=THREE.MathUtils.clamp((z-za)/(zb-za),0,1);
    return THREE.MathUtils.lerp(a,b,t*t*(3-2*t));
  }
  return pontos.at(-1)[0];
}

/** Uma fita contínua com UV em metros, sem retângulos sobrepostos nas curvas. */
export function faixaDeTrilha(grupo,pontos,largura,material,ordem=-5,y=0) {
  const inicio=pontos[0][1], fim=pontos.at(-1)[1], n=Math.ceil((fim-inicio)/2);
  const pos=[], uv=[], indices=[], tile=ladrilhoDe(material,5);
  for (let i=0;i<=n;i++) {
    const z=THREE.MathUtils.lerp(inicio,fim,i/n), x=xEmZ(pontos,z);
    for (const lado of [-1,1]) {
      const u=x+lado*largura/2;
      pos.push(u,y,z);
      uv.push(u/tile,-z/tile);
    }
    if (i) {
      const a=(i-1)*2, b=i*2;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const malha=new THREE.Mesh(geo,material);
  malha.renderOrder=ordem;
  grupo.add(malha);
  return malha;
}

function instanciar(grupo,geo,mat,transformacoes,nome) {
  const lote=new THREE.InstancedMesh(geo,mat,transformacoes.length);
  const dummy=new THREE.Object3D();
  for (const [i,[x,y,z,l,a,p,giro]] of transformacoes.entries()) {
    dummy.position.set(x,y,z); dummy.scale.set(l,a,p); dummy.rotation.y=giro;
    dummy.updateMatrix();
    lote.setMatrixAt(i,dummy.matrix);
  }
  lote.name=nome;
  grupo.add(lote);
}

/** Três planos da paisagem. O rebordo próximo encobre a cerca; as agulhas
 * remotas são pintadas na cor da névoa, como uma camada atrás do céu local. */
export function paisagemExterior(mundo,C,sementes,oclusores) {
  const m=materiais(), rng=criarSorteio(sementes);
  const {minX,maxX,minZ,maxZ}=mundo.limites;
  const pedra=new THREE.IcosahedronGeometry(1,0);
  const tronco=new THREE.CylinderGeometry(0.31,0.74,1,5);
  const copa=new THREE.ConeGeometry(1,1,5);
  const rochedos=[], troncos=[], copas=[];
  for (const lado of [-1,1]) {
    const borda=lado<0?minX:maxX;
    for (let i=0;i<2;i++) for (let z=minZ-9;z<=maxZ+17;z+=i?10:7) {
      const x=borda+lado*(i?17+rng()*8:3+rng()*4);
      const altura=(i?21:11)+rng()*(i?14:10), raio=(i?5:2.5)+rng()*2.5;
      const zz=z+(rng()-0.5)*4;
      troncos.push([x,altura*0.48,zz,raio*0.67,altura,raio*0.67,rng()*6]);
      copas.push([x,altura*0.84,zz,raio*1.65,altura*0.61,raio*1.65,rng()*6]);
      if (rng()>0.49) rochedos.push([x,1.8,zz-3,4.7,4.4+i*4,5.1,rng()*6]);
    }
  }
  for (const [x,z,raio,a] of oclusores) {
    rochedos.push([x,a*0.37,z,raio,a*0.63,raio*0.95,rng()*6]);
    if (!mundo.colisores.bloqueiaTrecho({x,z},{x,z},0,raio*0.74)) mundo.colisores.adicionar(x,z,raio*1.35,raio*1.35);
  }
  const folha=retro(new THREE.MeshLambertMaterial({ color: 0x142329, flatShading:true }));
  instanciar(mundo.grupo,pedra,m.morro,rochedos,'Paredão de xisto');
  instanciar(mundo.grupo,tronco,m.tronco,troncos,'Troncos do horizonte');
  instanciar(mundo.grupo,copa,folha,copas,'Copas do horizonte');
  const longes=[];
  for (const [x,z,a,r] of [[-22,31,48,5],[-32,36,38,6],[-15,37,32,5],[34,26,41,8],[43,42,59,12]]) {
    longes.push([x,a*0.44,maxZ+z,r,a,r,rng()*6]);
  }
  const longe=retro(new THREE.MeshBasicMaterial({
    color:new THREE.Color(C.nevoa.cor).lerp(new THREE.Color(0x070b1d),0.42), fog:false,
  }));
  instanciar(mundo.grupo,copa,longe,longes,'Agulhas distantes');
  const luzes = new THREE.BufferGeometry();
  luzes.setAttribute('position',new THREE.Float32BufferAttribute([
    maxX+5,5,maxZ-29, minX-4,3.2,maxZ-50, maxX+7,4,maxZ-4,
  ],3));
  mundo.grupo.add(new THREE.Points(luzes,new THREE.PointsMaterial({
    map:texturas().brilho, color:0xd2a275, size:1, opacity:0.7, transparent:true,
    blending:THREE.AdditiveBlending, depthWrite:false,
  })));
}
