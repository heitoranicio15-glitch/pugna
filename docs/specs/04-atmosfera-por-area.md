# 04 — Atmosfera por área

**Modelo recomendado:** Sonnet (Opus se precisar mexer no shader do céu).

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

1. Vilarejo e catedral ficam **iguais aos de hoje** na imagem (mesmos números, só mudaram de lugar).
2. Cada área tem um som ambiente audível e diferente; trocar de área troca o som sem estalo.
3. Mudar a névoa de uma área = mudar um número no `config.js`.
4. Nenhum arquivo de áudio novo (sem pendência em `CREDITOS.md`).
5. Teste novo: toda área do registro tem `nevoa`, `luzJogador` e um `som.tipo` conhecido. `npm test`, `npm run build`, `npm run test:browser` passam.
