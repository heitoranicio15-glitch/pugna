// Contagem de quadros isolados. Não inicia partida nem executa test:browser.
import { chromium } from 'playwright-core';

const [url, ...filtro] = process.argv.slice(2);
if (!url) throw new Error('Uso: node tests/medir-quadro.mjs URL [catedral estrada floresta]');
const vistas = [
  ['catedral','nave',0,0,6,0], ['catedral','galeria',8,4,-9,0],
  ['catedral','torre',19,8,13,0], ['catedral','cripta',-16,-4,29,Math.PI / 2],
  ['catedral','arena',0,0,-42,0],
  ['vilarejo','rua',0,0,52,0], ['taverna','salão',0,0,2,0],
  ['estrada','estrada',0,0,8,Math.PI], ['floresta','entrada',0,0,-38.5,Math.PI],
  ['floresta','cabana',26,0,44,-Math.PI/2], ['floresta','poço',4,0,83,-Math.PI/2],
];
const browser = await chromium.launch({
  executablePath: process.env.PUGNA_CHROME,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const erros = [];
  page.on('pageerror', err => erros.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error' && /WebGL|shader/i.test(msg.text())) erros.push(msg.text()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto(url, { waitUntil: 'load', timeout: 25000 });
  await page.waitForFunction(() => window.jogo, null, { polling: 100, timeout: 20000 });
  const dados = await page.evaluate(async (vistas) => {
    const { jogo } = window;
    const carregar = [];
    jogo.cena.traverse(o => { if (o.userData.pronto) carregar.push(o.userData.pronto); });
    const modelos = await Promise.all(carregar);
    const r = jogo.render.renderer;
    r.info.autoReset = false;
    const saida = [];
    for (const estilo of ['ps1','hd']) {
      jogo.preferencias.estiloGrafico = estilo;
      jogo.aplicarPreferencias();
      for (const [id,nome,x,y,z,yaw] of vistas) {
        const area = jogo.areasPorId.get(id);
        jogo.ativarArea(area);
        jogo.jogador.reiniciar(x,z,yaw,y);
        jogo.jogador.atualizarCamera(0);
        jogo.boneco.atualizar(0,jogo.jogador);
        area.atualizar(0,0,jogo.jogador.pos,estilo);
        jogo.luzJogador.position.set(x,y+2.1,z);
        r.info.reset();
        jogo.desenharPartida(0);
        const { calls, triangles } = r.info.render;
        saida.push({ estilo,id,nome,chamadas:calls,triangulos:triangles });
      }
    }
    return { modelosCarregados: modelos.filter(Boolean).length, modelos: modelos.length, dados: saida };
  }, vistas.filter(([id]) => !filtro.length || filtro.includes(id)));
  if (erros.length) throw new Error(erros.join('\n'));
  console.log(JSON.stringify(dados));
} finally {
  await browser.close();
}
