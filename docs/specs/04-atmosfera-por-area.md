# 04 — Atmosfera por área

**Modelo recomendado:** Sonnet (Opus se precisar mexer no shader do céu).

**Estado:** o quarto incremento gráfico entregou a parte visual, com paletas
próprias para os quatro cenários. Os perfis de céu usam `paletaDoCeu` em
`CONFIG.areas`. O som ambiente sintetizado e o crossfade de trilha foram
entregues no incremento S5 de som (seção "S5 som entregue" no fim).

## Objetivo

Cada área ter cara e som próprios, declarados em dados, sem código espalhado: paleta, névoa, céu, luz e som ambiente. Hoje a névoa e as luzes da catedral estão escritas direto em `Catedral.js` e a paleta do `config.js` serve só ao vilarejo.

## Como

- Bloco por área em `src/config.js`, completando o `CONFIG.areas` da spec 00:

```
CONFIG.areas.catedral = {
  luzJogador: 8,
  nevoa: { cor: 0x19162d, densidade: 0.027 },
  fundo: 0x0b0a14,
  luzAmbiente: { ceu: 0xb6a6d6, chao: 0x1a1420, intensidade: 0.5 },
  ceu: null,                      // ou uma paleta para Ceu.definirPaleta
  som: { tipo: 'pedra', vento: 0.1, gotas: 0.4, eco: 0.6 },
}
```

- As classes de área leem esses valores no construtor (em vez de números soltos). O contrato da spec 00 ganha os campos opcionais `fundo`, `paletaDoCeu` e `somAmbiente`.
- `ativarArea` (em `Jogo.js`, uma vez só) aplica `fundo`, chama `ceu.definirPaleta(area.paletaDoCeu)` quando existir e avisa o som (`area:entrou`).
- **Transição suave:** ao atravessar um portal, névoa e cor de fundo vão do valor antigo ao novo em ~0,6 s.
- **Som ambiente sintetizado** em `src/audio/Som.js` (nada gravado, nada para creditar): camadas simples de ruído filtrado. Tipos iniciais: `vila` (vento, grilo esparso, sino distante raro), `pedra` (eco, gotas), `taverna` (fogo crepitando, murmúrio grave), `estrada` (vento mais forte, madeira rangendo). Obedece ao volume de **efeitos** e fica baixo sob a música.
- A lua continua sempre olhando para o jogador onde `usaCeu` for verdadeiro. Áreas futuras "tomadas pelos seres" podem mudar a cor do céu por `paletaDoCeu` (ideia do banco de ideias; não fazer agora).

## Arquivos

`src/config.js`, `src/mundo/Vilarejo.js`, `src/mundo/Catedral.js`, `src/mundo/Ceu.js` (só se `definirPaleta` precisar de ajuste), `src/mundo/areas.js`, `src/nucleo/Jogo.js` (`ativarArea`), `src/audio/Som.js`, testes, LEIAME ("Onde mexer para…").

## Critérios de aceite

1. Os quatro cenários têm paletas distinguíveis em PS1 e HD, com os avisos e
   marcadores de combate preservados. Céu, névoa e fundo assumem o perfil do destino.
2. Cada área tem um som ambiente audível e diferente; trocar de área troca o som sem estalo.
3. Mudar a névoa de uma área = mudar um número no `config.js`.
4. Nenhum arquivo de áudio novo (sem pendência em `CREDITOS.md`).
5. Teste novo: toda área do registro tem `nevoa`, `luzJogador` e um `som.tipo` conhecido. `npm test`, `npm run build`, `npm run test:browser` passam.

## S5 som entregue

**O que existe**

- `CONFIG.areas.<área>.som` e `CONFIG.areas.<área>.trilha` (dados); `CONFIG.audio` guarda os tempos dos crossfades (ambiente 0,6 s, trilha 1,5 s).
- `src/audio/regras.js` (regras puras: tipos, taxas, planejador de eventos esparsos, curva do crossfade), `src/audio/Ambiente.js` (as camadas no WebAudio) e `src/audio/Trilha.js` (dois players com crossfade). `Som.js` liga tudo ao aviso `area:entrou`, que `ativarArea` (`Jogo.js`) emite com `{ id, som, trilha, transicao }`.
- Ambiente por área (cada número vai de 0 a 1; `base` é o nível do vento e do zumbido que já existiam):

| Área | tipo | camadas contínuas | eventos esparsos (máx. por minuto x intensidade) |
| --- | --- | --- | --- |
| vilarejo | `vila` | vento (0,45) | grilo (14 x 0,4), sino distante (2,5 x 0,3), `base` 1 |
| estrada | `estrada` | vento forte (0,7), riacho baixo (0,45) | madeira rangendo (5 x 0,5), `base` 1 |
| taverna | `taverna` | fogo (0,6), murmúrio grave (0,5) | estalos do fogo (100 x 0,6), `base` 0,3 |
| catedral | `pedra` | ar parado (0,25) | gotas (18 x 0,5) com eco (0,7), `base` 0,6 |

- Os eventos esparsos são sorteados por um planejador que olha 1,2 s à frente no relógio do AudioContext (acorda a cada 0,5 s): o intervalo médio é 60 / taxa, com um mínimo entre dois eventos do mesmo tipo. Em pausa ou com efeitos em 0 ele não cria nós. Aba parada por mais de 3 s não despeja o atraso.
- Tudo passa pelo ganho de **efeitos** (o mesmo da pausa e do título). Nada gravado: nenhum arquivo novo, `CREDITOS.md` não muda.
- Crossfade do ambiente em potência igual (seno/cosseno em 12 degraus). O ambiente antigo para suas fontes na hora marcada e é desligado; sem nós acumulando. Ambiente igual ao de antes (mesmo bloco `som`) não reinicia.
- Trilha por área: vilarejo, estrada e taverna usam `vilarejo`; catedral usa `catedral`. Troca de faixa faz crossfade de 1,5 s (faixa igual continua sem reiniciar). A troca do Guardião (`guardiao`, `guardiao-final`) segue a mesma regra de antes, agora com crossfade. Pausar no meio do fade encerra a faixa antiga.

**Contraste dos avisos de combate** (`tests/contraste.test.js`, fórmula WCAG de luminância; faixa = menor e maior valor contra névoa, fundo e céu zênite/meio/horizonte da área; mínimo exigido 3:1). As cores são as mesmas em PS1 e HD, então a tabela vale para os dois.

| Aviso (cor) | vilarejo | catedral | estrada | taverna |
| --- | --- | --- | --- | --- |
| alto (sem aviso; olho verde `0x7dff2e`) | 11,6-15,1 | 12,5-15,0 | 9,1-13,8 | 10,5-14,4 |
| pesado (vermelho `0xff2a1e`) | 4,0-5,2 | 4,3-5,2 | **3,2-4,8** | 3,6-5,0 |
| rasteira (amarelo `0xffb21e`) | 8,3-10,8 | 9,0-10,8 | 6,6-9,9 | 7,5-10,4 |
| inaparável (branco-violeta `0xd9c8ff`) | 9,7-12,7 | 10,6-12,7 | 7,7-11,7 | 8,9-12,2 |

O menor par é o pesado contra a névoa da estrada (3,16:1), acima de 3:1. **Nenhum ajuste foi preciso**: cores de aviso, paletas das áreas e tempos dos golpes ficaram como estavam. O teste falha se uma paleta futura derrubar algum par abaixo de 3:1.

**Decidido pela IA (o Heitor revisa)**

- Só existem 4 faixas e duas são do chefe. Por isso estrada e taverna usam a música do vilarejo: ao atravessar o portão a música continua sem reiniciar. O "mais quente" da taverna vem do som (fogo, murmúrio, vento de base em 0,3), não da música. Faixas novas pedem arquivo novo e crédito em `CREDITOS.md`.
- Os números de `som` são intensidades de 0 a 1 (não taxas): as taxas máximas ficam em `TAXAS` (`regras.js`).
- O vento e o zumbido de base continuam em todas as áreas, mas com nível próprio (`som.base`): 1 fora, 0,6 na catedral, 0,3 na taverna.
- A primeira entrada do ambiente (primeiro clique) leva 1,2 s; as trocas por portal levam 0,6 s, como a névoa.
- A troca de faixa do Guardião também passou a ter crossfade de 1,5 s.
- Os volumes das camadas foram escolhidos de ouvido no código, sem poder ouvir; vale o Heitor ajustar os números de `CONFIG.areas.<área>.som`.
