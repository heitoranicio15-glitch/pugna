export const CURA_FRASCO = 42;

export const CHAVE_SACRISTIA = 'vilarejo:chave-sacristia';
export const PORTA_SACRISTIA = 'catedral:porta-sacristia';
export const ATALHO_SACRISTIA = 'catedral:atalho-sacristia';

export const FRASCOS = Object.freeze({
  'vilarejo:bau-casa': 2,
  'catedral:frasco-sacristia': 1,
});

export const ANOTACOES = Object.freeze({
  'vilarejo:livro-dos-estabulos': {
    nome: 'Livro dos estábulos',
    texto: 'Quatro arreios para a romaria. Voltaram cinco cavalos. O quinto trazia uma fita do coro na crina e nenhum vestígio de cavaleiro.',
  },
  'vilarejo:ordem-dos-romeeiros': {
    nome: 'Ordem dos romeiros',
    texto: 'Pelo largo, em pares, até o adro. Um diz o nome do outro ao passar. Quem ouvir o nome antes de falar fica para trás e espera a luz.',
  },
  'vilarejo:lista-das-urnas': {
    nome: 'Lista das urnas',
    texto: 'Contadas vinte e duas atrás da catedral. A vigésima terceira já estava no altar quando chegamos. O selo ainda estava quente.',
  },
  'catedral:capela-ultimo-nome': {
    nome: 'Capela do Último Nome',
    texto: 'Aqui vieram dizer os nomes que já não cabiam nas lápides. Ao quarto dia, o leitor fechou o livro. Alguém continuou a ler do outro lado da parede.',
  },
  'catedral:arquivo-das-vigilias': {
    nome: 'Arquivo das Vigílias',
    texto: 'Retiveram os livros dos vivos no Relicário. Na manhã seguinte, havia páginas novas na caligrafia dos mortos. Reconheci o traço de minha mãe; ela nunca soube escrever.',
  },
  'vilarejo:edital-triagem': {
    nome: 'Aviso de triagem',
    texto: 'Internação ao primeiro toque. Tragam o nome de batismo e uma pessoa que o possa repetir. Quem chegar só aguarda no mercado. Por ordem do Guardião: se o bronze tocar de novo sem que a corda mexa, fechem o portão.',
  },
  'vilarejo:contas-do-mercado': {
    nome: 'Peso do pão',
    texto: 'Nove pães enviados à nave. Quatorze na volta, todos intactos. Na tábua de nomes havia seis riscos novos. A sineira veio buscar o dela. Disse que ainda tinha fome.',
  },
  'vilarejo:marco-dos-ausentes': {
    nome: 'Marco dos ausentes',
    texto: 'A pedra foi gravada com os nomes das famílias que receberam urnas leves demais. Os nomes foram raspados por ordem do cabido. Na base ainda se lê: “Se não voltares com o nome, volta com a voz.”',
  },
  'vilarejo:registro-da-oficina': {
    nome: 'Registro da oficina',
    texto: 'Entreguei a grade da sacristia. A chave pequena ficou na bancada, junto às limas. É da porta ao sul do Relicário. A grade da nave tem uma alavanca do lado de dentro. O aprendiz pôs o próprio nome no molde. De manhã só restava a marca do cinzel.',
  },
  'vilarejo:lapide-sineira': {
    nome: 'Lápide da sineira',
    texto: 'À sineira que cortou as cordas para poupar a vila do segundo toque. O bronze tornou a soar. Foi o primeiro toque que o povo ouviu vindo do poço.',
  },
  'vilarejo:lapide-aprendiz': {
    nome: 'Lápide do aprendiz',
    texto: 'Ao aprendiz da oficina do poço. Deixou um cinzel, três limas e o molde das chaves. A mãe pediu que aqui escrevessem o nome. Nenhum dos presentes conseguiu pronunciá-lo.',
  },
  'taverna:bilhete-da-mesa': {
    nome: 'Bilhete na mesa',
    texto: 'Esperei até a vela acabar. O dono do cavalo no pátio subiu para a catedral e não voltou. O cavalo sumiu na segunda noite. Deixo isto para quem vier depois: a carroça ao sul foi derrubada de dentro para fora.',
  },
  'catedral:registro-ossario': {
    nome: 'Registro do Ossário',
    texto: 'Primeira vigília: a voz volta se alguém disser o nome perto do leito. Terceira vigília: as vozes repetem o nome de quem veio visitar. Ordem do Guardião: separem os ossos dos nomes. À margem: “De que lado ficamos nós?”',
  },
  'catedral:registro-relicario': {
    nome: 'Registro do Relicário',
    texto: 'O selo azul permanece sob o vitral. O do Ossário guarda o que foi enterrado. Este guarda o que foi escrito. Os dois levantam a grade do Santuário. Ao sul, a porta da sacristia abre com a chave feita na oficina do poço.',
  },
  'catedral:registro-guardiao': {
    nome: 'Vigília do Guardião',
    texto: 'Ele nos pediu que voltássemos à vila e trancou a grade do lado de dentro. Ainda bate a maça duas vezes no chão, como quem marca o intervalo do sino. Quando o elmo arde, espera a segunda varrida antes de te aproximares.',
  },
  'catedral:lista-das-devolucoes': {
    nome: 'Lista das devoluções',
    texto: 'Da nave para o Ossário: treze pessoas, onze caixões. Do Ossário para a vila: onze urnas, nenhuma voz. As duas pessoas restantes voltaram pelo corredor esta manhã. Traziam o mesmo nome.',
  },
  'catedral:juramento-do-veu': {
    nome: 'Juramento do Véu',
    texto: 'Selamos os ossos a oeste e os nomes a leste. Eu vigio entre os dois. Enquanto o sino soar, quem subir ainda poderá descer. Se um dia ouvirem a minha voz no poço, deixem a grade fechada. — Guardião',
  },
});

export function totalFrascos(eventos) {
  return Object.entries(FRASCOS).reduce((total, [id, quantidade]) => total + (eventos.includes(id) ? quantidade : 0), 0);
}

export function contarFrascos(progresso) {
  return totalFrascos(progresso.eventos) - progresso.frascosUsados;
}
