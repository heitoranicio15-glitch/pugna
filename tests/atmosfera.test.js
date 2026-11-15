import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { retro, uniformesRetro } from '../src/render/retro.js';

// Direção de arte, Fase 3: névoa que esconde o fim do mapa, névoa baixa nos
// materiais dos dois modos e o ritmo de exploração mais lento.

const opacidadeDaNevoa = (densidade, d) => 1 - Math.exp(-((densidade * d) ** 2));

test('nos exteriores a névoa fecha antes de 80 m: o fim do mapa nunca aparece, só silhuetas', () => {
  for (const id of ['vilarejo', 'estrada', 'floresta']) {
    const { nevoa, nevoaBaixa } = CONFIG.areas[id];
    assert.ok(opacidadeDaNevoa(nevoa.densidade, 80) > 0.95, `${id}: névoa rala demais`);
    // Mas a 15 m ainda se lê o inimigo (no máximo um terço de névoa).
    assert.ok(opacidadeDaNevoa(nevoa.densidade, 15) < 0.34, `${id}: névoa grossa demais para lutar`);
    assert.ok(nevoaBaixa && nevoaBaixa.forca > 0.5 && nevoaBaixa.altura >= 1.5, `${id}: sem névoa baixa`);
  }
  assert.equal(CONFIG.areas.taverna.nevoaBaixa, undefined);   // a taverna é o respiro quente
});

test('a névoa baixa e o contorno entram nos shaders do Three (básico, lambert e PBR)', () => {
  for (const [nome, contorno] of [['basic', false], ['lambert', false], ['standard', true]]) {
    const lib = THREE.ShaderLib[nome];
    const shader = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
    const material = retro(new THREE.MeshBasicMaterial(), { contorno });
    material.onBeforeCompile(shader);
    assert.match(shader.vertexShader, /vMundoPos = /, nome);
    assert.match(shader.fragmentShader, /uBrumaForca > 0\.0/, nome);
    assert.equal(shader.uniforms.uBrumaCor, uniformesRetro.uBrumaCor);
    if (contorno) assert.match(shader.fragmentShader, /uContornoForca/, nome);
  }
});

test('o PS1 desenha a névoa baixa em degraus e o HD suave', () => {
  assert.ok(CONFIG.render.estilos.ps1.bandasDeNevoa >= 2);
  assert.equal(CONFIG.render.estilos.hd.bandasDeNevoa, 0);
  assert.equal(CONFIG.render.estilos.ps1.grao, 0);   // o PS1 já tem o pontilhado
});

test('a distância com 90% de névoa é menor ao sair da vila e menor ainda na mata', () => {
  const { estrada, floresta, vilarejo } = CONFIG.areas;
  const distancia = a => Math.sqrt(Math.log(10)) / a.nevoa.densidade;
  assert.ok(distancia(estrada) >= 35 && distancia(estrada) <= 50);
  assert.ok(distancia(floresta) >= 25 && distancia(floresta) <= 40);
  assert.ok(distancia(vilarejo) > distancia(estrada));
  assert.equal(vilarejo.nevoaEmDegraus, undefined);
  assert.equal(estrada.nevoaEmDegraus, true);
  assert.equal(floresta.nevoaEmDegraus, true);
});

test('explorar é mais lento, mas esquiva, quickstep e luta não mudam', () => {
  const J = CONFIG.jogador;
  assert.ok(J.ritmoExploracao > 0.8 && J.ritmoExploracao < 1);
  assert.equal(J.velAndar, 3.3);
  assert.equal(J.velCorrer, 6.2);
  assert.deepEqual(CONFIG.combate.quickstep, { custo: 14, duracao: 0.2, invencivel: 0.13, velocidade: 11, espera: 0.12 });
  assert.equal(CONFIG.combate.esquiva.velocidade, 9.5);
});
