// =============================================================================
//  O GIGANTE ENCAPUZADO
//  Um ser cósmico imenso, parado no horizonte. Ele NUNCA luta: só observa.
//  É uma silhueta escura cuja base some na névoa, com dois olhos verdes.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { texturas } from '../render/texturas.js';

const VERT = /* glsl */ `
  varying vec3 vNormal;
  varying float vAltura;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vAltura = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying float vAltura;
  uniform vec3 uCor, uBruma, uLuz, uLuaDir;
  void main() {
    vec3 n = normalize(vNormal);
    // Luz da lua só de raspão, num dos lados (como na referência).
    float borda = pow(max(dot(n, normalize(uLuaDir)), 0.0), 1.5);
    vec3 cor = uCor + uLuz * borda * 0.20;
    // Quanto mais baixo, mais dissolvido na névoa do horizonte.
    float bruma = 1.0 - smoothstep(0.0, 0.5, vAltura);
    cor = mix(cor, uBruma, 0.1 + 0.9 * bruma);
    gl_FragColor = vec4(cor, 1.0);
  }
`;

export class Gigante {
  /** altura em metros; posicao = onde ficam os "pés" (longe, atrás do vilarejo). */
  constructor(cena, direcaoLua, { altura = 430, posicao = new THREE.Vector3(0, -40, -520) } = {}) {
    const p = CONFIG.paleta;
    this.grupo = new THREE.Group();
    this.grupo.position.copy(posicao);
    this.grupo.scale.setScalar(altura);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, fog: false,
      uniforms: {
        uCor: { value: new THREE.Color(0x070b2c) },
        uBruma: { value: new THREE.Color(p.ceuHorizonte) },
        uLuz: { value: new THREE.Color(p.luzLua) },
        uLuaDir: { value: direcaoLua },
      },
    });

    // Corpo: um perfil girado (como num torno de oleiro). Altura total = 1.
    const perfil = [
      [0.64, 0.0], [0.53, 0.2], [0.43, 0.39], [0.35, 0.53], [0.29, 0.62], [0.22, 0.675],
      [0.16, 0.705], [0.185, 0.75], [0.2, 0.80], [0.19, 0.86], [0.15, 0.91], [0.09, 0.96], [0.0, 1.0],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    // toNonIndexed + computeVertexNormals = faces "chapadas" (visual low-poly).
    const geoCorpo = new THREE.LatheGeometry(perfil, 10).toNonIndexed();
    geoCorpo.computeVertexNormals();
    const corpo = new THREE.Mesh(geoCorpo, material);
    corpo.scale.z = 0.6; // mais largo de ombros do que fundo
    this.grupo.add(corpo);

    // Vazio escuro dentro do capuz.
    const rosto = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 8),
      new THREE.MeshBasicMaterial({ color: 0x02030f, fog: false }),
    );
    rosto.scale.set(1, 1.3, 1);
    rosto.position.set(0, 0.815, 0.125);
    this.grupo.add(rosto);

    // Olhos: dois losangos verdes inclinados + um halo.
    this.matOlho = new THREE.MeshBasicMaterial({ color: p.magia, fog: false });
    this.matHalo = new THREE.SpriteMaterial({
      map: texturas().brilho, color: p.magia, fog: false,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    const forma = new THREE.Shape();
    forma.moveTo(-0.03, 0.004); forma.lineTo(0.024, 0.016); forma.lineTo(0.03, -0.004); forma.lineTo(-0.012, -0.012);
    const geoOlho = new THREE.ShapeGeometry(forma);
    for (const lado of [-1, 1]) {
      const olho = new THREE.Mesh(geoOlho, this.matOlho);
      olho.scale.x = -lado;
      olho.position.set(lado * 0.05, 0.845, 0.13);
      const halo = new THREE.Sprite(this.matHalo);
      halo.scale.set(0.11, 0.07, 1);
      halo.position.set(lado * 0.05, 0.845, 0.133);
      this.grupo.add(olho, halo);
    }

    cena.add(this.grupo);
    this.pulso = 0;
    this.corOlho = new THREE.Color(p.magia);
  }

  /** Direção (a partir do centro do vilarejo) em que fica a cabeça: usada pelo céu. */
  direcaoCabeca(alvo = new THREE.Vector3()) {
    return alvo.copy(this.grupo.position).add(new THREE.Vector3(0, this.grupo.scale.y * 0.85, 0)).normalize();
  }

  atualizar(tempo) {
    // Respiração lentíssima e um leve balanço: ele está vivo, mas não se mexe.
    this.pulso = 0.5 + 0.5 * Math.sin(tempo * 0.45);
    this.grupo.rotation.y = Math.sin(tempo * 0.07) * 0.035;
    this.grupo.scale.y = this.grupo.scale.x * (1 + Math.sin(tempo * 0.22) * 0.006);
    const brilho = 0.8 + 0.5 * this.pulso;
    this.matOlho.color.copy(this.corOlho).multiplyScalar(brilho);
    this.matHalo.opacity = 0.35 + 0.4 * this.pulso;
  }
}
