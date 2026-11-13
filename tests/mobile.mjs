// CELULAR CONGELADO (veja PASSAGEM.md): este cenário não faz parte dos testes
// obrigatórios. Ele só roda com `npm run test:celular` e pode ficar desatualizado
// enquanto o celular não voltar a ser suportado.
import assert from 'node:assert/strict';
import { devices } from 'playwright-core';

export async function validarMobile(browser, url) {
  const context = await browser.newContext({ ...devices['Pixel 7'], defaultBrowserType: undefined });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const erros = [];
  page.on('pageerror', (erro) => erros.push(erro.message));
  const pontos = new Map();
  const toque = async (type, id, x, y) => {
    if (type === 'touchCancel' || type === 'touchEnd') pontos.clear();
    else pontos.set(id, { id, x, y });
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...pontos.values()] });
  };
  const centro = async (seletor) => {
    const caixa = await page.locator(seletor).boundingBox();
    assert.ok(caixa, seletor);
    return [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2];
  };
  const quadros = (n = 1) => page.evaluate((n) => {
    const render = jogo.render.desenhar;
    try {
      jogo.render.desenhar = () => {};
      for (let i = 0; i < n; i++) {
        jogo.atualizar(0.04);
        jogo.entrada.limparQuadro();
      }
    } finally { jogo.render.desenhar = render; }
  }, n);

  try {
    // Congela o relógio para medir gestos em passos fixos. A URL é a normal.
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.goto(url);
    await page.locator('#botao-comecar').tap();
    await page.locator('#controles-toque').waitFor();
    assert.equal(await page.evaluate(() => document.pointerLockElement), null);
    const superficie = await page.evaluate(() => {
      const alvo = document.elementFromPoint(48, 230);
      return { canvas: alvo instanceof HTMLCanvasElement, gesto: getComputedStyle(alvo.parentElement).touchAction };
    });
    assert.deepEqual(superficie, { canvas: true, gesto: 'none' });
    const zoomInicial = await page.evaluate(() => visualViewport.scale);
    await cdp.send('Input.synthesizePinchGesture', {
      x: 66, y: 235, scaleFactor: 1.65, relativeSpeed: 500, gestureSourceType: 'touch',
    });
    assert.equal(await page.evaluate(() => visualViewport.scale), zoomInicial);
    await page.touchscreen.tap(48, 230);
    await page.touchscreen.tap(48, 230);
    assert.equal(await page.evaluate(() => visualViewport.scale), zoomInicial);
    const permitePinca = () => document.dispatchEvent(new Event('gesturestart', { cancelable: true }));
    assert.equal(await page.evaluate(permitePinca), false);
    const [x, y] = await centro('#direcional-toque');
    const origem = await page.evaluate(() => jogo.jogador.pos.z);
    await toque('touchStart', 1, x, y);
    await toque('touchMove', 1, x, y - 46);
    await quadros(8);
    assert.ok(await page.evaluate((z) => jogo.jogador.pos.z < z - 0.8 && jogo.jogador.estamina < 100, origem));
    await toque('touchStart', 2, 290, 312);
    await toque('touchMove', 2, 338, 331);
    await page.waitForFunction(() => jogo.entrada.mouseDX !== 0, null, { polling: 25, timeout: 2500 });
    await quadros();
    const camera = await page.evaluate(() => ({
      yaw: jogo.jogador.yaw, pitch: jogo.jogador.pitch, frente: jogo.entrada.frenteToque,
      ponteiros: [...jogo.toque.ponteiros.values()].map(({ tipo }) => tipo),
    }));
    assert.ok(Math.abs(camera.yaw) > 0.15 && Math.abs(camera.pitch) > 0.05 && camera.frente > 0, JSON.stringify(camera));
    await toque('touchEnd');
    await page.waitForFunction(() => jogo.toque.ponteiros.size === 0, null, { polling: 25 });

    const ataque = '[data-botao="0"]';
    await toque('touchStart', 3, ...await centro(ataque));
    await quadros(10);
    assert.equal(await page.evaluate(() => jogo.jogador.avisouCarga), true);
    await toque('touchEnd');
    await page.waitForFunction(() => !jogo.entrada.botoes[0], null, { polling: 25 });
    await quadros();
    assert.equal(await page.evaluate(() => jogo.jogador.ataque), 'forte');
    await quadros(26);
    assert.equal(await page.evaluate(() => jogo.entrada.frenteToque), 0);
    await page.locator(ataque).tap();
    await quadros();
    assert.equal(await page.evaluate(() => jogo.jogador.ataque), 'leve');
    await quadros(20);
    await toque('touchStart', 4, ...await centro('[data-botao="2"]'));
    await quadros();
    assert.equal(await page.evaluate(() => jogo.jogador.bloqueando), true);
    await toque('touchCancel', 4);
    await quadros();
    assert.equal(await page.evaluate(() => jogo.jogador.bloqueando), false);
    await page.locator('[data-tecla="KeyQ"]').tap();
    await quadros();
    assert.ok(await page.evaluate(() => jogo.jogador.tEsquiva > 0));
    await quadros(21);
    await page.locator('[data-tecla="Space"]').tap();
    await quadros();
    assert.ok(await page.evaluate(() => jogo.jogador.pos.y > 0));

    await page.evaluate(() => jogo.jogador.reiniciar(-2.7, 50, 0));
    await quadros();
    await page.locator('#toque-interagir').tap();
    await quadros(25);
    assert.equal(await page.evaluate(() => jogo.progresso.descanso), 'portao-sul');
    await page.evaluate(() => { jogo.registrarEvento('vilarejo:bau-casa'); jogo.jogador.vida = 40; });
    await quadros();
    await page.locator('#toque-cura').tap();
    await quadros(18);   // o frasco agora leva um tempo para curar
    assert.equal(await page.evaluate(() => jogo.jogador.vida), 82);
    await page.locator('#toque-bolsa').tap();
    await page.locator('#tela-bolsa').waitFor();
    assert.match(await page.locator('#bolsa-frascos').textContent(), /1 ×/);
    await page.locator('#fechar-bolsa').tap();
    await page.locator('#continuar').tap();
    await page.setViewportSize({ width: 820, height: 390 });
    await quadros();
    for (const seletor of ['#toque-pausa', '#direcional-toque', ataque]) {
      const [cx, cy] = await centro(seletor);
      assert.ok(cx > 0 && cx < 820 && cy > 0 && cy < 390);
    }
    await page.locator('#toque-pausa').tap();
    await page.locator('#tela-pausa').waitFor();
    assert.equal(await page.evaluate(permitePinca), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('jogo')).touchAction), 'auto');
    assert.deepEqual(erros, []);
    console.log('Passou: celular sem captura do mouse, multitoque, ataque, guarda, esquiva, pulo, lanterna, cura, bolsa, rotação e pausa.');
  } finally {
    await context.close();
  }
}
