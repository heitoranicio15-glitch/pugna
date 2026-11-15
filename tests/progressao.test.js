import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { criarAreas, montarAreas } from '../src/mundo/areas.js';
import { Jogo } from '../src/nucleo/Jogo.js';
import { Jogador } from '../src/entidades/Jogador.js';
import { CONFIG } from '../src/config.js';
import { ARMAS, contarMunicao, fichaDeGolpe } from '../src/nucleo/Inventario.js';
import { areasAlcancaveis, avisoPortal, CHAVE_MATEIRO, CHAVE_PORTAO, GUARDIAO_DERROTADO, PORTAO_SUL_ABERTO, VERSAO_PROGRESSAO } from '../src/nucleo/Progressao.js';
import { normalizarProgresso } from '../src/nucleo/Salvamento.js';

const ctx=new Proxy(function(){},{get:(_,k)=>k==='createImageData'?(w,h)=>({data:new Uint8ClampedArray(w*h*4)}):ctx,
  apply:()=>ctx,set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>ctx,style:{}})};
const mapa=criarAreas(new THREE.Scene(),{direcaoLua:new THREE.Vector3(0.3,0.5,-0.8).normalize()});
const vila=mapa.porId.get('vilarejo'), catedral=mapa.porId.get('catedral'), mata=mapa.porId.get('floresta');
const portal=vila.portais.find(p=>p.destino==='estrada');

function jogoCom(progresso) {
  const j=Object.create(Jogo.prototype);
  Object.assign(j,{progresso:normalizarProgresso(progresso), areas:mapa.areas,catedral,areasPorId:mapa.porId,
    mundo:vila,lanternas:[],inimigos:[],camera:new THREE.PerspectiveCamera(),preferencias:{sensibilidade:100},
    eventos:{emitir(){}},entrada:{toque:false},hud:{avisar(){},mostrarAlvo(){},mostrarFrascos(){},mostrarBalas(){}},
    salvamento:{salvar(p){j.salvo=normalizarProgresso(p);}},
    atravessar(area,chegada){j.chegou={area,chegada};},
  });
  j.jogador=new Jogador(j);
  j.jogador.reiniciar(0,55.4,Math.PI);
  j.aplicarProgresso();
  return j;
}

test('o grafo real dá acesso à estrada pela chave da Catedral e recusa um ciclo bloqueado', () => {
  const {areas,eventos}=areasAlcancaveis(mapa.porId,vila.id);
  assert.equal(areas.size,mapa.areas.length);
  assert.ok(eventos.has(GUARDIAO_DERROTADO) && eventos.has(CHAVE_PORTAO) && eventos.has(PORTAO_SUL_ABERTO));
  const semChave=mapa.areas.map(a=>a===catedral ? {...a,objetos:a.objetos.filter(o=>o.evento!==CHAVE_PORTAO)} : a);
  assert.throws(()=>montarAreas(semChave),/inalcançáveis.*estrada/);
  const semVolta=mapa.areas.map(a=>a.id==='estrada'?{...a,portais:a.portais.filter(p=>p.destino!==vila.id)}:a);
  assert.throws(()=>montarAreas(semVolta),/sem portal de volta/);
  const chaveInvalida=mapa.areas.map(a=>a===vila ?
    {...a,portais:a.portais.map(p=>p===portal?{...p,requer:'invalida'}:p)}:a);
  assert.throws(()=>montarAreas(chaveInvalida),/requer deve ser area:evento/);
});

test('save antigo que já venceu ou descansou fora abre o portão; save novo espera o espólio', () => {
  const selos=['ossario','relicario'];
  for (const dados of [{selos,guardiaoDerrotado:true},{descanso:'taverna-da-estrada'},
    {descanso:'floresta-cabana'},{area:'taverna'}]) {
    const p=normalizarProgresso(dados);
    assert.ok(p.eventos.includes(CHAVE_PORTAO) && p.eventos.includes(PORTAO_SUL_ABERTO));
    assert.deepEqual(normalizarProgresso(p),p);
  }
  const fresco=normalizarProgresso({versaoProgressao:VERSAO_PROGRESSAO,selos,eventos:[GUARDIAO_DERROTADO]});
  assert.equal(fresco.guardiaoDerrotado,true);
  assert.ok(!fresco.eventos.includes(CHAVE_PORTAO));
  assert.ok(!normalizarProgresso({descanso:'nave-do-veu'}).eventos.includes(PORTAO_SUL_ABERTO));
});

test('o Guardião solta a chave, que abre o portão uma vez e persiste ao recarregar', () => {
  const j=jogoCom({selos:['ossario','relicario']});
  const chave=catedral.objetos.find(o=>o.evento===CHAVE_PORTAO);
  assert.equal(chave.oculto,true);
  assert.match(j.interacao()[0],/selo do Guardião/);
  assert.equal(j.interacao()[1],undefined);
  assert.notEqual(avisoPortal(portal,[],1),avisoPortal(portal,[],-1));
  j.progresso.quedaGuardiao={x:3,z:-48};
  j.registrarEvento(GUARDIAO_DERROTADO);
  assert.equal(chave.oculto,false);
  assert.equal(chave.x,2.42);
  assert.equal(j.interacao()[1],undefined,'derrotar ainda não recolhe a chave');
  j.interacaoObjeto(chave)[1]();
  assert.equal(chave.oculto,true);
  assert.equal(j.interacaoObjeto(chave)[1],undefined,'repetir não recolhe de novo');
  assert.match(j.interacao()[0],/girar a Chave/);
  j.interacao()[1]();
  assert.ok(j.salvo.eventos.includes(PORTAO_SUL_ABERTO));
  assert.ok(vila.portaoSul.animando);
  assert.equal(j.interacao()[1],undefined,'espera a animação');
  vila.portaoSul.atualizar(1.4);
  j.interacao()[1]();
  assert.equal(j.chegou.area.id,'estrada');
  const depois=jogoCom(j.salvo);
  assert.equal(vila.portaoSul.pronto,true);
  assert.ok(!vila.colisores.bloqueiaTrecho({x:0,z:55.8},{x:0,z:57.75},1.45));
  assert.equal(vila.somLocal().sino,0);
  assert.match(depois.interacao()[0],/sair pelo Portão/);
});

test('a arma do cofre requer a chave, a troca persiste e o golpe gasta a estamina da ficha', () => {
  const j=jogoCom({});
  const cofre=mata.objetos.find(o=>o.evento===ARMAS.lanca.evento);
  assert.match(j.interacaoObjeto(cofre)[0],/ruínas/);
  assert.equal(j.interacaoObjeto(cofre)[1],undefined);
  assert.match(j.trocarArma('lanca'),/ainda não/);
  j.registrarEvento(CHAVE_MATEIRO);
  j.interacaoObjeto(cofre)[1]();
  assert.equal(cofre.oculto,true);
  assert.match(j.trocarArma('lanca'),/equipada/);
  assert.equal(j.salvo.arma,'lanca');
  const antes=j.jogador.estamina;
  j.jogador.iniciarAtaque('leve');
  assert.equal(j.jogador.estamina,antes-fichaDeGolpe('lanca','leve').custo);
  assert.match(j.trocarArma('espada'),/fim da ação/);
  assert.equal(jogoCom(j.salvo).jogador.armaEquipada,'lanca');
});

test('um pacote de munição é recolhido uma vez e só repõe as balas que faltam', () => {
  const j=jogoCom({});
  const pacote=catedral.objetos.find(o=>o.evento==='catedral:municao-do-coro');
  j.interacaoObjeto(pacote)[1]();
  assert.equal(contarMunicao(j.progresso),3);
  assert.equal(j.interacaoObjeto(pacote)[1],undefined);
  const max=CONFIG.combate.pistola.balasMax;
  j.jogador.balas=max-2;
  j.usarMunicao();
  assert.equal(j.jogador.balas,max);
  assert.equal(contarMunicao(j.salvo),1);
  assert.equal(contarMunicao(jogoCom(j.salvo).progresso),1);
});
