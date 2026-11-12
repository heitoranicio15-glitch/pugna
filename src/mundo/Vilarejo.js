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
import { texturas, criarSorteio } from '../render/texturas.js';
import { materiais, caixa, piramide, casa, torre, igreja, tocha, arvoreSeca, muralha } from './pecas.js';

export class Vilarejo {
  constructor(cena, direcaoLua) {
    this.grupo = new THREE.Group();
    this.colisores = new Colisores();
    this.tochas = [];
    this.nevoas = [];
    cena.add(this.grupo);

    const p = CONFIG.paleta;
    const m = materiais();
    const sorteio = criarSorteio(1234); // mesma semente = vilarejo sempre igual

    // ---------- névoa e luzes gerais ----------
    cena.fog = new THREE.FogExp2(p.nevoa, CONFIG.nevoa.densidade);
    cena.background = new THREE.Color(p.nevoa);
    cena.add(new THREE.HemisphereLight(p.luzAmbiente, 0x1a0f3a, 1.5));
    const lua = new THREE.DirectionalLight(p.luzLua, 1.1);
    lua.position.copy(direcaoLua).multiplyScalar(100);
    cena.add(lua);

    // ---------- chão e ruas ----------
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), m.terra.clone());
    chao.material.map = texturas().terra.clone();
    chao.material.map.repeat.set(230, 230);
    chao.material.onBeforeCompile = m.terra.onBeforeCompile;
    chao.rotation.x = -Math.PI / 2;
    this.grupo.add(chao);
    const rua = (x, z, l, pf) => {
      const r = caixa(l, 0.06, pf, m.calcamento, 1.6);
      r.position.set(x, 0.0, z); this.grupo.add(r);
    };
    rua(0, 5, 6.5, 104);       // rua principal: do portão sul até a igreja
    rua(0, 0, 90, 6.5);        // rua transversal (leste-oeste)
    rua(0, 0, 22, 22);         // praça central
    rua(0, -40, 16, 10);       // adro da igreja

    // ---------- igreja ao fundo (norte) ----------
    igreja(this, { x: 0, z: -61 });

    // ---------- casas ----------
    const casas = [
      // rua principal, trecho sul
      { x: -8.6, z: 43, l: 8, p: 7, a: 5.2, frente: 'L', acesa: true },
      { x: -8.9, z: 32, l: 9, p: 7.5, a: 4.2, frente: 'L' },
      { x: -8.4, z: 21, l: 8, p: 6.5, a: 6, frente: 'L' },
      { x: 8.6, z: 45, l: 7, p: 7, a: 4.4, frente: 'O' },
      { x: 9.1, z: 35, l: 9, p: 8, a: 6.2, frente: 'O', acesa: true },
      { x: 8.5, z: 24, l: 8, p: 6.6, a: 4.8, frente: 'O' },
      // em volta da praça
      { x: -17.5, z: -16.5, l: 9, p: 8, a: 6.4, frente: 'S' },
      { x: 17.5, z: -16.5, l: 9, p: 8, a: 5, frente: 'S', acesa: true },
      { x: -18, z: 16.5, l: 8, p: 7, a: 4.6, frente: 'N' },
      // rua transversal
      { x: -29, z: -8, l: 8, p: 7.5, a: 5, frente: 'S' },
      { x: -39, z: 8, l: 9, p: 7.5, a: 5.6, frente: 'N', acesa: true },
      { x: -28.5, z: 8.4, l: 7, p: 7, a: 4.2, frente: 'N' },
      { x: 28, z: 8, l: 8, p: 7.5, a: 5.8, frente: 'N' },
      { x: 38, z: -8, l: 9, p: 7.5, a: 4.6, frente: 'S' },
      { x: 28.5, z: -8.2, l: 7, p: 7, a: 5.2, frente: 'S' },
      // rua principal, trecho norte
      { x: -8.6, z: -27, l: 8, p: 6.5, a: 5.4, frente: 'L' },
      { x: 8.6, z: -28, l: 8, p: 6.5, a: 6.6, frente: 'O' },
    ];
    for (const c of casas) casa(this, { ...c, sorteio });

    // ---------- torres ----------
    torre(this, { x: -21, z: 31, lado: 5.5, a: 15, tipo: 'ameias' });
    torre(this, { x: 23, z: -31, lado: 5, a: 19, tipo: 'ponta' });
    torre(this, { x: 39, z: 21, lado: 4.5, a: 12, tipo: 'ponta' });

    // ---------- muralha em volta (impede sair do mapa) ----------
    const LX = 48, ZN = -76, ZS = 57;
    muralha(this, -LX, ZN, LX, ZN, 6);
    muralha(this, -LX, ZN, -LX, ZS, 6);
    muralha(this, LX, ZN, LX, ZS, 6);
    muralha(this, -LX, ZS, -6, ZS, 6);
    muralha(this, 6, ZS, LX, ZS, 6);
    for (const [tx, tz] of [[-LX, ZN], [LX, ZN], [-LX, ZS], [LX, ZS]]) torre(this, { x: tx, z: tz, lado: 5, a: 10, tipo: 'ameias' });
    // portão sul (fechado, atrás do jogador)
    torre(this, { x: -6.2, z: ZS, lado: 4.4, a: 11, tipo: 'ameias' });
    torre(this, { x: 6.2, z: ZS, lado: 4.4, a: 11, tipo: 'ameias' });
    const arco = caixa(8, 3, 2, m.pedraEscura); arco.position.set(0, 6.5, ZS); this.grupo.add(arco);
    const portao = caixa(8, 5, 0.4, m.madeira, 1.6); portao.position.set(0, 2.5, ZS); this.grupo.add(portao);
    this.colisores.adicionar(0, ZS, 8, 1.5);

    // ---------- poço da praça ----------
    const poco = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.9, 8), m.pedraEscura);
    poco.position.set(0, 0.45, 0); this.grupo.add(poco);
    const agua = new THREE.Mesh(new THREE.CircleGeometry(1.05, 8), new THREE.MeshBasicMaterial({ color: 0x06142e }));
    agua.rotation.x = -Math.PI / 2; agua.position.y = 0.8; this.grupo.add(agua);
    for (const lado of [-1, 1]) {
      const haste = caixa(0.16, 2.6, 0.16, m.madeira, 1); haste.position.set(lado * 1.2, 1.3, 0); this.grupo.add(haste);
    }
    const cobertura = piramide(3.2, 1.2, m.telhado); cobertura.position.y = 3.1; this.grupo.add(cobertura);
    this.colisores.adicionar(0, 0, 2.5, 2.5, 0.9);

    // ---------- tochas (as luzes laranja) ----------
    const tochas = [
      [3.7, 48], [3.7, 38], [-3.7, 27], [3.7, 15],
      [-10.5, -10.5], [10.5, 10.5], [10.5, -10.5], [-10.5, 10.5],
      [-24, 3.7], [33, -3.7], [-3.7, -20],
      [-4.4, -43], [4.4, -43],
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
      this.colisores.adicionar(x, z, l, pf, 1.1);
    };
    cerca(19.5, -44, 17, 0.14);
    cerca(28, -54, 0.14, 20);

    // ---------- caixotes e barris (dá para pular em cima) ----------
    for (const [x, z, t] of [[4.6, 30, 1], [5.2, 31.2, 0.8], [-12.6, 8, 1], [11.5, -3.5, 0.9], [-21, -3.8, 1], [20, 4.2, 1.1], [-5, -36, 1]]) {
      const cx = caixa(t, t, t, m.madeira, 1); cx.position.set(x, t / 2, z); cx.rotation.y = sorteio() * 0.2;
      this.grupo.add(cx); this.colisores.adicionar(x, z, t, t, t);
    }

    // ---------- árvores secas ----------
    for (const [x, z] of [[-14, 51], [15, 53], [-30, 22], [-40, -22], [-33, -34], [-22, -46], [-14, -56], [36, 38], [28, 46], [-36, 44], [40, -40], [16, -70], [-30, -66], [24, 16], [-20, 6.5]]) {
      arvoreSeca(this, { x, z, altura: 5 + sorteio() * 4, sorteio });
    }

    // ---------- morros e árvores fora da muralha (só paisagem) ----------
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + sorteio() * 0.2, dist = 105 + sorteio() * 70;
      const alt = 14 + sorteio() * 30, raio = 30 + sorteio() * 35;
      const morro = new THREE.Mesh(new THREE.ConeGeometry(raio, alt, 6, 1), m.morro);
      morro.position.set(Math.cos(ang) * dist, alt / 2 - 2, Math.sin(ang) * dist - 10);
      morro.rotation.y = sorteio() * 3;
      this.grupo.add(morro);
    }
    for (let i = 0; i < 24; i++) {
      const ang = sorteio() * Math.PI * 2, dist = 62 + sorteio() * 30;
      const x = Math.cos(ang) * dist * 0.9, z = Math.sin(ang) * dist * 1.15 - 10;
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
    const matNevoa = new THREE.SpriteMaterial({
      map: texturas().nevoa, color: 0x5a7fe0, transparent: true, opacity: 0.16, depthWrite: false,
    });
    for (let i = 0; i < 46; i++) {
      const s = new THREE.Sprite(matNevoa);
      const esc = 9 + sorteio() * 12;
      s.scale.set(esc * 1.8, esc * 0.5, 1);
      s.position.set((sorteio() - 0.5) * 110, 0.7 + sorteio() * 1.6, -80 + sorteio() * 140);
      this.grupo.add(s);
      this.nevoas.push({ sprite: s, vel: 0.25 + sorteio() * 0.5 });
    }

    // ---------- pontos de descanso (lanternas) ----------
    this.pontosDeDescanso = [
      { id: 'portao-sul', x: -2.7, z: 49, olhar: Math.PI }, // olhar: direção ao renascer
      { id: 'adro-da-igreja', x: 6.2, z: -37, olhar: Math.PI },
    ];
    this.nascimento = { x: 0, z: 53.5 };

    // ---------- inimigos: tipo + rota de patrulha (lista de pontos x, z) ----------
    this.inimigos = [
      { tipo: 'cavaleiro', rota: [[4, 8], [-5, 7], [-6, -7], [5, -6]] },
      { tipo: 'cacador', rota: [[14, 0.5], [40, -0.5]] },
      { tipo: 'cacador', rota: [[-14, -0.5], [-42, 0.5]] },
      { tipo: 'cavaleiro', rota: [[-4, -38], [4, -38]] },
      { tipo: 'cacador', rota: [[12, -38], [30, -40], [22, -66]] },
    ];
  }

  atualizar(dt, tempo) {
    // Tochas tremulando.
    for (const t of this.tochas) {
      const f = 0.82 + 0.12 * Math.sin(tempo * 11 + t.fase) + 0.1 * Math.sin(tempo * 23.7 + t.fase * 1.7);
      if (t.luz) t.luz.intensity = t.base * f;
      t.chama.scale.set(1, 0.8 + f * 0.4, 1);
      t.chama.rotation.y = tempo * 6 + t.fase;
      t.halo.scale.setScalar(1.5 + f * 0.5);
    }
    // Névoa deslizando com o vento.
    for (const n of this.nevoas) {
      n.sprite.position.x += n.vel * dt;
      if (n.sprite.position.x > 58) n.sprite.position.x = -58;
    }
  }
}
