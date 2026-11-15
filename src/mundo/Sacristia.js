import * as THREE from 'three';
import { bloco, frasco, placa } from './Aderecos.js';
import { juntarPorMaterial, materiais } from './pecas.js';
import { CHAVE_SACRISTIA, PORTA_SACRISTIA, ATALHO_SACRISTIA } from '../nucleo/Inventario.js';
import { alavancaDeAtalho, gradeDeAtalho } from './FerragensCatedral.js';

export function montarSacristia(mundo, bronze, luzes) {
  const g = mundo.setores.get('sacristia'), c = mundo.colisores, m = materiais();
  const vao = id => mundo.planta.vaos.find(v => v.trava === id);
  const { x, z, largura } = vao('porta-sacristia');
  const porta = portaDaSacristia(g, x, z, largura, m, bronze);
  const colPorta = c.adicionar(x, z, largura, 0.5, 3.75, 0, false);
  placa(g, 'Sacristia', x, 2.38, z - 0.27, 1.44, Math.PI);
  mundo.objetos.push({
    x, y: 1.44, z: z - 0.3, tolerancia: 0.83, acao: 'abrir',
    nome: 'porta da sacristia', chave: CHAVE_SACRISTIA, evento: PORTA_SACRISTIA,
    atualizar(aberta) {
      porta.visible = !aberta;
      colPorta.ativa = !aberta;
    },
  });

  const servico = vao('atalho-sacristia');
  const grade = gradeDeAtalho(g, { x: servico.x, y: 0, z: servico.z, giro: Math.PI / 2,
    largura: servico.largura, altura: 3.4 }, m, bronze);
  const colGrade = c.adicionar(servico.x, servico.z, 0.5, servico.largura, 3.75, 0, false);
  const atualizarAlavanca = alavancaDeAtalho(g, 10.51, 1.515, 7.1, m, bronze);
  mundo.objetos.push({
    x: 10.91, y: 1.53, z: 7.1, acao: 'acionar', nome: 'alavanca da grade',
    evento: ATALHO_SACRISTIA,
    atualizar(aberta) {
      grade.visible = !aberta;
      colGrade.ativa = !aberta;
      atualizarAlavanca(aberta);
    },
  });
  mundo.objetos.push({
    x: 9.7, y: 1.48, z: servico.z, acao: 'informar',
    mensagem: 'Grade fechada · alavanca do lado da sacristia', evento: ATALHO_SACRISTIA,
  });
  placa(g, 'Grade de serviço', 9.72, 3.6, servico.z, 1.42, -Math.PI / 2);
  bloco(g, m.madeira, 18.65, 0.49, 9.95, 3.45, 0.98, 1.06);
  c.adicionar(18.65, 9.95, 3.45, 1.06, 0.98);
  placa(g, 'Vigília do Guardião', 18.64, 1.67, 10.68, 2.07, Math.PI);
  mundo.objetos.push({ x: 18.64, y: 1.67, z: 10.67, acao: 'ler', evento: 'catedral:registro-guardiao' });
  const malhaFrasco = frasco(g, 20.88, 0, 8.25);
  mundo.objetos.push({
    x: 20.88, y: 0.19, z: 8.25, acao: 'recolher', nome: 'frasco de cura',
    evento: 'catedral:frasco-sacristia', atualizar: recolhido => { malhaFrasco.visible = !recolhido; },
  });
  arandela(g, 10.40, 2.36, 7.1, Math.PI / 2, luzes.sacristia, m, bronze);
  arandela(g, x + largura / 2 + 0.34, 2.28, z - 0.15, Math.PI, luzes.porta, m, bronze);
  arandela(mundo.setores.get('claustro'), -18.04, 2.36, 10.60, Math.PI, luzes.claustro, m, bronze);
}

function portaDaSacristia(grupo, x, z, largura, m, bronze) {
  const porta = new THREE.Group();
  porta.position.set(x, 0, z);
  const kit = juntarPorMaterial();
  kit.caixa(0, 1.6, 0, largura, 3.2, 0.14, m.madeiraEscura);
  for (let i = -3; i <= 3; i++) {
    kit.caixa(i * largura / 7, 1.62, 0, largura / 7 - 0.024, 3.08, 0.19, m.madeiraEscura);
  }
  for (const y of [0.53, 2.78]) {
    kit.caixa(0, y, -0.106, largura - 0.11, 0.087, 0.037, m.metal);
    kit.caixa(0, y, 0.116, largura - 0.12, 0.19, 0.057, m.madeiraEscura);
    for (const dx of [-1.42, -0.93, 0, 0.93, 1.42]) {
      kit.geometria(new THREE.OctahedronGeometry(0.049).translate(dx, y, -0.128), bronze);
    }
  }
  kit.caixa(0.48, 1.43, -0.119, 0.23, 0.32, 0.061, bronze);
  kit.geometria(new THREE.TorusGeometry(0.092, 0.019, 5, 12).translate(0.48, 1.375, -0.168), m.metal);
  kit.montar(porta, 'Tábuas e ferragens da Sacristia');
  grupo.add(porta);
  return porta;
}

function arandela(grupo, x, y, z, giro, { cor, intensidade, alcance }, m, bronze) {
  const montagem = new THREE.Group();
  montagem.position.set(x, y, z);
  montagem.rotation.y = giro;
  const kit = juntarPorMaterial();
  kit.caixa(0, -0.095, -0.09, 0.29, 0.35, 0.15, m.cantariaUmidaVeu);
  kit.caixa(0, -0.052, 0.031, 0.085, 0.071, 0.23, bronze);
  kit.geometria(new THREE.CylinderGeometry(0.115, 0.061, 0.068, 6).translate(0, 0, 0.139), bronze);
  kit.caixa(0, 0.09, 0.14, 0.056, 0.13, 0.056, m.quinaGaleria);
  kit.geometria(new THREE.OctahedronGeometry(0.055).scale(0.69, 1.3, 0.69).translate(0, 0.215, 0.14), m.chama);
  kit.montar(montagem, 'Arandela de serviço');
  const luz = new THREE.PointLight(cor, intensidade, alcance);
  luz.position.set(0, 0.29, 0.72);
  montagem.add(luz);
  grupo.add(montagem);
}
