import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const [endereco, ...filtros] = process.argv.slice(2);
if (!endereco) throw new Error('Uso: node tests/medir-percurso-catedral.mjs URL [ps1 hd]');
const url = new URL(endereco);
url.searchParams.set('teste', '');
const angle = process.env.PUGNA_ANGLE || 'swiftshader';
const trechos = [
  ['Entrada da nave', 0, 6, 0, 0],
  ['Transepto e grade', 0, -23.7, 0, 0],
  ['Galeria e ponte', 8, -17.8, 0, 4],
  ['Escada da Torre', 16, 19.1, 0, 6],
  ['Sala do Bronze', 16.4, 13.6, -Math.PI / 2, 8],
  ['Descida à Cripta', -16, 19.5, Math.PI, -2.25],
  ['Cripta e urnas', -13, 31.4, Math.PI / 2, -4],
  ['Coro e arcos', 0, -33.5, 0, 0],
  ['Santuário e Abside', 0, -55.2, 0, 0],
];
const browser = await chromium.launch({
  executablePath: process.env.PUGNA_CHROME,
  args: [`--use-angle=${angle}`, ...(angle === 'swiftshader' ? ['--enable-unsafe-swiftshader'] : [])],
});
const arredondar = n => Math.round(n * 10) / 10;
const percentil = (amostras, p) => {
  const ordenadas = [...amostras].sort((a,b) => a-b);
  return arredondar(ordenadas[Math.ceil(ordenadas.length * p) - 1]);
};
try {
  for (const estilo of filtros.length ? filtros : ['ps1', 'hd']) {
    const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
    const erros = [];
    page.on('pageerror', err => erros.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error' && /WebGL|shader/i.test(msg.text())) erros.push(msg.text()); });
    await page.addInitScript(() => {
      window.quadroDaMedicao = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = () => 0;
    });
    await page.goto(url.href, { timeout: 45000 });
    await page.locator('#botao-comecar').click();
    const sistema = await page.evaluate(async estilo => {
      const { jogo } = window;
      const carregar = [];
      jogo.cena.traverse(o => { if (o.userData.pronto) carregar.push(o.userData.pronto); });
      await Promise.all(carregar);
      jogo.preferencias.estiloGrafico = estilo;
      jogo.aplicarPreferencias();
      if (estilo === 'hd') await Promise.all(jogo.materiaisHd.malhas.map(m => m.carregamento));
      jogo.atravessar(jogo.catedral, jogo.catedral.entrada, jogo.catedral.nome);
      for (const inimigo of jogo.inimigos) inimigo.ocultarDerrotado();
      for (const id of ['ossario','relicario']) jogo.registrarEvento('catedral:selo-'+id);
      const r = jogo.render.renderer;
      r.info.autoReset = false;
      const gl = r.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        resolucao: [jogo.render.alvo.width, jogo.render.alvo.height],
      };
    }, estilo);

    const todos = [];
    const dados = [];
    for (const [nome, x, z, yaw, y] of trechos) {
      await page.evaluate(({ x,z,yaw,y }) => {
        jogo.jogador.reiniciar(x,z,yaw,y);
        jogo.jogador.atualizarCamera(0,0);
        jogo.entrada.limparQuadro();
      }, { x,z,yaw,y });
      await page.keyboard.down('w');
      const trecho = await page.evaluate(async () => {
        const { jogo } = window;
        const r = jogo.render.renderer;
        const pos = jogo.jogador.pos.clone();
        const cpu = [], quadros = [], luzes = [], chamadas = [];
        let anterior = null;
        for (let i = 0; i < 26; i++) {
          const agora = await new Promise(resolve => quadroDaMedicao(resolve));
          r.info.reset();
          const inicio = performance.now();
          jogo.atualizar(0.05);
          const duracao = performance.now() - inicio;
          jogo.entrada.limparQuadro();
          if (i >= 8) {
            quadros.push(agora - anterior);
            cpu.push(duracao);
            chamadas.push(r.info.render.calls);
            let total = 0;
            jogo.catedral.grupo.traverseVisible(o => { if (o.isPointLight) total++; });
            luzes.push(total);
          }
          anterior = agora;
        }
        return { cpu, quadros, chamadas, luzes, metros: jogo.jogador.pos.distanceTo(pos) };
      });
      await page.keyboard.up('w');
      assert.ok(trecho.metros > 0.65, `${estilo} · ${nome} · ${trecho.metros} m`);
      todos.push(...trecho.quadros);
      dados.push({
        nome, metros: arredondar(trecho.metros), quadroP50:percentil(trecho.quadros,0.5), quadroP95:percentil(trecho.quadros,0.95),
        cpuP50:percentil(trecho.cpu,0.5), luzesP50:percentil(trecho.luzes,0.5), chamadasP50:percentil(trecho.chamadas,0.5),
      });
    }
    assert.deepEqual(erros,[]);
    console.log(JSON.stringify({ estilo,...sistema,amostras:todos.length,quadroP50:percentil(todos,0.5),quadroP95:percentil(todos,0.95),dados }));
    await page.close();
  }
} finally { await browser.close(); }
