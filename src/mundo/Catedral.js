import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Colisores } from './Colisores.js';
import { abobadaOgival, arcoOgival, caixa, colunaFacetada, materiais, tocha, animarTochas } from './pecas.js';
import { retro } from '../render/retro.js';
import { placa } from './Aderecos.js';
import { montarSacristia } from './Sacristia.js';
import { feixeDeLuz, sombrasDeContato } from './efeitosCenario.js';
import { montarAtmosfera } from './Atmosfera.js';

const C = CONFIG.areas.catedral;

export class Catedral {
  constructor(cena) {
    this.id = 'catedral';
    this.nome = 'Catedral do Véu';
    this.usaCeu = false;
    this.limites = { minX: -22, maxX: 22, minZ: -33, maxZ: 9 };
    this.grupo = new THREE.Group();
    this.colisores = new Colisores();
    this.tochas = [];
    this.objetos = [];
    montarAtmosfera(this, C);
    cena.add(this.grupo);

    const m = materiais();
    const metalDourado = retro(new THREE.MeshLambertMaterial({ color: 0xb78843, map: m.metal.map }));
    const brasa = retro(new THREE.MeshBasicMaterial({ color: 0xffac65 }));
    const luar = retro(new THREE.MeshBasicMaterial({ color: 0x8dcfff }));
    const pano = retro(new THREE.MeshLambertMaterial({ color: 0x76264b, map: m.madeira.map }));
    const osso = retro(new THREE.MeshLambertMaterial({ color: 0xd2ad86 }));
    const escuro = retro(new THREE.MeshBasicMaterial({ color: 0x171022 }));
    const gotico = (x, y, z, l, flecha, espessura, p, rotacao = 0, mat = m.pedraEscura) => {
      const arco = arcoOgival(l, flecha, espessura, p, mat);
      arco.position.set(x, y, z);
      arco.rotation.y = rotacao;
      this.grupo.add(arco);
    };
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
    const piso = (x, z, l, p, altura, ladrilho, mat = m.lajesChao) => {
      const base = new THREE.Mesh(new THREE.PlaneGeometry(l, p), mat);
      const uv = base.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (x + (uv.getX(i) - 0.5) * l) / ladrilho, (-z + (uv.getY(i) - 0.5) * p) / ladrilho);
      }
      base.position.set(x, 0, z);
      base.rotation.x = -Math.PI / 2;
      base.renderOrder = -6;
      this.grupo.add(base);
      bloc(x, altura + 0.25, z, l, 0.5, p, m.pedraEscura);
    };
    const luz = (x, y, z, cor, intensidade, alcance) => {
      const ponto = new THREE.PointLight(cor, intensidade, alcance, 1.7);
      ponto.position.set(x, y, z);
      this.grupo.add(ponto);
    };

    // Nave, duas capelas laterais e o santuário atrás da grade.
    piso(0, -2, 16, 22, 10, 5.2);
    piso(-15, -5, 14, 14, 7, 4);
    piso(15, -5, 14, 14, 7, 4);
    piso(0, -23, 22, 20, 12, 7.5, m.mosaicoChao);
    parede(0, 9, 16, 0.7, 10);
    parede(0, -33, 22, 0.7, 12);
    for (const lado of [-1, 1]) {
      if (lado < 0) parede(-8, 3.25, 0.65, 11.5, 10);
      else {
        parede(8, 0.8625, 0.65, 6.725, 10);
        parede(8, 8.0375, 0.65, 1.925, 10);
      }
      parede(lado * 8, -10, 0.65, 6, 10);
      bloc(lado * 8, 8.55, -4.75, 0.65, 2.9, 4.5, m.pedraEscura);
      gotico(lado * 7.8, 4.05, -4.75, 3.85, 2.7, 0.34, 0.84, Math.PI / 2);
      luz(lado * 9.15, 3, -5.2, lado < 0 ? 0xff8646 : 0x638dff, 32, 10);
      if (lado < 0) parede(-15, 2, 14, 0.65);
      else for (const x of [10.8, 19.2]) parede(x, 2, 5.6, 0.65);
      parede(lado * 15, -12, 14, 0.65);
      parede(lado * 22, -5, 0.65, 14);
      parede(lado * 11, -23, 0.7, 20, 12);
      parede(lado * 6.65, -13, 8.7, 0.7, 12);
    }
    this.passagens = [
      { x: -7.6, z: -4.75, nome: 'Ossário' },
      { x: 7.6, z: -4.75, nome: 'Relicário' },
    ];
    bloc(0, 7.75, -13, 4.6, 8.5, 0.8, m.pedraEscura);
    gotico(0, 3.55, -12.54, 4.15, 2.75, 0.36, 0.58);

    // Nervuras, colunas e bancos da nave deixam o corredor central livre.
    const sombrasNave = [];
    for (const z of [5, 0, -10]) {
      for (const lado of [-1, 1]) {
        const coluna = colunaFacetada(5.42, 0.44, m.pedra, m.pedraEscura);
        coluna.position.set(lado * 6.8, 0, z);
        this.grupo.add(coluna);
        this.colisores.adicionar(lado * 6.8, z, 0.98, 0.98);
        sombrasNave.push([lado * 6.8, z, 2.65, 2.65]);
      }
      gotico(0, 5.15, z, 13.35, 4.6, 0.34, 0.48, 0, m.pedra);
    }
    const abobada = abobadaOgival(14.1, 4.87, 22, m.pedraEscura);
    abobada.position.set(0, 5.15, -2);
    this.grupo.add(abobada);
    bloc(0, 9.89, -2.2, 0.34, 0.24, 20, m.pedra);
    for (const z of [2, -0.4, -7.7, -10.1]) {
      for (const lado of [-1, 1]) {
        movel(lado * 4.25, z, 3.1, 0.48, 0.5, m.madeira);
        bloc(lado * 4.25, 0.69, z + 0.22, 3.1, 0.43, 0.12, m.madeira);
        sombrasNave.push([lado * 4.25, z, 4.2, 1.75]);
      }
    }
    sombrasDeContato(this.grupo, sombrasNave);
    for (const x of [-5.8, 5.8]) tocha(this, { x, z: 5.4 });
    luz(0, 3.2, -6.3, 0xbca3df, 15, 12);

    // A entrada e a grade têm silhuetas próprias para orientar o retorno.
    bloc(0, 2.1, 8.59, 3.7, 4.2, 0.18, m.madeira);
    gotico(0, 4.13, 8.42, 3.7, 2.1, 0.31, 0.52);
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
    this.indicadores = [-2.68, 2.68].map((x) => {
      const aro = new THREE.Mesh(new THREE.RingGeometry(0.31, 0.43, 4), metalDourado);
      aro.position.set(x, 1.93, -12.46);
      this.grupo.add(aro);
      const cavidade = new THREE.Mesh(new THREE.CircleGeometry(0.31, 4), escuro);
      cavidade.position.set(x, 1.93, -12.47);
      this.grupo.add(cavidade);
      const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.26), luar);
      cristal.position.set(x, 1.93, -12.32);
      this.grupo.add(cristal);
      return cristal;
    });

    // Ossário a oeste. As fileiras de nichos conduzem ao pedestal.
    for (const [indice, z] of [-10, -7.5, -2.5, 0].entries()) {
      movel(-20.76, z, 1.5, 0.83, 1.6, m.pedraEscura);
      bloc(-21.61, 1.65, z, 0.12, 1.75, 1.66, escuro);
      gotico(-21.46, 2.47, z, 1.61, 0.96, 0.21, 0.45, Math.PI / 2);
      placa(this.grupo, `Vigília ${indice + 1}`, -21.35, 1.63, z, 0.96, Math.PI / 2);
      for (const dz of [-0.45, 0, 0.45]) {
        const cranio = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 0), osso);
        cranio.position.set(-20.6, 1.05, z + dz);
        cranio.scale.set(0.86, 1.08, 0.9);
        this.grupo.add(cranio);
        bloc(-20.48, 0.94, z + dz, 0.16, 0.13, 0.18, osso);
        for (const olho of [-0.055, 0.055]) bloc(-20.434, 1.07, z + dz + olho, 0.045, 0.055, 0.055, escuro);
      }
    }
    for (const z of [-9.9, 0.4]) tocha(this, { x: -14.2, z });
    this.objetos.push({
      x: -21.29, y: 1.63, z: -7.5, acao: 'ler', evento: 'catedral:registro-ossario',
    });

    // Relicário a leste. Vitrais frios iluminam os relicários e o selo.
    for (const z of [-10, -5, 0]) {
      bloc(21.61, 4, z, 0.15, 3.7, 1.8, m.vitral);
      gotico(21.45, 5.83, z, 1.8, 1.35, 0.2, 0.24, Math.PI / 2);
    }
    for (const z of [-9.4, -0.5]) {
      movel(18.5, z, 2, 0.8, 1.2, m.pedraEscura);
      bloc(18.5, 1.01, z, 1.35, 0.42, 0.72, metalDourado);
    }
    placa(this.grupo, 'Registro do Relicário', 18.5, 1.08, -0.1, 1.18);
    this.objetos.push({
      x: 18.5, y: 1.11, z: -0.08, acao: 'ler', evento: 'catedral:registro-relicario',
    });
    for (const x of [10, 12, 14, 16, 18, 20]) {
      bloc(x, 0.012, -4.98, 0.22, 0.024, 0.22, metalDourado).rotation.y = Math.PI / 4;
    }
    luz(16.5, 3.6, -5, 0x668eff, 46, 16);
    montarSacristia(this);

    this.selos = [
      { id: 'ossario', x: -20, z: -5, nome: 'Selo do Ossário', material: brasa, cor: 0xff824a },
      { id: 'relicario', x: 20, z: -5, nome: 'Selo do Relicário', material: luar, cor: 0x88baff },
    ];
    for (const selo of this.selos) {
      movel(selo.x, selo.z, 1.05, 1.05, 1.05, m.pedraEscura);
      selo.malha = new THREE.Mesh(new THREE.OctahedronGeometry(0.39), selo.material);
      selo.malha.position.set(selo.x, 1.65, selo.z);
      this.grupo.add(selo.malha);
      selo.luz = new THREE.PointLight(selo.cor, 15, 8, 1.7);
      selo.luz.position.set(selo.x, 2.05, selo.z);
      this.grupo.add(selo.luz);
    }

    // Santuário. O corredor central termina no altar, com espaço para esquivar.
    for (const lado of [-1, 1]) {
      for (const z of [-17.6, -23.5, -29.5]) {
        const coluna = colunaFacetada(7.8, 0.56, m.pedra, m.pedraEscura);
        coluna.position.set(lado * 8.6, 0, z);
        this.grupo.add(coluna);
        this.colisores.adicionar(lado * 8.6, z, 1.2, 1.2);
        bloc(lado * 8, 4.2, z, 0.13, 3.1, 1.12, pano);
      }
      tocha(this, { x: lado * 6, z: -29.5 });
    }
    movel(0, -30, 5.7, 0.8, 2.1, m.pedraEscura);
    bloc(0, 2.6, -32.58, 4.2, 5.1, 0.2, m.vitral);
    luz(0, 4, -29, 0xa466eb, 63, 19);
    luz(0, 4.2, -17.3, 0xd3a6ed, 27, 15);
    for (const feixe of C.feixes) feixeDeLuz(this.grupo, feixe);

    this.saida = { x: 0, z: 8.45 };
    this.entrada = { x: 0, z: 6, yaw: 0 };
    this.portais = [{ ...this.saida, raio: 2.35, destino: 'vilarejo', texto: 'E — voltar ao vilarejo' }];
    this.chegadas = { vilarejo: this.entrada };
    this.portao = { x: 0, z: -12.4 };
    this.altar = { x: 0, z: -28.8 };
    this.pontosDeDescanso = [{ id: 'nave-do-veu', nome: 'Nave do Véu', x: 4.55, z: 6.55, olhar: Math.PI }];
    this.inimigos = [
      { tipo: 'penitente', rota: [[-13, -5], [-17, -7], [-16, -2.8]] },
      { tipo: 'penitente', rota: [[15, -5], [18, -3], [18, -7]] },
      { tipo: 'cacador', rota: [[13, -9], [13, -2]] },
      { tipo: 'guardiao', rota: [[0, -24], [0, -26]], limiteZ: -13.7, eventoDeDerrota: 'catedral:guardiao-derrotado' },
    ];
  }

  aplicarProgresso({ selos }) {
    for (const [indice, selo] of this.selos.entries()) {
      const obtido = selos.includes(selo.id);
      selo.malha.visible = !obtido;
      selo.luz.intensity = obtido ? 4 : 15;
      this.indicadores[indice].material = selo.material;
      this.indicadores[indice].visible = obtido;
    }
    const bloqueada = !this.selos.every((selo) => selos.includes(selo.id));
    if (this.bloqueio.ativa !== bloqueada) this.navegacao?.invalidar();
    this.bloqueio.ativa = bloqueada;
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
