# Reconstrução gráfica do PUGNA

O primeiro incremento reaproveita as peças de cenário e os pontos de luz
existentes. O modo HD troca os materiais de pedra, calçamento, terra e
madeira por variantes com mapas de cor, normal e rugosidade. O vilarejo
recebe o calçamento e as fachadas, a catedral recebe paredes e pisos, a estrada
recebe terra batida, ponte e cercas, e a taverna recebe assoalho, balcão e
lareira. O PS1 carrega as texturas pixeladas feitas no código. Ambos usam os
barris de oito lados com tampas rebaixadas e cintas, e o tapete ornamentado.

Em `src/mundo/pecas.js`, `materiais()` associa as variantes HD aos materiais
compartilhados. A montagem de todas as áreas ocorre antes de
`MateriaisHd` reunir as malhas, inclusive as que têm vários materiais.
Novas áreas que usem essas peças recebem o acabamento na mesma montagem.
Os arquivos WebP de cenário (1K) e personagem (512²) somam cerca de 3,6 MiB,
baixados na primeira seleção de HD. Se um conjunto falhar, o material
original serve de reserva.

## Segundo incremento

- **Vilarejo e estrada.** Molduras, beirais e ferragens usam a mesma peça
  de fachada. As geometrias são agrupadas por material e saem do desenho a
  cerca de 34 m, com uma margem ao voltar para perto. Telhados, portas,
  janelas e a placa da taverna continuam visíveis à distância.
- **Catedral.** A rosácea tem nervuras de pedra e o piso das alas e da nave
  usa ardósia própria no HD. O mosaico do santuário continua com seu desenho.
- **Ponte e taverna.** A textura procedural do riacho corre sob a ponte.
  A lareira tem um arco de pedra e uma cornija de madeira.
- **Sombras de contato.** As manchas sob casas, colunas, bancos e mesas,
  e junto à mureta da ponte, usam uma única malha instanciada por área.
  São estáticas, sem mapa de sombras nem luzes dinâmicas adicionais.
- **Realces.** O HD comprime picos de brilho antes de aplicar o contraste.
  O PS1 limita os canais à faixa de cor antes do pontilhado. Isso evita a
  inversão de cor em superfícies muito próximas da lareira e das tochas.

## Terceiro incremento

- **Caçador.** Capa com pregas e barra irregular, chapéu com faixa e fivela,
  casaco, botas, lâmina com espinha e cano facetado na pistola.
- **Inimigos.** Peitorais, grevas e braçadeiras facetados, dois pontos de luz
  na viseira, tabardos, manto e lâminas novas. O Guardião conserva a maça
  e o elmo com pontas. As versões de material compartilham a cor emissiva
  que acende a arma na preparação de um golpe.
- **Taverneiro.** Rosto e barba facetados, mangas e avental com alças. A pose
  de polir a caneca e a conversa seguem a implementação existente.

As peças em `src/entidades/formas.js` usam os pivôs das animações atuais. O
PS1 conserva a leitura facetada; o HD usa os mapas de lã, couro e aço.
Guarde a criação de NPCs e o contrato de falas para S4.

## Quarto incremento

- **Vilarejo e estrada.** No vilarejo, luar violeta e bruma baixa entre as
  casas. Na estrada, névoa azul-esverdeada mais veloz e céu frio. A lua com
  rosto continua visível nos dois exteriores.
- **Catedral e taverna.** Os vitrais ganharam desenho de losangos e faixas
  de luz translúcidas no Relicário e no Santuário. O salão da taverna ganhou
  esquadrias de madeira nas janelas, luz quente e fagulhas da lareira.
- **Portais.** Luz ambiente, cenário e luz do jogador usam o destino ao
  entrar. Névoa e fundo mudam em 0,6 s. Entre áreas externas, o céu muda
  com a mesma curva. Ao renascer, aplica-se o perfil de imediato.

Os valores ficam em `CONFIG.areas`. Feixes e fagulhas são procedurais.
O som ambiente específico de cada área permanece na fila de S5.

## Quinto incremento

O Portão Sul agora conduz a um muro de triagem com arco à direita. Depois
dele, o caminho se divide entre a rua do poço e a travessa leste do
mercado, que volta à praça pelas bancas. A entrada entre as cercas do
cemitério liga o adro ao Marco dos Ausentes.

Na Catedral, a Galeria dos Nomes fecha um circuito com a nave e o Ossário.
O Relicário mantém o atalho da sacristia. O estrado de dois degraus e o
altar de pedra dão um fim à nave central, depois da arena do Guardião.
Os bancos foram redistribuídos com espaço para passar nas laterais e pelo centro.

O segundo toque, a separação dos ossos e nomes e a decisão do Guardião são
contados por documentos de quem viveu o fechamento. A lista fica em
`src/nucleo/Inventario.js`; os cinco registros novos usam o mesmo sistema
de leitura e salvamento. A chave, a alavanca, os selos e os checkpoints
mantêm os IDs publicados.

## Expansão e modelos importados

- A vila vai de 94 × 155 m a 132 × 184 m nos limites do jogador, cerca de
  67% a mais. Os bairros laterais se encontram atrás da Catedral, com
  três patrulhas novas e documentos nos pontos de referência. São 33
  edifícios no conjunto de casas externas, além da igreja e das torres.
- A área delimitada da Catedral foi de 44 × 42 m a 70 × 42 m. O piso que
  cresceu fica nas duas alas laterais, cerca de 364 m² novos no total.
  Cada ala abre por duas arcadas. O Santuário continua separado pelos
  dois selos. Há cinco registros novos entre vila e Catedral.
- Os 42 GLBs do RGS Dev, Quaternius e KayKit substituem casas, torres,
  muralhas, paredes, pilares, bancas, árvores, cercas, poço, móveis,
  barris, caixas, caveiras, elmos, espadas e o martelo do Guardião.
  Paisagem, vitrais, efeitos e corpos animados continuam a usar peças do
  projeto. Os modelos usam o mesmo encaixe de colisores em ambos os modos.
  O HD usa mapas de superfície do PUGNA nas peças sem textura; algumas
  peças do KayKit mantêm seu atlas original. A emissão das armas do inimigo
  acompanha os avisos pelos mesmos materiais que o código de combate atualiza.
  A listagem de autoria está em [CREDITOS.md](../CREDITOS.md).
- A coleção [Quixel Megascans na Fab](https://www.fab.com/sellers/Quixel%20Megascans)
  é referência para uma revisão futura das superfícies. O
  [Modular Stone Wall](https://www.fab.com/listings/16754e4c-74dd-4bc7-8833-025ef47df632)
  e as ruínas de igreja servem de referência para os muros e vãos. A
  [licença padrão da Fab](https://www.fab.com/eula) restringe redistribuição
  avulsa. Os GLBs na pasta pública podem ser baixados diretamente pelo
  navegador, então a build pública usa os modelos CC0 descritos acima.

## Teste de jogo para Gabriel e Heitor

1. Abra o [jogo publicado](https://heitoranicio15-glitch.github.io/pugna/) e anote
   navegador, GPU e resolução da tela. Comece em PS1 e faça o mesmo trecho em HD
   720p. No vilarejo, compare calçamento, oficina e casas perto de uma tocha.
2. Na catedral, confira o piso da nave, as paredes ogivais e a legibilidade dos
   avisos de ataque. Volte pelo Portão Sul, atravesse a ponte e aproxime-se da
   taverna. Dentro, compare o assoalho, o tapete e os barris perto da lareira.
   Faça o desvio do mercado e complete o circuito nave–Galeria–Ossário.
   Leia uma inscrição em cada área e tente alcançar a arena antes dos selos.
   Faça a volta entre Estábulos e Romaria pelo norte da vila. Dentro da
   Catedral, entre na Capela do Último Nome e no Arquivo das Vigílias por
   uma arcada e retorne pela outra.
   Compare também a rosácea do adro, a água de cima da ponte e as guarnições
   da taverna ao se aproximar. O interior tem arco e cornija na lareira.
   Ao sair pelo Portão Sul, veja o céu mudar para o tom da estrada. Na
   catedral, olhe para os vitrais a partir do corredor do Relicário.
3. Troque de modo em pausa e recarregue. Confira que a resolução e o estilo
   foram lembrados. Use a lanterna da taverna na estrada e verifique o
   renascimento após recarregar. Dentro, confira a fala do taverneiro e o bilhete.
   Compare o movimento da capa ao correr e rolar, a pose da pistola durante
   o tiro e o aviso dos três tipos de ataque. Confira o Guardião em ambas
   as fases e o encaixe das mãos do taverneiro na caneca.
   Em **Configurações → Câmera → Primeira pessoa**, confira o enquadramento
   das mãos, a mira pelo Tab, a espada e o coice da pistola. Passe por uma
   porta ou portal, recarregue após descansar e volte para terceira pessoa
   durante a pausa. Repita em PS1 e HD.
4. Heitor, repita o trecho em HD 1080p, 1440p e, se houver tela 4K, em 2160p
   com **F** para tela cheia. Anote quedas de fluidez e o tempo até aparecerem
   os materiais na primeira seleção de HD. Para medir, grave 20 segundos do
   mesmo trecho no painel **Performance** do Chrome e compare os tempos de
   quadro. No console, `[jogo.render.alvo.width, jogo.render.alvo.height]`
   mostra os pixels que o jogo realmente desenha.

O teste automatizado rápido em Chrome com renderização por software acompanha
a alternância, a leitura dos arquivos e a montagem dos materiais nas quatro
áreas. O roteiro completo `npm run test:browser`, a avaliação artística e a
medição em GPU e em 4K precisam de validação à parte.

## Entregas de Blender para Heitor

1. **Fachada da taverna, primeiro piloto em Blender.** Use a fachada
   procedural publicada como referência de encaixe e detalhe. Abra
   `src/mundo/Estrada.js` no trecho que monta a fachada e
   `src/config.js` em `CONFIG.areas.estrada.taverna` para copiar as medidas.
   No Blender, use metros, origem no centro da casa ao nível do chão e frente
   local em +Y, que resulta em −Z no glTF com **+Y Up**; gire a exportação ou o
   encaixe para a frente local +Z da peça `casa()`. Exporte a fachada como
   geometria decorativa encaixada no volume atual. Modele molduras com chanfros,
   tábuas com espessura e pedras salientes. Alinhe o batente à porta atual e
   mantenha a passagem livre em frente à entrada.
2. **Prepare duas versões do piloto.** Exporte `taverna-hd.glb` com UV e
   materiais PBR e `taverna-ps1.glb` com silhueta facetada e atlas pintado.
   Como ponto de partida, use até 12 mil triângulos e dois materiais no HD,
   e até 1.500 triângulos com um atlas de até 256² no PS1. Priorize o detalhe
   perto da porta. Faça uma versão HD distante com cerca de 3 mil triângulos
   caso a captura mostre gargalo de geometria.
3. **Empacote para revisão.** Entregue o `.blend` fonte, os `.glb` e duas
   capturas do mesmo ângulo. Aplique escala e rotação, confira normais e exporte
   pelo formato glTF 2.0 **GLB**, com texturas embaladas. Use normal OpenGL (+Y),
   sem luzes nem câmeras dentro do GLB. Registre a origem de qualquer arquivo de
   terceiros. A integração coloca a malha sobre as coordenadas atuais e deixa
   portas, colisores, volumes de interação e lanternas no código do jogo.
4. **Próximos módulos após validar o encaixe.** Reaproveite a linguagem da
   fachada para um módulo de casa do vilarejo, um arco da nave e uma mureta da
   ponte. O primeiro personagem com esqueleto deve ser combinado com S4. Leve
   a luz, névoa e identidade por área para S5, comparando legibilidade antes
   de acrescentar sombras ou reflexos de custo alto.
5. **Piloto de personagem.** Antes de exportar o caçador, compare as novas
   silhuetas no jogo. Use metros, origem entre os pés, frente +Z e topo do
   chapéu em torno de 2,16 m no glTF. Exporte um GLB de teste com malhas
   nomeadas separadamente para tronco, capa, cabeça, pernas, braços e
   acessórios das mãos. O tronco gira a 0,90 m, as pernas a 0,86 m e os
   braços a 1,46 m. As armas encaixam em (0, −0,66, 0,03) no braço
   correspondente. Confira em pé, ataque leve, tiro e rolamento antes
   de preparar uma versão com esqueleto.

O [Medieval Village MegaKit de Quaternius](https://quaternius.itch.io/medieval-village-megakit)
pode servir de base modular para PS1. O
[Wine Barrel 01 do Poly Haven](https://polyhaven.com/a/wine_barrel_01)
é candidato ao próximo teste de redução de malha no HD.
