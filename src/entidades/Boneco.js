// =============================================================================
//  O BONECO DO CAÇADOR (o que se vê do jogador em terceira pessoa)
//  Malhas facetadas presas aos mesmos pivôs das animações.
//  Este arquivo só ANIMA: quem decide o que acontece é o Jogador.js.
//
//  O modelo "olha" para +Z. O braço da espada fica em -X (a direita dele) e o
//  braço da pistola em +X. Para trocar por um modelo de verdade no futuro,
//  basta manter o método atualizar(dt, jogador).
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { texturas } from '../render/texturas.js';
import { caixa as cx, corpoFacetado, lamina, manto, materialDePersonagem, parte } from './formas.js';
import { modeloPronto } from '../render/modelos.js';
import { modeloDePersonagem } from './ModeloDePersonagem.js';

const CB = CONFIG.combate;
const ALTURA_MIOLO = 0.95;   // centro do corpo: é em volta dele que o boneco rola
const ALTURA_CINTURA = 0.9;  // o tronco inclina e torce a partir daqui

// Pose de descanso. bd = braço direito (espada), be = braço esquerdo (pistola),
// es = punho da espada, c = tronco. x = para a frente/trás, z = para os lados,
// y = torção.
const REPOUSO = { bdx: -0.3, bdz: 0, esx: -0.9, bex: 0.1, bez: 0, cx: 0, cy: 0 };

export class Boneco {
  constructor(cena) {
    const t = texturas();
    // Um pouco de brilho próprio: o caçador continua legível mesmo longe das tochas.
    const mat = (map, color, extra = {}) => materialDePersonagem(map, color, { brilho: 0.35, ...extra });
    const tecido = { asset: 'caban', side: THREE.DoubleSide };
    const metal = { asset: 'Metal032', metalness: 0.48, normal: 0.28 };
    const casaco = mat(t.trama, 0x73677f, tecido);
    const couro = mat(t.madeira, 0x7f6e67, { asset: 'fabric_leather_01', normal: 0.35 });
    const lenco = mat(t.trama, 0xae4353, tecido);
    const pele = mat(null, 0xb99985);
    const aco = mat(t.metal, 0xe4e8ff, metal);
    const escuro = mat(t.metal, 0x777a93, metal);
    const latao = mat(t.metal, 0xcaaa77, metal);

    this.grupo = new THREE.Group();
    this.miolo = new THREE.Group();
    this.miolo.position.y = ALTURA_MIOLO;
    const base = new THREE.Group();          // devolve as peças à altura dos pés
    base.position.y = -ALTURA_MIOLO;
    this.miolo.add(base);
    this.grupo.add(this.miolo);

    // ---------- pernas ----------
    const perna = (x) => {
      const p = new THREE.Group();
      p.position.set(x, 0.86, 0);
      p.add(parte(corpoFacetado([
        [-0.6, 0.18, 0.18], [-0.32, 0.19, 0.2], [0, 0.22, 0.21],
      ]), casaco));
      p.add(parte(corpoFacetado([
        [-0.86, 0.2, 0.31, 0.06], [-0.77, 0.21, 0.34, 0.065],
        [-0.71, 0.18, 0.21, 0.015], [-0.52, 0.21, 0.22],
      ]), couro));
      base.add(p);
      return p;
    };
    this.pernaE = perna(0.13);
    this.pernaD = perna(-0.13);

    // ---------- tronco, cabeça, chapéu e capa ----------
    this.corpo = new THREE.Group();
    this.corpo.position.y = ALTURA_CINTURA;
    const tronco = new THREE.Group();
    tronco.position.y = -ALTURA_CINTURA;
    this.corpo.add(tronco);
    base.add(this.corpo);
    tronco.add(
      parte(corpoFacetado([[0.65, 0.55, 0.36], [0.94, 0.43, 0.3], [1.39, 0.55, 0.34], [1.51, 0.32, 0.28]]), casaco),
      parte(corpoFacetado([[0.88, 0.46, 0.33], [0.98, 0.465, 0.335]]), couro),
      cx(0.105, 0.085, 0.03, latao, 0, 0.93, 0.161),
      cx(0.12, 0.17, 0.105, couro, 0.195, 0.84, 0.1),
      parte(corpoFacetado([[1.49, 0.36, 0.36], [1.6, 0.29, 0.31, 0.03], [1.65, 0.26, 0.29, 0.035]]), lenco),
      parte(corpoFacetado([[1.57, 0.16, 0.18], [1.68, 0.235, 0.25, 0.016], [1.8, 0.255, 0.235], [1.89, 0.19, 0.18]]), pele),
      parte(new THREE.CylinderGeometry(0.37, 0.38, 0.032, 8), couro, 0, 1.856, 0),
      parte(corpoFacetado([[1.86, 0.39, 0.34], [1.93, 0.35, 0.32], [2.11, 0.28, 0.285, -0.035], [2.16, 0.02, 0.02, -0.055]]), couro),
      parte(corpoFacetado([[1.88, 0.395, 0.348], [1.925, 0.365, 0.332]]), escuro),
      cx(0.07, 0.044, 0.025, latao, 0.105, 1.904, 0.163),
    );
    this.capa = new THREE.Group();
    this.capa.position.set(0, 1.5, -0.17);
    this.capa.add(manto(lenco, 0.67, 1.07));
    tronco.add(this.capa);

    // ---------- braços ----------
    const braco = (x) => {
      const b = new THREE.Group();
      b.position.set(x, 1.46, 0);
      b.add(
        parte(corpoFacetado([[-0.49, 0.135, 0.15], [-0.2, 0.17, 0.18], [0, 0.205, 0.21], [0.045, 0.13, 0.14]]), casaco),
        parte(corpoFacetado([[-0.69, 0.095, 0.1], [-0.64, 0.137, 0.16], [-0.48, 0.158, 0.175]]), couro),
      );
      tronco.add(b);
      return b;
    };
    this.bracoE = braco(0.33);
    this.bracoD = braco(-0.33);

    // Espada na mão direita: com o braço abaixado, a lâmina aponta para a frente.
    this.espada = new THREE.Group();
    this.espada.position.set(0, -0.66, 0.03);
    this.espada.add(
      lamina(aco, 0.075, 0.98),
      cx(0.26, 0.045, 0.05, latao, 0, 0, 0.1),
      cx(0.04, 0.04, 0.2, couro, 0, 0, -0.02),
    );
    modeloPronto(this.espada, 'Sword', { pos: [0,-0.031,0.43], tamanho: [0.26,0.062,1.2],
      orientacao: [Math.PI / 2,0,0], reserva: [...this.espada.children],
      material: m => m.name === 'Metal' ? aco : m.name === 'Gold' ? latao : couro });
    this.bracoD.add(this.espada);

    // Pistola na mão esquerda (o parry do jogo). O cano segue o braço: abaixado,
    // aponta para o chão; com o braço esticado à frente, aponta para o inimigo.
    this.pistola = new THREE.Group();
    this.pistola.position.set(0, -0.66, 0.03);
    this.pistola.add(
      parte(new THREE.CylinderGeometry(0.033, 0.031, 0.38, 8), escuro, 0, -0.16, 0.03),
      cx(0.07, 0.12, 0.08, aco, 0, 0.0, 0.03),         // corpo do mecanismo
      cx(0.078, 0.022, 0.075, latao, 0, -0.27, 0.028),
      cx(0.06, 0.09, 0.2, couro, 0, 0.03, -0.1),       // coronha
    );
    modeloPronto(this.pistola, 'pistola-pugna', {
      pos: [0, -0.375, -0.05], tamanho: [0.13, 0.49, 0.25], orientacao: [0, 0, -Math.PI / 2],
      reserva: [...this.pistola.children],
    });
    this.bracoE.add(this.pistola);
    this.modelo = modeloDePersonagem(base, 'cacador-pugna', {
      reserva: [this.pernaD, this.pernaE, this.corpo],
      armas: [['maoD', this.espada, [0.52, 0.16, 0]], ['maoE', this.pistola, [-0.1, 0, 0]]],
    });

    this.pose = { ...REPOUSO };
    this.rumo = 0;
    this.queda = 0;
    cena.add(this.grupo);
  }

  atualizar(dt, j) {
    const g = this.grupo;
    g.visible = j.distCamera > 0.85;   // câmera colada numa parede: não mostra o boneco por dentro
    g.position.copy(j.pos);
    const difRumo = Math.atan2(Math.sin(j.rumo - this.rumo), Math.cos(j.rumo - this.rumo));
    this.rumo += difRumo * (dt > 0 ? 1 - Math.exp(-dt * 24) : 1);
    g.rotation.y = this.rumo + Math.PI;

    const rapidez = Math.hypot(j.vel.x, j.vel.z);
    const passo = Math.sin(j.fasePasso) * Math.min(1, rapidez / 2.2) * 0.75;
    const alvo = { ...REPOUSO, bex: 0.1 - passo * 0.6, cx: 0.2 * Math.min(1, rapidez / CONFIG.jogador.velCorrer) };
    let k = dt > 0 ? 1 - Math.exp(-dt * 12) : 1;   // rapidez com que chega na pose
    let direto = false;                            // pose exata, sem suavizar (durante o corte)
    let altura = ALTURA_MIOLO, rolo = 0, escala = 1;

    const golpe = CB[j.ataque];
    if (j.morto) {
      this.queda = Math.min(1, this.queda + dt * 1.8);
      alvo.bdx = 0.5; alvo.bex = 0.5;
    } else {
      this.queda = 0;
      if (j.tEsquiva > 0) {
        const p = 1 - j.tEsquiva / (j.quickstep ? CB.quickstep : CB.esquiva).duracao;
        if (j.quickstep) {         // quickstep: passo curto e baixo, de frente para o alvo
          altura = ALTURA_MIOLO - 0.12 * Math.sin(Math.PI * p);
          alvo.cx = 0.12; alvo.bdx = -0.35; alvo.bex = -0.35;
        } else if (j.rolando) {           // rola para a frente, encolhido
          rolo = p * Math.PI * 2;
          altura = ALTURA_MIOLO - 0.45 * Math.sin(Math.PI * p);
          escala = 1 - 0.22 * Math.sin(Math.PI * p);
          alvo.bdx = -0.9; alvo.bex = -0.9; alvo.cx = 0.5;
        } else {                   // parado: salto curto para trás
          altura = ALTURA_MIOLO + 0.1 * Math.sin(Math.PI * p);
          alvo.cx = -0.22;
        }
      } else if (j.acao === 'atordoado') {
        alvo.cx = -0.35; alvo.bdx = 0.4; alvo.bex = 0.4;
      } else if (j.acao === 'curando') {
        // Bebendo o frasco: leva a mão esquerda à boca e inclina a cabeça para trás.
        alvo.bex = -2.3; alvo.bez = -0.35; alvo.cx = -0.14;
      } else if (j.acao === 'visceral') {
        // Visceral: recolhe a espada torcendo o tronco e estoca de ponta, com tudo.
        alvo.esx = 1.55; alvo.bex = 0.3;
        if (j.tAcao < CB.visceral.momento) { alvo.bdx = -0.7; alvo.cy = 0.6; alvo.cx = -0.12; k = dt > 0 ? 1 - Math.exp(-dt * 18) : 1; }
        else { alvo.bdx = -1.62; alvo.cy = -0.2; alvo.cx = 0.32; k = dt > 0 ? 1 - Math.exp(-dt * 40) : 1; }
      } else if (j.acao === 'tiro') {
        // Tiro: o braço esquerdo estica à frente e o coice joga a pistola para cima.
        const coice = Math.max(0, 1 - j.tAcao / (CB.pistola.recuperacao * 0.4));
        alvo.bex = -1.55 - 0.5 * coice; alvo.bez = 0; alvo.cy = -0.4; alvo.cx = -0.05 * coice; alvo.bdx = -0.2;
        direto = true;
      } else if (golpe && j.ataque === 'forte') {
        // Golpe forte: de cima para baixo.
        if (j.acao === 'preparo') { alvo.bdx = -2.9; alvo.esx = 0; alvo.cx = -0.15; k = dt > 0 ? 1 - Math.exp(-dt * 30) : 1; }
        else if (j.acao === 'ativo') {
          const p = j.contatoParede ?? j.tAcao / golpe.ativo;
          alvo.bdx = -2.9 + 2.45 * p; alvo.esx = 0.5 * p; alvo.cx = 0.35 * p;
          direto = true;
        } else { alvo.bdx = -0.45; alvo.esx = 0.5; alvo.cx = 0.22; k = dt > 0 ? 1 - Math.exp(-dt * 5) : 1; }
      } else if (golpe) {
        // Golpe leve: corte de lado, alternando a direção.
        const s = j.golpeAlternado ? 1 : -1;
        alvo.bdx = -1.35; alvo.esx = 1.2;
        if (j.acao === 'preparo') { alvo.cy = -s * 0.95; k = dt > 0 ? 1 - Math.exp(-dt * 40) : 1; }
        else if (j.acao === 'ativo') {
          const p = j.contatoParede ?? j.tAcao / golpe.ativo;
          alvo.cy = s * 0.95 * (2 * p - 1);
          direto = true;
        } else { alvo.cy = s * 0.7; k = dt > 0 ? 1 - Math.exp(-dt * 7) : 1; }
      } else if (j.carregando && j.tCarga > 0.12) {
        alvo.bdx = -2.7 + (j.avisouCarga ? (Math.random() - 0.5) * 0.08 : 0); alvo.esx = 0; alvo.cx = -0.1;
      }
    }

    const pose = this.pose;
    for (const chave in pose) pose[chave] += (alvo[chave] - pose[chave]) * (direto ? 1 : k);
    this.bracoD.rotation.set(pose.bdx, 0, pose.bdz);
    this.espada.rotation.x = pose.esx;
    this.bracoE.rotation.set(pose.bex, 0, pose.bez);
    this.corpo.rotation.set(pose.cx, pose.cy, 0);
    this.pernaE.rotation.x = passo;
    this.pernaD.rotation.x = -passo;
    this.capa.rotation.x = 0.1 + Math.min(0.75, rapidez * 0.085) + Math.sin(j.fasePasso * 2) * 0.03;
    const rig = this.modelo.userData.pose;
    if (rig) {
      rig.tronco(pose.cx, pose.cy, 0);
      rig.bracoD(pose.bdx + 0.2, 0, pose.bdz);
      rig.bracoE(pose.bex, 0, pose.bez);
      rig.pernaE(passo, 0, 0);
      rig.pernaD(-passo, 0, 0);
    }

    // Morte: cai de costas. Esquiva: gira em volta do centro do corpo.
    this.miolo.rotation.x = rolo - this.queda * Math.PI / 2;
    this.miolo.position.y = altura - this.queda * 0.72 + (j.noChao ? Math.abs(Math.sin(j.fasePasso)) * 0.035 : 0);
    this.miolo.scale.setScalar(escala);
  }
}
