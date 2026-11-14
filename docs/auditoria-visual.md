# Auditoria visual (Fase 1 da direção de arte)

Levantamento feito no código e na geometria dos modelos `.glb` (sem abrir o jogo).
Ele explica por que as casas tinham buracos, por que a textura mudava de tamanho
de uma peça para outra e quais adereços estavam fora do lugar. No fim estão as
correções por área.

## O que estava quebrado

### Casas e muros com pedaços faltando

Medi, em cada modelo, quanto de cada lado da caixa envolvente é coberto por faces
voltadas para fora (script em Node, sem navegador):

| Modelo | Tamanho original (m) | Problema |
| --- | --- | --- |
| `House_3` | 1,9 × 2,1 × 2,1 | Sem material de telhado; topo coberto só 59 %, fundos 53 %. É uma casa em ruína. Era esticada até 8 m de altura. |
| `House_4` | 1,9 × 1,1 × 2,1 | Só a base da casa (1,1 m de altura); topo 60 %, fundos 50 %. Esticada até uns 8 m: parede com buracos. |
| `TallWallBricks` | 1,5 × 2,4 × 0,4 | Só a face da frente existe (o verso cobre 18 %). Na muralha, os lados sul e leste mostravam o verso para dentro da vila: muro "invisível" com buracos. |
| `SmallSquareTowerBricks`, `PointyTower` | 0,8 × 2 × 0,9 e 1,5 × 5,4 × 1,5 | Esticadas de 6 a 8 vezes só na altura: tijolos deformados. |
| `House_1`, `House_2`, `Inn`, `Stable`, `Blacksmith`, `Bell_Tower` | 2 a 4,7 m | Fechadas, mas cada uma esticada numa proporção diferente (de 3,5 a 7 vezes por eixo), com 7 a 10 materiais de cores próprias (reboco bege, telha vermelha). |
| `rgs-muro`, `rgs-arcada`, `rgs-pilar` | 2,1 × 3,1 × 0,3 | Paredes da catedral esticadas até 12 m; sem textura no PS1 (cinza liso), com outra textura no HD. |
| `pillar_decorated`, `wall_arched`, `table_long_tablecloth` | — | Atlas do KayKit (outro estilo de cor) dentro da catedral. |

### Textura de tamanho diferente em cada peça

- `caixa()` recebia o tamanho da textura em cada chamada: a mesma pedra aparecia
  com 1, 1,25, 1,4, 1,5, 1,6 e 2 m por repetição. O calçamento ia de 1,6 m (escada
  da igreja) a 5,8 m (ruas).
- Nos modelos importados, o UV era refeito em unidades do arquivo (`× 95`), antes da
  escala do encaixe. Um muro esticado 6 vezes na altura mostrava tijolos 6 vezes mais
  altos que largos.

### Adereços sem lugar

O teste novo `tests/aderecos.test.js` encontrou:

| Área | Adereço | Problema |
| --- | --- | --- |
| Vilarejo | 2 plantas na fachada da igreja | Dentro dos contrafortes |
| Vilarejo | Saco e caixote no Portão Sul | Dentro da parede de uma casa |
| Vilarejo | Árvore seca em (24; 16) | Dentro de uma casa |
| Catedral | 2 livros nos bancos | Flutuando 30 cm acima do assento |
| Catedral | Pergaminho e livro do Arquivo | Fora da sala, sem chão embaixo |
| Estrada | Árvore da paisagem em (−21; 23) | Dentro do riacho |
| Estrada | Planta da margem em (11,5; 18,6) | Dentro da cerca |
| Taverna | Caldeirão | Dentro da lareira, enterrado nas toras |

## O que foi feito

- **Kit modular próprio** (`src/mundo/pecas.js`): `casa()` agora monta paredes de
  pedra fechadas, rodapé de pedra escura, cantos e vigas de madeira queimada,
  telhado de ardósia com beiral nos quatro lados e empenas de pedra rentes à parede.
  Porta (1,2 × 2,2 m), janela (0,95 × 1,15 m), pé-direito (3 m), beiral e caimento
  do telhado são iguais em todas as casas (`CONFIG.arte.casa`). Nada é sorteado: a
  mesma casa sempre sai igual. Cada casa vira 6 a 8 malhas (uma por material), em
  vez de uns 30 pedaços mais um modelo de 3 a 12 mil triângulos.
- `torre()` e `muralha()` usam só pedra do kit; a muralha não tem mais lado sem face.
- **Catedral, alas, claustro e Bairros**: paredes de pedra maciça com rodapé, colunas
  facetadas e arcos ogivais do próprio jogo; altar das capelas em pedra.
- **Uma densidade de textura** (`CONFIG.arte.ladrilho`): pedra 2 m, madeira 1,4 m,
  telhado 2 m, calçamento 4 m, lajes 4 m, assoalho 1,6 m por repetição. `caixa()`,
  `planoDeChao()`, `telhado()`, as ruas e os pisos da catedral usam esse valor pela
  família do material. Os modelos importados que recebem pedra, madeira ou telhado
  no HD têm o UV projetado em metros, já com a escala do encaixe.
- **Adereços**: os da tabela acima foram movidos ou tirados. O teste
  `tests/aderecos.test.js` passa a falhar se algum adereço ficar flutuando, dentro de
  parede ou casa, ou sem chão embaixo.
- **17 modelos sem uso removidos** (casas, torres, muros e peças da catedral): uns
  4 MB a menos para baixar. `CREDITOS.md` foi atualizado.

Outros acertos do inventário: faixas da nave que atravessavam as colunas, a
prateleira de velas dentro de uma coluna, a placa "Ordens" solta no ar (agora
pregada na parede da oficina), faixa e prateleira da fachada da igreja soltas da
parede, uma tocha e um caixote no meio da rua e dois sacos na pista da estrada.

## Inventário por área (depois da limpeza)

| Área | Construções | Materiais (famílias) | Adereços importados | Observações |
| --- | --- | --- | --- | --- |
| Vilarejo | 33 casas do kit, 3 torres + 6 da muralha, igreja, muralha, 3 abrigos | pedra, pedra escura, madeira queimada, ardósia, calçamento, terra | caixas, sacos, feno, barracas, bancos, poço, cerca, carroça, entulho, plantas, árvores secas | casas ainda com medidas soltas (a Fase 2 padroniza por tipo) |
| Catedral (+ claustro, alas, sacristia) | paredes maciças, colunas facetadas, arcos e abóbadas ogivais | pedra, pedra escura, lajes, mosaico, vitral | bancos, velas, cálices, livros, faixas, prateleiras, crânios, entulho, tochas de parede | piso de lajes, parede de pedra e teto de pedra escura nas quatro salas |
| Estrada | fachada da taverna (casa do kit), muralha e torres do portão, ponte | pedra, madeira, terra, água | rochas, plantas, salgueiros, cais, barco, caixas, sacos | adereços de água ficam no colisor do riacho (marcado `agua`) |
| Taverna | salão de madeira escura | assoalho, madeira escura, pedra da lareira | mesas, bancos, pratos, garrafas, velas, caldeirão | lareira com cornija de madeira e arco de pedra |
| Floresta | — | terra, caminho | árvores, troncos, rochas, plantas | dois salgueiros ficam além da barricada, como paisagem |

Ainda repetidos em fila, de propósito: as três barracas do mercado (uma rua de
feira) e as lápides do cemitério. A Fase 2 revê os dois junto com o plano da vila.
