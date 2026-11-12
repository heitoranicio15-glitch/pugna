// =============================================================================
//  TEXTURAS PIXELADAS FEITAS NO CÓDIGO
//  Em vez de baixar imagens, cada textura é "pintada" pixel a pixel aqui.
//  São pequenas (32x32) e usam filtro "nearest" para ficarem serrilhadas.
//  Para trocar por imagens de verdade no futuro: carregue um PNG de
//  public/assets com THREE.TextureLoader e aplique os mesmos filtros de prepararTextura.
// =============================================================================
import * as THREE from 'three';

/** Gerador de números "aleatórios" que sempre repete a mesma sequência. */
export function criarSorteio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function prepararTextura(tex) {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cria uma textura chamando pintar(x, y) para cada pixel. pintar devolve [r, g, b] (0-255). */
function pintarTextura(tam, pintar, alfa = null) {
  const tela = document.createElement('canvas');
  tela.width = tela.height = tam;
  const ctx = tela.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const c = pintar(x, y);
      const i = (y * tam + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2];
      img.data[i + 3] = alfa ? alfa(x, y) : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return prepararTextura(new THREE.CanvasTexture(tela));
}

const mult = (c, f) => [c[0] * f, c[1] * f, c[2] * f];

function pedra() {
  const r = criarSorteio(11);
  const tons = Array.from({ length: 64 }, () => 0.72 + r() * 0.5);
  return pintarTextura(32, (x, y) => {
    const fila = Math.floor(y / 8);
    const xx = (x + (fila % 2) * 8) % 32;
    const tijolo = fila * 2 + Math.floor(xx / 16);
    const junta = y % 8 === 0 || xx % 16 === 0;
    const f = junta ? 0.34 : tons[tijolo] * (0.86 + r() * 0.28);
    return mult([70, 76, 128], f);
  });
}

function calcamento() {
  // Pedras irregulares: cada pixel pertence à "semente" mais próxima.
  const r = criarSorteio(23);
  const pts = Array.from({ length: 14 }, () => [r() * 32, r() * 32, 0.6 + r() * 0.6]);
  return pintarTextura(32, (x, y) => {
    let d1 = 99, d2 = 99, tom = 1;
    for (const p of pts) {
      let dx = Math.abs(x - p[0]); dx = Math.min(dx, 32 - dx);
      let dy = Math.abs(y - p[1]); dy = Math.min(dy, 32 - dy);
      const d = Math.hypot(dx, dy);
      if (d < d1) { d2 = d1; d1 = d; tom = p[2]; } else if (d < d2) d2 = d;
    }
    const borda = d2 - d1 < 1.3;
    const f = borda ? 0.3 : tom * (0.85 + r() * 0.3);
    return mult([62, 64, 118], f);
  });
}

function telhado() {
  const r = criarSorteio(31);
  return pintarTextura(32, (x, y) => {
    const fila = Math.floor(y / 6);
    const xx = (x + (fila % 2) * 4) % 8;
    const sombra = y % 6 === 0 ? 0.35 : xx === 0 ? 0.55 : 0.75 + (y % 6) * 0.07;
    return mult([58, 40, 110], sombra * (0.85 + r() * 0.3));
  });
}

function madeira() {
  const r = criarSorteio(41);
  const tons = Array.from({ length: 8 }, () => 0.7 + r() * 0.5);
  return pintarTextura(32, (x, y) => {
    const tabua = Math.floor(x / 6) % 8;
    const f = x % 6 === 0 ? 0.3 : tons[tabua] * (0.85 + r() * 0.25) * (y % 13 === 0 ? 0.75 : 1);
    return mult([74, 48, 70], f);
  });
}

function terra() {
  const r = criarSorteio(53);
  return pintarTextura(32, () => {
    const f = 0.6 + r() * 0.6;
    return r() < 0.2 ? mult([34, 62, 74], f) : mult([36, 40, 82], f);
  });
}

function metal() {
  const r = criarSorteio(61);
  return pintarTextura(16, (x, y) => {
    const f = 0.75 + r() * 0.35 - (y % 8 === 0 ? 0.3 : 0);
    return mult([96, 104, 150], f);
  });
}

function tecido() {
  const r = criarSorteio(67);
  return pintarTextura(16, (x, y) => mult([40, 30, 78], 0.7 + r() * 0.4 - (x % 5 === 0 ? 0.2 : 0)));
}

function janela(acesa) {
  const r = criarSorteio(acesa ? 71 : 73);
  return pintarTextura(16, (x, y) => {
    const moldura = x === 0 || x === 15 || y === 0 || y === 15 || x === 7 || x === 8 || y === 7 || y === 8;
    if (moldura) return [22, 16, 34];
    if (!acesa) return mult([20, 24, 60], 0.7 + r() * 0.5);
    const calor = 1.05 - Math.abs(y - 9) / 16;
    return mult([255, 150, 50], calor * (0.85 + r() * 0.2));
  });
}

function vitral() {
  const r = criarSorteio(83);
  const cores = [[125, 255, 46], [130, 70, 255], [255, 138, 42], [40, 190, 255], [220, 60, 160]];
  const grade = Array.from({ length: 64 }, () => cores[Math.floor(r() * cores.length)]);
  return pintarTextura(16, (x, y) => {
    if (x % 4 === 0 || y % 4 === 0) return [14, 10, 28];
    return mult(grade[Math.floor(y / 4) * 4 + Math.floor(x / 4)], 0.8 + r() * 0.3);
  });
}

/** Mancha redonda e suave: usada em brilhos, chamas e névoa. */
function brilho() {
  return pintarTextura(32, () => [255, 255, 255], (x, y) => {
    const d = Math.hypot(x - 15.5, y - 15.5) / 15.5;
    return Math.max(0, 1 - d) ** 2 * 255;
  });
}

function nevoa() {
  return pintarTextura(32, () => [255, 255, 255], (x, y) => {
    const d = Math.hypot(x - 15.5, y - 15.5) / 15.5;
    return Math.max(0, 1 - d) ** 1.5 * 255;
  });
}

let cache = null;
/** Devolve todas as texturas do jogo (criadas uma vez só). */
export function texturas() {
  if (!cache) {
    cache = {
      pedra: pedra(), calcamento: calcamento(), telhado: telhado(), madeira: madeira(),
      terra: terra(), metal: metal(), tecido: tecido(),
      janelaAcesa: janela(true), janelaApagada: janela(false), vitral: vitral(),
      brilho: brilho(), nevoa: nevoa(),
    };
    for (const n of ['brilho', 'nevoa']) {
      cache[n].wrapS = cache[n].wrapT = THREE.ClampToEdgeWrapping;
      cache[n].magFilter = cache[n].minFilter = THREE.LinearFilter; // manchas suaves
    }
  }
  return cache;
}
