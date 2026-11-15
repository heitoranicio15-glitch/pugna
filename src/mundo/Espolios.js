import * as THREE from 'three';
import { ARMAS, ITENS } from '../nucleo/Inventario.js';
import { CHAVE_MATEIRO, CHAVE_PORTAO, GUARDIAO_DERROTADO, RELIQUIA } from '../nucleo/Progressao.js';
import { modeloDeArma } from '../entidades/ModelosDeArma.js';
import { bloco, chave, frasco } from './Aderecos.js';
import { materiais } from './pecas.js';
import { retro } from '../render/retro.js';

function espolio(area,grupo,evento,visual,{x,y,z,nome,chave, textoTrancado, depois}={}) {
  const o={x,y,z,acao:'recolher',evento,chave,depois,textoTrancado,nome:nome??ITENS[evento]?.nome,
    oculto:!!depois,
    atualizar(recolhido,liberado){ visual.visible=liberado && !recolhido; },
  };
  visual.visible=!depois;
  area.objetos.push(o);
  return o;
}

function pacote(g,x,y,z) {
  const m=materiais(), saco=new THREE.Group();
  saco.position.set(x,y,z); g.add(saco);
  bloco(saco,m.madeiraEscura,0,0.105,0,0.32,0.21,0.29);
  for (const dx of [-0.07,0,0.07]) bloco(saco,m.metal,dx,0.22,0,0.041,0.065,0.105);
  return saco;
}

function armaNoMundo(g,id,x,y,z) {
  const m=materiais(), model=modeloDeArma(id,m.metal,m.pedraMusgo,m.madeiraEscura);
  model.position.set(x,y,z); model.rotation.set(Math.PI/2,0,0.45);
  model.scale.setScalar(id==='lanca'?0.62:0.86);
  g.add(model);
  return model;
}

export function montarEspoliosCatedral(area) {
  const m=materiais(), sala=id=>area.setores.get(id);
  const lamina=ARMAS.lamina;
  espolio(area,sala('relicario'),lamina.evento,armaNoMundo(sala('relicario'),'lamina',19.68,0.93,-15.35),
    {x:19.68,y:1.02,z:-15.04,nome:lamina.nome});

  const g=sala('sacristia');
  const fr=frasco(g,19.38,0.995,9.84);
  fr.scale.setScalar(1.32);
  espolio(area,g,'catedral:frasco-maior',fr,{x:19.38,y:1.21,z:9.84});

  const joia=new THREE.Mesh(new THREE.OctahedronGeometry(0.15),retro(new THREE.MeshBasicMaterial({color:0x81a9d3})));
  joia.position.set(-28.2,-3.32,31.55);
  sala('cela').add(joia);
  espolio(area,sala('cela'),RELIQUIA,joia,{x:joia.position.x,y:joia.position.y,z:joia.position.z});
  espolio(area,sala('coro'),'catedral:municao-do-coro',pacote(sala('coro'),-7.4,0,-34.8),
    {x:-7.4,y:0.24,z:-34.8,nome:'cartuchos do coro'});

  const grupo=new THREE.Group();
  sala('santuario').add(grupo);
  const planoChave=chave(grupo,-0.58,0.18,0.16);
  const planoMaca=armaNoMundo(grupo,'maca',0.57,0.29,-0.34);
  const dadosChave=espolio(area,grupo,CHAVE_PORTAO,planoChave,{y:0.31,depois:GUARDIAO_DERROTADO});
  const dadosMaca=espolio(area,grupo,ARMAS.maca.evento,planoMaca,{y:0.38,depois:GUARDIAO_DERROTADO,nome:ARMAS.maca.nome});
  return ({quedaGuardiao})=>{
    const {x,z}=quedaGuardiao ?? {x:0,z:-49};
    grupo.position.set(x,0,z);
    dadosChave.x=x-0.58; dadosChave.z=z+0.16;
    dadosMaca.x=x+0.57; dadosMaca.z=z+0.24;
  };
}

export function montarEspoliosFloresta(area) {
  const g=area.grupo,m=materiais();
  espolio(area,g,CHAVE_MATEIRO,chave(g,-29.55,0.13,17.82),{x:-29.55,y:0.21,z:17.82});
  espolio(area,g,'floresta:municao-do-mateiro',pacote(g,33.72,0,44.22),
    {x:33.72,y:0.24,z:44.22,nome:'cartuchos do mateiro'});
  const x=32.9,z=47.68;
  bloco(g,m.madeiraEscura,x,0.26,z,1.32,0.52,0.72);
  const tampa=bloco(g,m.metal,x,0.55,z,1.4,0.085,0.79);
  area.colisores.adicionar(x,z,1.40,0.79,0.6);
  const id=ARMAS.lanca.evento;
  area.objetos.push({x,y:0.73,z,acao:'recolher',evento:id,chave:CHAVE_MATEIRO,
    nome:'Lança do Mateiro no cofre',
    textoTrancado:'Uma fita do coro prende a fechadura. A chave ficou nas ruínas, entre as urnas.',
    atualizar(recolhida){
      tampa.rotation.x=recolhida?-0.95:0;
      tampa.position.set(x,recolhida?0.84:0.55,recolhida?z-0.25:z);
    },
  });
}
