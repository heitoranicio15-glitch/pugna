import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Colisores } from './Colisores.js';
import { criarSorteio, texturas } from '../render/texturas.js';
import { retro } from '../render/retro.js';
import { bloco, placa } from './Aderecos.js';
import { materiais, planoDeChao, silhuetasColossais, telhado } from './pecas.js';
import { montarAtmosfera } from './Atmosfera.js';
import { faixaDeTrilha, paisagemExterior, xEmZ } from './PaisagemExterior.js';
import { plantarBosque, recortarBosque } from './Bosque.js';
import { ANOTACOES } from '../nucleo/Inventario.js';

const C = CONFIG.areas.floresta;
export const xDaTrilha = z => xEmZ(C.caminho,z);

export class Floresta {
  constructor(cena,direcaoLua) {
    this.id='floresta';
    this.nome='Floresta Seca';
    this.usaCeu=true;
    this.limites={...C.limites};
    this.grupo=new THREE.Group();
    this.colisores=new Colisores();
    this.objetos=[];
    cena.add(this.grupo);
    const {minX,maxX,minZ,maxZ}=this.limites, meioZ=(minZ+maxZ)/2;
    const m=materiais(), r=criarSorteio(2179);
    const zN=C.portaNorte.z, zS=C.barricadaSul.z;
    montarAtmosfera(this,C,direcaoLua);
    silhuetasColossais(this.grupo,direcaoLua,{x:0,z:meioZ});

    this.portais=[{x:0,z:zN,raio:2.2,destino:'estrada',texto:'E — voltar à estrada'}];
    this.chegadas={estrada:{x:0,z:zN+3.9,yaw:Math.PI}};
    this.pontosDeDescanso=[
      {id:'floresta-clareira',nome:'Clareira da Floresta',...C.lanterna,olhar:0},
      {id:'floresta-cabana',nome:'Cabana do Mateiro',...C.lanternaDaCabana,olhar:0,ilumina:false},
    ];
    this.inimigos=[
      {tipo:'cacador',rota:[[-9,-7],[-14,0],[-17,7]]},
      {tipo:'cavaleiro',rota:[[-6,29],[0,35],[8,41]]},
      {tipo:'penitente',rota:[[3,71],[1,73],[-6,80],[-9,85]]},
    ];
    // Apenas reserva do mapa: não é um portal do registro até o destino existir.
    this.portalFuturo={x:0,z:zS-1.45,destino:'castelo',requer:'floresta:passagem-do-castelo',
      textoTrancado:'A madeira cedeu para dentro. Do outro lado, ainda não.'};

    planoDeChao(this,{x:0,z:meioZ,l:420,p:420,ladrilho:7,material:m.terraChao,ordem:-6});
    faixaDeTrilha(this.grupo,C.caminho,C.larguraDoCaminho,m.caminhoChao);
    for (const desvio of [C.desvio,C.desvioLeste]) faixaDeTrilha(this.grupo,desvio,4.1,m.caminhoChao,-5.1);

    this.colisores.adicionar(minX+0.3,meioZ,0.8,maxZ-minZ+2);
    this.colisores.adicionar(maxX-0.3,meioZ,0.8,maxZ-minZ+2);
    this.colisores.adicionar(0,minZ+0.4,maxX-minX+2,0.8);
    this.colisores.adicionar(0,maxZ-0.4,maxX-minX+2,0.8);

    const gravar=(id,x,y,z,giro=0) => {
      const evento='floresta:'+id;
      placa(this.grupo,ANOTACOES[evento].nome,x,y,z,1.52,giro);
      this.objetos.push({x,y,z,acao:'ler',evento});
    };
    const pedra=(x,z,l,a,p) => {
      bloco(this.grupo,m.pedraMusgo,x,a/2,z,l,a,p);
      this.colisores.adicionar(x,z,l,p,a);
    };
    const poste=(texto,x,z,ry=0) => {
      bloco(this.grupo,m.madeiraEscura,x,0.77,z,0.14,1.54,0.14);
      this.colisores.adicionar(x,z,0.24,0.24);
      placa(this.grupo,texto,x,1.46,z+(ry ? -0.1:0.1),1.65,ry);
    };
    poste('Estrada do Sul',3.8,zN+1.2);
    poste('Cabana · Grota',9.8,36.25,Math.PI);

    // Clareira e ruína: a lua aparece entre as copas, sobre as urnas sem tampa.
    pedra(-8.35,-33.2,2.5,0.6,1.1);
    pedra(-31.6,17.6,0.65,2.9,7.3);
    pedra(-29.2,14.4,4.15,2.15,0.65);
    pedra(-29.4,20.9,3.6,0.82,0.68);
    const urna=new THREE.LatheGeometry([[0,0],[0.29,0],[0.54,0.48],[0.28,0.77],[0.38,0.84],[0.3,0.91],[0.21,0.86],[0.2,0.23]]
      .map(([x,y])=>new THREE.Vector2(x,y)),9);
    const urnas=new THREE.InstancedMesh(urna,m.pedraEscura,5), matriz=new THREE.Matrix4();
    for (const [i,[x,z]] of [[-7.5,-31.2],[-30.8,16.8],[-30.3,18.8],[12.2,85.7],[14.8,86.6]].entries()) {
      urnas.setMatrixAt(i,matriz.makeTranslation(x,0,z));
      this.colisores.adicionarCilindro(x,z,0.44,0.91);
    }
    this.grupo.add(urnas);
    gravar('urnas-do-mato',-31.22,1.49,19.65,Math.PI/2);

    // Vala rasa com uma ponte de toras, parte do corredor do poço.
    const agua=retro(new THREE.MeshBasicMaterial({color:0x102335,depthWrite:false}));
    planoDeChao(this,{x:2,z:75.8,l:16,p:2.15,ladrilho:null,material:agua,ordem:-4.8,y:0.02});
    const toraGeo=new THREE.CylinderGeometry(0.18,0.2,3.1,6).rotateX(Math.PI/2);
    const ponte=new THREE.InstancedMesh(toraGeo,m.tronco,12);
    for (let i=0;i<12;i++) ponte.setMatrixAt(i,matriz.makeTranslation(-2+i*0.4,0.16,75.8));
    this.grupo.add(ponte);
    this.colisores.adicionar(0.2,75.8,4.8,3.1,0.34);

    // Cabana aberta para a trilha leste; a lanterna fica do lado de fora.
    const cx=33.15, cz=46.15;
    const parede=(x,z,l,a,p)=>{
      bloco(this.grupo,m.madeiraEscura,x,a/2,z,l,a,p);
      this.colisores.adicionar(x,z,l,p,a);
    };
    parede(cx+2.4,cz,0.35,3,5.5);
    parede(cx,cz-2.6,4.45,3,0.30);
    parede(cx,cz+2.6,4.45,3,0.30);
    const teto=telhado(5.65,1.28,6.3,m.telhado,m.pedraEscura);
    teto.position.set(cx,3.02,cz); this.grupo.add(teto);
    parede(cx+1.52,cz+1.45,0.75,0.87,1.75);
    gravar('bilhete-do-mateiro',cx+1.15,1.37,cz+1.45,-Math.PI/2);
    // A montaria ficou junto da cabana; fita escura no pescoço, sela sem dono.
    const cavalo=new THREE.Group();
    cavalo.position.set(33,0,55); cavalo.rotation.y=-0.85; this.grupo.add(cavalo);
    const pelo=retro(new THREE.MeshLambertMaterial({color:0x2b272d}));
    const oval=(y,z,l,a,p,mat=pelo) => {
      const forma=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),mat);
      forma.position.set(0,y,z); forma.scale.set(l,a,p); cavalo.add(forma);
      return forma;
    };
    oval(1.29,0,0.46,0.48,1.07);
    oval(1.68,0.68,0.26,0.63,0.32).rotation.x=0.5;
    oval(2.12,1.01,0.23,0.31,0.39);
    oval(1.59,-0.13,0.48,0.19,0.37,m.madeiraEscura);
    for (const x of [-0.29,0.29]) for (const z of [-0.61,0.61]) bloco(cavalo,pelo,x,0.48,z,0.16,0.97,0.19);
    for (const x of [-0.12,0.12]) bloco(cavalo,pelo,x,2.43,0.89,0.075,0.27,0.12);
    this.colisores.adicionarCilindro(33,55,0.91,2.35);

    // Poço, fitas do coro e uma carroça tombada para dentro da trilha.
    for (const [x,z,l,a,p] of [[12.9,83.5,1.8,0.65,2.8],[-32.6,25,6.3,4.1,4.9]]) pedra(x,z,l,a,p);
    const aro=new THREE.LatheGeometry([[1.22,0],[1.62,0],[1.63,0.88],[1.22,0.88],[1.22,0]]
      .map(([x,y])=>new THREE.Vector2(x,y)),10);
    const poco=new THREE.Mesh(aro,m.pedraMusgo);
    poco.position.set(8.9,0,85); this.grupo.add(poco);
    this.colisores.adicionarCilindro(8.9,85,1.63,0.88);
    gravar('fitas-do-coro',10.59,0.78,85,Math.PI/2);
    const fita=retro(new THREE.MeshLambertMaterial({color:0x5c2e45}));
    for(const [x,z,h] of [[6.8,83.7,2.5],[11.2,83.4,3.2],[-8.31,-32.6,1.54]]) {
      bloco(this.grupo,m.madeiraEscura,x,h/2,z,0.14,h,0.14);
      bloco(this.grupo,fita,x+0.22,h-0.32,z,0.3,0.6,0.045);
    }
    const carroca=bloco(this.grupo,m.madeiraEscura,13.85,0.72,83.5,1.95,0.28,2.6);
    carroca.rotation.z=0.66;
    const roda=new THREE.Mesh(new THREE.TorusGeometry(0.54,0.105,5,9),m.metal);
    roda.position.set(16.2,0.57,84.7); this.grupo.add(roda);

    // A barricada fecha a ponta inteira. O ponto central tem texto de lore,
    // mas não aparece no grafo até existir o retorno da área futura.
    const tronco=new THREE.CylinderGeometry(0.52,0.64,10.4,6).rotateZ(Math.PI/2);
    const barricada=new THREE.InstancedMesh(tronco,m.tronco,20);
    for(let i=0;i<20;i++) barricada.setMatrixAt(i,matriz.makeTranslation(-36+(i%10)*8,0.53+Math.floor(i/10)*1.02,zS-0.1+r()*0.52));
    this.grupo.add(barricada);
    this.colisores.adicionar(0,zS,maxX-minX,2.4);
    poste('Trilha interrompida',2.5,zS-2.55,Math.PI);
    this.objetos.push({x:0,y:1.55,z:zS-1.47,acao:'informar',mensagem:this.portalFuturo.textoTrancado});

    const reservas=[
      [0,-39,7],[-4.4,-33.5,5.2],[-31,17,6.5],[-32.6,25,5],
      [33.15,46.15,6.5],[29,48,3.2],[33,55,2.8],[2,75.8,5],[10.5,85,7.5],[0,zS-2.6,5.4],
      ...this.inimigos.flatMap(i=>i.rota.map(([x,z])=>[x,z,1.9])),
    ];
    paisagemExterior(this,C,7746,[[8.7,-27,2.5,7.3],[-21.2,-5.5,4.6,9.5],[30.5,63.1,4.4,9.3]]);
    const bosque=plantarBosque(this,C,reservas);
    this.arvores=bosque.arvores.length;
    this.troncos=bosque.arvores;
    this.setores=bosque.setores;

    // Bruma barata: poucos bancos próximos e fungos discretos em uma só malha.
    this.nevoas=[];
    const matNevoa=new THREE.SpriteMaterial({
      map:texturas().nevoa,color:C.bruma.cor,transparent:true,opacity:C.bruma.opacidade,depthWrite:false,
    });
    for(let i=0;i<28;i++) {
      const s=new THREE.Sprite(matNevoa), z=minZ+3+r()*(maxZ-minZ-5), w=7+r()*9;
      s.position.set(xDaTrilha(z)+(r()-0.5)*22,C.bruma.altura+r()*C.bruma.variacao,z);
      s.scale.set(w*1.7,w*0.4,1);
      this.grupo.add(s);
      this.nevoas.push({s,centro:xDaTrilha(z),vel:(0.22+r()*0.35)*C.bruma.velocidade});
    }
    const fungos=new THREE.BufferGeometry(), pontos=[];
    for (const [x,z] of [[-8,-30],[-31,22],[17,59],[9,89],[3,76.5]]) {
      for(let i=0;i<9;i++) pontos.push(x+(r()-0.5)*3,0.07+r()*0.27,z+(r()-0.5)*2.8);
    }
    fungos.setAttribute('position',new THREE.Float32BufferAttribute(pontos,3));
    this.grupo.add(new THREE.Points(fungos,new THREE.PointsMaterial({
      map:texturas().brilho,color:0x6198df,size:0.28,opacity:0.64,transparent:true,
      depthWrite:false,blending:THREE.AdditiveBlending,
    })));
  }

  atualizar(dt,tempo,pos,estilo) {
    if (pos) recortarBosque(this.setores,pos,C.vegetacao.recorte);
    if (estilo==='hd') for (const {s,centro,vel} of this.nevoas) {
      s.position.x+=vel*dt;
      if (s.position.x>centro+14) s.position.x=centro-14;
    }
  }
}
