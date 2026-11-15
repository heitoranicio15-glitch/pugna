// Fotos de enquadramento da câmera em terceira pessoa (spec 10, fases CAM1 a CAM4).
// Tira sempre as mesmas 4 fotos, para comparar antes e depois de mexer na câmera:
// vila com um cavaleiro a 4 m, nave da catedral, estrada e Guardião com a mira travada.
//
// Uso: node tests/fotos-camera.mjs <pasta-de-saída> [prefixo] [--conferencia]
// --conferencia tira também as fotos dos casos de borda (parede colada nas costas,
// olhar para cima, taverna com e sem teto à vista).
// Não faz parte dos testes: é só uma ferramenta. Usa o mesmo navegador do test:browser.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const conferencia = process.argv.includes('--conferencia');
const [pasta = 'fotos-camera', prefixo = ''] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
mkdirSync(pasta, { recursive: true });
const porta = 5187;
const servidor = spawn(process.execPath, [
  fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
  '--host', '127.0.0.1', '--port', String(porta), '--strictPort',
], { stdio: ['ignore', 'pipe', 'inherit'] });

// yaw 0 olha para o norte (z negativo); Math.PI olha para o sul.
const FOTOS = [
  { nome: 'vila-cavaleiro', area: 'vilarejo', jogador: [0, 14, 0], inimigo: { tipo: 'cavaleiro', x: 1.1, z: 10.15 } },
  { nome: 'catedral-nave', area: 'catedral', jogador: [0, 2, 0] },
  { nome: 'estrada', area: 'estrada', jogador: [0, -34, Math.PI] },
  { nome: 'guardiao-mira', area: 'catedral', jogador: [0, -19, 0], inimigo: { tipo: 'guardiao', x: 0, z: -24 }, travar: true },
];
if (conferencia) FOTOS.push(
  { nome: 'taverna', area: 'taverna', jogador: [0, -1, 0] },
  { nome: 'taverna-de-cima', area: 'taverna', jogador: [0, -1, 0], pitch: -0.9 },
  { nome: 'parede-a-1m6', area: 'taverna', jogador: [0, 2.6, 0] },
  { nome: 'parede-a-1m', area: 'taverna', jogador: [0, 3.2, 0] },
  { nome: 'parede-colada', area: 'taverna', jogador: [0, 3.7, 0] },
  { nome: 'olhando-para-cima', area: 'estrada', jogador: [0, -34, Math.PI], pitch: 0.85 },
);

let browser;
try {
  await new Promise((resolve, reject) => {
    servidor.on('error', reject);
    servidor.on('exit', (codigo) => reject(new Error(`Vite encerrou com código ${codigo}`)));
    servidor.stdout.on('data', (dados) => { if (String(dados).includes(`127.0.0.1:${porta}`)) resolve(); });
  });
  browser = await chromium.launch({
    executablePath: process.env.PUGNA_CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://127.0.0.1:${porta}/?teste`);
  await page.locator('#botao-comecar').click();
  await page.waitForFunction(() => jogo.estado === 'jogando', null, { polling: 50 });
  // Para o laço do jogo: daqui em diante só anda quando a foto pede.
  await page.evaluate(() => {
    const atualizar = jogo.atualizar.bind(jogo), desenhar = jogo.render.desenhar.bind(jogo.render);
    // Passo de simulação sem desenhar (o navegador de teste desenha devagar).
    window.passo = (dt) => { jogo.render.desenhar = () => {}; try { atualizar(dt); } finally { jogo.render.desenhar = desenhar; } };
    jogo.atualizar = () => jogo.desenharPartida(0);
  });

  for (const foto of FOTOS) {
    const dados = await page.evaluate(({ foto }) => {
      const j = jogo.jogador;
      jogo.ativarArea(jogo.areasPorId.get(foto.area));
      jogo.reporInimigos();
      let alvo = null;
      for (const i of jogo.inimigos) {
        if (!alvo && foto.inimigo && i.tipo === foto.inimigo.tipo) alvo = i;
        else i.ocultarDerrotado();
      }
      j.reiniciar(...foto.jogador);
      if (alvo) {
        alvo.pos.set(foto.inimigo.x, 0, foto.inimigo.z);
        alvo.rumo = Math.atan2(-(j.pos.x - alvo.pos.x), -(j.pos.z - alvo.pos.z));
      }
      // Sem inimigo na foto, dá tempo de o boneco virar para onde a câmera olha.
      for (let n = 0; n < (alvo ? 3 : 40); n++) window.passo(alvo ? 0.001 : 0.05);
      if (foto.travar) {
        j.travar(alvo);
        j.yaw = Math.atan2(-(alvo.pos.x - j.pos.x), -(alvo.pos.z - j.pos.z));
        // Deixa a câmera assentar na inclinação da mira sem o Guardião andar.
        for (let n = 0; n < 400; n++) { alvo.pos.set(foto.inimigo.x, 0, foto.inimigo.z); alvo.mudar?.('recuperacao'); window.passo(0.01); }
        alvo.pos.set(foto.inimigo.x, 0, foto.inimigo.z);
        j.pos.set(foto.jogador[0], 0, foto.jogador[1]);
        j.vida = 100;
        window.passo(0.001);
      }
      if (foto.pitch !== undefined) j.pitch = foto.pitch;
      window.passo(0.001);
      return {
        fov: jogo.camera.fov,
        camera: jogo.camera.position.toArray().map((v) => +v.toFixed(2)),
        pitch: +j.pitch.toFixed(3),
        distCamera: +j.distCamera.toFixed(2),
        alvo: j.alvo?.tipo ?? null,
        inimigo: alvo ? { visivel: alvo.grupo.visible, pos: alvo.pos.toArray(), estado: alvo.estado } : null,
      };
    }, { foto });
    await page.waitForTimeout(1500);
    const arquivo = join(pasta, `${prefixo}${foto.nome}.jpg`);
    await page.screenshot({ path: arquivo, type: 'jpeg', quality: 88, timeout: 120000 });
    console.log(arquivo, JSON.stringify(dados));
  }
} finally {
  await browser?.close();
  servidor.kill();
}
