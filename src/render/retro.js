// Efeito de "tremida de vértices" do PS1, névoa baixa e contorno frio.
// O PlayStation 1 não tinha precisão para posicionar os cantos dos modelos entre
// dois pixels, então eles "pulavam" de pixel em pixel. Aqui imitamos isso.
// O mesmo gancho acrescenta a NÉVOA BAIXA: um véu azulado que engole a base das
// construções e dos personagens e apaga o chão ao longe (CONFIG.areas.<área>.nevoaBaixa).
// É calculada no próprio pixel de cada material, sem camadas transparentes por cima:
// custa quase nada, inclusive no PC sem placa de vídeo.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Valores compartilhados por todos os materiais (atualizados pelo renderizador e pela Atmosfera).
export const uniformesRetro = {
  uRetroRes: { value: new THREE.Vector2(480, 270) },
  uTremor: { value: CONFIG.render.estilos.ps1.tremor },
  uBrumaCor: { value: new THREE.Color(0x1c2550) },
  uBrumaAltura: { value: 2.2 },     // m: até onde a névoa baixa sobe
  uBrumaForca: { value: 0 },        // 0 = sem névoa baixa
  uBrumaPerto: { value: 3 },        // m: perto do caçador ela some (o chão aos pés fica nítido)
  uBrumaLonge: { value: 28 },       // m: daqui em diante ela está inteira
  uBrumaBandas: { value: 0 },       // PS1: degraus de névoa (0 = suave, como no HD)
  uTempo: { value: 0 },
  uContornoCor: { value: new THREE.Color(0x4a66c8) },   // luz de contorno dos personagens
  uContornoForca: { value: 0.6 },
};

const VERTICE = /* glsl */ `
  #include <project_vertex>
  {
    vec4 mundo = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      mundo = instanceMatrix * mundo;
    #endif
    vMundoPos = (modelMatrix * mundo).xyz;
  }
  if (uTremor > 0.0 && gl_Position.w > 0.0) {
    vec2 grade = uRetroRes * 0.5 / uTremor;
    vec3 ndc = gl_Position.xyz / gl_Position.w;
    ndc.xy = floor(ndc.xy * grade + 0.5) / grade;
    gl_Position.xyz = ndc * gl_Position.w;
  }
`;

const BRUMA = /* glsl */ `
  #include <fog_fragment>
  if (uBrumaForca > 0.0) {
    float bAltura = 1.0 - smoothstep(0.0, uBrumaAltura, vMundoPos.y);
    float bDist = smoothstep(uBrumaPerto, uBrumaLonge, distance(vMundoPos, cameraPosition));
    // Ondula devagar com o vento: a névoa nunca fica parada.
    float bOnda = 0.72 + 0.28 * sin(vMundoPos.x * 0.21 + uTempo * 0.35) * sin(vMundoPos.z * 0.17 - uTempo * 0.27);
    float b = clamp(bAltura * bDist * bOnda * uBrumaForca, 0.0, 1.0);
    if (uBrumaBandas > 0.0) b = floor(b * uBrumaBandas + 0.5) / uBrumaBandas;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uBrumaCor, b);
  }
`;

// Contorno frio (rim light): a borda do personagem pega a cor do luar, como nas referências.
const CONTORNO = /* glsl */ `
  #include <emissivemap_fragment>
  {
    float borda = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
    totalEmissiveRadiance += uContornoCor * uContornoForca * pow(borda, 3.0);
  }
`;

const DECLARAR_VERTICE = 'uniform vec2 uRetroRes;\nuniform float uTremor;\nvarying vec3 vMundoPos;\n';
const DECLARAR_FRAGMENTO = `varying vec3 vMundoPos;
uniform vec3 uBrumaCor; uniform float uBrumaAltura; uniform float uBrumaForca;
uniform float uBrumaPerto; uniform float uBrumaLonge; uniform float uBrumaBandas; uniform float uTempo;
uniform vec3 uContornoCor; uniform float uContornoForca;
`;

/**
 * Aplica a tremida PS1 e a névoa baixa a um material do Three.js e devolve o próprio material.
 * `contorno: true` acrescenta a luz fria de contorno (personagens).
 */
export function retro(material, { contorno = false } = {}) {
  material.onBeforeCompile = (shader) => {
    // Só materiais prontos do Three têm os trechos onde o efeito entra.
    if (!shader.vertexShader.includes('#include <project_vertex>') || !shader.fragmentShader.includes('#include <fog_fragment>')) return;
    Object.assign(shader.uniforms, uniformesRetro);
    shader.vertexShader = DECLARAR_VERTICE + shader.vertexShader.replace('#include <project_vertex>', VERTICE);
    let frag = DECLARAR_FRAGMENTO + shader.fragmentShader.replace('#include <fog_fragment>', BRUMA);
    // Só os materiais com luz têm normal e vViewPosition (o básico não tem).
    if (contorno && frag.includes('#include <emissivemap_fragment>') && frag.includes('vViewPosition')) {
      frag = frag.replace('#include <emissivemap_fragment>', CONTORNO);
    }
    shader.fragmentShader = frag;
  };
  material.customProgramCacheKey = () => (contorno ? 'retro-contorno' : 'retro');
  return material;
}
