// =============================================================================
//  A TAVERNA (interior)
//  Salão pequeno (12 x 9 m) de madeira escura, com lareira, balcão, três mesas e barris.
//  Sem inimigos: é um lugar de respiro. A porta fica ao sul (+Z); o balcão e o
//  taverneiro ficam ao norte, e a lareira na parede leste.
//
//  O taverneiro é provisório (decidido pela IA): um boneco parado atrás do balcão que
//  fala em rodízio com E. Quando o sistema de NPCs (spec 03) existir, ele troca de lugar.
//  Valores (tamanho, luz, névoa, falas) em CONFIG.areas.taverna.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Colisores } from './Colisores.js';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';
import { materiais, caixa, animarTochas, planoDeChao, barril, arcoOgival } from './pecas.js';
import { fagulhasDaLareira, sombrasDeContato } from './efeitosCenario.js';
import { montarAtmosfera } from './Atmosfera.js';
import { modeloPronto } from '../render/modelos.js';
import { caixa as cx, corpoFacetado, materialDePersonagem, parte } from '../entidades/formas.js';
import { modeloDePersonagem } from '../entidades/ModeloDePersonagem.js';
import { decorar } from './Decoracao.js';

const C = CONFIG.areas.taverna;

export class Taverna {
  constructor(cena) {
    this.id = 'taverna';
    this.nome = 'Taverna da Estrada';
    this.usaCeu = false;
    this.limites = { ...C.limites };
    this.grupo = new THREE.Group();
    this.colisores = new Colisores();
    this.tochas = [];   // chamas que tremulam (lareira e velas): animarTochas cuida delas
    this.objetos = [];
    this.indiceFala = 0;
    montarAtmosfera(this, C);
    cena.add(this.grupo);

    const m = materiais();
    const H = C.altura;
    const { minX, maxX, minZ, maxZ } = this.limites;
    const preto = retro(new THREE.MeshBasicMaterial({ color: 0x140a06 }));
    const noite = retro(new THREE.MeshBasicMaterial({ color: 0x314e62 }));
    const colocar = (o, x, y, z) => { o.position.set(x, y, z); this.grupo.add(o); return o; };
    // Caixa decorativa e, se `topo` for dado, com colisão.
    const bloco = (x, y, z, l, a, p, mat, topo = null, ladrilho = 1.6) => {
      const malha = colocar(caixa(l, a, p, mat, ladrilho), x, y, z);
      if (topo !== null) this.colisores.adicionar(x, z, l, p, topo);
      return malha;
    };

    // ---------- piso, tapete e teto ----------
    // O assoalho não grava profundidade e tem ordem fixa (nota técnica do chão, veja Vilarejo.js).
    planoDeChao(this, { x: 0, z: 0, l: maxX - minX + 0.8, p: maxZ - minZ + 0.8, ladrilho: 1.6, material: m.madeiraChao, ordem: -6 });
    planoDeChao(this, {
      x: -0.4, z: 0.9, l: 4.4, p: 3.2, ladrilho: null, ordem: -5, y: 0.01,
      material: retro(new THREE.MeshLambertMaterial({ map: texturas().tapete, depthWrite: false })),
    });
    // O teto só aparece de baixo: com a câmera alta (olhando para baixo) o salão fica à mostra.
    const teto = planoDeChao(this, { x: 0, z: 0, l: maxX - minX + 0.8, p: maxZ - minZ + 0.8, ladrilho: 1.6, material: m.madeiraEscura, ordem: 0, y: H });
    teto.rotation.x = Math.PI / 2;
    for (const x of [-4.5, -1.5, 1.5, 4.5]) bloco(x, H - 0.15, 0, 0.3, 0.3, maxZ - minZ, m.madeiraEscura);

    // ---------- paredes (a porta fica no meio da parede sul) ----------
    const alturaParede = H + 0.3;
    const parede = (x, z, l, p) => bloco(x, alturaParede / 2, z, l, alturaParede, p, m.madeiraEscura, Infinity);
    parede(0, minZ - 0.2, maxX - minX + 0.8, 0.4);
    parede(minX - 0.2, 0, 0.4, maxZ - minZ + 0.8);
    parede(maxX + 0.2, 0, 0.4, maxZ - minZ + 0.8);
    for (const lado of [-1, 1]) parede(lado * 3.65, maxZ + 0.2, 5.5, 0.4);
    bloco(0, (2.6 + alturaParede) / 2, maxZ + 0.2, 1.8, alturaParede - 2.6, 0.4, m.madeiraEscura);
    bloco(0, 1.3, maxZ + 0.02, 1.8, 2.6, 0.18, m.madeira, null, 1.2);   // a porta
    this.colisores.adicionar(0, maxZ + 0.2, 1.8, 0.4);
    for (const lado of [-1, 1]) bloco(lado * 0.98, 1.3, maxZ - 0.02, 0.2, 2.6, 0.24, m.madeiraEscura);
    // Janelas escuras, de luar frio, contra o laranja da lareira.
    for (const [x, z] of [[maxX - 0.02, 3], [minX + 0.02, -3.6]]) {
      bloco(x, 1.95, z, 0.1, 1.2, 1.3, m.madeiraEscura, null, 1);
      const dentro = x - Math.sign(x) * 0.06;
      colocar(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.0), noite), dentro, 1.95, z);
      const moldura = dentro - Math.sign(x) * 0.045;
      bloco(moldura, 1.95, z, 0.05, 0.94, 0.075, m.madeiraEscura);
      bloco(moldura, 1.95, z, 0.05, 0.075, 1.05, m.madeiraEscura);
    }

    // ---------- balcão, prateleiras e garrafas (norte) ----------
    bloco(-2, 0.5, -2.4, 8, 1, 1, m.madeira, 1.1, 1.2);                 // frente do balcão, de parede a parede
    bloco(-2, 1.05, -2.4, 8.3, 0.1, 1.3, m.madeiraEscura);              // tampo
    bloco(1.5, 0.5, -3.65, 1, 1, 1.7, m.madeira, 1.1, 1.2);             // lateral: fecha o espaço do taverneiro
    for (const y of [1.55, 2.25]) bloco(-3, y, -4.27, 5.6, 0.1, 0.45, m.madeiraEscura);
    const vidros = [0x2c5a3a, 0x7a4a1c, 0x3a2a4a, 0x2c5a3a, 0x7a4a1c, 0x5a2a2a, 0x3a2a4a, 0x2c5a3a];
    vidros.forEach((cor, i) => {
      const garrafa = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.34, 6), retro(new THREE.MeshLambertMaterial({ color: cor, emissive: new THREE.Color(cor).multiplyScalar(0.3) })));
      colocar(garrafa, -5.4 + i * 0.7, (i % 2 ? 2.25 : 1.55) + 0.22, -4.27);
    });
    const caneca = retro(new THREE.MeshLambertMaterial({ color: 0xb08a5a }));
    for (const x of [-3.9, -0.8, 0.4]) colocar(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.13, 6), caneca), x, 1.16, -2.4);

    // ---------- barris ao lado do balcão ----------
    for (const [x, z, r] of [[3.2, -3.85, 0.45], [4.2, -3.95, 0.42], [3.55, -2.95, 0.38]]) {
      colocar(barril(r, 0.95), x, 0.475, z);
      this.colisores.adicionar(x, z, r * 2, r * 2, 0.95);
    }

    // ---------- escada decorativa na parede oeste (sem andar de cima) ----------
    for (let i = 0; i < 8; i++) {
      const alt = 0.36 * (i + 1);
      bloco(-5.45, alt / 2, 3.7 - i * 0.45, 1.1, alt, 0.45, m.madeira, null, 1);
    }
    bloco(-5.45, H / 2 + 0.3, 0.2, 1.1, H - 0.6, 0.2, m.madeiraEscura);   // o alto da escada dá numa tábua fechada
    this.colisores.adicionar(-5.45, 2.05, 1.1, 3.7);

    // ---------- mesas e bancos ----------
    this.mesas = [[-3.2, 0.4], [1.4, 1.8], [2.6, -0.3]];
    sombrasDeContato(this.grupo, this.mesas.map(([x, z]) => [x, z, 2.7, 2.05]));
    for (const [x, z] of this.mesas) {
      const inicio = this.grupo.children.length;
      bloco(x, 0.88, z, 1.6, 0.1, 1.1, m.madeira, null, 1);
      for (const [dx, dz] of [[-0.7, -0.45], [0.7, -0.45], [-0.7, 0.45], [0.7, 0.45]]) bloco(x + dx, 0.42, z + dz, 0.12, 0.84, 0.12, m.madeiraEscura);
      this.colisores.adicionar(x, z, 1.6, 1.1, 0.93);
      modeloPronto(this.grupo, 'table_medium', {
        pos: [x, 0, z], tamanho: [1.6, 0.93, 1.1], reserva: this.grupo.children.slice(inicio),
      });
      for (const dz of [-0.85, 0.85]) {
        const pupitre = bloco(x, 0.24, z + dz, 1.2, 0.48, 0.4, m.madeiraEscura, 0.48, 1);
        modeloPronto(this.grupo, 'Bench_1', { pos: [x,0,z + dz], tamanho: [1.2,0.48,0.4], reserva: [pupitre] });
      }
      // vela: chama que tremula
      const vela = colocar(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 5), retro(new THREE.MeshBasicMaterial({ color: 0xe8dcb8 }))), x + 0.45, 1.01, z - 0.2);
      const chama = colocar(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 4), m.chama), vela.position.x, 1.14, vela.position.z);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texturas().brilho, color: CONFIG.paleta.fogo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55,
      }));
      colocar(halo, chama.position.x, 1.14, chama.position.z);
      this.tochas.push({ chama, halo, luz: null, fase: x * 7.3 + z, base: 0 });
      decorar(this.grupo, [
        [x < 0 ? 'plate_food_A' : 'plate_food_B', x + 0.27, 0.936, z + 0.21, z],
        ['Chalice', x - 0.46, 0.936, z - 0.25],
        ['plate_stack', x - 0.45, 0.936, z + 0.22, x, 0.56],
      ]);
    }
    // O bilhete na primeira mesa (anotação lida com E, como as outras).
    const bilhete = bloco(-3.35, 0.945, 0.35, 0.5, 0.012, 0.36, retro(new THREE.MeshLambertMaterial({ color: 0xd9c9a0, emissive: 0x3a3220 })));
    bilhete.rotation.y = 0.3;
    this.objetos.push({ x: -3.35, y: 1.0, z: 0.35, acao: 'ler', evento: 'taverna:bilhete-da-mesa' });

    // ---------- lareira (parede leste) ----------
    const fx = 5.3;
    for (const z of [-1.6, 0.6]) bloco(fx, 0.7, z, 1.4, 1.4, 0.8, m.pedraEscura);
    bloco(fx, (1.4 + H) / 2, -0.5, 1.4, H - 1.4, 3.0, m.pedraEscura);
    const arcoDaLareira = arcoOgival(1.44, 0.53, 0.15, 0.2, m.pedra);
    arcoDaLareira.rotation.y = -Math.PI / 2;
    colocar(arcoDaLareira, fx - 0.72, 0.96, -0.5);
    bloco(fx - 0.02, 1.76, -0.5, 1.44, 0.17, 2.96, m.madeiraEscura);
    colocar(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.4), preto), 5.9, 0.7, -0.5);
    bloco(4.1, 0.06, -0.5, 1.0, 0.12, 2.2, m.pedraEscura);
    this.colisores.adicionar(fx, -0.5, 1.4, 3.0);
    for (const dz of [-0.2, 0.2]) {
      const tora = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 5), m.madeira);
      tora.rotation.x = Math.PI / 2;
      colocar(tora, 5.35, 0.14, -0.5 + dz);
    }
    const fogo = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 5), m.chama);
    colocar(fogo, 5.35, 0.62, -0.5);
    const haloFogo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturas().brilho, color: CONFIG.paleta.fogo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8,
    }));
    colocar(haloFogo, 5.2, 0.8, -0.5);
    const luzFogo = new THREE.PointLight(0xff7a2a, C.lareira.intensidade, C.lareira.alcance, 1.7);
    luzFogo.position.set(4.9, 0.9, -0.5);
    this.grupo.add(luzFogo);
    this.tochas.push({ chama: fogo, halo: haloFogo, luz: luzFogo, fase: 1.3, base: C.lareira.intensidade });
    this.animarFagulhas = fagulhasDaLareira(this.grupo, 4.92, -0.5);
    this.animarFagulhas(0);

    // ---------- lampião no teto ----------
    colocar(caixa(0.04, 0.8, 0.04, m.metal, 1), 0, H - 0.4, 0.4);
    const aro = colocar(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 4, 8), m.metal), 0, H - 0.85, 0.4);
    aro.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      colocar(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), m.chama), Math.cos(a) * 0.5, H - 0.72, 0.4 + Math.sin(a) * 0.5);
    }
    const luzTeto = new THREE.PointLight(0xffc27a, C.lampiao.intensidade, C.lampiao.alcance, 1.7);
    luzTeto.position.set(0, H - 1.1, 0.4);
    this.grupo.add(luzTeto);
    decorar(this.grupo, [
      ['bottle_A_green', -4.9, 1.606, -4.25], ['bottle_B_brown', -4.42, 1.606, -4.23, 0.5],
      ['bottle_A_green', -1.85, 2.306, -4.28], ['bottle_B_brown', -2.15, 2.306, -4.29],
      ['plate_stack', -0.55, 1.606, -4.27], ['bottle_B_brown', -0.6, 2.306, -4.25, 1.8],
      ['Book3_Closed', -2.75, 1.101, -2.25, 0.22], ['bottle_A_green', -2.87, 1.101, -2.73],
      ['plate_stack', -4.55, 1.101, -2.32], ['Pouch', -4.91, 1.101, -2.48, -0.7, 0.83],
      ['banco-peixes', 4.94, 0, -3.48, 1.2, 0.85],
      ['Cauldron', 5.36, 0.16, -0.52, 0.33, 0.87], ['WoodLog_Moss', 5.22, 0, 2.1, 1.58, 0.62],
      ['candle_triple', 4.96, 1.86, -0.04, 1.5, 0.7],
      ['Chalice', 5.24, 1.86, -1.12, 0.4],
      ['banner_patternC_brown', 3.9, 1.35, -4.43, 0, 0.77],
      ['box_stacked', 5.15, 0, 3.68, 0.15],
    ]);

    this.montarTaverneiro();

    // ---------- portal, chegada e descanso ----------
    this.portais = [{ x: 0, z: maxZ - 0.7, raio: 1.5, destino: 'estrada', texto: 'E — sair da taverna' }];
    this.chegadas = { estrada: { x: 0, z: maxZ - 2.9, yaw: 0 } };
    this.pontosDeDescanso = [];   // a lanterna fica do lado de fora ('taverna-da-estrada', na estrada)
    this.inimigos = [];
  }

  /** Taverneiro provisório: boneco parado atrás do balcão, polindo uma caneca. */
  montarTaverneiro() {
    const t = texturas();
    const T = C.taverneiro;
    const tecido = (cor) => materialDePersonagem(t.trama, cor, { asset: 'caban', brilho: 0.16, side: THREE.DoubleSide });
    const pele = materialDePersonagem(null, 0xb9977d, { brilho: 0.08 });
    const camisa = tecido(0x8a6a58), avental = tecido(0xb5a692), calca = tecido(0x4a3a34);
    const pelo = materialDePersonagem(null, 0x332521);
    const couro = materialDePersonagem(t.madeira, 0x826653, { asset: 'fabric_leather_01' });
    const g = new THREE.Group();
    g.position.set(-2, 0, -3.7);              // olha para +Z, de frente para o salão
    g.add(cx(0.2, 0.8, 0.22, calca, 0.13, 0.4, 0), cx(0.2, 0.8, 0.22, calca, -0.13, 0.4, 0));
    this.corpoTaverneiro = new THREE.Group();
    this.corpoTaverneiro.position.y = 0.8;
    g.add(this.corpoTaverneiro);
    const corpo = this.corpoTaverneiro;
    corpo.add(
      parte(corpoFacetado([[0, 0.43, 0.3], [0.21, 0.55, 0.36], [0.55, 0.56, 0.33], [0.69, 0.28, 0.27]]), camisa),
      cx(0.5, 0.08, 0.33, couro, 0, 0.06, 0),
    );
    const bib = cx(0.31, 0.32, 0.028, avental, 0, 0.31, 0.167);
    bib.rotation.x = -0.027;
    corpo.add(bib, cx(0.45, 0.19, 0.042, avental, 0, 0.08, 0.179));
    for (const lado of [-1, 1]) {
      const tira = cx(0.037, 0.26, 0.026, couro, lado * 0.122, 0.53, 0.134);
      tira.rotation.set(-0.28, 0, lado * 0.17);
      corpo.add(tira);
    }
    this.cabecaTaverneiro = new THREE.Group();
    this.cabecaTaverneiro.position.y = 0.83;
    this.cabecaTaverneiro.add(
      parte(corpoFacetado([[-0.16, 0.15, 0.17], [-0.09, 0.23, 0.23], [0.055, 0.275, 0.26], [0.15, 0.21, 0.22], [0.18, 0.04, 0.04]]), pele),
      parte(corpoFacetado([[-0.23, 0.075, 0.085, 0.11], [-0.13, 0.2, 0.15, 0.107], [-0.057, 0.236, 0.13, 0.094]]), pelo),
      parte(corpoFacetado([[0.095, 0.272, 0.268, -0.014], [0.15, 0.245, 0.243, -0.019], [0.186, 0.12, 0.09, -0.02], [0.19, 0.02, 0.02]]), pelo),
      cx(0.059, 0.063, 0.07, pele, 0, 0.006, 0.13),
    );
    for (const lado of [-1, 1]) {
      this.cabecaTaverneiro.add(cx(0.033, 0.014, 0.015, pelo, lado * 0.061, 0.043, 0.119));
    }
    corpo.add(this.cabecaTaverneiro);
    const braco = (x) => {
      const b = new THREE.Group();
      b.position.set(x, 0.6, 0);
      b.add(
        parte(corpoFacetado([[-0.43, 0.15, 0.16], [-0.22, 0.18, 0.19], [0, 0.205, 0.2], [0.06, 0.12, 0.13]]), camisa),
        parte(corpoFacetado([[-0.66, 0.09, 0.1], [-0.58, 0.13, 0.135], [-0.4, 0.146, 0.15]]), pele),
      );
      corpo.add(b);
      return b;
    };
    this.bracoDireito = braco(-0.33);
    this.bracoEsquerdo = braco(0.33);
    const caneca = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.15, 6), retro(new THREE.MeshLambertMaterial({ color: 0xb08a5a, emissive: 0x30200e })));
    caneca.position.set(0, -0.66, 0.05);
    this.bracoEsquerdo.add(caneca);
    this.bracoDireito.add(cx(0.2, 0.02, 0.14, avental, 0, -0.62, 0.06));   // o pano
    this.grupo.add(g);
    this.modeloTaverneiro = modeloDePersonagem(g, 'taverneiro-pugna', {
      reserva: [...g.children],
      armas: [['maoE', caneca, [0, 0, 0]]],
    });

    // E — falar: cada vez mostra a fala seguinte (o Jogo.js trata acao 'falar').
    this.objetos.push({
      x: -2, y: 1.4, z: -3.7, alcance: T.alcance, nome: 'o taverneiro', acao: 'falar',
      falar: () => {
        const fala = T.falas[this.indiceFala % T.falas.length];
        this.indiceFala += 1;
        return fala;
      },
      segundos: T.segundosDaFala,
    });
  }

  atualizar(dt, tempo) {
    animarTochas(this.tochas, tempo);
    this.animarFagulhas(tempo);
    // O taverneiro respira, poli a caneca e olha de lado de vez em quando.
    this.corpoTaverneiro.rotation.x = Math.sin(tempo * 1.4) * 0.015;
    this.bracoEsquerdo.rotation.set(-1.15 + Math.sin(tempo * 1.9) * 0.1, 0, 0.1);
    this.bracoDireito.rotation.set(-1.0 + Math.sin(tempo * 1.9 + 1.2) * 0.14, 0, -0.1);
    this.cabecaTaverneiro.rotation.y = Math.sin(tempo * 0.35) * 0.3;
    const rig = this.modeloTaverneiro.userData.pose;
    if (rig) {
      rig.tronco(this.corpoTaverneiro.rotation.x, 0, 0);
      rig.cabeca(0.05, this.cabecaTaverneiro.rotation.y, 0);
      rig.bracoE(this.bracoEsquerdo.rotation.x * 1.42, 0, -0.42);
      rig.bracoD(this.bracoDireito.rotation.x * 1.26, 0, 0.38);
    }
  }
}
