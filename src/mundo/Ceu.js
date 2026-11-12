// =============================================================================
//  CÉU NOTURNO
//  Uma esfera enorme em volta da câmera, pintada por um pequeno programa (shader):
//  degradê violeta → azul, estrelas, nuvens que se movem devagar e a lua.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';

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
  uniform float uPulso;       // 0..1, acompanha o "respirar" do gigante
  uniform vec3 uZenite, uMeio, uHorizonte, uNuvem, uLuaCor, uMagia;
  uniform vec3 uLuaDir, uGiganteDir;

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

    // Lua: disco + halo.
    float ml = max(dot(d, normalize(uLuaDir)), 0.0);
    float disco = smoothstep(0.9982, 0.9987, ml);
    float halo = pow(ml, 140.0) * 0.4 + pow(ml, 12.0) * 0.13;

    cor += vec3(0.8, 0.85, 1.0) * est * (1.0 - nuv);
    vec3 corNuvem = mix(uMeio * 0.5, uNuvem, n) * (0.55 + halo * 1.6);
    cor = mix(cor, corNuvem, nuv * 0.78);
    cor += uLuaCor * (disco * (1.0 - nuv * 0.7) + halo);

    // A presença do gigante tinge o céu de verde atrás dele.
    float mg = max(dot(d, normalize(uGiganteDir)), 0.0);
    cor += uMagia * pow(mg, 5.0) * (0.035 + 0.03 * uPulso);

    gl_FragColor = vec4(cor, 1.0);
  }
`;

export class Ceu {
  constructor(cena) {
    const p = CONFIG.paleta;
    this.uniformes = {
      uTempo: { value: 0 }, uPulso: { value: 0 },
      uZenite: { value: new THREE.Color(p.ceuZenite) },
      uMeio: { value: new THREE.Color(p.ceuMeio) },
      uHorizonte: { value: new THREE.Color(p.ceuHorizonte) },
      uNuvem: { value: new THREE.Color(p.nuvem) },
      uLuaCor: { value: new THREE.Color(p.lua) },
      uMagia: { value: new THREE.Color(p.magia) },
      uLuaDir: { value: new THREE.Vector3(0.42, 0.52, -0.74).normalize() },
      uGiganteDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
    };
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

  get direcaoLua() { return this.uniformes.uLuaDir.value; }

  /** Troca as cores do céu (para quando outros seres cósmicos aparecerem). */
  definirPaleta({ zenite, meio, horizonte, nuvem } = {}) {
    if (zenite !== undefined) this.uniformes.uZenite.value.set(zenite);
    if (meio !== undefined) this.uniformes.uMeio.value.set(meio);
    if (horizonte !== undefined) this.uniformes.uHorizonte.value.set(horizonte);
    if (nuvem !== undefined) this.uniformes.uNuvem.value.set(nuvem);
  }

  atualizar(tempo, camera, pulso) {
    this.uniformes.uTempo.value = tempo;
    this.uniformes.uPulso.value = pulso;
    this.malha.position.copy(camera.position); // o céu anda junto: nunca se chega nele
  }
}
