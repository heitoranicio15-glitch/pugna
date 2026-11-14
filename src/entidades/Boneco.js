// =============================================================================
//  O BONECO DO CAÇADOR (o que se vê do jogador em terceira pessoa)
//  Modelo simples, feito de caixas e cones, no mesmo estilo dos inimigos.
//  Este arquivo só ANIMA: quem decide o que acontece é o Jogador.js.
//
//  O modelo "olha" para +Z. O braço da espada fica em -X (a direita dele) e o
//  braço da pistola em +X. Para trocar por um modelo de verdade no futuro,
//  basta manter o método atualizar(dt, jogador).
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { retro } from '../render/retro.js';
import { texturas } from '../render/texturas.js';

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
    const mat = (map, color, extra = {}) => retro(new THREE.MeshLambertMaterial({
      map, color, emissiveMap: map, emissive: new THREE.Color(color).multiplyScalar(0.4), ...extra,
    }));
    const casaco = mat(t.tecido, 0x8f7a94, { side: THREE.DoubleSide });
    const couro = mat(t.madeira, 0xa08878);
    const lenco = mat(t.tecido, 0xd8565a, { side: THREE.DoubleSide });
    const pele = mat(t.tecido, 0xe0c2aa);
    const aco = mat(t.metal, 0xe4e8ff);
    const escuro = mat(t.metal, 0x6a6a9a);
    const cx = (l, a, p, m, x = 0, y = 0, z = 0) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), m);
      o.position.set(x, y, z);
      return o;
    };

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
      p.add(cx(0.19, 0.6, 0.21, casaco, 0, -0.3, 0), cx(0.2, 0.3, 0.25, couro, 0, -0.71, 0.015));
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
    tronco.add(cx(0.5, 0.62, 0.3, casaco, 0, 1.2, 0));
    tronco.add(cx(0.44, 0.12, 0.33, couro, 0, 0.9, 0));            // cinto
    tronco.add(cx(0.36, 0.16, 0.36, lenco, 0, 1.56, 0));           // lenço no pescoço
    tronco.add(cx(0.25, 0.24, 0.25, pele, 0, 1.72, 0));            // cabeça
    const aba = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 6), couro);
    aba.position.y = 1.86;
    const copa = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.3, 5), couro);
    copa.position.y = 2.02;
    tronco.add(aba, copa);
    this.capa = new THREE.Group();
    this.capa.position.set(0, 1.5, -0.17);
    this.capa.add(cx(0.56, 0.95, 0.04, lenco, 0, -0.475, 0));
    tronco.add(this.capa);

    // ---------- braços ----------
    const braco = (x) => {
      const b = new THREE.Group();
      b.position.set(x, 1.46, 0);
      b.add(cx(0.15, 0.5, 0.17, casaco, 0, -0.24, 0), cx(0.13, 0.2, 0.15, couro, 0, -0.58, 0));
      tronco.add(b);
      return b;
    };
    this.bracoE = braco(0.33);
    this.bracoD = braco(-0.33);

    // Espada na mão direita: com o braço abaixado, a lâmina aponta para a frente.
    this.espada = new THREE.Group();
    this.espada.position.set(0, -0.66, 0.03);
    this.espada.add(
      cx(0.055, 0.02, 0.98, aco, 0, 0, 0.6),
      cx(0.26, 0.05, 0.05, escuro, 0, 0, 0.1),
      cx(0.04, 0.04, 0.2, couro, 0, 0, -0.02),
    );
    this.bracoD.add(this.espada);

    // Pistola na mão esquerda (o parry do jogo). O cano segue o braço: abaixado,
    // aponta para o chão; com o braço esticado à frente, aponta para o inimigo.
    this.pistola = new THREE.Group();
    this.pistola.position.set(0, -0.66, 0.03);
    this.pistola.add(
      cx(0.05, 0.36, 0.05, escuro, 0, -0.16, 0.03),   // cano
      cx(0.07, 0.12, 0.08, aco, 0, 0.0, 0.03),         // corpo do mecanismo
      cx(0.06, 0.09, 0.2, couro, 0, 0.03, -0.1),       // coronha
    );
    this.bracoE.add(this.pistola);

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
        const p = 1 - j.tEsquiva / CB.esquiva.duracao;
        if (j.rolando) {           // rola para a frente, encolhido
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

    // Morte: cai de costas. Esquiva: gira em volta do centro do corpo.
    this.miolo.rotation.x = rolo - this.queda * Math.PI / 2;
    this.miolo.position.y = altura - this.queda * 0.72 + (j.noChao ? Math.abs(Math.sin(j.fasePasso)) * 0.035 : 0);
    this.miolo.scale.setScalar(escala);
  }
}
