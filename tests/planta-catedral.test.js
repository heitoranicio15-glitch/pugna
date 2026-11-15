import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { Catedral } from '../src/mundo/Catedral.js';
import { facesDoKit } from '../src/mundo/KitCatedral.js';
import { Navegacao } from '../src/mundo/Navegacao.js';
import { atualizarObjetos } from '../src/mundo/Interacoes.js';
import { ANOTACOES, ATALHO_SACRISTIA, PORTA_SACRISTIA } from '../src/nucleo/Inventario.js';
import { ANDARES, ATALHO_CRIPTA, ESCADAS } from '../src/mundo/NiveisCatedral.js';
import { validarSom } from '../src/audio/regras.js';

const ctx = new Proxy(function () {}, {
  get: (_, k) => k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : ctx,
  apply: () => ctx,
  set: () => true,
});
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
const c = new Catedral(new THREE.Scene());
const sobrepoe = (a, A, b, B) => Math.min(A, B) > Math.max(a, b);

test('o kit não sobrepõe volumes nem emite faces coplanares em duplicata', () => {
  const volumes = c.volumes;
  for (const [i, a] of volumes.entries()) for (let j = i + 1; j < volumes.length; j++) {
    const b = volumes[j];
    assert.ok(!a.min.every((v, k) => sobrepoe(v, a.max[k], b.min[k], b.max[k])), JSON.stringify([a, b]));
  }
  const planos = new Map();
  for (const a of facesDoKit(volumes)) {
    const id = a.eixo + ':' + a.cota, [x, y, X, Y] = a.ret;
    if (!planos.has(id)) planos.set(id, []);
    for (const { ret: [u,v,U,V] } of planos.get(id)) {
      assert.ok(!(sobrepoe(x, X, u, U) && sobrepoe(y, Y, v, V)), JSON.stringify(a));
    }
    planos.get(id).push(a);
  }
});

test('cada borda externa fecha a sala e os vãos de combate têm mais de 3 m', () => {
  const raio = CONFIG.jogador.raio;
  for (const { x, z, eixo, vao, salas, base } of c.planta.arestas.values()) {
    const dx = eixo === 'x' ? 1 : 0, dz = 1 - dx;
    if (salas.length === 1) assert.equal(vao, undefined);
    for (const s of [-1.6, 0, 1.6]) {
      if (vao?.trava) continue;
      const a = { x: x - dx + s * dz, z: z - dz + s * dx };
      const b = { x: x + dx + s * dz, z: z + dz + s * dx };
      assert.equal(c.colisores.bloqueiaTrecho(a,b,(vao?.y ?? base) + 1.6), !vao, JSON.stringify({ x,z,eixo,s }));
    }
    if (vao) assert.ok(vao.largura >= 3 && vao.altura >= 2.5);
    if (salas.length === 1) {
      assert.ok(c.colisores.bloqueiaTrecho({ x:x-dx,z:z-dz }, { x:x+dx,z:z+dz }, base, raio));
    }
  }
});

test('chegada, lanterna, patrulhas e interações da Catedral ficam no piso e fora de bloqueios', () => {
  const points = [...Object.values(c.chegadas), ...c.portais, ...c.pontosDeDescanso,
    ...c.objetos, ...c.inimigos.flatMap(i => i.rota.map(([x,z]) => ({ x,z,y:i.y ?? 0 })))];
  for (const p of points) {
    assert.ok([...c.planta.celulas.values()].some(a => Math.abs(a.x - p.x) <= 2 && Math.abs(a.z - p.z) <= 2), JSON.stringify(p));
    assert.ok(!c.colisores.bloqueiaTrecho(p,p,p.y ?? 0), JSON.stringify(p));
  }
});

test('as duas alas são acessíveis antes dos selos e a grade controla a rota até o Guardião', () => {
  const nav = new Navegacao(c.colisores, c.limites), raio = CONFIG.jogador.raio;
  const [x,z] = c.inimigos.find(i => i.tipo === 'guardiao').rota[0];
  const destino = { x,z };
  for (const selo of c.selos) assert.ok(nav.encontrar(c.entrada, { x: selo.x - Math.sign(selo.x) * 1.4, z:selo.z }, raio).length);
  assert.equal(nav.encontrar(c.entrada, destino, raio).length, 0);
  c.aplicarProgresso({ selos: ['ossario','relicario'] });
  nav.invalidar();
  assert.ok(nav.encontrar(c.entrada, destino, raio).length);
  c.aplicarProgresso({ selos: [] });
});

test('os IDs antigos do térreo e a abertura da sacristia sobrevivem ao progresso salvo', () => {
  assert.ok(c.pontosDeDescanso.some(p => p.id === 'nave-do-veu'));
  assert.equal(c.inimigos.find(i => i.tipo === 'guardiao').eventoDeDerrota, 'catedral:guardiao-derrotado');
  assert.deepEqual(c.selos.map(s => s.id), ['ossario','relicario']);
  const eventos = new Set(c.objetos.map(o => o.evento));
  for (const id of Object.keys(ANOTACOES).filter(id => id.startsWith('catedral:'))) assert.ok(eventos.has(id), id);
  for (const id of [PORTA_SACRISTIA, ATALHO_SACRISTIA, 'catedral:frasco-sacristia']) assert.ok(eventos.has(id), id);
  const a = { x: 9,z:5 }, b = { x: 11,z:5 };
  assert.ok(c.colisores.bloqueiaTrecho(a,b,1.6));
  atualizarObjetos(c, [PORTA_SACRISTIA, ATALHO_SACRISTIA]);
  assert.ok(!c.colisores.bloqueiaTrecho(a,b,1.6));
});

// Percorre os lances em ambas as direções usando o mesmo colisor do caçador.
function caminhar(coords) {
  const [primeiro, ...alvos] = coords;
  const [x,y,z] = primeiro;
  const pos = { x,y,z }, raio = CONFIG.jogador.raio;
  for (const [destX, destZ, destY] of alvos) {
    const passos = Math.max(1, Math.ceil(Math.hypot(destX-pos.x, destZ-pos.z) / 0.1));
    const dx = (destX-pos.x)/passos, dz = (destZ-pos.z)/passos;
    for (let i=0;i<passos;i++) {
      pos.x += dx; pos.z += dz;
      c.colisores.resolver(pos, raio, pos.y, 0.4);
      const h = c.colisores.alturaDoChao(pos.x, pos.z, pos.y, 0.4);
      assert.ok(Math.abs(pos.y-h) <= 0.4, JSON.stringify({pos,h,destX,destZ}));
      pos.y = h;
    }
    assert.ok(Math.hypot(pos.x-destX,pos.z-destZ)<0.11, JSON.stringify({pos,destX,destZ}));
    if (destY !== undefined) assert.equal(pos.y, destY, JSON.stringify(pos));
  }
  return pos;
}

test('as escadas têm 3,5 m de largura e chegam a patamares navegáveis nos quatro pisos', () => {
  for (const { id, x,z,rumo,base,alto } of ESCADAS) {
    const lances = c.volumes.filter(v=>v.tipo==='degrau' && (v.max[0]+v.min[0])/2===x);
    assert.equal(lances.length,16,id);
    for (const p of lances) {
      assert.equal(p.max[0]-p.min[0],3.5,id);
      assert.equal(p.max[2]-p.min[2],0.5,id);
    }
    assert.deepEqual(lances.map(v=>v.max[1]), Array.from({length:16},(_,i)=>base+0.25*(i+1)),id);
    assert.equal(alto-base,4,id);
    assert.equal(c.colisores.alturaDoChao(x,z+rumo*8.55,alto,0.05),alto,id);
  }
  caminhar([[0,0,5],[8,5],[8,13],[12,13],[12,24.5,ANDARES.galeria],[8,24.5],[8,-23],[-8,-23],[-8,-9,4]]);
  caminhar([[8,4,24.5],[12,24.5],[12,13,0],[8,13],[8,7]]);
  caminhar([[12,4,25],[16,25],[16,13,ANDARES.torre],[19,13,8],[16,13],[16,25,4]]);
  caminhar([[0,0,5],[-8,5],[-16,5],[-16,13],[-16,25,ANDARES.cripta],[-16,30],[-23,30,-4]]);
});

test('ferrolho abre somente do lado da cripta e libera o retorno à nave', () => {
  const a={x:-20,z:14}, b={x:-20,z:16};
  assert.ok(c.colisores.bloqueiaTrecho(a,b,1));
  const alavanca=c.objetos.find(o=>o.evento===ATALHO_CRIPTA && o.acao==='acionar');
  assert.ok(c.colisores.interceptarTrecho(a,alavanca,1.7,0,alavanca.y) !== null);
  atualizarObjetos(c,[ATALHO_CRIPTA]);
  assert.ok(!c.colisores.bloqueiaTrecho(a,b,1));
  caminhar([[-20,-4,29],[-20,24],[-20,13,0],[-16,13],[-16,5],[-8,5],[0,5]]);
});

test('câmera e navegação distinguem o teto dos dois lados da mesma passarela', () => {
  const p = { x:8,z:3 };
  assert.equal(c.colisores.alturaDoChao(p.x,p.z,0),0);
  assert.equal(c.colisores.alturaDoChao(p.x,p.z,4),4);
  assert.equal(c.colisores.alturaDoTeto(p.x,p.z,0,1.75,0.4),2);
  assert.ok(c.colisores.interceptarTrecho(p,p,1.5,0,5.5,0.8) !== null);
  assert.ok(c.colisores.interceptarTrecho(p,{x:8,z:7},5.5,0,5.5) === null);
  const nav=new Navegacao(c.colisores,c.limites);
  assert.ok(nav.encontrar({x:8,z:-15,y:4},{x:-8,z:-15,y:4},0.4).some(p=>p.z<-21));
  assert.ok(!nav.livre({x:8,z:-15,y:4},{x:-8,z:-15,y:4},0.4));
});

test('as patrulhas conservam um caminho no andar de nascimento', () => {
  const nav = new Navegacao(c.colisores,c.limites);
  c.aplicarProgresso({ selos: ['ossario','relicario'] });
  for (const {tipo,rota,y=0,limiteZ} of c.inimigos) {
    for (const [i,[x,z]] of rota.entries()) {
      const [X,Z] = rota[(i+1) % rota.length];
      assert.equal(c.colisores.alturaDoChao(x,z,y,0.05),y,tipo);
      assert.ok(nav.encontrar({x,y,z},{x:X,y,z:Z},CONFIG.inimigos[tipo].raio,limiteZ).length,tipo);
    }
  }
  c.aplicarProgresso({ selos: [] });
});

test('o som muda com o nível e a torre e a cripta ocultam salas incomunicáveis', () => {
  const posicoes = [[0,0,6],[8,4,-11],[20,8,13],[-16,-4,31]];
  const sons = posicoes.map(([x,y,z]) => c.somLocal({x,y,z}));
  assert.equal(new Set(sons).size,4);
  for (const som of sons) assert.deepEqual(validarSom(som),[]);
  c.atualizar(0,0,{x:20,y:8,z:13});
  assert.equal(c.setores.get('nave').visible,false);
  assert.equal(c.setores.get('torre').visible,true);
  c.atualizar(0,0,{x:-16,y:-4,z:31});
  assert.equal(c.setores.get('claustro').visible,true);
  assert.equal(c.setores.get('cela').visible,true);
  assert.equal(c.setores.get('santuario').visible,false);
  c.atualizar(0,0,{x:8,y:4,z:-11});
  assert.equal(c.setores.get('nave').visible,true);
  assert.equal(c.setores.get('galeria-leste').visible,true);
});
