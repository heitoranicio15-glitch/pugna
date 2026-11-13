import * as THREE from 'three';
import { Colisores } from './Colisores.js';
import { caixa, materiais, tocha, animarTochas } from './pecas.js';
import { retro } from '../render/retro.js';

export class Catedral {
  constructor(cena) {
    this.grupo = new THREE.Group();
    this.colisores = new Colisores();
    this.tochas = [];
    this.nevoa = new THREE.FogExp2(0x19162d, 0.027);
    this.grupo.add(new THREE.HemisphereLight(0x9995d8, 0x33233b, 0.95));
    cena.add(this.grupo);

    const m = materiais();
    const metalDourado = retro(new THREE.MeshLambertMaterial({ color: 0xb78843, map: m.metal.map }));
    const brasa = retro(new THREE.MeshBasicMaterial({ color: 0xffac65 }));
    const luar = retro(new THREE.MeshBasicMaterial({ color: 0x8dcfff }));
    const pano = retro(new THREE.MeshLambertMaterial({ color: 0x76264b, map: m.madeira.map }));
    const bloc = (x, y, z, l, a, p, mat) => {
      const malha = caixa(l, a, p, mat);
      malha.position.set(x, y, z);
      this.grupo.add(malha);
      return malha;
    };
    const parede = (x, z, l, p, a = 7, mat = m.pedra) => {
      bloc(x, a / 2, z, l, a, p, mat);
      return this.colisores.adicionar(x, z, l, p);
    };
    const movel = (x, z, l, a, p, mat) => {
      bloc(x, a / 2, z, l, a, p, mat);
      this.colisores.adicionar(x, z, l, p, a);
    };
    const piso = (x, z, l, p, altura) => {
      const base = bloc(x, -0.14, z, l, 0.28, p, m.calcamentoChao);
      base.renderOrder = -6;
      bloc(x, altura + 0.25, z, l, 0.5, p, m.pedraEscura);
    };
    const luz = (x, y, z, cor, intensidade, alcance) => {
      const ponto = new THREE.PointLight(cor, intensidade, alcance, 1.7);
      ponto.position.set(x, y, z);
      this.grupo.add(ponto);
    };

    // Nave, duas capelas laterais e o santuário atrás da grade.
    piso(0, -2, 16, 22, 10);
    piso(-15, -5, 14, 14, 7);
    piso(15, -5, 14, 14, 7);
    piso(0, -23, 22, 20, 12);
    parede(0, 9, 16, 0.7, 10);
    parede(0, -33, 22, 0.7, 12);
    for (const lado of [-1, 1]) {
      parede(lado * 8, 3.25, 0.65, 11.5, 10);
      parede(lado * 8, -10, 0.65, 6, 10);
      bloc(lado * 8, 8.5, -4.75, 0.65, 3, 4.5, m.pedraEscura);
      parede(lado * 15, 2, 14, 0.65);
      parede(lado * 15, -12, 14, 0.65);
      parede(lado * 22, -5, 0.65, 14);
      parede(lado * 11, -23, 0.7, 20, 12);
      parede(lado * 6.65, -13, 8.7, 0.7, 12);
    }
    bloc(0, 7.75, -13, 4.6, 8.5, 0.8, m.pedraEscura);

    // Nervuras, colunas e bancos da nave deixam o corredor central livre.
    for (const z of [5, 0, -10]) {
      for (const lado of [-1, 1]) {
        parede(lado * 6.8, z, 0.8, 0.9, 6.2, m.pedraEscura);
        bloc(lado * 3.45, 7.95, z, 7.6, 0.35, 0.5, m.pedraEscura).rotation.z = -lado * 0.48;
      }
    }
    for (const z of [2, -0.4, -7.7, -10.1]) {
      for (const lado of [-1, 1]) {
        movel(lado * 4.25, z, 3.1, 0.48, 0.5, m.madeira);
        bloc(lado * 4.25, 0.69, z + 0.22, 3.1, 0.43, 0.12, m.madeira);
      }
    }
    for (const x of [-5.8, 5.8]) tocha(this, { x, z: 5.4 });

    // A entrada e a grade têm silhuetas próprias para orientar o retorno.
    bloc(0, 2.1, 8.59, 3.7, 4.2, 0.18, m.madeira);
    bloc(0, 4.25, 8.43, 4.3, 0.36, 0.45, m.pedraEscura);
    bloc(0, 0.12, 8.41, 3.1, 0.12, 0.09, luar);
    luz(0, 1.8, 7.75, 0x719dff, 17, 8);

    this.grade = new THREE.Group();
    for (const x of [-1.95, -1.3, -0.65, 0, 0.65, 1.3, 1.95]) {
      const barra = caixa(0.15, 3.55, 0.18, metalDourado);
      barra.position.set(x, 1.77, -13);
      this.grade.add(barra);
    }
    for (const y of [0.55, 2.6]) {
      const travessa = caixa(4.5, 0.17, 0.25, metalDourado);
      travessa.position.set(0, y, -13);
      this.grade.add(travessa);
    }
    this.grupo.add(this.grade);
    this.bloqueio = this.colisores.adicionar(0, -13, 4.6, 0.4);
    this.indicadores = [
      bloc(-2.7, 1.9, -12.6, 0.34, 0.48, 0.14, m.metal),
      bloc(2.7, 1.9, -12.6, 0.34, 0.48, 0.14, m.metal),
    ];

    // Ossário a oeste. As fileiras de nichos conduzem ao pedestal.
    for (const z of [-10, -7.5, -2.5, 0]) {
      movel(-19.8, z, 2.8, 0.77, 1.3, m.pedraEscura);
      for (const x of [-20.5, -19.8, -19.1]) {
        const cranio = bloc(x, 0.93, z, 0.27, 0.29, 0.25, metalDourado);
        cranio.rotation.y = Math.PI / 5;
      }
    }
    for (const z of [-9.9, 0.4]) tocha(this, { x: -14.2, z });

    // Relicário a leste. Vitrais frios iluminam os relicários e o selo.
    for (const z of [-10, -5, 0]) {
      bloc(21.61, 4, z, 0.15, 3.7, 1.8, m.vitral);
      bloc(21.59, 6, z, 0.14, 1.25, 1.25, m.vitral).rotation.x = Math.PI / 4;
    }
    for (const z of [-9.4, -0.5]) {
      movel(18.5, z, 2, 0.8, 1.2, m.pedraEscura);
      bloc(18.5, 1.01, z, 1.35, 0.42, 0.72, metalDourado);
    }
    luz(16.5, 3.6, -5, 0x668eff, 46, 16);

    this.selos = [
      { id: 'ossario', x: -20, z: -5, nome: 'Selo do Ossário', material: brasa, cor: 0xff824a },
      { id: 'relicario', x: 20, z: -5, nome: 'Selo do Relicário', material: luar, cor: 0x88baff },
    ];
    for (const selo of this.selos) {
      movel(selo.x, selo.z, 1.05, 1.05, 1.05, m.pedraEscura);
      selo.malha = new THREE.Mesh(new THREE.OctahedronGeometry(0.39), selo.material);
      selo.malha.position.set(selo.x, 1.65, selo.z);
      this.grupo.add(selo.malha);
      luz(selo.x, 2.05, selo.z, selo.cor, 15, 8);
    }

    // Santuário. O corredor central termina no altar, com espaço para esquivar.
    for (const lado of [-1, 1]) {
      for (const z of [-17.6, -23.5, -29.5]) {
        parede(lado * 8.6, z, 1.2, 1.2, 11, m.pedraEscura);
        bloc(lado * 8, 4.2, z, 0.13, 3.1, 1.12, pano);
      }
      tocha(this, { x: lado * 6, z: -29.5 });
    }
    movel(0, -30, 5.7, 0.8, 2.1, m.pedraEscura);
    bloc(0, 2.6, -32.58, 4.2, 5.1, 0.2, m.vitral);
    luz(0, 4, -29, 0xa466eb, 63, 19);
    luz(0, 4.2, -17.3, 0xd3a6ed, 27, 15);

    this.saida = { x: 0, z: 8.45 };
    this.entrada = { x: 0, z: 6, yaw: 0 };
    this.portao = { x: 0, z: -12.4 };
    this.altar = { x: 0, z: -28.8 };
    this.pontosDeDescanso = [{ id: 'nave-do-veu', x: 4.55, z: 6.55, olhar: Math.PI }];
    this.inimigos = [
      { tipo: 'penitente', rota: [[-13, -5], [-17, -7], [-16, -2.8]] },
      { tipo: 'penitente', rota: [[15, -5], [18, -3], [18, -7]] },
      { tipo: 'cacador', rota: [[13, -9], [13, -2]] },
      { tipo: 'guardiao', rota: [[0, -24], [0, -26]], limiteZ: -13.7 },
    ];
  }

  aplicarProgresso(selos) {
    for (const [indice, selo] of this.selos.entries()) {
      const obtido = selos.includes(selo.id);
      selo.malha.visible = !obtido;
      this.indicadores[indice].material = obtido ? selo.material : materiais().metal;
    }
    this.bloqueio.ativa = !this.selos.every((selo) => selos.includes(selo.id));
    this.grade.visible = this.bloqueio.ativa;
  }

  atualizar(dt, tempo) {
    animarTochas(this.tochas, tempo);
    for (const selo of this.selos) {
      selo.malha.rotation.y = tempo * 1.7;
      selo.malha.position.y = 1.65 + Math.sin(tempo * 2.5) * 0.13;
    }
  }
}
