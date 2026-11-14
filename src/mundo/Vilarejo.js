// =============================================================================
//  O VILAREJO
//  Aqui fica o "mapa": onde está cada casa, rua, torre, tocha, inimigo e lanterna.
//  Orientação: o NORTE é o lado -Z (onde ficam a igreja e a lua).
//  O jogador nasce no portão SUL (+Z) olhando para o norte.
//
//  Para criar outra área no futuro, faça outro arquivo parecido com este que
//  preencha as mesmas listas (colisores, tochas, pontosDeDescanso, inimigos).
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Colisores } from './Colisores.js';
import { montarExploracaoVilarejo } from './ExploracaoVilarejo.js';
import { texturas, criarSorteio } from '../render/texturas.js';
import { materiais, caixa, piramide, casa, torre, igreja, tocha, animarTochas, arvoreSeca, muralha, planoDeChao } from './pecas.js';
import { sombrasDeContato } from './efeitosCenario.js';
import { montarAtmosfera } from './Atmosfera.js';
import { montarBairrosVilarejo } from './BairrosVilarejo.js';
import { modeloPronto } from '../render/modelos.js';

const C = CONFIG.areas.vilarejo;

export class Vilarejo {
  constructor(cena, direcaoLua) {
    this.id = 'vilarejo';
    this.nome = 'Vilarejo';
    this.usaCeu = true; // mostra e atualiza o céu e a lua
    this.limites = { minX: -66, maxX: 66, minZ: -128, maxZ: 56 };
    this.grupo = new THREE.Group();
    this.colisores = new Colisores();
    this.tochas = [];
    this.objetos = [];
    this.nevoas = [];
    cena.add(this.grupo);

    const m = materiais();
    const sorteio = criarSorteio(1234); // mesma semente = vilarejo sempre igual

    // ---------- névoa e luzes gerais ----------
    montarAtmosfera(this, C, direcaoLua);

    // ---------- chão e ruas ----------
    // IMPORTANTE: o chão e as ruas são superfícies enormes e quase coladas. Com a
    // tremida de vértices do filtro PS1, elas "brigavam" e piscavam ao andar. Solução:
    // elas são desenhadas primeiro, em ordem fixa (renderOrder), sem gravar profundidade.
    // Como nada fica abaixo do chão, tudo o mais é desenhado por cima sem conflito.
    planoDeChao(this, { x: 0, z: 0, l: 700, p: 700, ladrilho: 7, material: m.terraChao });
    let ordemRua = -5;
    const rua = (x, z, l, pf) => {
      const geo = new THREE.PlaneGeometry(l, pf);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (x + (uv.getX(i) - 0.5) * l) / 5.8, (-z + (uv.getY(i) - 0.5) * pf) / 5.8);
      }
      const r = new THREE.Mesh(geo, m.calcamentoChao);
      r.rotation.x = -Math.PI / 2;
      r.position.set(x, 0.02, z);
      r.renderOrder = ordemRua; ordemRua += 0.1;
      this.grupo.add(r);
    };
    rua(0, 48.6, 6.5, 16.8);   // trecho entre o Portão Sul e a triagem
    rua(0, 20.5, 6.5, 25);     // da triagem ao poço
    rua(-21.5, 1.2, 42, 5.8);  // rua dos fundos da oficina
    rua(24, 3, 39, 5.2);       // rua do mercado, desencontrada da rua oeste
    rua(2.2, 0.8, 21, 21);     // praça em torno do poço
    rua(0, -23.8, 5.6, 31);
    rua(0, -43, 22, 12);       // adro da igreja

    // ---------- igreja ao fundo (norte) ----------
    this.igreja = igreja(this, { x: 0, z: -72 });
    const porta = this.igreja.porta;
    this.portais = [
      { ...porta, raio: 2.6, destino: 'catedral', texto: 'E — entrar na Catedral do Véu' },
    ];
    this.chegadas = { catedral: { x: porta.x, z: porta.z + 4, yaw: Math.PI } };
    // Portão Sul: leva à estrada. Quem volta da estrada chega logo dentro do portão, olhando para o norte.
    this.portais.push({ x: 0, z: 55.4, raio: 1.6, destino: 'estrada', texto: 'E — sair pelo Portão Sul' });
    this.chegadas.estrada = { x: 0, z: 52.6, yaw: 0 };

    // ---------- casas ----------
    const casas = [
      // rua principal, trecho sul
      { x: -8.6, z: 43, l: 8, p: 7, a: 5.2, frente: 'L', acesa: true },
      { x: -8.2, z: 34.4, l: 11.5, p: 6.4, a: 6.2, frente: 'L' },
      { x: -8.4, z: 21, l: 8, p: 6.5, a: 6, frente: 'L' },
      { x: 8.6, z: 45, l: 7, p: 7, a: 4.4, frente: 'O' },
      { x: 11.55, z: 35, l: 9, p: 8, a: 6.2, frente: 'O', acesa: true },
      { x: 9.2, z: 21, l: 9, p: 7.5, a: 4.8, frente: 'O' },
      // em volta da praça
      { x: -17.5, z: -16.5, l: 9, p: 8, a: 6.4, frente: 'S' },
      { x: 17.5, z: -16.5, l: 9, p: 8, a: 5, frente: 'S', acesa: true },
      { x: -18, z: 16.5, l: 8, p: 7, a: 4.6, frente: 'N' },
      // rua transversal
      { x: -29, z: -8, l: 8, p: 7.5, a: 5, frente: 'S' },
      { x: -39, z: 8, l: 9, p: 7.5, a: 5.6, frente: 'N', acesa: true },
      { x: -28.5, z: 8.4, l: 7, p: 7, a: 4.2, frente: 'N' },
      { x: 27, z: 13.7, l: 9, p: 8.5, a: 6.9, frente: 'O' },
      { x: 38, z: -8, l: 9, p: 7.5, a: 4.6, frente: 'S' },
      { x: 28.5, z: -8.2, l: 7, p: 7, a: 5.2, frente: 'S' },
      // rua principal, trecho norte
      { x: -8.6, z: -27, l: 8, p: 6.5, a: 5.4, frente: 'L' },
      { x: 8.6, z: -28, l: 8, p: 6.5, a: 6.6, frente: 'O' },
    ];
    casas.push(
      { x: -42, z: 34, l: 12, p: 10, a: 6.2, frente: 'L', modelo: 'Stable' },
      { x: -53.5, z: 37, l: 9, p: 7, a: 5, frente: 'N' },
      { x: -55, z: 21, l: 9, p: 8, a: 5.6, frente: 'L', modelo: 'Blacksmith', acesa: true },
      { x: -39, z: 17.5, l: 8, p: 7, a: 5, frente: 'O' },
      { x: -42.4, z: -27, l: 9, p: 7, a: 6, frente: 'L' },
      { x: -54.5, z: -27.4, l: 8, p: 7, a: 4.5, frente: 'L' },
      { x: -51, z: -45, l: 11, p: 9, a: 8.5, frente: 'L', modelo: 'Bell_Tower' },
      { x: -41.4, z: -56.1, l: 10, p: 8, a: 5.5, frente: 'S' },
      { x: -25.5, z: -60, l: 8, p: 7, a: 5, frente: 'S' },
      { x: 48, z: 17, l: 10, p: 8, a: 5.3, frente: 'N', modelo: 'Stable' },
      { x: 56, z: 8, l: 9, p: 8, a: 6.2, frente: 'O', acesa: true },
      { x: 55, z: -9, l: 10, p: 8, a: 5.5, frente: 'O' },
      { x: 55, z: -33.5, l: 10, p: 8, a: 6.7, frente: 'O' },
      { x: 55.5, z: -48, l: 10, p: 8, a: 5.4, frente: 'O' },
      { x: 32.8, z: -111.5, l: 10, p: 9, a: 6.5, frente: 'O' },
      { x: -26, z: -111.5, l: 10, p: 9, a: 6, frente: 'L' },
    );
    const variantes = ['House_1', 'House_3', 'House_2', 'House_4'];
    for (const [i, c] of casas.entries()) casa(this, { ...c, sorteio, modelo: c.modelo ?? variantes[i % variantes.length] });
    sombrasDeContato(this.grupo, casas.map(({ x, z, l = 7, p = 8, frente }) => {
      const deLado = frente === 'L' || frente === 'O';
      return [x, z, (deLado ? p : l) * 1.5, (deLado ? l : p) * 1.5];
    }));

    // ---------- torres ----------
    torre(this, { x: -21, z: 31, lado: 5.5, a: 15, tipo: 'ameias' });
    torre(this, { x: 23, z: -31, lado: 5, a: 19, tipo: 'ponta' });
    torre(this, { x: 39, z: 21, lado: 4.5, a: 12, tipo: 'ponta' });

    // ---------- muralha em volta (impede sair do mapa) ----------
    const LX = 67, ZN = -129, ZS = 57;
    muralha(this, -LX, ZN, LX, ZN, 6);
    muralha(this, -LX, ZN, -LX, ZS, 6);
    muralha(this, LX, ZN, LX, ZS, 6);
    muralha(this, -LX, ZS, -6, ZS, 6);
    muralha(this, 6, ZS, LX, ZS, 6);
    for (const [tx, tz] of [[-LX, ZN], [LX, ZN], [-LX, ZS], [LX, ZS]]) torre(this, { x: tx, z: tz, lado: 5, a: 10, tipo: 'ameias' });
    // portão sul (o portal 'estrada' fica logo em frente, em this.portais)
    torre(this, { x: -6.2, z: ZS, lado: 4.4, a: 11, tipo: 'ameias' });
    torre(this, { x: 6.2, z: ZS, lado: 4.4, a: 11, tipo: 'ameias' });
    const arco = caixa(8, 3, 2, m.pedraEscura); arco.position.set(0, 6.5, ZS); this.grupo.add(arco);
    const portao = caixa(8, 5, 0.4, m.madeira, 1.6); portao.position.set(0, 2.5, ZS); this.grupo.add(portao);
    this.colisores.adicionar(0, ZS, 8, 1.5);

    // ---------- poço da praça ----------
    const poçoOriginal = new THREE.Group();
    this.grupo.add(poçoOriginal);
    const poco = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.9, 8), m.pedraEscura);
    poco.position.set(0, 0.45, 0); poçoOriginal.add(poco);
    const agua = new THREE.Mesh(new THREE.CircleGeometry(1.05, 8), new THREE.MeshBasicMaterial({ color: 0x06142e }));
    agua.rotation.x = -Math.PI / 2; agua.position.y = 0.8; poçoOriginal.add(agua);
    for (const lado of [-1, 1]) {
      const haste = caixa(0.16, 2.6, 0.16, m.madeira, 1); haste.position.set(lado * 1.2, 1.3, 0); poçoOriginal.add(haste);
    }
    const cobertura = piramide(3.2, 1.2, m.telhado); cobertura.position.y = 3.1; poçoOriginal.add(cobertura);
    modeloPronto(this.grupo, 'Well', { tamanho: [2.72, 3.55, 2.72], reserva: [poçoOriginal] });
    this.colisores.adicionar(0, 0, 2.5, 2.5, 0.9);

    // ---------- tochas (as luzes laranja) ----------
    const tochas = [
      [3.7, 48], [3.7, 38], [-3.7, 27], [3.7, 15],
      [-10.5, -10.5], [10.5, 10.5], [10.5, -10.5], [-10.5, 10.5],
      [-24, 3.7], [33, -3.7], [-3.7, -20],
      [-8.2, -42.5], [8.2, -42.5],
    ];
    for (const [x, z] of tochas) tocha(this, { x, z });

    // ---------- cemitério ao lado da igreja ----------
    for (let i = 0; i < 16; i++) {
      const gx = 13 + (i % 4) * 4 + sorteio() * 1.2, gz = -47 - Math.floor(i / 4) * 4.5 + sorteio();
      const lapide = caixa(0.7, 0.8 + sorteio() * 0.5, 0.18, m.pedraEscura, 1);
      lapide.position.set(gx, 0.45, gz);
      lapide.rotation.set((sorteio() - 0.5) * 0.2, (sorteio() - 0.5) * 0.4, (sorteio() - 0.5) * 0.25);
      this.grupo.add(lapide);
      this.colisores.adicionar(gx, gz, 0.7, 0.3, 1.0);
    }
    const cerca = (x, z, l, pf) => {
      const c = caixa(l, 1.1, pf, m.madeira, 0.9); c.position.set(x, 0.55, z); this.grupo.add(c);
      const lateral = pf > l;
      modeloPronto(this.grupo, 'Fence', {
        pos: [x, 0, z], rotacao: lateral ? Math.PI / 2 : 0,
        tamanho: [lateral ? pf : l, 1.1, 0.18], reserva: [c],
      });
      this.colisores.adicionar(x, z, l, pf, 1.1);
    };
    cerca(16, -44, 10, 0.14);
    cerca(25.2, -44, 5.6, 0.14);
    cerca(28, -54, 0.14, 20);
    montarExploracaoVilarejo(this);
    montarBairrosVilarejo(this);

    // ---------- caixotes e barris (dá para pular em cima) ----------
    for (const [x, z, t] of [[4.6, 30, 1], [5.2, 31.2, 0.8], [-12.6, 8, 1], [11.5, -3.5, 0.9], [-21, -3.8, 1], [20, 4.2, 1.1], [-5, -36, 1]]) {
      const cx = caixa(t, t, t, m.madeira, 1); cx.position.set(x, t / 2, z); cx.rotation.y = sorteio() * 0.2;
      this.grupo.add(cx); this.colisores.adicionar(x, z, t, t, t);
      modeloPronto(this.grupo, 'Crate', { pos: [x, 0, z], tamanho: [t, t, t], reserva: [cx] });
    }

    // ---------- árvores secas ----------
    for (const [x, z] of [[-14, 51], [15, 53], [-30, 22], [-40, -22], [-33, -34], [-22, -46], [-14, -56], [36, 38], [28, 46], [-36, 44], [40, -40], [22, -90], [-30, -66], [-24, -88], [38, -84], [24, 16], [-20, 6.5]]) {
      arvoreSeca(this, { x, z, altura: 5 + sorteio() * 4, sorteio });
    }

    // ---------- morros e árvores fora da muralha (só paisagem) ----------
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + sorteio() * 0.2, dist = 150 + sorteio() * 70;
      const alt = 16 + sorteio() * 34, raio = 30 + sorteio() * 30;
      const morro = new THREE.Mesh(new THREE.ConeGeometry(raio, alt, 6, 1), m.morro);
      morro.position.set(Math.cos(ang) * dist, alt / 2 - 2, Math.sin(ang) * dist - 22);
      morro.rotation.y = sorteio() * 3;
      this.grupo.add(morro);
    }
    for (let i = 0; i < 24; i++) {
      const ang = sorteio() * Math.PI * 2, dist = 66 + sorteio() * 30;
      const x = Math.cos(ang) * dist * 0.9, z = Math.sin(ang) * dist * 1.3 - 22;
      if (Math.abs(x) < LX + 3 && z > ZN - 3 && z < ZS + 3) continue;
      arvoreSeca(this, { x, z, altura: 6 + sorteio() * 6, sorteio, colide: false });
    }

    // ---------- castelo distante (silhueta, como nas referências) ----------
    const castelo = new THREE.Group();
    const sil = (l, a, x, ponta) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(l, a, l), m.silhueta); b.position.set(x, a / 2, 0); castelo.add(b);
      if (ponta) { const c = new THREE.Mesh(new THREE.ConeGeometry(l * 0.75, ponta, 4), m.silhueta); c.position.set(x, a + ponta / 2, 0); castelo.add(c); }
    };
    sil(60, 30, 0, 0); sil(12, 70, 0, 45); sil(9, 55, -22, 34); sil(9, 50, 20, 30); sil(7, 40, -38, 26); sil(7, 44, 36, 24);
    castelo.position.set(-190, -6, -300);
    castelo.rotation.y = 0.5;
    this.grupo.add(castelo);

    // ---------- bancos de névoa rasteira ----------
    const bruma = C.bruma;
    const matNevoa = new THREE.SpriteMaterial({
      map: texturas().nevoa, color: bruma.cor, transparent: true, opacity: bruma.opacidade, depthWrite: false,
    });
    for (let i = 0; i < 46; i++) {
      const s = new THREE.Sprite(matNevoa);
      const esc = 9 + sorteio() * 12;
      s.scale.set(esc * 1.8, esc * 0.5, 1);
      s.position.set((sorteio() - 0.5) * 110, bruma.altura + sorteio() * bruma.variacao, -100 + sorteio() * 160);
      this.grupo.add(s);
      this.nevoas.push({ sprite: s, vel: (0.25 + sorteio() * 0.5) * bruma.velocidade });
    }

    // ---------- pontos de descanso (lanternas) ----------
    this.pontosDeDescanso = [
      { id: 'portao-sul', nome: 'Portão Sul', x: -2.7, z: 49, olhar: Math.PI },
      { id: 'adro-da-igreja', nome: 'Adro da Igreja', x: 8.5, z: -36, olhar: Math.PI },
    ];
    this.nascimento = { x: 0, z: 53.5 };

    // ---------- inimigos: tipo + rota de patrulha (lista de pontos x, z) ----------
    this.inimigos = [
      { tipo: 'cavaleiro', rota: [[4, 8], [-5, 7], [-6, -7], [5, -6]] },
      { tipo: 'cacador', rota: [[15.7, 24.6], [16.4, 12.4], [22.7, 5.5], [39, 2.5]] },
      { tipo: 'cacador', rota: [[-14, -0.5], [-42, 0.5]] },
      { tipo: 'cavaleiro', rota: [[-4, -38], [4, -38]] },
      { tipo: 'cacador', rota: [[14, -40], [31, -42], [22, -66]] },
      { tipo: 'cavaleiro', rota: [[-48, 31], [-47, 12], [-44, -4]] },
      { tipo: 'cacador', rota: [[50, 2], [46, -15], [44, -41]] },
      { tipo: 'cavaleiro', rota: [[-29, -102], [-7, -114], [22, -110]] },
    ];
  }

  atualizar(dt, tempo) {
    animarTochas(this.tochas, tempo);
    // Névoa deslizando com o vento.
    for (const n of this.nevoas) {
      n.sprite.position.x += n.vel * dt;
      if (n.sprite.position.x > 58) n.sprite.position.x = -58;
    }
  }
}
