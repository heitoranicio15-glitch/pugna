// =============================================================================
//  A FLORESTA
//  Clareira e trilha de 40 x 90 m ao sul da estrada. O NORTE é o lado -Z: o caçador entra
//  pela ponta norte (vindo da estrada) e anda para o sul (+Z). Árvores secas e altas dos
//  dois lados, troncos caídos e rochas no meio, vagalumes fracos, névoa verde-azulada
//  densa e a lua por cima. Três patrulhas longe da chegada. A trilha acaba numa barricada
//  de troncos (o Castelo vem depois, veja docs/specs/05-mapa-e-progressao.md).
//
//  Os limites NÃO prendem o jogador sozinhos: as paredes invisíveis dos quatro lados são
//  colisores. Valores (tamanhos, posições, névoa, som) em CONFIG.areas.floresta.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Colisores } from './Colisores.js';
import { criarSorteio, texturas } from '../render/texturas.js';
import { retro } from '../render/retro.js';
import { placa } from './Aderecos.js';
import { materiais, caixa, arvoreSeca, planoDeChao } from './pecas.js';
import { sombrasDeContato } from './efeitosCenario.js';
import { montarAtmosfera } from './Atmosfera.js';
import { decorar } from './Decoracao.js';

const C = CONFIG.areas.floresta;

/** Onde corre o eixo da trilha na altura z (o chão desenha em degraus; aqui é o mesmo degrau). */
export function xDaTrilha(z) {
  for (const [z0, z1, x] of C.caminho) if (z >= z0 && z <= z1) return x;
  return 0;
}

/** Distância de um ponto a um segmento (para manter árvores longe das patrulhas). */
function distanciaAoSegmento(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

export class Floresta {
  constructor(cena, direcaoLua) {
    this.id = 'floresta';
    this.nome = 'Floresta Seca';
    this.usaCeu = true; // céu e lua visíveis por entre as copas
    this.limites = { ...C.limites };
    this.grupo = new THREE.Group();
    this.colisores = new Colisores();
    this.objetos = [];
    cena.add(this.grupo);

    const m = materiais();
    const sorteio = criarSorteio(8642); // mesma semente = floresta sempre igual
    const { minX, maxX, minZ, maxZ } = this.limites;
    const meioX = (minX + maxX) / 2, meioZ = (minZ + maxZ) / 2;
    const zN = C.portaNorte.z, zS = C.barricadaSul.z;

    // ---------- névoa e luzes gerais ----------
    montarAtmosfera(this, C, direcaoLua);

    // ---------- pontos e rotas (decididos antes, para as árvores saberem o que evitar) ----------
    this.portais = [
      { x: 0, z: zN, raio: 2.2, destino: 'estrada', texto: 'E — voltar à estrada' },
    ];
    this.chegadas = {
      estrada: { x: 0, z: zN + 3.9, yaw: Math.PI },   // olhando para o sul, para dentro da floresta
    };
    this.pontosDeDescanso = [
      { id: 'floresta-clareira', nome: 'Clareira da Floresta', x: C.lanterna.x, z: C.lanterna.z, olhar: 0 },
    ];
    this.inimigos = [
      { tipo: 'cacador', rota: [[3.5, -14], [-3.5, -6]] },
      { tipo: 'cavaleiro', rota: [[-3, 8], [4, 17]] },
      { tipo: 'penitente', rota: [[-3, 30], [3, 36]] },
    ];
    const pontosLivres = [
      [0, zN, 4.5], [this.chegadas.estrada.x, this.chegadas.estrada.z, 4], [C.lanterna.x, C.lanterna.z, 4.5],
      [C.lanterna.x, C.lanterna.z - 1.2, 3], [3.8, zN + 1.2, 2], [3, zS - 2.4, 3],
    ];
    const rotas = this.inimigos.map((i) => i.rota);
    // Obstáculos: [x, z, raio de folga] ocupados por tronco caído ou rocha (as árvores desviam).
    const ocupados = [];

    // ---------- chão: terra escura, trilha em degraus e sulcos ----------
    // Chão e trilha não gravam profundidade e têm ordem fixa (veja o comentário em Vilarejo.js).
    planoDeChao(this, { x: meioX, z: meioZ, l: 420, p: 420, ladrilho: 7, material: m.terraChao, ordem: -6 });
    for (const [z0, z1, x] of C.caminho) {
      planoDeChao(this, { x, z: (z0 + z1) / 2, l: C.larguraDoCaminho, p: z1 - z0 + 1.5, ladrilho: 5, material: m.caminhoChao, ordem: -5 });
    }

    // ---------- paredes invisíveis (os limites não prendem sozinhos) ----------
    this.colisores.adicionar(minX + 0.3, meioZ, 0.8, maxZ - minZ + 2);
    this.colisores.adicionar(maxX - 0.3, meioZ, 0.8, maxZ - minZ + 2);
    this.colisores.adicionar(meioX, minZ + 0.4, maxX - minX + 2, 0.8);
    this.colisores.adicionar(meioX, maxZ - 0.4, maxX - minX + 2, 0.8);

    // ---------- boca da trilha (ponta norte): duas árvores grandes, um vão escuro e a placa ----------
    for (const lado of [-1, 1]) arvoreSeca(this, { x: lado * 5.4, z: zN - 1.3, altura: 11.5, sorteio });
    const vao = new THREE.Mesh(new THREE.BoxGeometry(10.6, 5.5, 0.4), retro(new THREE.MeshBasicMaterial({ color: 0x03090a })));
    vao.position.set(0, 2.75, minZ + 1.1); this.grupo.add(vao);
    const posteN = caixa(0.16, 1.7, 0.16, m.madeira, 1); posteN.position.set(3.8, 0.85, zN + 1.2); this.grupo.add(posteN);
    this.colisores.adicionar(3.8, zN + 1.2, 0.3, 0.3);
    placa(this.grupo, 'Estrada do Sul', 3.8, 1.55, zN + 1.2 + 0.1, 1.6, 0);

    // ---------- barricada de troncos (ponta sul): a trilha acaba aqui ----------
    for (const [y, rot] of [[0.55, 0.02], [1.45, -0.03], [2.3, 0.025]]) {
      for (const [x0, x1] of [[minX, -3], [-3, 5], [5, maxX]]) {
        const c = x1 - x0 + 0.8;
        const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, c, 6), m.tronco);
        tronco.rotation.z = Math.PI / 2 + rot;
        tronco.position.set((x0 + x1) / 2, y, zS + (sorteio() - 0.5) * 0.5);
        this.grupo.add(tronco);
      }
    }
    this.colisores.adicionar(meioX, zS, maxX - minX, 2.4);
    decorar(this.grupo, [
      ['Willow_Dead_3', -11, 0, zS + 3.2, 0.4, 1.1], ['Willow_Dead_3', 10, 0, zS + 3.4, -0.7, 1.2],
      ['Rock_Moss_2', -6, 0, zS - 1.7, 0.3], ['Plant_3', 7, 0, zS - 1.5, 1.2], ['Grass_2', -2.4, 0, zS - 1.6, 0.5, 1.3],
    ]);
    const posteS = caixa(0.16, 1.7, 0.16, m.madeira, 1); posteS.position.set(3, 0.85, zS - 2.4); this.grupo.add(posteS);
    this.colisores.adicionar(3, zS - 2.4, 0.3, 0.3);
    placa(this.grupo, 'Trilha interrompida', 3, 1.55, zS - 2.4 - 0.1, 1.7, Math.PI);

    // ---------- troncos caídos (colisores baixos: dá para pular em cima) ----------
    const toras = [   // [x, z, comprimento, eixo] (eixo 'x' = deitado ao longo de X)
      [-8, -24, 4.6, 'x'], [8, -10, 5, 'z'], [-9, 14, 4.2, 'x'], [9, 26, 4.6, 'z'], [-10, -1, 3.6, 'z'],
    ];
    const sombras = [];
    for (const [x, z, comp, eixo] of toras) {
      const tora = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, comp, 6), m.tronco);
      tora.rotation.set(eixo === 'z' ? Math.PI / 2 : 0, 0, eixo === 'x' ? Math.PI / 2 : 0);
      tora.position.set(x, 0.38, z);
      this.grupo.add(tora);
      const [l, p] = eixo === 'x' ? [comp, 0.8] : [0.8, comp];
      this.colisores.adicionar(x, z, l, p, 0.7);
      ocupados.push([x, z, comp / 2 + 1.2]);
      sombras.push([x, z, l + 0.8, p + 0.8]);
    }
    sombrasDeContato(this.grupo, sombras);
    decorar(this.grupo, [['WoodLog_Moss', 11.5, 0, -19, 0.4], ['WoodLog_Moss', -12.5, 0, 22, 1.3]]);

    // ---------- rochas (colisores baixos, dão cobertura e dá para subir pulando) ----------
    const rochas = [   // [modelo, x, z, escala]; tamanhos do acervo em Decoracao.js (sem giro)
      ['Rock_Moss_2', 11, -28, 1.3, [1.9, 1.2]], ['Rock_Moss_4', -11, -18, 1.4, [1.2, 0.95]],
      ['Rock_Moss_2', -12, 4, 1.2, [1.9, 1.2]], ['Rock_Moss_4', 12, 12, 1.5, [1.2, 0.95]],
      ['Rock_Moss_2', 11, 33, 1.3, [1.9, 1.2]], ['Rock_Moss_4', -10, 31, 1.4, [1.2, 0.95]],
    ];
    for (const [id, x, z, esc, [l, p]] of rochas) {
      decorar(this.grupo, [[id, x, 0, z, 0, esc]]);
      this.colisores.adicionar(x, z, l * esc * 0.85, p * esc * 0.85, 0.7);
      ocupados.push([x, z, Math.max(l, p) * esc * 0.5 + 1.2]);
    }
    decorar(this.grupo, [
      ['Plant_3', -3.1, 0, -37.6, 0.4], ['Grass_2', 4.2, 0, -36.2, 1.1, 1.3], ['Plant_3', 6.8, 0, -4, 2, 1.2],
      ['Grass_2', -6.5, 0, 9, 0.7, 1.2], ['Plant_3', 7.5, 0, 19, 0.2], ['Grass_2', -5.6, 0, 27.5, 1.9, 1.3],
    ]);

    // ---------- árvores secas e altas ----------
    // Nas bordas formam uma parede; no meio ficam afastadas da trilha, dos obstáculos, das patrulhas
    // e dos pontos de chegada, para sempre sobrar caminho.
    const livre = (x, z, folga) => {
      if (Math.abs(x - xDaTrilha(z)) < C.larguraDoCaminho / 2 + folga) return false;
      for (const [px, pz, r] of pontosLivres) if (Math.hypot(x - px, z - pz) < r + folga) return false;
      for (const [px, pz, r] of ocupados) if (Math.hypot(x - px, z - pz) < r + folga) return false;
      for (const rota of rotas) if (distanciaAoSegmento(x, z, rota[0], rota[1]) < 3 + folga) return false;
      return true;
    };
    const plantadas = [];
    const plantar = (x, z, altura) => {
      plantadas.push([x, z]);
      arvoreSeca(this, { x, z, altura, sorteio });
    };
    for (const lado of [-1, 1]) {
      for (let z = minZ + 6; z < zS - 3; z += 6.5) {
        const x = lado * (maxX - 2.4 - sorteio() * 2.4), zz = z + (sorteio() - 0.5) * 3;
        if (livre(x, zz, 0)) plantar(x, zz, 8.5 + sorteio() * 3.5);
      }
    }
    for (let tentativa = 0; tentativa < 140 && plantadas.length < 40; tentativa++) {
      const lado = tentativa % 2 ? 1 : -1;
      const x = lado * (6.5 + sorteio() * 8), z = minZ + 7 + sorteio() * (zS - minZ - 11);
      if (!livre(x, z, 1.5) || plantadas.some(([px, pz]) => Math.hypot(x - px, z - pz) < 4.2)) continue;
      plantar(x, z, 7 + sorteio() * 4.5);
    }
    this.arvores = plantadas.length;
    for (let i = 0; i < 28; i++) {   // fora das paredes: só paisagem
      const lado = i % 2 ? 1 : -1;
      const x = lado * (maxX + 3 + sorteio() * 26), z = minZ - 6 + sorteio() * (maxZ - minZ + 12);
      arvoreSeca(this, { x, z, altura: 8 + sorteio() * 6, sorteio, colide: false });
    }

    // ---------- morros em volta (só paisagem) ----------
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + sorteio() * 0.2, dist = 85 + sorteio() * 60;
      const alt = 14 + sorteio() * 28, raio = 26 + sorteio() * 26;
      const morro = new THREE.Mesh(new THREE.ConeGeometry(raio, alt, 6, 1), m.morro);
      morro.position.set(meioX + Math.cos(ang) * dist * 0.9, alt / 2 - 2, meioZ + Math.sin(ang) * dist * 1.2);
      morro.rotation.y = sorteio() * 3;
      this.grupo.add(morro);
    }

    // ---------- bancos de névoa rasteira ----------
    const bruma = C.bruma;
    const matNevoa = new THREE.SpriteMaterial({
      map: texturas().nevoa, color: bruma.cor, transparent: true, opacity: bruma.opacidade, depthWrite: false,
    });
    this.nevoas = [];
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Sprite(matNevoa);
      const esc = 8 + sorteio() * 10;
      s.scale.set(esc * 1.8, esc * 0.5, 1);
      s.position.set(minX + sorteio() * (maxX - minX), bruma.altura + sorteio() * bruma.variacao, minZ + sorteio() * (maxZ - minZ));
      this.grupo.add(s);
      this.nevoas.push({ sprite: s, vel: (0.2 + sorteio() * 0.4) * bruma.velocidade });
    }

    // ---------- vagalumes: uma única malha de pontos que vagueia devagar ----------
    const n = C.vagalumes.quantidade;
    this.vagalumes = Array.from({ length: n }, () => ({
      x: minX + 3 + sorteio() * (maxX - minX - 6), y: 0.7 + sorteio() * 1.9, z: minZ + 4 + sorteio() * (maxZ - minZ - 8),
      fase: sorteio() * 100,
    }));
    const posicao = new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3);
    const cores = new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', posicao);
    geo.setAttribute('color', cores);
    const pontos = new THREE.Points(geo, new THREE.PointsMaterial({
      map: texturas().brilho, size: 0.16, vertexColors: true,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    pontos.name = 'Vagalumes';
    pontos.frustumCulled = false;
    this.grupo.add(pontos);
    this.malhaVagalumes = { posicao, cores };
    this.atualizarVagalumes(0);
  }

  atualizarVagalumes(tempo) {
    const { posicao, cores } = this.malhaVagalumes;
    this.vagalumes.forEach((v, i) => {
      const t = tempo + v.fase;
      posicao.setXYZ(i, v.x + Math.sin(t * 0.31) * 1.6, v.y + Math.sin(t * 0.53) * 0.45, v.z + Math.cos(t * 0.27) * 1.6);
      const brilho = Math.max(0, Math.sin(t * 0.9)) ** 3 * 0.8;
      cores.setXYZ(i, brilho * 0.7, brilho, brilho * 0.3);
    });
    posicao.needsUpdate = true;
    cores.needsUpdate = true;
  }

  atualizar(dt, tempo) {
    for (const n of this.nevoas) {
      n.sprite.position.x += n.vel * dt;
      if (n.sprite.position.x > this.limites.maxX + 20) n.sprite.position.x = this.limites.minX - 20;
    }
    this.atualizarVagalumes(tempo);
  }
}
