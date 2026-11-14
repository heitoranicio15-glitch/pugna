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
import { materiais, caixa, animarTochas, planoDeChao } from './pecas.js';

const C = CONFIG.areas.taverna;

export class Taverna {
  constructor(cena) {
    this.id = 'taverna';
    this.nome = 'Taverna da Estrada';
    this.luzJogador = C.luzJogador;
    this.usaCeu = false;
    this.limites = { ...C.limites };
    this.grupo = new THREE.Group();
    this.colisores = new Colisores();
    this.tochas = [];   // chamas que tremulam (lareira e velas): animarTochas cuida delas
    this.objetos = [];
    this.indiceFala = 0;
    this.nevoa = new THREE.FogExp2(C.nevoa.cor, C.nevoa.densidade);
    this.grupo.add(new THREE.HemisphereLight(0xffb98a, 0x3a2418, 0.9));
    cena.add(this.grupo);

    const m = materiais();
    const H = C.altura;
    const { minX, maxX, minZ, maxZ } = this.limites;
    const preto = retro(new THREE.MeshBasicMaterial({ color: 0x140a06 }));
    const noite = retro(new THREE.MeshBasicMaterial({ color: 0x24407f }));
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
      x: -0.4, z: 0.9, l: 4.4, p: 3.2, ladrilho: 1, ordem: -5, y: 0.01,
      material: retro(new THREE.MeshLambertMaterial({ color: 0x6a2430, depthWrite: false })),
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
      colocar(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.0), noite), x + (x > 0 ? -0.06 : 0.06), 1.95, z);
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
      const barril = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r, 0.95, 8), m.madeira);
      colocar(barril, x, 0.475, z);
      for (const y of [0.25, 0.7]) colocar(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.06, 8), m.metal), x, y, z);
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
    for (const [x, z] of this.mesas) {
      bloco(x, 0.88, z, 1.6, 0.1, 1.1, m.madeira, null, 1);
      for (const [dx, dz] of [[-0.7, -0.45], [0.7, -0.45], [-0.7, 0.45], [0.7, 0.45]]) bloco(x + dx, 0.42, z + dz, 0.12, 0.84, 0.12, m.madeiraEscura);
      this.colisores.adicionar(x, z, 1.6, 1.1, 0.93);
      for (const dz of [-0.85, 0.85]) {
        bloco(x, 0.24, z + dz, 1.2, 0.48, 0.4, m.madeiraEscura, 0.48, 1);
      }
      // vela: chama que tremula
      const vela = colocar(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 5), retro(new THREE.MeshBasicMaterial({ color: 0xe8dcb8 }))), x + 0.45, 1.01, z - 0.2);
      const chama = colocar(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 4), m.chama), vela.position.x, 1.14, vela.position.z);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texturas().brilho, color: CONFIG.paleta.fogo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55,
      }));
      colocar(halo, chama.position.x, 1.14, chama.position.z);
      this.tochas.push({ chama, halo, luz: null, fase: x * 7.3 + z, base: 0 });
    }
    // O bilhete na primeira mesa (anotação lida com E, como as outras).
    const bilhete = bloco(-3.35, 0.945, 0.35, 0.5, 0.012, 0.36, retro(new THREE.MeshLambertMaterial({ color: 0xd9c9a0, emissive: 0x3a3220 })));
    bilhete.rotation.y = 0.3;
    this.objetos.push({ x: -3.35, y: 1.0, z: 0.35, acao: 'ler', evento: 'taverna:bilhete-da-mesa' });

    // ---------- lareira (parede leste) ----------
    const fx = 5.3;
    for (const z of [-1.6, 0.6]) bloco(fx, 0.7, z, 1.4, 1.4, 0.8, m.pedraEscura);
    bloco(fx, (1.4 + H) / 2, -0.5, 1.4, H - 1.4, 3.0, m.pedraEscura);
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
    const mat = (map, cor) => retro(new THREE.MeshLambertMaterial({
      map, color: cor, emissiveMap: map, emissive: new THREE.Color(cor).multiplyScalar(0.35),
    }));
    const pele = mat(t.tecido, 0xe0c2aa), camisa = mat(t.tecido, 0x8a6a58), avental = mat(t.tecido, 0xd8ccb0);
    const calca = mat(t.tecido, 0x4a3a34), pelo = mat(t.tecido, 0x3a2b24), couro = mat(t.madeira, 0xa08878);
    const cx = (l, a, p, material, x, y, z) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), material);
      o.position.set(x, y, z);
      return o;
    };
    const g = new THREE.Group();
    g.position.set(-2, 0, -3.7);              // olha para +Z, de frente para o salão
    g.add(cx(0.2, 0.8, 0.22, calca, 0.13, 0.4, 0), cx(0.2, 0.8, 0.22, calca, -0.13, 0.4, 0));
    this.corpoTaverneiro = new THREE.Group();
    this.corpoTaverneiro.position.y = 0.8;
    g.add(this.corpoTaverneiro);
    const corpo = this.corpoTaverneiro;
    corpo.add(
      cx(0.52, 0.66, 0.3, camisa, 0, 0.33, 0),
      cx(0.46, 0.5, 0.05, avental, 0, 0.27, 0.17),
      cx(0.5, 0.08, 0.33, couro, 0, 0.06, 0),
    );
    this.cabecaTaverneiro = new THREE.Group();
    this.cabecaTaverneiro.position.y = 0.83;
    this.cabecaTaverneiro.add(
      cx(0.26, 0.26, 0.26, pele, 0, 0, 0),
      cx(0.28, 0.14, 0.1, pelo, 0, -0.07, 0.11),   // barba
      cx(0.28, 0.07, 0.28, pelo, 0, 0.15, 0),      // cabelo
    );
    corpo.add(this.cabecaTaverneiro);
    const braco = (x) => {
      const b = new THREE.Group();
      b.position.set(x, 0.6, 0);
      b.add(cx(0.15, 0.5, 0.17, camisa, 0, -0.24, 0), cx(0.13, 0.18, 0.15, pele, 0, -0.58, 0));
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
    // O taverneiro respira, poli a caneca e olha de lado de vez em quando.
    this.corpoTaverneiro.rotation.x = Math.sin(tempo * 1.4) * 0.015;
    this.bracoEsquerdo.rotation.set(-1.15 + Math.sin(tempo * 1.9) * 0.1, 0, 0.1);
    this.bracoDireito.rotation.set(-1.0 + Math.sin(tempo * 1.9 + 1.2) * 0.14, 0, -0.1);
    this.cabecaTaverneiro.rotation.y = Math.sin(tempo * 0.35) * 0.3;
  }
}
