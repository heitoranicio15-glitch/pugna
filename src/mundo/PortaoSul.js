import * as THREE from 'three';
import { bloco, chave, placa } from './Aderecos.js';
import { juntarPorMaterial, materiais } from './pecas.js';
import { retro } from '../render/retro.js';
import { CHAVE_PORTAO, PORTAO_SUL_ABERTO } from '../nucleo/Progressao.js';

export const PORTAL_SUL = {
  x:0, z:55.4, raio:1.6, destino:'estrada', texto:'E — sair pelo Portão Sul',
  requer:CHAVE_PORTAO, eventoAoAbrir:PORTAO_SUL_ABERTO,
  textoTrancado:'O selo do Guardião fecha a tranca. A fechadura tem a boca de um sino pequeno.',
  textoTrancadoAlternativo:'Sob o selo, o ferrolho vibra. É do mesmo bronze que toca sem corda.',
};

// Silhuetas próprias para os dois moradores: poucos triângulos, sem um GLB
// detalhado duplicado na vista do portão, onde a vila já pesa no navegador.
export function moradorDoPortao(ferreiro = false) {
  const m = materiais(), g = new THREE.Group(), p = juntarPorMaterial();
  const tecido = retro(new THREE.MeshLambertMaterial({color:ferreiro ? 0x4e3c31 : 0x44465e}));
  const pele = retro(new THREE.MeshLambertMaterial({color:0x9e806f}));
  const cil = (r1,r2,h,y,mat) => p.geometria(new THREE.CylinderGeometry(r1,r2,h,7).translate(0,y,0),mat);
  cil(0.24,0.36,0.89,0.71,tecido);
  cil(0.2,0.24,0.37,1.33,tecido);
  p.geometria(new THREE.IcosahedronGeometry(0.168,0).scale(0.92,1.12,0.92).translate(0,1.64,0.015),pele);
  if (ferreiro) p.caixa(0,0.95,0.219,0.37,0.64,0.064,m.madeiraEscura);
  else {
    cil(0.23,0.23,0.052,1.75,m.madeiraEscura);
    cil(0.10,0.175,0.23,1.86,tecido);
  }
  for (const lado of [-1,1]) {
    p.caixa(lado*0.245,1.18,0.024,0.12,0.54,0.15,tecido);
    p.caixa(lado*0.245,0.86,0.048,0.095,0.1,0.1,pele);
    p.caixa(lado*0.155,0.10,0.07,0.14,0.18,0.25,m.madeiraEscura);
  }
  p.montar(g,'Morador');
  return g;
}

export function montarPortaoSul(vila,z) {
  const m=materiais(), g=vila.grupo;
  const trava=vila.colisores.adicionar(0,z,8.02,1.5);
  // O portal ainda delimita a transição: não se anda para fora do cenário.
  vila.colisores.adicionar(0,z+1.5,12,0.6);
  const folhas=[];
  for(const lado of [-1,1]) {
    const folha=new THREE.Group();
    folha.position.set(lado*4,0,z);
    bloco(folha,m.madeiraEscura,-lado*2,2.42,0,3.97,4.84,0.23);
    for(const y of [0.9,2.35,3.82]) bloco(folha,m.metal,-lado*2,y,-0.15,3.8,0.13,0.095);
    folhas.push([folha,lado]);
    g.add(folha);
  }
  const bronze=retro(new THREE.MeshLambertMaterial({color:0xb8864e,map:m.metal.map}));
  const ferrolho=bloco(g,bronze,0,2.1,z-0.31,0.74,0.28,0.17);
  const selo=new THREE.Mesh(new THREE.CircleGeometry(0.23,8),bronze);
  selo.rotation.y=Math.PI; selo.position.set(0,2.12,z-0.405); g.add(selo);
  const boca=new THREE.Shape();
  boca.moveTo(-0.09,-0.09); boca.lineTo(0.09,-0.09); boca.lineTo(0.05,0.045);
  boca.quadraticCurveTo(0,0.12,-0.05,0.045); boca.closePath();
  const fenda=new THREE.Mesh(new THREE.ShapeGeometry(boca),retro(new THREE.MeshBasicMaterial({color:0x251723})));
  fenda.position.z=0.001;
  selo.add(fenda);
  const chaveNaTranca=chave(g,0.02,2.11,z-0.47);
  const corda=bloco(g,m.madeira,0.32,1.63,z-0.33,0.065,1.42,0.063);
  const vigilia=new THREE.Mesh(new THREE.OctahedronGeometry(0.17),m.chama);
  vigilia.position.set(4.31,2.12,z-1.31); g.add(vigilia);
  bloco(g,m.pedraEscura,4.31,0.96,z-1.31,0.34,1.92,0.36);
  vila.colisores.adicionar(4.31,z-1.31,0.34,0.36);
  bloco(g,m.madeiraEscura,-3.66,0.85,55.34,0.15,1.7,0.15);
  vila.colisores.adicionar(-3.66,55.34,0.21,0.21);
  placa(g,'Registro do Portão Sul',-3.66,1.53,55.25,1.65,Math.PI);
  vila.objetos.push({x:-3.66,y:1.53,z:55.22,acao:'ler',evento:'vilarejo:registro-do-portao'});

  let tempo=0, animando=false, aberto=false;
  const quadro = f => {
    const giro=THREE.MathUtils.smoothstep(f,0.30,1)*1.32;
    for(const [folha,lado] of folhas) folha.rotation.y=lado*giro;
    ferrolho.rotation.z=THREE.MathUtils.smoothstep(f,0,0.35)*Math.PI/2;
    chaveNaTranca.rotation.z=ferrolho.rotation.z+0.33;
    chaveNaTranca.visible=f>0 && f<0.41;
    const solta=THREE.MathUtils.smoothstep(f,0.18,0.55);
    corda.position.y=1.63-1.57*solta;
    corda.rotation.x=solta*Math.PI/2;
    corda.visible=f<0.92; ferrolho.visible=f<0.42; selo.visible=f<0.42;
  };
  quadro(0);
  return {
    get aberto() {return aberto;},
    get pronto() {return aberto && !animando;},
    get animando() {return animando;},
    iniciar() {if(!aberto) {animando=true; tempo=0; quadro(0);}},
    aplicar(progresso) {
      aberto=progresso.eventos.includes(PORTAO_SUL_ABERTO);
      if(!aberto) animando=false;
      trava.ativa=!aberto || animando;
      if(!animando) quadro(aberto?1:0);
      vigilia.visible=!aberto && !progresso.guardiaoDerrotado;
    },
    atualizar(dt) {
      if(!animando) return;
      tempo=Math.min(1,tempo+dt/1.32);
      quadro(tempo);
      if(tempo===1) {animando=false; trava.ativa=!aberto; vila.navegacao?.invalidar();}
    },
  };
}
