// Efeito de "tremida de vértices" do PS1.
// O PlayStation 1 não tinha precisão para posicionar os cantos dos modelos entre
// dois pixels, então eles "pulavam" de pixel em pixel. Aqui imitamos isso.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Valores compartilhados por todos os materiais (atualizados pelo renderizador).
export const uniformesRetro = {
  uRetroRes: { value: new THREE.Vector2(480, 270) },
  uTremor: { value: CONFIG.render.tremor },
};

const TRECHO = /* glsl */ `
  #include <project_vertex>
  if (uTremor > 0.0 && gl_Position.w > 0.0) {
    vec2 grade = uRetroRes * 0.5 / uTremor;
    vec3 ndc = gl_Position.xyz / gl_Position.w;
    ndc.xy = floor(ndc.xy * grade + 0.5) / grade;
    gl_Position.xyz = ndc * gl_Position.w;
  }
`;

/** Aplica a tremida PS1 a um material do Three.js e devolve o próprio material. */
export function retro(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRetroRes = uniformesRetro.uRetroRes;
    shader.uniforms.uTremor = uniformesRetro.uTremor;
    shader.vertexShader = 'uniform vec2 uRetroRes;\nuniform float uTremor;\n' +
      shader.vertexShader.replace('#include <project_vertex>', TRECHO);
  };
  material.customProgramCacheKey = () => 'retro';
  return material;
}
