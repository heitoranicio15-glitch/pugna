// =============================================================================
//  A LUA
//  Um ser cósmico: uma lua enorme, com um rosto sinistro, que ocupa boa parte do
//  céu e está SEMPRE lá. Ela nunca luta. Só olha.
//
//  Como funciona: a lua é pintada dentro do próprio céu (shader). O rosto é um
//  "relevo" feito de calombos e sulcos (bochechas, nariz, órbitas, lábios) que
//  recebe luz de lado. A boca é um sorriso aberto, com dentes à mostra. Os olhos e o rosto viram devagar na direção do jogador,
//  e quando o jogador a encara, os olhos acendem mais e o sorriso abre.
// =============================================================================
import * as THREE from 'three';

/** Trecho de shader usado pelo Ceu.js. Devolve a cor da lua em rgb e a cobertura em a. */
export const SHADER_LUA = /* glsl */ `
  uniform vec3 uLuaDir;        // direção da lua no céu
  uniform float uLuaRaio;      // raio aparente, em radianos
  uniform vec2 uLuaVirar;      // quanto o rosto está virado (x = lados, y = cima/baixo)
  uniform vec2 uLuaPupila;     // deslocamento das pupilas
  uniform float uLuaAtencao;   // 0..1: sobe quando o jogador encara a lua
  uniform vec3 uLuaCor, uLuaBorda, uLuaOlho;

  float calombo(vec2 p, vec2 c, vec2 s) { vec2 d = (p - c) / s; return exp(-dot(d, d)); }

  // Curvas da boca: devolve (borda de cima, borda de baixo) para uma distância x do centro.
  // A boca é um sorriso aberto em forma de lua crescente, largo demais para um rosto.
  vec2 bocaLua(float x) {
    float cima = -0.32 + 0.52 * x * x;
    float abertura = (0.17 + 0.07 * uLuaAtencao) * max(0.0, 1.0 - (x * x) / 0.3844); // fecha em x = 0.62
    return vec2(cima, cima - abertura);
  }

  // Altura do "relevo" do rosto em cada ponto (positivo = saliente, negativo = fundo).
  float relevoLua(vec2 p) {
    vec2 q = vec2(abs(p.x), p.y);            // espelha: o rosto é simétrico
    vec2 b = bocaLua(q.x);
    float naBoca = smoothstep(0.66, 0.56, q.x);
    float h = 0.0;
    h += 1.05 * calombo(q, vec2(0.43, -0.04), vec2(0.18, 0.15));  // bochechas (empurradas pelo sorriso)
    h += 0.85 * calombo(p, vec2(0.0, 0.04), vec2(0.075, 0.2));    // nariz
    h += 0.55 * calombo(p, vec2(0.0, -0.13), vec2(0.14, 0.065));  // ponta do nariz
    h += 0.80 * calombo(q, vec2(0.27, 0.37), vec2(0.25, 0.065));  // sobrancelhas
    h -= 1.00 * calombo(q, vec2(0.28, 0.22), vec2(0.17, 0.08));   // órbitas dos olhos
    float lc = p.y - (b.x + 0.035), lb = p.y - (b.y - 0.04);
    h += 0.55 * exp(-lc * lc / 0.0011) * naBoca;                  // lábio de cima
    h += 0.50 * exp(-lb * lb / 0.0016) * naBoca;                  // lábio de baixo
    h -= 0.70 * calombo(q, vec2(0.66, -0.1), vec2(0.045, 0.12));  // vincos nos cantos da boca
    h += 0.40 * calombo(p, vec2(0.0, -0.72), vec2(0.22, 0.09));   // queixo
    return h;
  }

  vec4 pintarLua(vec3 d, float tempo) {
    vec3 c = normalize(uLuaDir);
    vec3 direita = normalize(cross(vec3(0.0, 1.0, 0.0), c));
    vec3 cima = cross(c, direita);
    vec2 p = vec2(-dot(d, direita), dot(d, cima)) / sin(uLuaRaio);
    float r2 = dot(p, p);
    if (dot(d, c) < 0.0 || r2 > 1.0) return vec4(0.0);

    // Ponto na superfície da esfera, girado para o rosto "seguir" o jogador.
    vec3 n = vec3(p, sqrt(1.0 - r2));
    float ca = cos(uLuaVirar.x), sa = sin(uLuaVirar.x), cb = cos(uLuaVirar.y), sb = sin(uLuaVirar.y);
    vec3 f = vec3(ca * n.x - sa * n.z, n.y, sa * n.x + ca * n.z);
    f = vec3(f.x, cb * f.y - sb * f.z, sb * f.y + cb * f.z);
    vec2 r = f.xy;                          // coordenadas do rosto
    float frente = smoothstep(0.0, 0.3, f.z);

    // Luz de lado sobre o relevo (é o que "esculpe" o rosto).
    float e = 0.012;
    float h0 = relevoLua(r);
    vec2 grad = vec2(relevoLua(r + vec2(e, 0.0)) - h0, relevoLua(r + vec2(0.0, e)) - h0) / e;
    float luz = clamp(0.52 - dot(grad, normalize(vec2(-0.45, 0.75))) * 0.23, 0.04, 1.7);
    luz = mix(0.52, luz, frente);

    // Crateras/manchas.
    vec2 m = floor(r * 9.0);
    float mancha = 0.86 + 0.28 * fract(sin(dot(m, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 cor = uLuaCor * luz * mancha;
    cor *= 0.35 + 0.65 * n.z;                                   // escurece para as bordas...
    cor += uLuaBorda * pow(1.0 - n.z, 3.0) * 1.3;               // ...e ganha um aro azul

    // Boca: um sorriso aberto, com dentes demais, tortos e manchados.
    vec2 q = vec2(abs(r.x), r.y);
    vec2 bc = bocaLua(q.x);
    float alturaBoca = max(bc.x - bc.y, 0.0001);
    float dentro = smoothstep(0.0, 0.012, r.y - bc.y) * smoothstep(0.0, 0.012, bc.x - r.y) * step(q.x, 0.62) * frente;
    float tv = (r.y - bc.y) / alturaBoca;                 // 0 = lábio de baixo, 1 = lábio de cima
    float meio = abs(tv - 0.5) * 2.0;                     // 0 = linha entre as arcadas
    float fileira = tv > 0.5 ? 0.0 : 0.5;                 // dentes de baixo desencontrados
    float ud = r.x * 13.0 + fileira;
    float idDente = floor(ud) + fileira * 37.0;
    float sorte = fract(sin(idDente * 91.7) * 4375.5);
    float fenda = abs(fract(ud) - 0.5);                   // 0 = meio do dente, 0.5 = entre dois dentes
    float dente = smoothstep(0.5, 0.5 - mix(0.16, 0.05, meio), fenda);  // mais finos na ponta
    dente *= smoothstep(0.05 + 0.1 * sorte, 0.16 + 0.1 * sorte, meio);  // pontas desiguais
    float gengiva = smoothstep(0.78, 0.95, meio);
    vec3 corDente = vec3(0.62, 0.66, 0.46) * (0.5 + 0.5 * sorte) * (1.0 - 0.45 * q.x) * (0.9 + 0.4 * uLuaAtencao);
    vec3 corBoca = mix(vec3(0.012, 0.0, 0.03), corDente, dente);
    corBoca = mix(corBoca, vec3(0.16, 0.02, 0.12), gengiva);
    cor = mix(cor, corBoca, dentro);

    // Olhos: amêndoas inclinadas, meio fechadas, com íris em brasa.
    float lado = r.x < 0.0 ? -1.0 : 1.0;
    vec2 o = vec2(q.x - 0.28, r.y - 0.215);
    o.y -= 0.22 * o.x;                                          // canto de fora mais alto
    float olho = 1.0 - smoothstep(0.8, 1.0, length(o / vec2(0.135, 0.05)));
    olho *= smoothstep(0.03, 0.015, o.y) * frente;              // pálpebra pesada
    vec2 pup = vec2(r.x - lado * 0.28, r.y - 0.205) - uLuaPupila;
    float iris = 1.0 - smoothstep(0.03, 0.045, length(pup));
    float pupila = 1.0 - smoothstep(0.008, 0.016, length(pup * vec2(1.8, 0.8)));
    float brasa = 0.75 + 0.25 * sin(tempo * 0.6) + 0.9 * uLuaAtencao;
    vec3 corOlho = mix(uLuaOlho * 0.16, uLuaOlho * brasa * 1.5, iris);
    corOlho = mix(corOlho, vec3(0.0), pupila);
    cor = mix(cor, corOlho, olho);
    cor += uLuaOlho * calombo(q, vec2(0.28, 0.215), vec2(0.2, 0.11)) * 0.06 * brasa * frente; // clarão em volta

    return vec4(cor, 1.0);
  }
`;

const tmp = new THREE.Vector3();

export class Lua {
  /** uniformes = os uniformes do shader do céu (a lua acrescenta os dela). */
  constructor(uniformes, cores) {
    this.u = uniformes;
    this.direcao = new THREE.Vector3(0.4, 0.5, -0.77).normalize(); // nordeste, ao lado das torres da catedral
    Object.assign(uniformes, {
      uLuaDir: { value: this.direcao },
      uLuaRaio: { value: 0.31 },                 // ~18 graus: quase metade da altura da tela
      uLuaVirar: { value: new THREE.Vector2() },
      uLuaPupila: { value: new THREE.Vector2() },
      uLuaAtencao: { value: 0 },
      uLuaCor: { value: new THREE.Color(cores.lua) },
      uLuaBorda: { value: new THREE.Color(cores.luaBorda) },
      uLuaOlho: { value: new THREE.Color(cores.luaOlho) },
    });
    this.atencao = 0;
  }

  /** posJogador: onde o jogador está; camera: para saber se ele está encarando a lua. */
  atualizar(dt, posJogador, camera) {
    // O rosto vira um pouco conforme o jogador anda pelo vilarejo...
    const alvoX = THREE.MathUtils.clamp(posJogador.x / 48, -1, 1);
    const alvoY = THREE.MathUtils.clamp((posJogador.z + 10) / 65, -1, 1);
    const k = 1 - Math.exp(-dt * 0.9); // devagar: ela não tem pressa
    const virar = this.u.uLuaVirar.value, pupila = this.u.uLuaPupila.value;
    virar.x += (-alvoX * 0.32 - virar.x) * k;
    virar.y += (0.1 + alvoY * 0.1 - virar.y) * k;
    // ...e as pupilas vão além, sempre no jogador.
    pupila.x += (alvoX * 0.035 - pupila.x) * k * 2;
    pupila.y += (-0.012 - alvoY * 0.012 - pupila.y) * k * 2;

    // Se o jogador encara a lua, ela "percebe".
    camera.getWorldDirection(tmp);
    const encarando = tmp.dot(this.direcao) > 0.93 ? 1 : 0;
    this.atencao += (encarando - this.atencao) * (1 - Math.exp(-dt * (encarando ? 0.35 : 1.2)));
    this.u.uLuaAtencao.value = this.atencao;
  }
}
