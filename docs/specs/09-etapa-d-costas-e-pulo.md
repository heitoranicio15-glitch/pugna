# 09 — Etapa D: golpe pelas costas e pulo contra a rasteira

**Modelo recomendado:** Opus ou Fable. **Mexe na partida:** sim. **Base:** Plano D do PASSAGEM e a "regra de ouro do combate" (tabela de respostas). Números são palpites e moram em `CONFIG.combate`.

## Objetivo

Fechar as duas linhas da regra de ouro que ainda não existem:

| Ataque / situação | Melhor resposta | Recompensa |
| --- | --- | --- |
| Rasteira (larga) | Pulo | Contra-ataque pisando no inimigo |
| Antes da luta | Golpe pelas costas (agachado, sem ser visto) | Execução silenciosa |

Sem tutorial na tela, sem botão de toque (celular congelado), só o Esc pausa.

## Parte A — Agachar e furtividade

- **Agachar:** tecla **Z** alterna agachado (Ctrl é esquiva e C atira). **(decidido pela IA, o Heitor revisa)**. Agachado: anda a 45% da velocidade, boneco mais baixo (pose simples no `Boneco.js`), não corre, não pula; atacar, esquivar, atirar ou apanhar tiram o agachamento.
- **Barulho e visão:** `CONFIG.combate.furtividade`: `raioAgachado` (quanto o inimigo "ouve" agachado), `raioAndando`, `raioCorrendo`, `anguloVisao` (cone de visão do inimigo, uns 100°) e `visaoNoEscuro` (fração da `visao` já existente do inimigo). O inimigo só percebe o jogador se ele estiver dentro do cone e do alcance, ou perto demais por barulho (atrás dele agachado quase nunca). Perceber = o comportamento atual de perseguir.
- **Alerta dos vizinhos:** quando um inimigo passa a perseguir, os da mesma área a até `raioAlerta` (uns 10 m) também passam a perseguir depois de 0,4 s. Sem alerta se o primeiro morrer em silêncio antes de ser visto.

## Parte B — Golpe pelas costas (execução silenciosa)

- Com o inimigo ainda **sem ter percebido** o jogador (patrulhando ou parado), o jogador **por trás dele** (cone de 60° atrás) e a até 1,6 m, aperta o ataque: vira uma execução silenciosa (`golpe:costas`): animação de estocada do visceral, dano letal em inimigos comuns (não vale no Guardião), **sem pausa de cinema e sem tremor**, sem grito, som curto e seco, invencível durante a animação, **sem alertar vizinhos**. Aparece o texto discreto "PELAS COSTAS" no destaque.
- Se o inimigo percebeu, vale o que já existe (forte carregado pelas costas desequilibra e abre o visceral).
- Ganhar rally cheio como no visceral.

## Parte C — Pulo contra a rasteira e contra-ataque pisando

- A rasteira já não acerta quem está no ar acima de `alturaPulo` (evento `jogador:pulou-golpe`). Falta a recompensa: se o jogador pulou a rasteira, ao **cair a até 1,8 m do atacante dentro de 0,8 s**, ele pisa nele (`pisada`): dano de 1,5× o leve, o inimigo fica desequilibrado `pisada.desequilibrio` (uns 1,2 s, abre o visceral) e o jogador quica um pouco. Se cair fora do alcance, nada acontece.
- **Pular contra golpe alto** (no ar acima de uma altura mínima durante a fase ativa do golpe alto, que não é `evitaPulando`) leva **dano extra** (`danoExtraNoAr`, ×1,5). Isso é só um custo, não há aviso na tela.
- A rasteira continua sem poder ser aparada.

## Arquivos

`src/config.js` (`CONFIG.combate.furtividade`, `costas`, `pisada`), `src/entidades/Jogador.js` (agachar, golpe pelas costas, pisada), `src/entidades/Inimigo.js` (percepção por cone e barulho, alerta, `receberCostas`), `src/entidades/Boneco.js` (pose agachada), `src/interface/Hud.js` (texto), `src/audio/Som.js`, testes (`tests/jogabilidade.test.js` ou `tests/areas.test.js`: regras puras de percepção, cone e pisada), LEIAME e PASSAGEM.

## Critérios de aceite

1. Agachado por trás de um inimigo desatento, o ataque o mata em silêncio e os vizinhos não reagem. Visto, os vizinhos ao redor passam a perseguir.
2. Pular a rasteira e cair perto abre o contra-ataque pisando; pular contra golpe alto custa dano extra.
3. Nada muda para quem não agacha: patrulhas já existentes continuam percebendo o jogador de frente como hoje (conferir `visao` e as regras atuais antes de mexer).
4. Save e `Toque.js` não mudam; sem assets; sem botão novo de toque; o Guardião e os inimigos em combate não são afetados pela execução silenciosa.
5. `npm test` e `npm run build` passam (o navegador é testado jogando, pela versão publicada).

## Decidido pela IA (o Heitor revisa)

- **Em pé nada muda:** o cone de quem não agacha continua o de antes (`furtividade.coneEmPe` = −0,15, uns 200°) com a `visao` inteira, e por trás ele ouve a 5 m (`raioAndando`, vale também parado). O cone de 100° (`anguloVisao`) e a `visaoNoEscuro` (0,5 da `visao`) só valem para o caçador **agachado**. Correndo, ouve a 7 m (`raioCorrendo`); agachado, a 1 m (`raioAgachado`). A linha de visão (parede no meio, desnível) segue a de antes.
- Agachado: 45% da velocidade, olhos a 62% da altura (primeira pessoa), não corre e o Espaço não faz nada (não levanta). Z de novo levanta. Beber o frasco não levanta. O corpo encolhe 26% e inclina o tronco (sem mexer no modelo).
- **Golpe pelas costas** não exige estar agachado: basta o inimigo ainda estar patrulhando (desatento), o caçador estar no cone de 60° atrás dele a até 1,6 m e o inimigo estar à frente do caçador (o mesmo cone do visceral). Reaproveita a ação `visceral` (pose, invencibilidade, 0,7 s) com `jogador.costas = true`; o golpe **mantém o agachamento** para o barulho do golpe não acordar os vizinhos. Morte letal (`receberCostas`), som seco curto, sem rosnado de morte (`inimigo.silencioso`), texto "PELAS COSTAS" menor e acinzentado. O alvo fica parado durante a estocada.
- **Alerta:** sai quando um inimigo percebe o caçador, leva tiro ou apanha patrulhando. Os vizinhos (mesma área, a até 10 m, patrulhando) passam a perseguir 0,4 s depois, indo ao ponto onde o caçador estava. Quem foi alertado não alerta outros (sem corrente), e o Guardião não alerta nem é alertado.
- **Pisada:** a janela de 0,8 s conta do instante em que a rasteira passou por baixo. Dano 1,5× o leve pelo `receberDano` comum (rally normal), desequilíbrio de 1,2 s com duração própria (`tempoDesequilibrio`); caindo atrás dele, o visceral vale por trás. Quique de 3,5 m/s, texto "PISADA". Vale também no Guardião.
- **Dano extra no ar:** só para o tipo `alto` (inclui as varridas laterais do Guardião), no ar a pelo menos 0,25 m: ×1,5. O pesado não muda.
- Sem botão de toque, sem tutorial; `Toque.js`, save, modelos e mapas não mudaram. Regras puras em `src/entidades/Furtividade.js`.
