export const CURA_FRASCO = 42;

export const CHAVE_SACRISTIA = 'vilarejo:chave-sacristia';
export const PORTA_SACRISTIA = 'catedral:porta-sacristia';
export const ATALHO_SACRISTIA = 'catedral:atalho-sacristia';

export const FRASCOS = Object.freeze({
  'vilarejo:bau-casa': 2,
  'catedral:frasco-sacristia': 1,
});

export const ANOTACOES = Object.freeze({
  'vilarejo:registro-da-oficina': {
    nome: 'Registro da oficina',
    texto: 'Entreguei a grade da sacristia. A chave pequena ficou na bancada, junto às limas. A porta do Relicário abre com ela. A grade da nave tem uma alavanca do lado de dentro.',
  },
  'vilarejo:lapide-sineira': {
    nome: 'Lápide da sineira',
    texto: 'À sineira que dobrou o bronze na noite do Véu. O último toque foi ouvido na praça. As cordas da torre foram encontradas cortadas ao amanhecer.',
  },
  'vilarejo:lapide-aprendiz': {
    nome: 'Lápide do aprendiz',
    texto: 'Ao aprendiz da oficina do poço. Deixou um cinzel, três limas e o molde das chaves. O mestre pediu que enterrassem o molde com ele.',
  },
  'catedral:registro-ossario': {
    nome: 'Registro do Ossário',
    texto: 'As marcas nos nichos são datas de vigília. À terceira noite, o Guardião mandou recolher os nomes e guardar apenas os ossos. Alguém riscou a ordem por baixo.',
  },
  'catedral:registro-relicario': {
    nome: 'Registro do Relicário',
    texto: 'O selo azul permanece sob o vitral. A porta ao sul dá acesso à sacristia. O ferreiro da praça fez a chave e a grade de serviço que retorna à nave.',
  },
  'catedral:registro-guardiao': {
    nome: 'Vigília do Guardião',
    texto: 'Quando o elmo arde, ele varre o chão duas vezes. Quem esquiva da primeira pancada deve esperar a segunda antes de avançar. O sino da nave marcava o intervalo.',
  },
});

// Osso de Retorno: consumível que leva o caçador de volta à última lanterna.
// O caçador começa com alguns e encontra outros pelo mundo.
export const OSSOS_INICIAIS = 1;
export const OSSOS = Object.freeze({
  'vilarejo:ossos-cemiterio': 2,
});

export function totalOssos(eventos) {
  return Object.entries(OSSOS).reduce((total, [id, quantidade]) => total + (eventos.includes(id) ? quantidade : 0), OSSOS_INICIAIS);
}

export function contarOssos(progresso) {
  return totalOssos(progresso.eventos) - progresso.ossosUsados;
}

export function totalFrascos(eventos) {
  return Object.entries(FRASCOS).reduce((total, [id, quantidade]) => total + (eventos.includes(id) ? quantidade : 0), 0);
}

export function contarFrascos(progresso) {
  return totalFrascos(progresso.eventos) - progresso.frascosUsados;
}
