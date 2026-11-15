// =============================================================================
//  TEXTURAS PIXELADAS FEITAS NO CÓDIGO
//  Em vez de baixar imagens, cada textura é "pintada" pixel a pixel aqui.
//  São pequenas (32x32) e usam filtro "nearest" para ficarem serrilhadas.
//  As variantes PBR de cenário ficam em materiaisHd.js.
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

function prepararPiso(tex) {
  // Continua pixelado de perto. Usa níveis menores quando o piso se afasta da câmera.
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
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
  // Um trecho maior e ladrilhável, com pedras, juntas de barro e bordas lascadas.
  const tam = 128;
  const r = criarSorteio(23);
  const pts = Array.from({ length: 81 }, (_, i) => [
    ((i % 9) + 0.2 + r() * 0.6) * tam / 9,
    (Math.floor(i / 9) + 0.2 + r() * 0.6) * tam / 9,
    0.68 + r() * 0.55,
  ]);
  return pintarTextura(tam, (x, y) => {
    let d1 = Infinity, d2 = Infinity, tom = 1;
    for (const p of pts) {
      let dx = Math.abs(x - p[0]); dx = Math.min(dx, tam - dx);
      let dy = Math.abs(y - p[1]); dy = Math.min(dy, tam - dy);
      const d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; tom = p[2]; } else if (d < d2) d2 = d;
    }
    const junta = Math.sqrt(d2) - Math.sqrt(d1);
    if (junta < 1.45) return mult([45, 33, 40], 0.8 + r() * 0.32);
    const relevo = junta < 2.6 ? 0.8 : 1;
    const manchas = 0.92 + 0.09 * Math.sin(x * Math.PI / 16 + Math.sin(y * Math.PI / 32));
    return mult([99, 92, 111], tom * relevo * manchas * (0.92 + r() * 0.16));
  });
}

function lajes() {
  const r = criarSorteio(127);
  const tons = Array.from({ length: 16 }, () => 0.72 + r() * 0.35);
  return pintarTextura(128, (x, y) => {
    const fila = y >> 5;
    const u = (x + (fila % 2) * 16) % 128;
    const px = u % 32, py = y % 32;
    if (px === 0 || py === 0) return mult([38, 32, 48], 0.8 + r() * 0.3);
    const borda = px === 1 || py === 1 ? 1.25 : px === 31 || py === 31 ? 0.7 : 1;
    const veios = 0.9 + 0.12 * Math.sin((px + py) * 0.32 + Math.sin(py * 0.2));
    return mult([112, 103, 124], tons[fila * 4 + (u >> 5)] * borda * veios * (0.91 + r() * 0.18));
  });
}

function mosaico() {
  const r = criarSorteio(137);
  return pintarTextura(128, (x, y) => {
    const a = Math.abs(x - 63.5), b = Math.abs(y - 63.5);
    const raio = Math.hypot(a, b);
    const losango = a + b;
    let cor = [69, 55, 81];
    if (raio > 50 && raio < 55 || losango > 44 && losango < 49) cor = [168, 122, 75];
    else if (losango <= 44) cor = a < 6 || b < 6 ? [162, 122, 78] : [112, 50, 67];
    else if (raio < 50) cor = [85, 61, 104];
    else if ((x >> 4) % 2 === (y >> 4) % 2) cor = [96, 79, 100];
    const desgaste = r() < 0.06 ? 0.58 : 1;
    const junta = x % 4 === 0 || y % 4 === 0 ? 0.64 : 1;
    return mult(cor, junta * desgaste * (0.88 + r() * 0.24));
  });
}

function tapete() {
  const r = criarSorteio(149);
  return pintarTextura(128, (x, y) => {
    const borda = Math.min(x, 127 - x, y, 127 - y);
    const losango = Math.abs(x - 63.5) + Math.abs(y - 63.5);
    const friso = borda === 4 || borda === 11 || (borda > 6 && borda < 9 && ((x + y) % 8 < 4));
    const medalhao = (losango > 22 && losango < 25) || losango < 7;
    const cor = friso || medalhao ? [166, 108, 64] : borda < 14 ? [48, 23, 36] : [103, 38, 52];
    const trama = (x + y) % 2 ? 0.87 : 1;
    return mult(cor, trama * (0.79 + r() * 0.31));
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
  return pintarTextura(128, (x, y) => {
    const u = x * Math.PI / 64, v = y * Math.PI / 64;
    const limo = Math.sin(u * 2 + Math.cos(v * 3)) * Math.cos(v * 2 - u);
    const f = 0.74 + r() * 0.38 + 0.13 * Math.cos(u * 5 + v * 4);
    return mult(limo > 0.24 ? [43, 55, 47] : [56, 46, 58], f);
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

function trama() {
  const r = criarSorteio(163);
  return pintarTextura(32, (x, y) => {
    const fio = (x + y) % 2 ? 0.82 : 1;
    const faixa = x % 8 === 0 ? 0.86 : 1;
    return mult([111, 103, 116], fio * faixa * (0.83 + r() * 0.3));
  });
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
  const cores = [[76, 118, 167], [112, 89, 153], [179, 122, 65], [74, 139, 148], [146, 64, 101]];
  const grade = Array.from({ length: 16 }, () => cores[Math.floor(r() * cores.length)]);
  return pintarTextura(64, (x, y) => {
    const u = x + y, v = 64 + x - y;
    if (u % 16 < 2 || v % 16 < 2) return [17, 14, 27];
    const cor = grade[(Math.floor(u / 16) % 4) * 4 + Math.floor(v / 16) % 4];
    const vidro = 0.86 + 0.13 * Math.sin((x * 0.26 + y * 0.16) + Math.sin(y * 0.3));
    return mult(cor, vidro * (0.87 + r() * 0.26));
  });
}

/** Rosácea, painéis longos e juntas de chumbo pintados em uma textura só. */
function vitralDoVeu(ambar) {
  const tamanho = 128;
  const r = criarSorteio(ambar ? 388 : 387);
  const [fundo, petala, filete] = ambar
    ? [[105, 54, 64], [233, 160, 73], [253, 208, 114]]
    : [[31, 65, 124], [88, 164, 206], [252, 191, 113]];
  const chumbo = [27, 23, 37];
  const tex = pintarTextura(tamanho, (x, y) => {
    const u = (x + 0.5) / tamanho - 0.5;
    const v = (y + 0.5) / tamanho;
    const borda = Math.min(0.5 - Math.abs(u), 1 - v, (Math.sqrt(1 - 2 * Math.abs(u)) * 0.47 + v - 0.47) * 1.3);
    const d = Math.hypot(u, (v - 0.40) * 1.27);
    const angulo = Math.atan2((v - 0.40) * 1.27, u);
    const raioPetala = 0.131 + 0.044 * Math.cos(angulo * 8);
    const vao = Math.abs(Math.sin(angulo * 4)) * d;
    const ruido = 0.88 + 0.19 * r() + 0.08 * Math.sin(x * 0.37 + y * 0.31);
    if (borda < 0.031 || Math.abs(d - 0.218) < 0.01 || Math.abs(d - raioPetala) < 0.008) return chumbo;
    if (borda < 0.051 || d < 0.025 || (d > 0.192 && d < 0.209)) return mult(filete, ruido);
    if (d < raioPetala && vao < 0.009) return chumbo;
    if (d < raioPetala) return mult(petala, ruido);
    if (v > 0.61) {
      const junta = Math.min(Math.abs(u), Math.abs(Math.abs(u) - 0.23));
      if (junta < 0.011 || Math.abs(v - 0.65) < 0.009 || Math.abs(v - 0.89) < 0.009) return chumbo;
      const losango = Math.abs((Math.abs(u) % 0.23) - 0.115) + Math.abs(v - 0.77) * 0.8;
      if (losango < 0.051) return mult(losango < 0.029 ? filete : petala, ruido * 0.8);
    }
    return mult(fundo, ruido);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return prepararPiso(tex);
}

function cantariaDoVeu() {
  const r = criarSorteio(509);
  const tons = Array.from({ length: 12 }, () => 0.82 + r() * 0.28);
  return prepararPiso(pintarTextura(128, (x, y) => {
    const fiada = Math.floor(y / 32);
    const deslocado = (x + (fiada % 2) * 19) % 128;
    const bloco = Math.floor(deslocado / 43);
    const linha = y % 32;
    const borda = deslocado % 43;
    const relevo = Math.sin(x * 0.43 + y * 0.27) * Math.cos(y * 0.51);
    const poro = r();
    if (linha < 2 || borda < 2) return mult([43, 41, 48], 0.89 + poro * 0.24);
    const quina = linha < 4 || borda < 4 ? 1.14 : linha > 28 || borda > 39 ? 0.76 : 1;
    const grao = 0.94 + poro * 0.15 + relevo * 0.09 - (poro < 0.045 ? 0.16 : 0);
    return mult([118, 113, 119], tons[fiada * 3 + bloco] * quina * grao);
  }));
}

function lajesDaNave() {
  const r = criarSorteio(510);
  return prepararPiso(pintarTextura(128, (x, y) => {
    const linha = y % 32;
    const borda = (x + (Math.floor(y / 32) % 2) * 32) % 64;
    const grao = 0.87 + r() * 0.16 + 0.08 * Math.sin(x * 0.2 - y * 0.19);
    if (linha < 2 || borda < 2) return mult([39, 39, 51], grao);
    const quina = linha < 4 || borda < 4 ? 1.15 : linha > 28 || borda > 59 ? 0.72 : 1;
    return mult([89, 91, 107], grao * quina);
  }));
}

function corredorDoVeu() {
  const r = criarSorteio(511);
  const tex = prepararPiso(pintarTextura(128, (x, y) => {
    const distanciaDaBorda = Math.min(x, 127 - x);
    const junta = y % 32;
    const grao = 0.88 + r() * 0.16 + 0.07 * Math.sin((x - y) * 0.29);
    if (distanciaDaBorda < 2 || junta < 2) return mult([43, 38, 45], grao);
    if (distanciaDaBorda === 5 || distanciaDaBorda === 11) return mult([157, 115, 76], grao);
    if (distanciaDaBorda > 5 && distanciaDaBorda < 11) {
      const losango = Math.abs(junta % 16 - 8) + Math.abs(distanciaDaBorda - 8);
      return mult(losango <= 3 ? [179, 145, 101] : [64, 52, 63], grao);
    }
    const bisel = junta < 4 ? 1.12 : junta > 29 ? 0.8 : 1;
    return mult([121, 116, 122], grao * bisel);
  }));
  tex.wrapS = THREE.ClampToEdgeWrapping;
  return tex;
}

function mosaicoDasAlas() {
  const r = criarSorteio(529);
  const tex = prepararPiso(pintarTextura(128, (x, y) => {
    const eixo = Math.abs(x - 63.5);
    const distanciaDaBorda = Math.min(x, 127 - x);
    const losango = eixo + Math.abs(y - 63.5);
    const grao = 0.86 + 0.22 * r() + 0.09 * Math.sin(x * 0.38 - y * 0.43);
    if (distanciaDaBorda < 2 || y < 2 || y > 125) return mult([35, 32, 36], grao);
    if (distanciaDaBorda === 7 || distanciaDaBorda === 12 || Math.abs(losango - 34) < 2) {
      return mult([157, 137, 113], grao);
    }
    if (losango < 12) return mult([155, 144, 138], grao);
    if (losango < 31) return mult([111, 104, 101], grao);
    const junta = (x + (Math.floor(y / 32) % 2) * 16) % 32;
    if (y % 32 < 2 || junta < 2) return mult([55, 49, 54], grao);
    return mult([100, 92, 90], grao * (y % 32 < 4 || junta < 4 ? 1.14 : 1));
  }));
  tex.wrapS = THREE.ClampToEdgeWrapping;
  return tex;
}

function estandarteDoVeu() {
  const r = criarSorteio(530);
  const tex = prepararPiso(pintarTextura(128, (x, y) => {
    const lado = Math.abs(x - 63.5);
    const altura = Math.abs(y - 52);
    const losango = lado * 0.83 + altura;
    const anel = Math.hypot(lado, altura * 1.13);
    const trama = 0.8 + r() * 0.23 + 0.06 * ((x + y) % 2);
    const desfiado = y > 116 ? 0.76 + r() * 0.21 : 1;
    if (Math.abs(anel - 21) < 1.7 || Math.abs(losango - 11) < 1.8 || lado > 54 && lado < 58) {
      return mult([171, 152, 118], trama * desfiado);
    }
    const fio = 0.91 + Math.sin(x * 0.31) * 0.09;
    return mult([77, 70, 68], trama * fio * desfiado);
  }));
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function pedraDasQuinas() {
  const r = criarSorteio(531);
  return prepararPiso(pintarTextura(64, (x, y) => {
    const poro = r();
    const veio = 0.07 * Math.sin(x * Math.PI / 8 + 0.8 * Math.sin(y * Math.PI / 16));
    return mult([137, 129, 116], 0.91 + poro * 0.17 + veio - (poro < 0.052 ? 0.2 : 0));
  }));
}

function bronzeDoSino() {
  const r = criarSorteio(532);
  return prepararPiso(pintarTextura(128, (x, y) => {
    const angulo = x * Math.PI / 64;
    const manchas = Math.sin(7 * angulo + y * 0.17) * Math.cos(3 * angulo - y * 0.23);
    const escorrido = Math.sin(19 * angulo + 0.48 * Math.sin(y * 0.09)) * 0.09;
    const poro = r();
    const grao = 0.91 + 0.17 * poro + escorrido;
    const patina = THREE.MathUtils.smoothstep(manchas + poro * 0.21 + escorrido, 0.34, 0.91);
    const fundicao = y % 21 < 2 ? [146, 106, 64] : [129, 95, 62];
    const oxidado = [79, 103, 84];
    return fundicao.map((canal, i) => THREE.MathUtils.lerp(canal, oxidado[i], patina) * grao);
  }));
}

function ceramicaDaCripta() {
  const r = criarSorteio(533);
  return prepararPiso(pintarTextura(128, (x, y) => {
    const poro = r();
    const veio = 0.054 * Math.cos(x * Math.PI / 16 - y * 0.39);
    const grao = 0.92 + poro * 0.21 + veio - (poro < 0.033 ? 0.24 : 0);
    const losango = Math.abs(x % 16 - 7.5) + Math.abs(y - 51);
    if (y === 39 || y === 63 || Math.abs(losango - 6.5) < 1.5) return mult([183, 151, 125], grao);
    if ((y > 40 && y < 63) || y === 23 || y === 85) return mult([101, 77, 65], grao);
    return mult([144, 119, 103], grao * (y > 96 ? 0.87 : 1));
  }));
}

function mosaicoDoAltar() {
  const r = criarSorteio(534);
  return prepararPiso(pintarTextura(128, (x, y) => {
    const u = x - 63.5, v = y - 63.5;
    const raio = Math.hypot(u, v);
    const angulo = Math.atan2(v, u);
    const junta = x % 8 === 0 || y % 8 === 0;
    const filete = Math.abs(raio - 46) < 1.4 || Math.abs(raio - 39) < 1.35;
    const flor = raio < 35 && raio > 12 && Math.abs(raio - 25 - 9 * Math.cos(angulo * 8)) < 2.35;
    const canto = Math.max(Math.abs(u), Math.abs(v));
    const base = canto > 57 && canto < 60 || filete || flor || raio < 7
      ? [167, 140, 101] : raio < 46 ? [89, 103, 123] : [68, 73, 86];
    return mult(base, (junta ? 0.68 : 0.92) + r() * 0.19);
  }));
}

function tecidoDoAltar() {
  const r = criarSorteio(535);
  return prepararPiso(pintarTextura(128, (x, y) => {
    const raio = Math.hypot((x - 63.5) * 3.4, y - 60);
    const borda = Math.min(x * 3.4, (127 - x) * 3.4, y, 127 - y);
    const cruz = (Math.abs(x - 63.5) < 1 || Math.abs(y - 60) < 1.5) && raio < 20;
    const dourado = Math.abs(raio - 32) < 2 || Math.abs(raio - 24) < 1.3 || cruz || (borda > 5 && borda < 8);
    const trama = 0.85 + r() * 0.19 + (y % 2) * 0.05 + Math.cos(x * 0.36) * 0.07;
    return mult(dourado ? [180, 146, 102] : [105, 47, 58], trama);
  }));
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

function sombra() {
  return pintarTextura(32, (x, y) => {
    const d = Math.min(1, Math.hypot(x - 15.5, y - 15.5) / 15.5);
    const f = (1 - d * d) ** 2 * 255;
    return [f, f, f];
  });
}

function feixe() {
  return pintarTextura(64, (x, y) => {
    const lateral = Math.sin(Math.PI * x / 63) ** 2;
    const longitudinal = Math.sin(Math.PI * y / 63) ** 0.65;
    const f = 255 * lateral * longitudinal;
    return [f, f, f];
  });
}

function riacho() {
  return prepararPiso(pintarTextura(128, (x, y) => {
    const u = x * Math.PI / 64, v = y * Math.PI / 64;
    const crista = (0.5 + 0.5 * Math.sin(v * 7 + Math.sin(u * 2 + v) + 0.4 * Math.sin(u * 5))) ** 9;
    const fiapo = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(u * 3 - v)) ** 3;
    const onda = 0.08 * Math.sin(v * 4 - u) + 0.85 * crista * fiapo;
    return [18 + 39 * onda, 34 + 55 * onda, 63 + 69 * onda];
  }));
}

// ---- Filtro das texturas (PS1 = pixelado, HD = suavizado) ----
// Cada textura registrada guarda o filtro original (o do PS1). No HD ela passa a
// suavizar; ao voltar para o PS1, recebe de novo o filtro original.
const registradas = new Set();
let filtroAtual = 'nearest';

function aplicarFiltro(tex) {
  const original = tex.userData.filtroPs1;
  const linear = filtroAtual === 'linear';
  const mag = linear ? THREE.LinearFilter : original.mag;
  const min = !linear ? original.min
    : tex.generateMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  if (tex.magFilter === mag && tex.minFilter === min) return;
  tex.magFilter = mag;
  tex.minFilter = min;
  tex.needsUpdate = true;
}

/** Registra uma textura já pronta para seguir o filtro do estilo de imagem. */
export function registrarTextura(tex) {
  // Uma cópia (clone) já traz o filtro original da textura de onde saiu.
  tex.userData.filtroPs1 ??= { mag: tex.magFilter, min: tex.minFilter };
  registradas.add(tex);
  aplicarFiltro(tex);
  return tex;
}

/** Troca o filtro de todas as texturas registradas: 'nearest' (PS1) ou 'linear' (HD). */
export function definirFiltroTexturas(filtro) {
  filtroAtual = filtro === 'linear' ? 'linear' : 'nearest';
  for (const tex of registradas) aplicarFiltro(tex);
}

let cache = null;
/** Devolve todas as texturas do jogo (criadas uma vez só). */
export function texturas() {
  if (!cache) {
    cache = {
      pedra: pedra(), calcamento: prepararPiso(calcamento()), lajes: prepararPiso(lajes()),
      mosaico: prepararPiso(mosaico()), tapete: prepararPiso(tapete()), telhado: telhado(), madeira: madeira(),
      terra: prepararPiso(terra()), metal: metal(), tecido: tecido(), trama: trama(),
      janelaAcesa: janela(true), janelaApagada: janela(false), vitral: vitral(),
      vitralVeuAzul: vitralDoVeu(false), vitralVeuAmbar: vitralDoVeu(true),
      cantariaVeu: cantariaDoVeu(), lajesNave: lajesDaNave(), corredorVeu: corredorDoVeu(),
      mosaicoAlas: mosaicoDasAlas(), estandarteVeu: estandarteDoVeu(), quinaGaleria: pedraDasQuinas(),
      bronzeSino: bronzeDoSino(), ceramicaCripta: ceramicaDaCripta(),
      mosaicoAltar: mosaicoDoAltar(), tecidoAltar: tecidoDoAltar(),
      brilho: brilho(), nevoa: nevoa(), sombra: sombra(), riacho: riacho(), feixe: feixe(),
    };
    cache.assoalho = prepararPiso(cache.madeira.clone());
    for (const n of ['brilho', 'nevoa', 'sombra', 'feixe']) {
      cache[n].wrapS = cache[n].wrapT = THREE.ClampToEdgeWrapping;
      cache[n].magFilter = cache[n].minFilter = THREE.LinearFilter; // manchas suaves
    }
    // alphaMap lê o canal verde como dado linear.
    cache.sombra.colorSpace = THREE.NoColorSpace;
    cache.feixe.colorSpace = THREE.NoColorSpace;
    for (const tex of Object.values(cache)) registrarTextura(tex);
  }
  return cache;
}
