// =============================================================================
//  CÉU NOTURNO
//  Uma esfera enorme em volta da câmera, pintada por um pequeno programa (shader):
//  degradê violeta → azul, estrelas, nuvens que se movem devagar e a lua com
//  rosto (o desenho da lua fica em Lua.js).
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Lua, SHADER_LUA } from './Lua.js';

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform float uTempo;
  uniform vec3 uZenite, uMeio, uHorizonte, uNuvem;
  ${SHADER_LUA}

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * ruido(p); p = p * 2.03 + 7.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);

    // Degradê do horizonte até o topo.
    vec3 cor = mix(uHorizonte, uMeio, smoothstep(0.0, 0.28, h));
    cor = mix(cor, uZenite, smoothstep(0.22, 0.85, h));

    // Estrelas (só no alto).
    vec2 ce = d.xz / (d.y + 0.4) * 46.0;
    vec2 cel = floor(ce);
    float est = step(0.965, hash(cel)) * step(length(fract(ce) - 0.5), 0.22);
    est *= smoothstep(0.12, 0.5, h) * (0.5 + 0.5 * sin(uTempo * 1.5 + hash(cel) * 40.0));

    // Nuvens em faixas, andando devagar.
    vec2 cn = d.xz / (d.y + 0.22);
    float n = fbm(cn * vec2(1.3, 2.4) + vec2(uTempo * 0.012, uTempo * 0.004));
    float nuv = smoothstep(0.42, 0.78, n) * smoothstep(-0.02, 0.2, d.y);

    // Halo azul em volta da lua.
    float ang = acos(clamp(dot(d, normalize(uLuaDir)), -1.0, 1.0));
    float fora = max(ang - uLuaRaio, 0.0);
    float halo = exp(-fora * 26.0) * 0.9 + exp(-fora * 4.0) * 0.22;

    cor += vec3(0.8, 0.85, 1.0) * est * (1.0 - nuv);
    vec3 corNuvem = mix(uMeio * 0.5, uNuvem, n) * (0.55 + halo * 1.2);
    cor = mix(cor, corNuvem, nuv * 0.78);
    cor += uLuaBorda * halo * (0.75 + 0.25 * uLuaAtencao);

    // A lua em si, com fiapos de nuvem passando na frente e a base sumindo na névoa.
    vec4 lua = pintarLua(d, uTempo);
    lua.rgb = mix(lua.rgb, corNuvem, nuv * 0.35);
    lua.rgb = mix(lua.rgb, uHorizonte, (1.0 - smoothstep(0.0, 0.16, d.y)) * 0.85);
    cor = mix(cor, lua.rgb, lua.a);

    gl_FragColor = vec4(cor, 1.0);
  }
`;

export class Ceu {
  constructor(cena) {
    const p = CONFIG.paleta;
    this.uniformes = {
      uTempo: { value: 0 },
      uZenite: { value: new THREE.Color(p.ceuZenite) },
      uMeio: { value: new THREE.Color(p.ceuMeio) },
      uHorizonte: { value: new THREE.Color(p.ceuHorizonte) },
      uNuvem: { value: new THREE.Color(p.nuvem) },
    };
    this.lua = new Lua(this.uniformes, p);
    this.malha = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 24, 16),
      new THREE.ShaderMaterial({
        uniforms: this.uniformes, vertexShader: VERT, fragmentShader: FRAG,
        side: THREE.BackSide, depthWrite: false, fog: false,
      }),
    );
    this.malha.renderOrder = -10;
    this.malha.frustumCulled = false;
    cena.add(this.malha);
  }

  get direcaoLua() { return this.lua.direcao; }

  /** Troca as cores do céu (para quando outros seres cósmicos aparecerem). */
  definirPaleta({ zenite, meio, horizonte, nuvem } = {}) {
    if (zenite !== undefined) this.uniformes.uZenite.value.set(zenite);
    if (meio !== undefined) this.uniformes.uMeio.value.set(meio);
    if (horizonte !== undefined) this.uniformes.uHorizonte.value.set(horizonte);
    if (nuvem !== undefined) this.uniformes.uNuvem.value.set(nuvem);
  }

  atualizar(dt, tempo, camera, posJogador) {
    this.uniformes.uTempo.value = tempo;
    this.lua.atualizar(dt, posJogador, camera);
    this.malha.position.copy(camera.position); // o céu anda junto: nunca se chega nele
  }
}
