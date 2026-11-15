import * as THREE from 'three';
import { bloco, frasco, placa } from './Aderecos.js';
import { juntarPorMaterial, materiais } from './pecas.js';
import { CHAVE_SACRISTIA, PORTA_SACRISTIA, ATALHO_SACRISTIA } from '../nucleo/Inventario.js';

export function montarSacristia(mundo) {
  const g = mundo.setores.get('sacristia'), c = mundo.colisores, m = materiais();
  const vao = id => mundo.planta.vaos.find(v => v.trava === id);
  const { x, z, largura } = vao('porta-sacristia');
  const porta = bloco(g, m.madeiraEscura, x, 1.6, z, largura, 3.2, 0.22);
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
  const grade = new THREE.Group();
  grade.position.set(servico.x, 0, servico.z);
  g.add(grade);
  const barras = juntarPorMaterial();
  for (const dz of [-1.52, -1.02, -0.51, 0, 0.51, 1.02, 1.52]) barras.caixa(0, 1.7, dz, 0.13, 3.4, 0.12, m.metal);
  for (const y of [0.52, 2.65]) barras.caixa(0.11, y, 0, 0.09, 0.13, 3.5, m.metal);
  barras.montar(grade, 'grade de serviço');
  const colGrade = c.adicionar(servico.x, servico.z, 0.5, servico.largura, 3.75, 0, false);
  bloco(g, m.metal, 10.37, 1.45, 7.1, 0.22, 0.59, 0.36);
  const haste = bloco(g, m.metal, 10.67, 1.53, 7.1, 0.38, 0.085, 0.105);
  const punho = bloco(g, m.madeira, 10.91, 1.53, 7.1, 0.1, 0.14, 0.18);
  const indicador = new THREE.PointLight(0xffad65, 6, 3.5, 1.8);
  indicador.position.set(10.96, 1.8, 7.1);
  g.add(indicador);
  mundo.objetos.push({
    x: 10.91, y: 1.53, z: 7.1, acao: 'acionar', nome: 'alavanca da grade',
    evento: ATALHO_SACRISTIA,
    atualizar(aberta) {
      grade.visible = !aberta;
      colGrade.ativa = !aberta;
      haste.rotation.z = aberta ? -0.55 : 0.24;
      punho.position.y = aberta ? 1.32 : 1.53;
      indicador.color.setHex(aberta ? 0xa4dc8c : 0xffad65);
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
}
