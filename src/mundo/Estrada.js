// =============================================================================
//  A ESTRADA
//  Faixa comprida e estreita (uns 120 x 30 m) ao sul do vilarejo. O NORTE é o lado -Z.
//  O caçador chega pelo Portão Sul do vilarejo (ponta norte da estrada) e anda para o sul
//  (+Z). No caminho: a taverna (fachada à esquerda), um riacho com ponte de pedra e,
//  na ponta sul, uma carroça tombada que fecha o caminho (as áreas novas entram ali).
//
//  Valores (tamanhos, posições, névoa) em CONFIG.areas.estrada.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Colisores } from './Colisores.js';
import { criarSorteio, texturas } from '../render/texturas.js';
import { retro } from '../render/retro.js';
import { placa } from './Aderecos.js';
import { materiais, caixa, casa, torre, tocha, animarTochas, arvoreSeca, muralha, planoDeChao, barril } from './pecas.js';

const C = CONFIG.areas.estrada;

export class Estrada {
  constructor(cena, direcaoLua) {
    this.id = 'estrada';
    this.nome = 'Estrada do Sul';
    this.luzJogador = C.luzJogador;
    this.usaCeu = true; // céu e lua visíveis
    this.limites = { ...C.limites };
    this.grupo = new THREE.Group();
    this.colisores = new Colisores();
    this.tochas = [];
    this.objetos = [];
    this.fumaca = [];
    cena.add(this.grupo);

    const p = CONFIG.paleta;
    const m = materiais();
    const sorteio = criarSorteio(2468); // mesma semente = estrada sempre igual
    const { minX, maxX, minZ, maxZ } = this.limites;
    const meioX = (minX + maxX) / 2, meioZ = (minZ + maxZ) / 2;

    // ---------- névoa e luzes gerais ----------
    this.nevoa = new THREE.FogExp2(p.nevoa, C.nevoaDensidade);
    this.grupo.add(new THREE.HemisphereLight(p.luzAmbiente, 0x1a0f3a, 1.5));
    const lua = new THREE.DirectionalLight(p.luzLua, 1.1);
    lua.position.copy(direcaoLua).multiplyScalar(100);
    this.grupo.add(lua);

    // ---------- chão: terra, pista de terra batida, sulcos de carroça e riacho ----------
    // Chão e pista não gravam profundidade e têm ordem fixa (veja o comentário em Vilarejo.js).
    planoDeChao(this, { x: meioX, z: meioZ, l: 420, p: 420, ladrilho: 7, material: m.terraChao, ordem: -6 });
    planoDeChao(this, { x: 0, z: meioZ, l: C.larguraDaPista, p: maxZ - minZ - 2, ladrilho: 5, material: m.caminhoChao, ordem: -5 });
    for (const x of [-1.5, 1.5]) {
      planoDeChao(this, { x, z: meioZ, l: 0.55, p: maxZ - minZ - 4, ladrilho: 7, material: m.terraChao, ordem: -4.9, y: 0.01 });
    }
    const zPonte = C.ponte.z;
    const agua = new THREE.Mesh(
      new THREE.PlaneGeometry(420, C.ponte.riacho),
      retro(new THREE.MeshBasicMaterial({ color: 0x0a1f4d, depthWrite: false })),
    );
    agua.rotation.x = -Math.PI / 2;
    agua.position.set(meioX, 0.02, zPonte);
    agua.renderOrder = -4;
    this.grupo.add(agua);

    // ---------- Portão Sul do vilarejo, visto de fora (ponta norte) ----------
    const zN = C.portaoNorte.z;
    muralha(this, minX, zN, -6, zN, 6);
    muralha(this, 6, zN, maxX, zN, 6);
    torre(this, { x: -6.2, z: zN, lado: 4.4, a: 11, tipo: 'ameias' });
    torre(this, { x: 6.2, z: zN, lado: 4.4, a: 11, tipo: 'ameias' });
    const arco = caixa(8, 3, 2, m.pedraEscura); arco.position.set(0, 6.5, zN); this.grupo.add(arco);
    const vao = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 0.4), retro(new THREE.MeshBasicMaterial({ color: 0x04050c })));
    vao.position.set(0, 2.5, zN); this.grupo.add(vao);
    this.colisores.adicionar(0, zN, 8, 1.5);

    // ---------- cercas dos dois lados (paredes invisíveis para quem tenta sair) ----------
    const cercaLinha = (x, z0, z1, comPostes = true) => {
      const comp = z1 - z0, meio = (z0 + z1) / 2;
      for (const y of [0.6, 1.15]) {
        const trilho = caixa(0.12, 0.12, comp, m.madeira, 1); trilho.position.set(x, y, meio); this.grupo.add(trilho);
      }
      if (comPostes) {
        for (let z = z0; z <= z1 + 0.01; z += 2.6) {
          const alt = 1.5 + sorteio() * 0.25;
          const poste = caixa(0.2, alt, 0.2, m.madeira, 1); poste.position.set(x, alt / 2, z);
          poste.rotation.z = (sorteio() - 0.5) * 0.08;
          this.grupo.add(poste);
        }
      }
      this.colisores.adicionar(x, meio, 0.5, comp);
    };
    const T = C.taverna;
    const ladoTaverna = [T.z - T.largura / 2, T.z + T.largura / 2];   // a taverna ocupa este trecho do fundo
    cercaLinha(maxX - 0.5, zN + 3, C.carroca.z - 1);
    cercaLinha(minX + 0.5, zN + 3, ladoTaverna[0]);
    cercaLinha(minX + 0.5, ladoTaverna[1], C.carroca.z - 1);

    // ---------- taverna vista de fora ----------
    this.montarTaverna(sorteio);

    // ---------- ponte de pedra sobre o riacho ----------
    const dp = C.ponte.comprimento, lp = C.larguraDaPista + 0.5;
    const tabuleiro = caixa(lp, 0.3, dp, m.pedra, 1.6); tabuleiro.position.set(0, 0.15, zPonte); this.grupo.add(tabuleiro);
    this.colisores.adicionar(0, zPonte, lp, dp, 0.3);
    for (const lado of [-1, 1]) {
      const x = lado * (lp / 2 - 0.25);
      const mureta = caixa(0.5, 1.0, dp, m.pedraEscura, 1.4); mureta.position.set(x, 0.8, zPonte); this.grupo.add(mureta);
      const topo = caixa(0.7, 0.18, dp + 0.3, m.pedra, 1.4); topo.position.set(x, 1.38, zPonte); this.grupo.add(topo);
      this.colisores.adicionar(x, zPonte, 0.5, dp);
      const ponta = caixa(0.9, 1.7, 0.9, m.pedraEscura, 1.4);
      for (const pz of [-1, 1]) { const p2 = ponta.clone(); p2.position.set(x, 0.85, zPonte + pz * (dp / 2)); this.grupo.add(p2); }
    }
    for (const pz of [-1, 1]) {   // degrau de cada ponta (dá para subir andando)
      const degrau = caixa(lp - 0.9, 0.15, 0.9, m.pedra, 1.6);
      const z = zPonte + pz * (dp / 2 + 0.45);
      degrau.position.set(0, 0.075, z); this.grupo.add(degrau);
      this.colisores.adicionar(0, z, lp - 0.9, 0.9, 0.15);
    }
    // As margens do riacho fora da ponte são intransponíveis.
    const bordaL = maxX - (lp / 2), bordaO = (lp / 2) - minX;
    this.colisores.adicionar(lp / 2 + bordaL / 2, zPonte, bordaL, C.ponte.riacho);
    this.colisores.adicionar(-lp / 2 - bordaO / 2, zPonte, bordaO, C.ponte.riacho);

    // ---------- carroça tombada (ponta sul, "em obras") ----------
    const zC = C.carroca.z;
    const carroca = new THREE.Group();
    carroca.position.set(2.2, 0.82, zC - 0.6);
    carroca.rotation.set(0.1, 0.35, 1.28);
    this.grupo.add(carroca);
    const peca = (l, a, pf, x, y, z, mat = m.madeira) => { const c = caixa(l, a, pf, mat, 1); c.position.set(x, y, z); carroca.add(c); return c; };
    peca(1.8, 0.2, 2.9, 0, 0, 0);
    for (const lado of [-1, 1]) peca(0.14, 0.55, 2.9, lado * 0.86, 0.3, 0);
    peca(1.8, 0.55, 0.14, 0, 0.3, 1.38);
    const rodaPresa = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 5, 10), m.metal);
    rodaPresa.rotation.y = Math.PI / 2; rodaPresa.position.set(-1.0, -0.2, 0.3); carroca.add(rodaPresa);
    const rodaSolta = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.08, 5, 10), m.metal);
    rodaSolta.rotation.set(Math.PI / 2 - 0.25, 0, 0.3); rodaSolta.position.set(-4.4, 0.2, zC - 2.4); this.grupo.add(rodaSolta);
    for (const [x, z, t] of [[-1.8, zC - 1.2, 0.9], [-2.7, zC - 0.2, 0.7], [5.4, zC - 1.8, 0.8], [6.3, zC - 0.6, 1]]) {
      const cx = caixa(t, t, t, m.madeira, 1); cx.position.set(x, t / 2, z); cx.rotation.y = sorteio() * 1.2; this.grupo.add(cx);
    }
    for (const [x, z] of [[-6.2, zC - 0.4], [8.2, zC - 0.9]]) {
      const tambor = barril(0.46, 0.95);
      tambor.position.set(x, 0.47, z); tambor.rotation.z = (sorteio() - 0.5) * 0.4; this.grupo.add(tambor);
    }
    // Estacas e tábuas cruzadas: "em obras".
    for (const x of [-9, -3, 3, 8.5]) {
      const estaca = caixa(0.22, 1.7, 0.22, m.madeira, 1); estaca.position.set(x, 0.85, zC - 2.1); this.grupo.add(estaca);
    }
    for (const [y, rot] of [[0.6, 0.04], [1.15, -0.06]]) {
      const tabua = caixa(18.5, 0.22, 0.14, m.madeira, 1.4); tabua.position.set(-0.3, y, zC - 2.12); tabua.rotation.z = rot; this.grupo.add(tabua);
    }
    const poste = caixa(0.16, 1.7, 0.16, m.madeira, 1); poste.position.set(-1.9, 0.85, zC - 3.4); this.grupo.add(poste);
    placa(this.grupo, 'Em obras', -1.9, 1.55, zC - 3.5, 1.6, Math.PI);
    this.colisores.adicionar(poste.position.x, poste.position.z, 0.3, 0.3);
    // Fecha a ponta inteira (a spec 05 abre aqui as áreas novas).
    this.colisores.adicionar(meioX, zC - 0.8, maxX - minX, 3.2);

    // ---------- tochas ----------
    for (const [x, z] of [[3.8, zN + 3.5], [-3.8, -33], [3.8, 0], [3.9, zPonte - 5], [-3.9, zPonte + 5], [3.8, zC - 7]]) tocha(this, { x, z });

    // ---------- árvores secas ----------
    for (const [x, z] of [[8.8, -48], [9.4, -30], [-15.4, -40], [9, -2], [10, 11], [-15, 8], [10.2, 36], [-14.6, 40], [9, 48], [-15, 52]]) {
      arvoreSeca(this, { x, z, altura: 5 + sorteio() * 4, sorteio });
    }
    for (let i = 0; i < 34; i++) {   // fora das cercas: só paisagem
      const lado = i % 2 ? 1 : -1;
      const x = lado > 0 ? maxX + 3 + sorteio() * 28 : minX - 3 - sorteio() * 28;
      const z = minZ + 4 + sorteio() * (maxZ - minZ - 8);
      arvoreSeca(this, { x, z, altura: 6 + sorteio() * 6, sorteio, colide: false });
    }

    // ---------- morros em volta (só paisagem) ----------
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + sorteio() * 0.2, dist = 105 + sorteio() * 70;
      const alt = 16 + sorteio() * 34, raio = 30 + sorteio() * 30;
      const morro = new THREE.Mesh(new THREE.ConeGeometry(raio, alt, 6, 1), m.morro);
      morro.position.set(meioX + Math.cos(ang) * dist * 0.7, alt / 2 - 2, meioZ + Math.sin(ang) * dist * 1.25);
      morro.rotation.y = sorteio() * 3;
      this.grupo.add(morro);
    }

    // ---------- bancos de névoa rasteira ----------
    const matNevoa = new THREE.SpriteMaterial({
      map: texturas().nevoa, color: 0x5a7fe0, transparent: true, opacity: 0.16, depthWrite: false,
    });
    this.nevoas = [];
    for (let i = 0; i < 30; i++) {
      const s = new THREE.Sprite(matNevoa);
      const esc = 9 + sorteio() * 12;
      s.scale.set(esc * 1.8, esc * 0.5, 1);
      s.position.set(minX + sorteio() * (maxX - minX), 0.7 + sorteio() * 1.6, minZ + sorteio() * (maxZ - minZ));
      this.grupo.add(s);
      this.nevoas.push({ sprite: s, vel: 0.25 + sorteio() * 0.5 });
    }

    // ---------- portais, chegadas, lanterna e inimigos ----------
    this.portais = [
      { x: 0, z: zN + 1.4, raio: 2.2, destino: 'vilarejo', texto: 'E — voltar ao vilarejo' },
      { ...this.portaDaTaverna, raio: 1.7, destino: 'taverna', texto: 'E — entrar na taverna' },
    ];
    this.chegadas = {
      vilarejo: { x: 0, z: zN + 4.8, yaw: Math.PI },
      taverna: { x: this.portaDaTaverna.x + 2.1, z: this.portaDaTaverna.z, yaw: -Math.PI / 2 },
    };
    this.pontosDeDescanso = [
      { id: 'taverna-da-estrada', nome: 'Taverna da Estrada', x: C.lanterna.x, z: C.lanterna.z, olhar: Math.PI / 2 },
    ];
    this.inimigos = [
      { tipo: 'cacador', rota: [[2, -40], [-2, -28]] },
      { tipo: 'cavaleiro', rota: [[-1, 4], [3, 14]] },
      { tipo: 'cacador', rota: [[2, 34], [-2, 46]] },
    ];
  }

  /** Fachada da taverna: casa grande, janelas acesas, placa, chaminé com fumaça e a porta (portal). */
  montarTaverna(sorteio) {
    const m = materiais();
    const T = C.taverna;
    const fachada = casa(this, {
      x: T.x, z: T.z, l: T.largura, p: T.profundidade, a: T.altura, frente: 'L',
      todasAcesas: true, xPorta: 0, chamine: { x: -3.6, z: 0.5 }, sorteio,
    });
    const frente = T.profundidade / 2;   // z local da fachada (a porta fica em x local = 0)
    const add = (o, x, y, z) => { o.position.set(x, y, z); fachada.add(o); return o; };
    // Moldura, alpendre e degrau da porta.
    for (const lado of [-1, 1]) add(caixa(0.22, 2.5, 0.28, m.madeiraEscura, 1), lado * 0.78, 1.25, frente + 0.08);
    add(caixa(1.9, 0.25, 0.3, m.madeiraEscura, 1), 0, 2.55, frente + 0.08);
    const alpendre = add(caixa(2.6, 0.12, 1.3, m.telhado, 1), 0, 2.95, frente + 0.6);
    alpendre.rotation.x = 0.12;
    add(caixa(2.2, 0.2, 0.8, m.pedra, 1), 0, 0.1, frente + 0.5);
    // Placa pendurada num braço, legível pelos dois lados da estrada (lado norte e sul).
    const bx = 3.4, bz = frente + 1.7;
    add(caixa(0.14, 0.14, 1.9, m.madeiraEscura, 1), bx, 3.9, frente + 0.95);
    add(caixa(0.1, 0.8, 2.0, m.madeiraEscura, 1), bx, 3.1, bz);
    for (const cz of [-0.8, 0.8]) add(caixa(0.04, 0.3, 0.04, m.metal, 1), bx, 3.7, bz + cz);
    placa(fachada, 'Taverna', bx + 0.07, 3.1, bz, 1.8, Math.PI / 2);
    placa(fachada, 'Taverna', bx - 0.07, 3.1, bz, 1.8, -Math.PI / 2);
    // Fumaça: poucos sprites subindo da chaminé (posição local de `fachada`).
    const topo = fachada.userData.topoChamine;
    for (let i = 0; i < C.fumaca.particulas; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texturas().nevoa, color: 0x8a86a8, transparent: true, depthWrite: false, opacity: 0,
      }));
      fachada.add(sprite);
      this.fumaca.push({ sprite, base: topo, fase: i / C.fumaca.particulas });
    }
    // Calor das janelas e do alpendre.
    const luz = new THREE.PointLight(0xffa050, 20, 12, 1.7);
    luz.position.set(T.x + frente + 1.4, 2.4, T.z);
    this.grupo.add(luz);
    // Barris e banco ao lado da porta.
    for (const [dx, dz] of [[0.9, 5.4], [1.5, 6.2]]) {
      const tambor = barril(0.44, 0.9);
      tambor.position.set(T.x + frente + dx, 0.45, T.z - dz);
      this.grupo.add(tambor);
      this.colisores.adicionar(tambor.position.x, tambor.position.z, 0.8, 0.8, 0.9);
    }
    const banco = caixa(0.5, 0.5, 2.2, m.madeira, 1);
    banco.position.set(T.x + frente + 0.45, 0.25, T.z - 3.0);
    this.grupo.add(banco);
    this.colisores.adicionar(banco.position.x, banco.position.z, 0.5, 2.2, 0.5);
    this.fachada = fachada;
    // A porta fica em (T.x + frente, T.z). O portal fica 1 m à frente dela.
    this.portaDaTaverna = { x: T.x + frente + 1, z: T.z };
  }

  atualizar(dt, tempo) {
    animarTochas(this.tochas, tempo);
    for (const n of this.nevoas) {
      n.sprite.position.x += n.vel * dt;
      if (n.sprite.position.x > this.limites.maxX + 20) n.sprite.position.x = this.limites.minX - 20;
    }
    const F = C.fumaca;
    for (const f of this.fumaca) {
      const u = (tempo / F.tempo + f.fase) % 1;   // 0 = saindo da chaminé, 1 = sumindo
      f.sprite.position.set(f.base.x + u * 1.2, f.base.y + 0.3 + u * F.subida, f.base.z);
      f.sprite.scale.setScalar(0.8 + u * 2.4);
      f.sprite.material.opacity = 0.4 * (1 - u) * Math.min(1, u * 6);
    }
  }
}
