import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { NearestFilter } from 'three';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const url = process.argv[2] || 'http://127.0.0.1:5186/';
const servidor = process.argv[2] ? null : spawn(process.execPath, [
  fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
  '--host', '127.0.0.1', '--port', '5186', '--strictPort',
], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
async function iniciarNavegador() {
  if (servidor) {
    await new Promise((resolve, reject) => {
      servidor.on('error', reject);
      servidor.on('exit', (codigo) => reject(new Error(`Vite encerrou com código ${codigo}`)));
      servidor.stdout.on('data', (dados) => { if (String(dados).includes('127.0.0.1:5186')) resolve(); });
    });
  }
  browser = await chromium.launch({
    executablePath: process.env.PUGNA_CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  return browser.newPage({ viewport: { width: 1100, height: 650 } });
}
let page;
const erros = [];
const chave = 'pugna-progresso-v1';

async function comecar() {
  const endereco = new URL(url);
  endereco.searchParams.set('teste', '');
  await page.goto(endereco.href);
  await page.locator('#botao-comecar').click();
  await page.waitForFunction(() => jogo.estado === 'jogando', null, { polling: 50 });
}

const estado = () => page.evaluate(() => ({
  area: jogo.mundo === jogo.catedral ? 'catedral' : 'vilarejo',
  pos: jogo.jogador.pos.toArray(),
  progresso: jogo.progresso,
  morte: jogo.jogador.morto,
  grade: jogo.catedral.bloqueio.ativa,
  guardiao: { vida: jogo.guardiao.vida, morto: jogo.guardiao.morto, golpes: jogo.guardiao.cfg.golpes },
  hudGuardiao: !document.getElementById('guardiao').classList.contains('oculto'),
  aviso: document.getElementById('aviso').textContent,
}));

async function passos(n = 1) {
  await page.evaluate((n) => {
    const desenhar = jogo.render.desenhar;
    jogo.render.desenhar = () => {};
    try {
      for (let i = 0; i < n; i++) {
        jogo.atualizar(0.05);
        jogo.entrada.limparQuadro();
      }
    } finally {
      jogo.render.desenhar = desenhar;
    }
    jogo.atualizar(0.001);
  }, n);
}

async function tecla(nome) {
  await page.keyboard.press(nome);
  await passos();
}

async function andar(nome, n) {
  await page.keyboard.down(nome);
  await passos(n);
  await page.keyboard.up(nome);
  await passos(12);
}

async function posicionar(x, z, yaw = 0) {
  await page.evaluate(({ x, z, yaw }) => {
    jogo.jogador.reiniciar(x, z, yaw);
    jogo.jogador.atualizarCamera(0, 0);
  }, { x, z, yaw });
}

async function prepararCombate() {
  await page.evaluate(() => {
    // Os cenários de navegação isolam a geometria. O combate é testado à parte.
    for (const i of jogo.inimigos) if (i !== jogo.guardiao) i.ocultarDerrotado();
  });
}

async function mirar(x, y, z) {
  await page.evaluate(({ x, y, z }) => {
    const j = jogo.jogador;
    const dx = x - j.pos.x, dz = z - j.pos.z;
    j.yaw = Math.atan2(-dx, -dz);
    j.pitch = Math.atan2(y - j.pos.y - j.alturaOlhos, Math.hypot(dx, dz));
    j.atualizarCamera(0, 0);
    jogo.hud.limparAviso();
  }, { x, y, z });
  await passos();
}

async function validarExploracao() {
  await prepararCombate();
  await posicionar(-15.9, 11.8);
  await mirar(-15.9, 1.4, 10.39);
  assert.match((await estado()).aviso, /abrir casa da sineira/);
  await tecla('e');
  await andar('w', 25);
  assert.ok((await estado()).pos[2] < 9);
  await mirar(-17.7, 0.82, 5.97);
  assert.match((await estado()).aviso, /abrir baú da sineira/);
  await tecla('e');
  assert.equal(await page.locator('#total-frascos').textContent(), '2');
  await tecla('e');
  assert.equal(await page.locator('#total-frascos').textContent(), '2');
  await page.evaluate(() => { jogo.jogador.vida = 41; });
  await tecla('r');
  assert.equal(await page.evaluate(() => jogo.jogador.vida), 83);
  assert.equal(await page.locator('#total-frascos').textContent(), '1');

  // Pelo lado de fora, a parede esconde a anotação mesmo dentro do alcance.
  await posicionar(-10.99, -13.65, Math.PI);
  await mirar(-10.99, 1.56, -11.79);
  assert.doesNotMatch((await estado()).aviso, /Registro da oficina/);
  await posicionar(-9.45, -5.55);
  await andar('w', 23);
  assert.ok((await estado()).pos[2] < -8.6);
  await mirar(-9.5, 1.13, -11.19);
  assert.match((await estado()).aviso, /recolher chave da sacristia/);
  await tecla('e');
  await andar('w', 5);
  await mirar(-10.99, 1.56, -11.79);
  assert.match((await estado()).aviso, /ler: Registro da oficina/);
  await tecla('e');
  await page.locator('#tela-leitura').waitFor();
  await page.locator('#fechar-leitura').click();
  await page.keyboard.press('i');
  await page.locator('#tela-bolsa').waitFor();
  assert.match(await page.locator('#bolsa-chaves').textContent(), /Chave da sacristia/);
  await page.getByRole('button', { name: 'Registro da oficina' }).click();
  assert.match(await page.locator('#texto-leitura').textContent(), /grade da nave/);
  await page.locator('#fechar-leitura').click();
  await page.locator('#fechar-bolsa').click();
  await page.locator('#continuar').click();

  await posicionar(0, -40);
  await andar('w', 36);
  await tecla('e');
  assert.equal((await estado()).area, 'catedral');
  await prepararCombate();
  // Sem a chave, pressionar E na porta preserva o bloqueio.
  const progresso = (await estado()).progresso;
  await page.evaluate(() => {
    jogo.progresso.eventos = jogo.progresso.eventos.filter((id) => id !== 'vilarejo:chave-sacristia');
  });
  await posicionar(15, -0.25, Math.PI);
  await mirar(15, 1.44, 1.84);
  assert.match((await estado()).aviso, /Trancada/);
  await tecla('e');
  assert.ok(!(await estado()).progresso.eventos.includes('catedral:porta-sacristia'));
  await page.evaluate((salvo) => { jogo.progresso = salvo; }, progresso);
  await mirar(15, 1.44, 1.84);
  assert.match((await estado()).aviso, /abrir porta da sacristia/);
  await tecla('e');
  await andar('w', 26);
  assert.ok((await estado()).pos[2] > 3.6);

  await posicionar(18.64, 6.25, Math.PI);
  await mirar(18.64, 1.67, 8.21);
  assert.match((await estado()).aviso, /Vigília do Guardião/);
  await tecla('e');
  await page.locator('#fechar-leitura').click();
  await page.locator('#continuar').click();
  await posicionar(20.02, 5.88);
  await mirar(20.88, 0.19, 6.77);
  assert.match((await estado()).aviso, /recolher frasco/);
  await tecla('e');
  assert.equal(await page.locator('#total-frascos').textContent(), '2');
  await posicionar(10.85, 6.94, Math.PI / 2);
  await mirar(9.03, 1.53, 7.06);
  assert.match((await estado()).aviso, /acionar alavanca/);
  await tecla('e');
  await posicionar(10.15, 5.98, Math.PI / 2);
  await andar('w', 29);
  assert.ok((await estado()).pos[0] < 6.8, (await estado()).pos.join(', '));
  await posicionar(4, 6.4);
  await tecla('e');
  await passos(23);
  await comecar();
  assert.equal((await estado()).area, 'catedral');
  assert.equal(await page.locator('#total-frascos').textContent(), '2');
  const persistido = await estado();
  assert.equal(persistido.progresso.frascosUsados, 1);
  for (const evento of ['vilarejo:bau-casa', 'vilarejo:chave-sacristia', 'catedral:porta-sacristia',
    'catedral:registro-guardiao', 'catedral:atalho-sacristia', 'catedral:frasco-sacristia']) {
    assert.ok(persistido.progresso.eventos.includes(evento), evento);
  }
  assert.equal(persistido.grade, true);
  await prepararCombate();
  await posicionar(10.15, 5.98, Math.PI / 2);
  await andar('w', 29);
  assert.ok((await estado()).pos[0] < 6.8);
  await page.keyboard.press('Escape');
  await page.locator('#reset-pausa').click();
  await page.locator('#confirmar-reset button[value="apagar"]').click();
  await page.locator('#tela-titulo').waitFor();
  assert.deepEqual((await estado()).progresso.eventos, []);
  assert.equal(await page.locator('#total-frascos').textContent(), '0');
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), chave), null);
}

try {
  page = await iniciarNavegador();
  page.on('pageerror', (erro) => erros.push(erro.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.location().url.endsWith('/favicon.ico')) {
      erros.push(`${msg.location().url}: ${msg.text()}`);
    }
  });
  // Avança a simulação a passos fixos, com o renderizador WebGL real.
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await comecar();
  assert.equal((await estado()).area, 'vilarejo');
  const pisos = await page.evaluate(() => {
    const filtros = new Map();
    for (const area of jogo.areas) area.grupo.traverse(({ material, renderOrder }) => {
      const tex = material?.map;
      if (renderOrder < 0 && tex) filtros.set(tex.id, { mips: tex.generateMipmaps, mag: tex.magFilter });
    });
    return [...filtros.values()];
  });
  assert.equal(pisos.length, 4);
  assert.ok(pisos.every(({ mips, mag }) => mips && mag === NearestFilter));
  assert.ok((await estado()).pos[2] > 50);
  await posicionar(0, -40);
  await andar('w', 36);
  assert.match((await estado()).aviso, /entrar na Catedral do Véu/);
  await tecla('e');
  assert.equal((await estado()).area, 'catedral');
  const rota = await page.evaluate(() => {
    const c = jogo.catedral;
    return c.navegacao.encontrar({ x: -12, z: -8 }, { x: -2, z: 2 }, 0.44);
  });
  assert.ok(rota.some(({ x, z }) => Math.abs(x + 8) < 1 && z > -7 && z < -2.5));
  const patrulha = await page.evaluate(() => {
    const inimigo = jogo.catedral.entidades[0];
    const jogador = jogo.jogador;
    jogador.pos.set(-2, 0, 2);
    const rotaOriginal = inimigo.rota;
    inimigo.rota = [[-12, -8], [-2, 2]];
    inimigo.reiniciar();
    inimigo.pontoAtual = 1;
    jogador.morto = true; // isola a patrulha do combate
    for (let i = 0; i < 520; i++) inimigo.atualizar(0.025);
    const pos = inimigo.pos.toArray();
    inimigo.rota = rotaOriginal;
    inimigo.reiniciar();
    jogador.morto = false;
    return pos;
  });
  assert.ok(patrulha[0] > -5 && patrulha[2] > -1, `Patrulha ficou em ${patrulha}`);
  const busca = await page.evaluate(() => {
    const inimigo = jogo.catedral.entidades[0];
    inimigo.pos.set(-11, 0, -5);
    inimigo.angulo = Math.PI / 2;
    jogo.jogador.pos.set(-4, 0, -5);
    inimigo.atualizar(0.025);
    jogo.jogador.pos.set(-2, 0, 5);
    inimigo.atualizar(0.025);
    const memoria = { estado: inimigo.estado, pos: inimigo.ultimaVista };
    inimigo.reiniciar();
    jogo.jogador.reiniciar(0, 6, 0);
    return memoria;
  });
  assert.deepEqual(busca, { estado: 'procurar', pos: { x: -4, z: -5 } });

  await prepararCombate();
  await andar('w', 116);
  const fechado = await estado();
  assert.equal(fechado.grade, true);
  assert.ok(fechado.pos[2] > -13 && fechado.pos[2] < -12, fechado.pos);
  assert.match(fechado.aviso, /0\/2/);

  await andar('s', 45);
  await andar('a', 114);
  const oeste = await estado();
  assert.ok(oeste.pos[0] < -18 && oeste.pos[0] > -20, oeste.pos);
  assert.match(oeste.aviso, /recolher Selo do Ossário/);
  await tecla('e');
  assert.deepEqual((await estado()).progresso.selos, ['ossario']);
  assert.equal((await estado()).grade, true);
  await tecla('e');
  assert.deepEqual((await estado()).progresso.selos, ['ossario']);
  await andar('d', 226);
  const leste = await estado();
  assert.ok(leste.pos[0] > 18 && leste.pos[0] < 20, leste.pos);
  assert.match(leste.aviso, /recolher Selo do Relicário/);
  await tecla('e');
  assert.deepEqual((await estado()).progresso.selos, ['ossario', 'relicario']);
  assert.equal((await estado()).grade, false);

  // Sai e retorna sem curar nem perder os selos.
  await posicionar(0, 7.3, Math.PI);
  await page.evaluate(() => { jogo.jogador.vida = 73; });
  await tecla('e');
  assert.equal((await estado()).area, 'vilarejo');
  assert.equal(await page.evaluate(() => jogo.jogador.vida), 73);
  await andar('s', 13);
  await tecla('e');
  assert.equal((await estado()).area, 'catedral');
  assert.equal(await page.evaluate(() => jogo.jogador.vida), 73);
  assert.equal((await estado()).grade, false);

  await posicionar(4, 6.4);
  await tecla('e');
  await passos(23);
  assert.equal((await estado()).progresso.descanso, 'nave-do-veu');
  assert.equal(await page.evaluate(() => jogo.jogador.vida), 100);
  assert.equal(await page.evaluate(() => jogo.inimigos.filter((i) => !i.morto).length), 4);
  await prepararCombate();

  // Entra pela grade aberta usando movimento e acerta um ataque forte com o mouse.
  await posicionar(0, -11);
  await andar('w', 45);
  const arena = await estado();
  assert.ok(arena.pos[2] < -16);
  assert.equal(arena.hudGuardiao, true);
  await page.evaluate(() => {
    const g = jogo.guardiao;
    jogo.jogador.reiniciar(g.pos.x, g.pos.z + 2.15, 0);
    g.mudar('recuperacao');
    g.golpesRestantes = 0;
  });
  await page.mouse.down();
  await passos(8);
  await page.mouse.up();
  await passos(9);
  assert.equal((await estado()).guardiao.vida, 272);

  // Exercita a mudança de fase e um golpe do Guardião pelo ciclo de combate.
  await page.evaluate(() => {
    jogo.guardiao.receberDano(130, jogo.jogador.frente(), 0, true);
  });
  assert.equal((await estado()).guardiao.golpes, 2);
  await page.evaluate(() => {
    const g = jogo.guardiao;
    jogo.jogador.reiniciar(g.pos.x, g.pos.z + 2.15, 0);
    g.angulo = 0;
    g.golpesRestantes = g.cfg.golpes;
    g.mudar('preparo');
  });
  await passos(25);
  assert.ok(await page.evaluate(() => jogo.jogador.vida < 100));
  await page.evaluate(() => {
    jogo.guardiao.receberDano(999, jogo.jogador.frente(), 0, true);
  });
  await passos();
  assert.equal((await estado()).progresso.guardiaoDerrotado, true);
  assert.equal((await estado()).hudGuardiao, false);

  // A morte repõe os inimigos comuns e mantém a vitória.
  await page.evaluate(() => jogo.jogador.receberDano(1000, jogo.guardiao.pos));
  assert.equal((await estado()).morte, true);
  await passos(110);
  await page.waitForFunction(() => jogo.estado === 'jogando', null, { polling: 50 });
  assert.equal((await estado()).area, 'catedral');
  assert.equal((await estado()).morte, false);
  assert.equal((await estado()).guardiao.morto, true);
  assert.equal(await page.evaluate(() => jogo.inimigos.filter((i) => !i.morto).length), 3);

  await comecar();
  assert.equal((await estado()).area, 'catedral');
  assert.equal((await estado()).grade, false);
  assert.equal((await estado()).guardiao.morto, true);
  assert.deepEqual(await page.evaluate((chave) => JSON.parse(localStorage.getItem(chave)), chave), {
    descanso: 'nave-do-veu', selos: ['ossario', 'relicario'], guardiaoDerrotado: true,
    frascosUsados: 0,
    eventos: ['catedral:selo-ossario', 'catedral:selo-relicario', 'catedral:guardiao-derrotado'],
  });

  await page.evaluate((chave) => localStorage.setItem(chave, JSON.stringify({ descanso: 'adro-da-igreja' })), chave);
  await comecar();
  assert.equal((await estado()).area, 'vilarejo');
  assert.ok((await estado()).pos[2] < -30);
  assert.equal((await estado()).grade, true);
  assert.deepEqual((await estado()).progresso.selos, []);
  await posicionar(0, -40);
  await andar('w', 36);
  await tecla('e');
  assert.equal((await estado()).area, 'catedral');
  await page.evaluate(() => jogo.jogador.receberDano(1000, jogo.jogador.pos));
  await passos(110);
  await page.waitForFunction(() => jogo.estado === 'jogando', null, { polling: 50 });
  assert.equal((await estado()).area, 'vilarejo');
  assert.equal((await estado()).progresso.descanso, 'adro-da-igreja');
  await page.evaluate((chave) => localStorage.setItem(chave, '{'), chave);
  await comecar();
  assert.ok((await estado()).pos[2] > 50);
  await validarExploracao();
  assert.deepEqual(erros, []);
  console.log('Passou: Catedral, navegação, combate, saves antigos, mira, baú, cura, bolsa, chave, sacristia e atalho após recarregar.');
} finally {
  await browser?.close();
  servidor?.kill();
}
