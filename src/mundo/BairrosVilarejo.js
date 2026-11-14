import * as THREE from 'three';
import { bloco, placa } from './Aderecos.js';
import { arcoOgival, caixa, materiais, planoDeChao, telhado, tocha } from './pecas.js';
import { retro } from '../render/retro.js';
import { modeloPronto } from '../render/modelos.js';

/** Travessas e pátios entre o Portão Sul, a praça e o pé da catedral. */
export function montarBairrosVilarejo(mundo) {
  const { grupo, colisores } = mundo;
  const m = materiais();
  const lona = retro(new THREE.MeshLambertMaterial({ color: 0x744f53, side: THREE.DoubleSide }));
  const lonaDesbotada = retro(new THREE.MeshLambertMaterial({ color: 0x5c6460, side: THREE.DoubleSide }));
  const muro = (x, z, l, p, altura) => {
    const corpo = bloco(grupo, m.pedraEscura, x, altura / 2, z, l, altura, p);
    const topo = bloco(grupo, m.pedra, x, altura + 0.09, z, l + 0.14, 0.18, p + 0.1);
    const lateral = p > l;
    modeloPronto(grupo, 'rgs-muro', { pos: [x, 0, z], tamanho: [lateral ? p : l, altura + 0.18, lateral ? l : p],
      rotacao: lateral ? Math.PI / 2 : 0, reserva: [corpo, topo], tinta: 0xaea6b4 });
    colisores.adicionar(x, z, l, p, altura + 0.18);
  };
  const pavimento = (x, z, l, p) => planoDeChao(mundo, {
    x, z, l, p, ladrilho: 4.2, material: m.calcamentoChao, ordem: -3.8, y: 0.024,
  });
  const inscricao = (nome, evento, x, y, z) => {
    placa(grupo, nome, x, y, z, 1.55);
    mundo.objetos.push({ x, y, z: z + 0.022, acao: 'ler', evento });
  };

  // A antiga triagem desviava a rua para um arco de inspeção no lado leste.
  muro(-0.6, 37, 9.5, 0.95, 3.05);
  muro(7.62, 37, 1.4, 0.95, 3.05);
  const arco = arcoOgival(2.75, 1.32, 0.27, 0.72, m.pedra);
  arco.position.set(5.54, 2.22, 37);
  grupo.add(arco);
  modeloPronto(grupo, 'rgs-arcada', {
    pos: [5.54, 0, 37], tamanho: [2.99,3.75,0.74], reserva: [arco],
  });
  pavimento(5.54, 37, 3, 12);
  pavimento(2.3, 42.8, 7, 3.2);
  pavimento(2.3, 31.5, 7, 3.2);
  inscricao('Aviso de triagem', 'vilarejo:edital-triagem', 0.7, 1.56, 37.5);

  // O pátio do mercado pode ser atravessado da rua sul até a praça.
  pavimento(16.9, 18.3, 5.1, 23);
  pavimento(10.7, 27.9, 15.1, 4.3);
  pavimento(17.5, 7.2, 9.2, 8);
  muro(20.5, 20.4, 0.75, 12.7, 1.46);
  for (const [z, tecido, altura] of [[13.7, lona, 2.26], [19.6, lonaDesbotada, 2.08], [25.3, lona, 2.16]]) {
    const inicio = grupo.children.length;
    const x = 19.04;
    const cobertura = telhado(2.45, 0.39, 3.08, tecido, m.madeiraEscura, 1.25);
    cobertura.position.set(x, altura, z);
    grupo.add(cobertura);
    for (const dx of [-0.91, 0.91]) {
      for (const dz of [-1.3, 1.3]) {
        bloco(grupo, m.madeiraEscura, x + dx, altura / 2, z + dz, 0.13, altura, 0.13);
        colisores.adicionar(x + dx, z + dz, 0.2, 0.2, altura);
      }
    }
    bloco(grupo, m.madeira, x, 0.83, z, 1.25, 0.16, 1.75);
    bloco(grupo, m.madeiraEscura, x + 0.26, 0.38, z, 0.5, 0.75, 1.45);
    colisores.adicionar(x, z, 1.25, 1.75, 0.91);
    modeloPronto(grupo, z === 19.6 ? 'MarketStand_2' : 'MarketStand_1', {
      pos: [x, 0, z], tamanho: [3.08, altura + 0.39, 2.45], rotacao: -Math.PI / 2,
      reserva: grupo.children.slice(inicio),
    });
  }
  bloco(grupo, m.madeiraEscura, 19, 0.68, 26.9, 0.12, 1.36, 0.12);
  colisores.adicionar(19, 26.9, 0.16, 0.16, 1.36);
  inscricao('Peso do pão', 'vilarejo:contas-do-mercado', 19, 1.35, 27);
  tocha(mundo, { x: 17.9, z: 28.8, altura: 2.05 });
  tocha(mundo, { x: 18.6, z: 10.9, altura: 2.15 });

  // Ossos sem nome à vista da praça, rota entre o adro e o cemitério.
  pavimento(15.4, -42.2, 12.5, 3.9);
  pavimento(22.2, -49.8, 2.8, 16);
  const marco = caixa(1.32, 1.65, 0.54, m.pedraEscura, 1.4);
  marco.position.set(22.1, 0.825, -41.15);
  grupo.add(marco);
  colisores.adicionar(22.1, -41.15, 1.32, 0.54, 1.65);
  const coroa = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.044, 6, 10), m.metal);
  coroa.position.set(22.1, 1.9, -41.15);
  grupo.add(coroa);
  inscricao('Marco dos ausentes', 'vilarejo:marco-dos-ausentes', 22.1, 1.27, -40.86);

  // Dois bairros laterais e um caminho completo atrás da Catedral.
  for (const [x, z, l, p] of [
    [-47.2, 28.6, 5.8, 31], [-23.8, 43.8, 43, 5.5], [-25, 1.2, 53, 5],
    [-47.4, -28.8, 6.3, 52], [-32.2, -52.5, 32, 4.8], [-30, -85.7, 5.5, 66],
    [48.2, -24.8, 5.3, 58], [32, 3.6, 30, 5], [43, -68, 6, 36],
    [32.5, -95, 28, 5], [0, -105.7, 65, 5.8], [-31.5, -98.5, 7, 16],
  ]) pavimento(x, z, l, p);
  for (const [x,z] of [[-47.3,41],[-45.6,6.5],[-48.3,-38.6],[-32.8,-59.4],[48.5,4.8],[48.5,-33.5],[41.7,-66.4],[29,-104],[-24,-106]]) {
    tocha(mundo, { x, z, altura: 2.12, luz: false });
  }
  for (const [x, z, rotacao] of [[-50,26,0],[-42.4,-48,1.6],[51,-37,1.57],[26.4,-103,0],[-20.7,-107,0]]) {
    modeloPronto(grupo, 'Bench_1', { pos: [x, 0, z], tamanho: [2.15, 0.54, 0.61], rotacao });
    colisores.adicionar(x, z, rotacao ? 0.61 : 2.15, rotacao ? 2.15 : 0.61, 0.54);
  }
  for (const [x,z] of [[-53.4, 28.6],[-50.5,-34.2],[53.7,-18],[41,-66.5],[1.4,-108.3]]) {
    modeloPronto(grupo, 'rgs-entulho', { pos: [x,0.025,z], tamanho: [1.9,0.26,1.3], rotacao: z * 0.3 });
  }
  const destinos = [
    [-47.4, 39.6, 'Bairro dos Estábulos', 'vilarejo:livro-dos-estabulos'],
    [49.7, -28.4, 'Largo da Romaria', 'vilarejo:ordem-dos-romeeiros'],
    [-18, -105.5, 'Caminho das Urnas', 'vilarejo:lista-das-urnas'],
  ];
  for (const [x, z, nome, evento] of destinos) {
    bloco(grupo, m.madeiraEscura, x, 0.8, z - 0.08, 0.14, 1.6, 0.14);
    colisores.adicionar(x, z - 0.08, 0.18, 0.18, 1.6);
    inscricao(nome, evento, x, 1.43, z);
  }
}
