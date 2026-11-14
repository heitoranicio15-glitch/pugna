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
