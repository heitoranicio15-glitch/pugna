import { CONFIG } from '../config.js';
import { CHAVE_MATEIRO, CHAVE_PORTAO, RELIQUIA } from './Progressao.js';

export const CURA_FRASCO = 42;

export const CHAVE_SACRISTIA = 'vilarejo:chave-sacristia';
export const PORTA_SACRISTIA = 'catedral:porta-sacristia';
export const ATALHO_SACRISTIA = 'catedral:atalho-sacristia';

export const FRASCOS = Object.freeze({
  'vilarejo:bau-casa': 2,
  'catedral:frasco-sacristia': 1,
  'catedral:frasco-maior': 1,
});

export const ARMAS = Object.freeze({
  espada: { nome: 'Espada do Caçador', descricao: 'Alcance e ritmo médios. A arma de sempre.' },
  lamina: { nome: 'Lâmina de Vigília', descricao: 'Corta depressa e poupa estamina; exige ficar perto.', evento: 'catedral:lamina-de-vigilia' },
  maca: { nome: 'Maça do Guardião', descricao: 'Pesada e lenta para recuperar. A carga completa desequilibra inimigos comuns.', evento: 'catedral:maca-do-guardiao' },
  lanca: { nome: 'Lança do Mateiro', descricao: 'Estocada estreita e longa. Errar deixa uma abertura.', evento: 'floresta:lanca-do-mateiro' },
});

export const MUNICOES = Object.freeze({
  'catedral:municao-do-coro': 3,
  'floresta:municao-do-mateiro': 2,
});

export const ITENS = Object.freeze({
  [CHAVE_SACRISTIA]: { nome: 'Chave da sacristia', descricao: 'Abre a porta ao sul do Relicário.', chave: true },
  [CHAVE_PORTAO]: { nome: 'Chave do Portão', descricao: 'Bronze com o selo do Guardião do Véu.', chave: true },
  [CHAVE_MATEIRO]: { nome: 'Chave do Mateiro', descricao: 'Abre o cofre da lança na cabana.', chave: true },
  [RELIQUIA]: { nome: 'Relíquia do Véu', descricao: 'Enquanto na bolsa, recupera estamina 6% mais depressa.' },
  'catedral:frasco-maior': { nome: 'Frasco maior', descricao: 'Traz uma dose extra de 42 de vida, com o tempo de cura habitual.' },
});

export function armaDisponivel(id,eventos) {
  return Object.hasOwn(ARMAS,id) && (!ARMAS[id].evento || eventos.includes(ARMAS[id].evento));
}

export function fichaDeGolpe(arma,tipo) {
  return CONFIG.combate.armas[arma]?.[tipo] ?? CONFIG.combate[tipo];
}

export function totalMunicao(eventos) {
  return Object.entries(MUNICOES).reduce((s,[id,n])=>s+(eventos.includes(id)?n:0),0);
}

export function contarMunicao(progresso) {
  return totalMunicao(progresso.eventos) - (progresso.municaoUsada ?? 0);
}

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
    texto: 'A chave pequena ficou na bancada, junto às limas. É da sacristia, ao sul do Relicário; a grade abre por dentro. O outro molde, o do portão, esfriou sozinho antes de receber a marca do aprendiz.',
  },
  'vilarejo:registro-do-portao': {
    nome: 'Registro do Portão Sul',
    texto: 'Fechado ao segundo toque, por ordem do Guardião do Véu. O lacre leva o seu selo. A chave não sai da mão de quem a guarda enquanto durar a vigília.',
  },
  'vilarejo:lapide-sineira': {
    nome: 'Lápide da sineira',
    texto: 'À sineira que cortou as cordas e ainda ouviu o bronze no fundo do poço. Dizia: “Deixaram a chave bater no cinturão dele, junto ao altar. Não a procurem na parede da vila.”',
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
    texto: 'Ele nos pediu que voltássemos à vila e trancou a grade do lado de dentro. Ainda bate a lâmina duas vezes no chão, como quem marca o intervalo do sino. Quando o elmo arde, espera a segunda varrida antes de te aproximares.',
  },
  'catedral:lista-das-devolucoes': {
    nome: 'Lista das devoluções',
    texto: 'Da nave para o Ossário: treze pessoas, onze caixões. Do Ossário para a vila: onze urnas, nenhuma voz. As duas pessoas restantes voltaram pelo corredor esta manhã. Traziam o mesmo nome.',
  },
  'catedral:juramento-do-veu': {
    nome: 'Juramento do Véu',
    texto: 'Selamos os ossos a oeste e os nomes a leste. Eu vigio entre os dois. Enquanto o sino soar, quem subir ainda poderá descer. Se um dia ouvirem a minha voz no poço, deixem a grade fechada. — Guardião',
  },
  'catedral:conta-da-mesa': {
    nome: 'Conta da mesa',
    texto: 'Seis lugares postos para a ceia. A sineira não desceu. Retirei o prato dela e serviram mais uma porção no lugar vazio. De manhã só a água tinha peso.',
  },
  'catedral:ata-do-cabido': {
    nome: 'Ata do cabido',
    texto: 'Por três votos, a lista do coro não será lida na ordem em que foi escrita. O Guardião não votou. Pediu que preferíssemos os nomes que ainda respondiam por outra voz.',
  },
  'catedral:contagem-da-cripta': {
    nome: 'Contagem da cripta',
    texto: 'As urnas que desceram vazias são as mais pesadas agora. Não sabem dizer por quê. Algumas retêm o calor de uma mão até depois de apagarmos as velas.',
  },
  'catedral:caderno-da-sineira': {
    nome: 'Caderno da sineira',
    texto: 'Pedi a cela de baixo porque daqui não vejo o bronze. Pela primeira vez ouvi o sino antes de sentir a corda. Na próxima vigília não haverá corda para me desmentir.',
  },
  'catedral:inventario-do-bronze': {
    nome: 'Inventário do bronze',
    texto: 'Abaixo do badalo há duas cordas e um corte limpo. Passamos a noite vigiando a cicatriz. O toque seguinte fez pensar que o metal se lembrava de como era ser movido.',
  },
  'catedral:nomes-na-passarela': {
    nome: 'Nomes na passarela',
    texto: 'Olhei da galeria e contei os leitores. Havia um a mais junto à coluna. Falei o nome dele em voz baixa. Todos na nave ergueram a cabeça ao mesmo tempo.',
  },
  'floresta:urnas-do-mato': {
    nome: 'As urnas do mato',
    texto: 'Enterramos as tampas separadas dos recipientes, para sabermos de onde vinha o som. À noite ouvimos uma tampa rolar. Pela manhã, todas as urnas estavam de boca para a trilha.',
  },
  'floresta:bilhete-do-mateiro': {
    nome: 'Bilhete do mateiro',
    texto: 'O cavalo passou pela cabana com o arreio virado. Não vinha fugindo de um homem. Virava a cabeça a cada toque, sempre para a árvore que havia deixado para trás.',
  },
  'floresta:fitas-do-coro': {
    nome: 'Fitas do coro',
    texto: 'Não amarrem a última fita. As outras dizem quem saiu da vila. A última só deve ser presa quando a mesma pessoa voltar para dizer o nome da primeira.',
  },
});

export function totalFrascos(eventos) {
  return Object.entries(FRASCOS).reduce((total, [id, quantidade]) => total + (eventos.includes(id) ? quantidade : 0), 0);
}

export function contarFrascos(progresso) {
  return totalFrascos(progresso.eventos) - progresso.frascosUsados;
}
