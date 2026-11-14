# 05 — Mapa e progressão

**Modelo recomendado:** Sonnet para implementar; a escolha da primeira área é do Heitor.

## Objetivo

Definir como as áreas se ligam. O PASSAGEM decidiu: **semi-linear**, com atalhos, **nada de mundo aberto**. Esta spec dá o desenho do grafo e as regras para lanternas e atalhos, para que cada área nova já nasça encaixada.

## Grafo proposto (decidido pela IA, o Heitor revisa)

```
                 Catedral do Véu (pronta)
                        |
   [Caverna] ---- Vilarejo (pronto) ---- Estrada ---- Taverna
   (sob o cemitério)                        |
                                         Floresta ---- Castelo
                                            \____atalho____/ (portão que abre por dentro)
```

- **Caminho principal:** Vilarejo → Estrada → Floresta → Castelo.
- **Ramos:** Catedral (pronta), Taverna (respiro), Caverna (opcional, entra pelo cemitério e sai na Floresta: vira atalho).
- A primeira área nova (item S6 da fila) é uma destas três: castelo, floresta ou caverna. Recomendação: **floresta**, porque é a continuação natural da estrada.

## Regras

- **Portais:** sempre nos dois sentidos, cada lado com `destino` e a `chegada` correspondente (o `montarAreas` da spec 00 já recusa portal sem volta).
- **Portal trancado:** campo opcional `requer: 'area:evento'` e `textoTrancado`. Sem o evento no save, o portal mostra o texto e não abre.
- **Atalhos:** porta, grade ou elevador que só abre de um lado. Ao abrir, grava `area:atalho-<nome>` e fica aberto para sempre (mesmo padrão da grade de serviço da sacristia).
- **Lanternas:** uma na entrada de cada área e uma antes de cada chefe; no máximo 3 por área. O bom atalho devolve o jogador a uma lanterna já conhecida, em vez de criar outra.
- **IDs:** áreas e lanternas com `id` único, minúsculo, com hífen. Eventos `area:evento`. Nunca renomear o que já foi publicado.
- **Inimigos:** comuns voltam ao descansar; chefes e minibosses usam `eventoDeDerrota` e não voltam.
- **Sem mapa na tela e sem viagem rápida** entre lanternas por enquanto (o Osso de Retorno já leva à última).

## Entregas

1. `docs/mapa.md`: o grafo acima mantido atualizado, com a tabela de áreas, lanternas, portais e atalhos (IDs).
2. Suporte a `requer`/`textoTrancado` nos portais (`Jogo.js`, trecho do portal, e `areas.js`).
3. Teste que percorre o registro e confere: todo destino existe, toda ida tem volta, todo `requer` segue o formato `area:evento`, e toda área é alcançável a partir da inicial.

## Critérios de aceite

- Áreas atuais continuam funcionando e o save antigo carrega.
- O teste de grafo passa com as áreas atuais e falha com um portal quebrado de exemplo.
- `npm test`, `npm run build`, `npm run test:browser` passam.

## S6 entregue: a floresta (decidido pela IA, o Heitor revisa)

- **Escolha:** a primeira área nova é a **floresta**, como a recomendação do grafo (continuação natural da estrada). Castelo e caverna seguem na fila. Código em `src/mundo/Floresta.js`, bloco `CONFIG.areas.floresta`, uma linha em `areas.js`.
- **Ligação:** a ponta sul da estrada não é mais fechada. O portal `E — seguir pela trilha da floresta` (estrada, 0; 57,4) leva à chegada da floresta (0; -38,5), e `E — voltar à estrada` (floresta, 0; -42,4) leva à chegada nova da estrada (0; 52,4, olhando para o norte). A carroça virou cenário ao lado da pista e a placa "Em obras" saiu, no lugar da placa "Trilha da floresta". Nenhuma chegada, lanterna, ID ou patrulha antiga mudou (o teste compara os números).
- **Área:** 40 × 90 m (x de -20 a 20, z de -45 a 45), `usaCeu: true`, `luzJogador` 5, névoa verde-azulada escura e densa (0,027). Lanterna `floresta-clareira` ("Clareira da Floresta") a 6 m da chegada; 3 patrulhas (caçador, cavaleiro, Penitente, valores de `CONFIG.inimigos` sem ajuste) a mais de 18 m da chegada e da lanterna. A trilha acaba numa barricada de troncos sem saída; o Castelo entra ali depois.
- **Som e trilha:** tipo novo `floresta` (vento, coruja, galhos) em `src/audio/regras.js` e `Ambiente.js`, com os valores de `CONFIG.areas.floresta.som` escolhidos só no código (**ninguém ouviu: ouvir e ajustar**). Trilha: a faixa `vilarejo`, para a música seguir sem reiniciar desde a estrada (só há duas faixas de área).
- **Progressão:** nada novo no save. Entrar na floresta não grava evento; o formato do save não mudou e saves antigos carregam como antes. O portal trancado (`requer`) e o `docs/mapa.md` seguem pendentes.
- **Os limites não prendem o jogador:** a floresta usa colisores nas bordas (como a estrada com as cercas).
