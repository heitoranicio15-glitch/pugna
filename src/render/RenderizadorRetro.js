// =============================================================================
//  RENDERIZADOR RETRÔ
//  1) Desenha o jogo numa imagem pequena (ex.: 480x270).
//  2) Amplia essa imagem para a tela inteira SEM suavizar (pixels grandes).
//  3) No caminho, reduz a quantidade de cores com pontilhado (dithering),
//     como nos consoles dos anos 90.
// =============================================================================
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { uniformesRetro } from './retro.js';

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tCena;
  uniform vec2 uRes;       // resolução interna
  uniform float uNiveis;   // tons por canal
  uniform float uDither;
  uniform float uEscurecer; // 0 = normal, 1 = preto (usado em transições)
  uniform float uBrilho;
  varying vec2 vUv;

  // Matriz de Bayer 4x4: o padrão clássico de pontilhado.
  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    float m[16];
    m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
    m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
    m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
    m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
    float v = 0.0;
    for (int k = 0; k < 16; k++) if (k == i) v = m[k];
    return v / 16.0 - 0.5;
  }

  void main() {
    vec2 px = floor(vUv * uRes);
    vec3 cor = texture2D(tCena, (px + 0.5) / uRes).rgb;

    // Vinheta suave: escurece os cantos e puxa o olhar para o centro.
    vec2 c = vUv - 0.5;
    cor *= 1.0 - dot(c, c) * 0.85;

    // Converte de luz "linear" para as cores da tela (sRGB), com um leve contraste.
    cor = pow(max(cor * uBrilho, 0.0), vec3(1.0 / 2.2));
    cor = mix(cor, cor * cor * (3.0 - 2.0 * cor), 0.35);

    // Reduz as cores com pontilhado.
    cor += bayer(px) * uDither / uNiveis;
    cor = floor(cor * uNiveis + 0.5) / uNiveis;

    gl_FragColor = vec4(cor * (1.0 - uEscurecer), 1.0);
  }
`;

export class RenderizadorRetro {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = true;
    container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    // Imagem interna pequena, sem suavização.
    this.alvo = new THREE.WebGLRenderTarget(480, 270, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
      depthBuffer: true,
    });

    // Um retângulo que cobre a tela e mostra a imagem interna com o filtro.
    this.uniformes = {
      tCena: { value: this.alvo.texture },
      uRes: { value: new THREE.Vector2(480, 270) },
      uNiveis: { value: CONFIG.render.niveisDeCor },
      uDither: { value: CONFIG.render.forcaDither },
      uEscurecer: { value: 0 },
      uBrilho: { value: 1 },
    };
    this.cenaFinal = new THREE.Scene();
    this.cameraFinal = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.cenaFinal.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: this.uniformes,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: FRAG,
        depthTest: false, depthWrite: false,
      }),
    ));

    this.proporcao = 16 / 9;
    this.alturaInterna = CONFIG.render.alturaInterna;
    addEventListener('resize', () => this.ajustarTamanho());
    this.ajustarTamanho();
  }

  ajustarTamanho() {
    const l = innerWidth, a = innerHeight;
    this.proporcao = l / a;
    const altura = this.alturaInterna;
    const largura = Math.max(2, Math.round(altura * this.proporcao / 2) * 2);
    this.renderer.setSize(l, a, false);
    this.alvo.setSize(largura, altura);
    this.uniformes.uRes.value.set(largura, altura);
    uniformesRetro.uRetroRes.value.set(largura, altura);
  }

  aplicarPreferencias({ resolucao, brilho, tremor }) {
    this.uniformes.uBrilho.value = brilho / 100;
    uniformesRetro.uTremor.value = tremor ? CONFIG.render.tremor : 0;
    if (resolucao === this.alturaInterna) return;
    this.alturaInterna = resolucao;
    this.ajustarTamanho();
  }

  /** Desenha a cena do mundo e, se houver, uma segunda cena por cima (sobreposição). */
  desenhar(cena, camera, cenaArma, cameraArma) {
    const r = this.renderer;
    r.setRenderTarget(this.alvo);
    r.autoClear = true;
    r.render(cena, camera);
    if (cenaArma) {
      r.autoClear = false;
      r.clearDepth();           // a arma nunca atravessa paredes
      r.render(cenaArma, cameraArma);
      r.autoClear = true;
    }
    r.setRenderTarget(null);
    r.render(this.cenaFinal, this.cameraFinal);
  }
}
