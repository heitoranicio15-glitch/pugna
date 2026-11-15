// Fotos de enquadramento da câmera em terceira pessoa (spec 10, fases CAM1 a CAM4).
// Tira sempre as mesmas fotos, para comparar antes e depois de mexer na câmera:
// os 4 pontos fixos (vila com um cavaleiro a 4 m, nave da catedral, estrada e Guardião com a mira
// travada) e os 7 da mira travada (cavaleiro a 4 m e a 1,5 m, Guardião de perto e de longe e a troca
// de alvo entre dois cavaleiros, em 3 momentos).
//
// Uso: node tests/fotos-camera.mjs <pasta-de-saída> [prefixo] [--conferencia] [--so=nome1,nome2] [--hd]
// --conferencia tira também as fotos dos casos de borda (parede colada nas costas,
// olhar para cima, taverna com e sem teto à vista).
// Não faz parte dos testes: é só uma ferramenta. Usa o mesmo navegador do test:browser.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const conferencia = process.argv.includes('--conferencia');
// --so=nome1,nome2 tira só as fotos com esses nomes (de qualquer um dos grupos).
const so = process.argv.find((a) => a.startsWith('--so='))?.slice(5).split(',');
const [pasta = 'fotos-camera', prefixo = ''] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
mkdirSync(pasta, { recursive: true });
const porta = 5187;
const servidor = spawn(process.execPath, [
  fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
  '--host', '127.0.0.1', '--port', String(porta), '--strictPort',
], { stdio: ['ignore', 'pipe', 'inherit'] });

// yaw 0 olha para o norte (z negativo); Math.PI olha para o sul.
// `inimigos` são postos no lugar e ficam parados; `travar` é o índice do inimigo com a mira.
// `depois` tira mais fotos na mesma cena (troca de alvo): trava em outro e anda `tempo` segundos.
const FOTOS = [
  { nome: 'vila-cavaleiro', area: 'vilarejo', jogador: [0, 14, 0], inimigos: [{ tipo: 'cavaleiro', x: 1.1, z: 10.15 }] },
  { nome: 'catedral-nave', area: 'catedral', jogador: [0, 2, 0] },
  { nome: 'estrada', area: 'estrada', jogador: [0, -34, Math.PI] },
  { nome: 'guardiao-mira', area: 'catedral', jogador: [0, -19, 0], inimigos: [{ tipo: 'guardiao', x: 0, z: -24 }], travar: 0 },
  // CAM3, mira travada: os mesmos pontos antes e depois.
  { nome: 'mira-cavaleiro-4m', area: 'vilarejo', jogador: [0, 14, 0], inimigos: [{ tipo: 'cavaleiro', x: 0, z: 10 }], travar: 0 },
  { nome: 'mira-cavaleiro-1m5', area: 'vilarejo', jogador: [0, 14, 0], inimigos: [{ tipo: 'cavaleiro', x: 0, z: 12.5 }], travar: 0 },
  // CAM3b: inimigo do tamanho do caçador (escala 1) colado.
  { nome: 'mira-cacador-1m5', area: 'estrada', jogador: [0, -34, Math.PI], inimigos: [{ tipo: 'cacador', x: 0, z: -32.5 }], travar: 0 },
  { nome: 'mira-guardiao-perto', area: 'catedral', jogador: [0, -19, 0], inimigos: [{ tipo: 'guardiao', x: 0, z: -21 }], travar: 0 },
  { nome: 'mira-guardiao-longe', area: 'catedral', jogador: [0, -19, 0], inimigos: [{ tipo: 'guardiao', x: 0, z: -27 }], travar: 0 },
  {
    nome: 'mira-troca-1-alvo-da-esquerda', area: 'vilarejo', jogador: [0, 14, 0], travar: 0,
    inimigos: [{ tipo: 'cavaleiro', x: -2.2, z: 10.5 }, { tipo: 'cavaleiro', x: 2.2, z: 10.5 }],
    depois: [
      { nome: 'mira-troca-2-no-meio', travar: 1, tempo: 0.08 },
      { nome: 'mira-troca-3-alvo-da-direita', travar: 1, tempo: 4 },
    ],
  },
];
if (conferencia || so) FOTOS.push(
  { nome: 'taverna', area: 'taverna', jogador: [0, -1, 0] },
  { nome: 'taverna-de-cima', area: 'taverna', jogador: [0, -1, 0], pitch: -0.9 },
  { nome: 'parede-a-1m6', area: 'taverna', jogador: [0, 2.6, 0] },
  { nome: 'parede-a-1m', area: 'taverna', jogador: [0, 3.2, 0] },
  { nome: 'parede-colada', area: 'taverna', jogador: [0, 3.7, 0] },
  { nome: 'olhando-para-cima', area: 'estrada', jogador: [0, -34, Math.PI], pitch: 0.85 },
);

// --hd tira as fotos no modo gráfico HD (o padrão é o PS1).
const hd = process.argv.includes('--hd');
if (so) FOTOS.splice(0, FOTOS.length, ...FOTOS.filter((f) => so.includes(f.nome)));

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

  if (hd) await page.evaluate(() => { jogo.preferencias.estiloGrafico = 'hd'; jogo.aplicarPreferencias(); });
  const fotografar = async (nome, dados) => {
    await page.waitForTimeout(1500);
    const arquivo = join(pasta, `${prefixo}${nome}.jpg`);
    await page.screenshot({ path: arquivo, type: 'jpeg', quality: 88, timeout: 120000 });
    console.log(arquivo, JSON.stringify(dados));
  };

  for (const foto of FOTOS) {
    const dados = await page.evaluate(({ foto }) => {
      const j = jogo.jogador;
      jogo.ativarArea(jogo.areasPorId.get(foto.area));
      jogo.reporInimigos();
      const pedidos = [...(foto.inimigos ?? [])], postos = [];
      for (const i of jogo.inimigos) {
        const n = pedidos.findIndex((p) => p && p.tipo === i.tipo);
        if (n < 0) { i.ocultarDerrotado(); continue; }
        postos[n] = { inimigo: i, ...pedidos[n] }; pedidos[n] = null;
      }
      j.reiniciar(...foto.jogador);
      // Põe os inimigos da foto no lugar, virados para o caçador e sem andar nem atacar.
      const segurar = window.segurar = (parados = true) => {
        for (const p of postos) {
          p.inimigo.pos.set(p.x, 0, p.z);
          p.inimigo.rumo = Math.atan2(-(j.pos.x - p.x), -(j.pos.z - p.z));
          if (parados) p.inimigo.mudar?.('recuperacao');
        }
        j.pos.set(foto.jogador[0], 0, foto.jogador[1]);
        j.vida = 100;
      };
      window.resumo = () => ({
        fov: jogo.camera.fov,
        camera: jogo.camera.position.toArray().map((v) => +v.toFixed(2)),
        yaw: +j.yaw.toFixed(3),
        pitch: +j.pitch.toFixed(3),
        distCamera: +j.distCamera.toFixed(2),
        alvo: j.alvo?.tipo ?? null,
        inimigos: postos.map((p) => ({ visivel: p.inimigo.grupo.visible, pos: p.inimigo.pos.toArray(), estado: p.inimigo.estado })),
      });
      window.postos = postos;
      const travado = foto.travar !== undefined;
      segurar(travado);
      // Sem inimigo na foto, dá tempo de o boneco virar para onde a câmera olha.
      for (let n = 0; n < (postos.length ? 3 : 40); n++) window.passo(postos.length ? 0.001 : 0.05);
      if (travado) {
        const alvo = postos[foto.travar].inimigo;
        j.travar(alvo);
        j.yaw = Math.atan2(-(alvo.pos.x - j.pos.x), -(alvo.pos.z - j.pos.z));
        // Deixa a câmera assentar na mira sem ninguém andar.
        for (let n = 0; n < 400; n++) { segurar(); window.passo(0.01); }
        segurar();
        window.passo(0.001);
      }
      if (foto.pitch !== undefined) j.pitch = foto.pitch;
      window.passo(0.001);
      return window.resumo();
    }, { foto });
    await fotografar(foto.nome, dados);
    for (const etapa of foto.depois ?? []) {
      const dadosEtapa = await page.evaluate(({ etapa }) => {
        const j = jogo.jogador, alvo = window.postos[etapa.travar].inimigo;
        if (j.alvo !== alvo) j.travar(alvo);
        for (let n = 0; n < Math.round(etapa.tempo / 0.01); n++) { window.segurar(); window.passo(0.01); }
        window.segurar();
        window.passo(0.001);
        return window.resumo();
      }, { etapa });
      await fotografar(etapa.nome, dadosEtapa);
    }
  }
} finally {
  await browser?.close();
  servidor.kill();
}
