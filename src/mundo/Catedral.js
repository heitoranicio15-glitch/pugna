import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Colisores } from './Colisores.js';
import { animarTochas, arcoOgival, colunaFacetada, juntarPorMaterial, materiais, tocha } from './pecas.js';
import { retro } from '../render/retro.js';
import { bloco, placa } from './Aderecos.js';
import { montarSacristia } from './Sacristia.js';
import { montarAtmosfera } from './Atmosfera.js';
import { plantaTerreo, volumesTerreo } from './PlantaCatedral.js';
import { fecharTetos, montarKit } from './KitCatedral.js';
import { montarAtalhoCripta, montarLuzesDaGaleria, volumesDosNiveis } from './NiveisCatedral.js';
import { montarCenasCatedral, nivelCatedral, visivelNaCatedral } from './CenasCatedral.js';
import { montarEspoliosCatedral } from './Espolios.js';
import { criarVitraisDoVeu, modeloBancoDaNave, montarLuzesDaNave } from './AcabamentoCatedral.js';
import { montarAlasDosSelos } from './AlasDosSelos.js';
import { montarBronzeECripta } from './BronzeECripta.js';
import { montarCoroEAbside } from './CoroEAbside.js';

const C = CONFIG.areas.catedral;

export class Catedral {
  constructor(cena) {
    this.id = 'catedral';
    this.nome = 'Catedral do Véu';
    this.usaCeu = false;
    this.limites = { minX: -38, maxX: 38, minZ: -65, maxZ: 35 };
    this.grupo = new THREE.Group();
    this.colisores = new Colisores(-12);
    this.tochas = [];
    this.objetos = [];
    this.setores = new Map();
    this.gruposPorNivel = new Map();
    montarAtmosfera(this, C);
    this.som = C.somPorNivel.nave;
    cena.add(this.grupo);

    this.planta = plantaTerreo();
    this.volumes = fecharTetos([...volumesTerreo(this.planta), ...volumesDosNiveis()]);
    const vaos = [...this.planta.arestas.values()].filter(a => a.vao)
      .map(a => ({ ...a.vao, sala: a.salas[0] }));
    montarKit(this, this.volumes, vaos);

    const m = materiais();
    const metal = retro(new THREE.MeshLambertMaterial({ color: 0xb78843, map: m.metal.map }));
    const brasa = retro(new THREE.MeshBasicMaterial({ color: 0xffac65 }));
    const luar = retro(new THREE.MeshBasicMaterial({ color: 0x8dcfff }));
    const vitral = criarVitraisDoVeu();
    const grupoDa = sala => this.setores.get(sala);
    montarLuzesDaNave(grupoDa('nave'), grupoDa('transepto'), m, metal, C.luzesDaNave);
    montarLuzesDaGaleria(this, m, metal, C.luzesDaGaleria);
    const movel = (sala, x, z, l, a, p, mat) => {
      bloco(grupoDa(sala), mat, x, a / 2, z, l, a, p);
      this.colisores.adicionar(x, z, l, p, a);
    };
    const ler = (sala, nome, evento, x, y, z, giro = 0) => {
      placa(grupoDa(sala), nome, x, y, z, 1.45, giro);
      this.objetos.push({ x, y, z, acao: 'ler', evento: 'catedral:' + evento });
    };

    // Cada tramo de 4 m recebe uma nervura ou uma baia de bancos, sem tocar o piso
    // nem estreitar o caminho central. Peças repetidas são enviadas em instâncias.
    const instancias = (sala, geometria, mat, pontos) => {
      const malha = new THREE.InstancedMesh(geometria, mat, pontos.length);
      const matriz = new THREE.Matrix4();
      for (const [i, [x,y,z]] of pontos.entries()) malha.setMatrixAt(i, matriz.makeTranslation(x,y,z));
      grupoDa(sala).add(malha);
    };
    for (const [sala, xs, ramos, altura] of [
      ['nave', [-5.24, 5.24], [-19, -11, -3, 9], 5.6],
      ['santuario', [-11.6, 11.6], [-55, -47, -39], 7.25],
    ]) {
      const pontos = xs.flatMap(x => ramos.map(z => [x, 0, z]));
      const coluna = colunaFacetada(altura, 0.36, m.pedra, m.pedraEscura);
      for (const peca of coluna.children) {
        instancias(sala, peca.geometry, peca.material, pontos.map(([x, , z]) => [x, peca.position.y, z]));
      }
      for (const [x, , z] of pontos) this.colisores.adicionar(x, z, 1, 1, altura);
      const arco = arcoOgival(Math.abs(xs[0]) * 2, altura * 0.43, 0.28, 0.38, m.pedraEscura);
      instancias(sala, arco.geometry, arco.material, ramos.map(z => [0, altura - 0.02, z]));
    }
    const bancos = [-3.25, 3.25].flatMap(x => [-17, -9, -1, 3].map(z => [x, 0, z]));
    for (const peca of modeloBancoDaNave(m).children) {
      instancias('nave', peca.geometry, peca.material, bancos);
    }
    for (const [x, , z] of bancos) this.colisores.adicionar(x, z, 2.6, 0.5, 0.83);

    const entrada = grupoDa('nave');
    bloco(entrada, m.madeiraEscura, 0, 2.25, 10.67, 3.5, 4.5, 0.12);
    bloco(entrada, luar, 0, 0.13, 10.58, 3.2, 0.14, 0.035);
    for (const [sala, x, z] of [
      ['nave',-4.6,7.15], ['nave',4.6,-17.7], ['transepto',-17,-23],
      ['transepto',17,-23], ['abside',7.8,-61.5],
    ]) {
      grupoDa(sala).add(tocha(this, { x, z, altura: 1.8, luz: false }));
    }
    this.passagens = [{ x: -9.6, z: -3, nome: 'Ossário' }, { x: 9.6, z: -3, nome: 'Relicário' }];

    this.grade = new THREE.Group();
    this.grade.position.z = -29;
    const barras = juntarPorMaterial();
    for (const x of [-1.52, -1.02, -0.51, 0, 0.51, 1.02, 1.52]) barras.caixa(x, 1.73, 0, 0.12, 3.46, 0.15, metal);
    // Travessas nas faces opostas, sem ocupar o volume das barras.
    for (const y of [0.62, 2.6]) barras.caixa(0, y, 0.115, 3.48, 0.15, 0.08, metal);
    barras.montar(this.grade, 'bronze da grade');
    grupoDa('transepto').add(this.grade);
    this.bloqueio = this.colisores.adicionar(0, -29, 3.5, 0.5, 4.5, 0, false);
    this.indicadores = [-2.35, 2.35].map(x => {
      const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.26), luar);
      cristal.position.set(x, 1.93, -28.59);
      grupoDa('transepto').add(cristal);
      return cristal;
    });

    const nichos = {
      ossario: [-19, -8, brasa],
      relicario: [19, -8, luar],
    };
    this.selos = Object.entries(nichos).map(([id, [x, z, material]], i) => {
      this.colisores.adicionar(x, z, 1.1, 1.1, 1.05);
      const malha = new THREE.Mesh(new THREE.OctahedronGeometry(0.39), material);
      malha.position.set(x, 1.65, z);
      grupoDa(id).add(malha);
      return { id, x, z, nome: ['Selo do Ossário', 'Selo do Relicário'][i], material, malha };
    });
    for (const [sala, x, z, a, largura] of [
      ['claustro', -19, 9.6, 0.85, 2.65], ['capela', -34, -13, 1, 3],
      ['arquivo', 34, -13, 1, 3], ['refeitorio', -26, -26.8, 0.86, 3.2],
      ['cabido', 26, -26.8, 0.86, 3.2],
    ]) movel(sala, x, z, largura, a, 1.25, m.pedraEscura);
    for (const x of [-19, 19]) this.colisores.adicionar(x, -15, 3.4, 1.25, 0.84);
    montarAlasDosSelos(this, m, metal, C.luzesDasAlas);
    ler('ossario', 'Registro do Ossário', 'registro-ossario', -19, 1.1, -14.27);
    ler('relicario', 'Registro do Relicário', 'registro-relicario', 19, 1.1, -14.27);
    ler('claustro', 'Lista das devoluções', 'lista-das-devolucoes', -12.1, 1.63, 10.66, Math.PI);
    ler('capela', 'Capela do Último Nome', 'capela-ultimo-nome', -34, 1.34, -12.27);
    ler('arquivo', 'Arquivo das Vigílias', 'arquivo-das-vigilias', 34, 1.34, -12.27);
    montarSacristia(this, metal, C.luzesDeServico);
    montarAtalhoCripta(this, metal);

    montarCoroEAbside(this, m, metal, C.luzesDoCoroEAbside);
    ler('abside', 'Juramento do Véu', 'juramento-do-veu', 0, 1.42, -62.96);
    for (const [sala, x, y, z, i, rot] of [
      ['abside', 0, 5.7, -64.69, 0, 0],
      ['relicario', 18, 3.68, -16.69, 0, 0],
      ['ossario', -18, 3.68, -16.69, 1, 0],
      ['nave', 0, 6.9, 10.69, 1, Math.PI],
    ]) {
      grupoDa(sala).add(vitral(i, x, y, z, rot));
    }
    montarBronzeECripta(this, m, metal, C.luzesDoBronzeECripta);
    this.poeira = montarCenasCatedral(this, C.feixes);
    this.posicionarEspolio = montarEspoliosCatedral(this);
    this.posicionarEspolio({});
    this.caixasDosSetores = new Map([...this.setores].map(([sala, g]) => [sala, new THREE.Box3().setFromObject(g)]));

    this.saida = { x: 0, z: 8.45 };
    this.entrada = { x: 0, z: 6, yaw: 0 };
    this.portais = [{ ...this.saida, raio: 2.35, destino: 'vilarejo', texto: 'E — voltar ao vilarejo' }];
    this.chegadas = { vilarejo: this.entrada };
    this.portao = { x: 0, z: -28.44 };
    this.altar = { x: 0, z: -62.2 };
    this.pontosDeDescanso = [
      { id: 'nave-do-veu', nome: 'Nave do Véu', x: 4.55, z: 6.55, olhar: Math.PI },
      { id: 'catedral-galeria', nome: 'Passarela das Vigílias', x: -8.7, y: 4, z: -9, olhar: 0, ilumina: false },
      { id: 'catedral-torre', nome: 'Sala do Bronze', x: 20, y: 8, z: 13.9, olhar: 0, ilumina: false },
      { id: 'catedral-cripta', nome: 'Cripta das Urnas', x: -23, y: -4, z: 31.7, olhar: 0, ilumina: false },
      { id: 'catedral-coro', nome: 'Coro do Véu', x: 3.8, z: -34.65, olhar: 0 },
    ];
    this.inimigos = [
      { tipo: 'penitente', rota: [[13, -13], [15, -10], [13, -5]] },
      { tipo: 'penitente', y: -4, rota: [[-23, 29], [-17, 31], [-12.4, 30]] },
      { tipo: 'cacador', y: 4, rota: [[-3, -23], [3, -23], [8, -19], [8, -13]] },
      { tipo: 'guardiao', rota: [[0, -47], [0, -52]], limiteZ: -37.45, eventoDeDerrota: 'catedral:guardiao-derrotado' },
    ];
  }

  somLocal(pos) { return C.somPorNivel[nivelCatedral(pos)]; }

  grupoParaNivel(y) {
    if (!this.gruposPorNivel.has(y)) {
      const grupo = new THREE.Group();
      this.grupo.add(grupo);
      this.gruposPorNivel.set(y, grupo);
    }
    return this.gruposPorNivel.get(y);
  }

  aplicarProgresso(progresso) {
    const { selos } = progresso;
    this.posicionarEspolio(progresso);
    for (const [indice, selo] of this.selos.entries()) {
      const obtido = selos.includes(selo.id);
      selo.malha.visible = !obtido;
      this.indicadores[indice].material = selo.material;
      this.indicadores[indice].visible = obtido;
    }
    const bloqueada = !this.selos.every(selo => selos.includes(selo.id));
    if (this.bloqueio.ativa !== bloqueada) this.navegacao?.invalidar();
    this.bloqueio.ativa = bloqueada;
    this.grade.visible = bloqueada;
  }

  atualizar(dt, tempo, pos) {
    if (pos) {
      for (const [sala, grupo] of this.setores) grupo.visible = visivelNaCatedral(sala,pos,this.caixasDosSetores.get(sala));
      const nivel = nivelCatedral(pos);
      for (const [y, grupo] of this.gruposPorNivel) {
        grupo.visible = nivel === 'cripta' && pos.z > 24 ? y === -4
          : nivel === 'torre' && pos.y >= 7.8 && pos.z < 15.5 ? y === 8
          : y === 0 || y === 4 || (y === -4 ? pos.z > 15 : pos.z > 18);
      }
    }
    animarTochas(this.tochas, tempo);
    for (const [i, camada] of this.poeira.entries()) {
      camada.position.y = Math.sin(tempo*0.41+i)*0.24;
      camada.position.z = Math.cos(tempo*0.28+i)*0.17;
    }
    for (const selo of this.selos) {
      selo.malha.rotation.y = tempo * 1.7;
      selo.malha.position.y = 1.65 + Math.sin(tempo * 2.5) * 0.13;
    }
  }
}
