# 08 — Etapa C: chefe e imprevisibilidade

**Modelo recomendado:** Opus ou Fable. **Depende de:** Etapa B (spec 07) integrada. **Mexe na partida:** sim.
**Fonte:** item C do Plano do PASSAGEM. **(IA)** = decidido pela IA, o Heitor revisa.

## Objetivo

Fazer os inimigos deixarem de ser um metrônomo e o Guardião do Véu virar um chefe de verdade: quem decorou um ritmo erra o parry, quem bebe frasco na cara do inimigo apanha, e a **fase 2 não pode ser vencida só com parry**. Fecha a conta que a Etapa A deixou aberta (o spam de ataque leve ainda vence os inimigos comuns).

## Entregar em 3 PRs pequenos

### PR C1 — imprevisibilidade (todos os inimigos)

```
CONFIG.combate.imprevisibilidade = {
  variacaoPreparo: 0.12,   // o aviso dura de -12% a +12%, sorteado a cada golpe
}
```

- **Variação do aviso:** `montarGolpe(cfg, entrada, sorteio = Math.random)` multiplica o `preparo` por `1 + (sorteio() × 2 − 1) × variacaoPreparo` (respeitando `preparoMin`). O sorteio entra por parâmetro para o teste ser determinístico.
- **Golpe atrasado:** uma entrada de sequência pode ter `atraso: 0.35`. O inimigo chega à pose final do aviso e **segura** por esse tempo antes de bater (somar ao `preparo`; a pose em `Inimigo.js` trava no fim da subida em vez de esticar a animação). Como a janela do parry é contada a partir do fim do preparo (spec 07), ela continua certa sozinha. O aviso sonoro toca no começo, igual: o som não entrega o atraso.
- **Sequências mais longas e rasteira mais frequente:** só `CONFIG.inimigos` (palpites): cavaleiro ganha `alto + pesado(atraso)`; caçador `alto + alto + rasteira`; penitente `alto + alto(atraso) + pesado`; subir o `peso` das rasteiras em ~50%.
- Uma sequência nunca repete três vezes seguidas (`sortearSequencia` já recebe a anterior; estender).

### PR C2 — fase final do Guardião

- Uma entrada de sequência pode sobrescrever campos do tipo: `{ tipo: 'pesado', aparavel: false, aviso: 'inaparavel' }`.
- **Aviso próprio** do golpe que não pode ser aparado: arma e olhos **brancos-violeta** (o vermelho é do pesado, o amarelo da rasteira) e um som próprio (sino invertido/grave duplo). O jogador aprende vendo, sem texto de tutorial.
- Tiro nesses golpes: gasta bala, só arranha, emite `jogador:resposta-errada`. Resposta certa: esquiva/quickstep (ou pulo, se for rasteira).
- `CONFIG.inimigos.guardiao.faseFinal.ataques` (palpite): pelo menos metade do peso em golpes não aparáveis: `varrida dupla inaparável (lado +1, −1)` peso 3, `pesado inaparável com atraso` peso 2, `rasteira + alto` peso 2, `alto + alto` (aparáveis) peso 2. Sequências de até 3 golpes.
- Na virada de fase: rugido, 1 s de invencibilidade do chefe, e ele se afasta um passo (hoje só muda a cor do olho) **(IA)**.
- O `desequilibrio` do Guardião na fase final cai para 0,9 s: ainda dá o visceral, mas só para quem emenda na hora.
- `eventoDeDerrota` e os IDs do save não mudam.

### PR C3 — pressão em grupo e punição do frasco

```
CONFIG.combate.grupo = { atacantesSimultaneos: 2, distanciaDeEspera: 4.5 }
CONFIG.combate.punirFrasco = { distancia: 7, chance: 0.8, reacao: 0.15 }
```

- **Limite de atacantes:** módulo puro `src/entidades/Fichas.js` (`pedir(inimigo)`, `devolver(inimigo)`, `limpar()`). O inimigo pede a ficha antes de `atacar()`; sem ficha, fica rondando em `distanciaDeEspera` (anda de lado, encarando). Devolve ao terminar a sequência, cambalear, ser aparado ou morrer. Chefes e minibosses não usam ficha. `Jogo.js` cria um conjunto por área e limpa em `ativarArea`/`reporInimigos`.
- **Punir frasco:** ao ouvir `jogador:bebendo`, cada inimigo em combate, livre e dentro de `distancia`, com `chance`, depois de `reacao` segundos, avança e inicia a sequência mais rápida dele (ignora a espera entre ataques, mas respeita as fichas). O Guardião sempre pune (chance 1).

## Arquivos

`src/entidades/Ataques.js`, `src/entidades/Inimigo.js`, `src/entidades/Fichas.js` (novo), `src/nucleo/Jogo.js` (fichas; trechos pequenos), `src/audio/Som.js`, `src/config.js`, `tests/jogabilidade.test.js`, `tests/catedral.mjs`, LEIAME, PASSAGEM. Usar `grep -n` nos arquivos grandes.

## Testes

- Variação: com sorteio 0, 0,5 e 1 o preparo é −12%, 0 e +12%; nunca abaixo de `preparoMin`.
- Atraso: o golpe com `atraso` só fica ativo depois de `preparo + atraso`; a janela do tiro acompanha.
- Inaparável: tiro na "janela" não desequilibra, gasta bala e emite `resposta-errada`; a esquiva evita.
- Fase final: abaixo de metade da vida, as sequências sorteadas vêm da lista nova e pelo menos metade do peso não é aparável.
- Fichas: com limite 2 e 3 inimigos, só 2 atacam; a ficha volta ao morrer, cambalear e ser aparado.
- Frasco: beber a 5 m de um inimigo livre dispara ataque (sorteio forçado); a 10 m, não.
- Simulação "só aperta o ataque leve" (já usada na Etapa A): passa a **perder** para o Guardião e a sair com menos de metade da vida contra dois inimigos comuns. Registrar o resultado no PASSAGEM.
- `tests/catedral.mjs` continua derrotando o Guardião (ajustar a rotina do teste se ela dependia do ritmo fixo).

## Critérios de aceite

1. Nenhum golpe inimigo tem sempre o mesmo tempo de aviso.
2. O Guardião na fase 2 não pode ser vencido só com parry: há golpes com aviso próprio que o tiro não apara.
3. No máximo 2 inimigos comuns atacam ao mesmo tempo.
4. Beber frasco colado no inimigo é punido; afastar-se antes funciona.
5. Tudo ajustável em `src/config.js`; save antigo carrega igual; nada de toque; sem tutorial.
6. `npm test`, `npm run build`, `npm run test:browser` passam em cada PR.

## E1: equilíbrio por simulação

O simulador fica em `tests/equilibrio.mjs` (rode com `node tests/equilibrio.mjs`; aceita `--lutas N`, `--cenario guardiao,mistos3` e `--jogador spam,habil`). Ele monta o `Jogador` e os `Inimigo` de verdade numa arena vazia, sem WebGL, e roda lutas inteiras. Leva uns 3 s para tudo. O `npm test` roda só 8 lutas por caso (`tests/equilibrio.test.js`).

### Premissas

- **Passo fixo** de 1/60 s; limite de 240 s por luta (passou disso, conta como derrota). A pausa de impacto do `Jogo.js` não entra (congela os dois lados igual).
- **Sementes fixas:** a luta N usa a semente N (1 a 60). Durante a luta o `Math.random` do jogo vira um gerador com semente; o jogador simulado tem o próprio gerador. A mesma semente repete a mesma luta.
- **Cenários:** o caçador começa em (0, 0) e os inimigos já perseguindo, a 4 a 5,6 m: Guardião sozinho (as duas fases), 2 cavaleiros, 3 cavaleiros e 3 mistos (cavaleiro, caçador e penitente). As fichas de ataque valem como no jogo.
- **SPAM:** aperta o ataque leve a cada 0,08 s, parado, com a ajuda de mira do jogo (sem trava). Não bebe frasco.
- **HÁBIL:** trava a mira no inimigo mais perto. Só "vê" cada golpe depois de um tempo de reação sorteado entre 0,15 e 0,25 s a partir do começo do aviso. Aí: golpe aparável com bala sobrando → atira mirando o meio da janela do parry, com erro de tempo sorteado (desvio de 0,045 s); rasteira → pula 0,12 s antes do golpe (erro de 0,035 s); inaparável ou sem bala → quickstep para trás 0,04 s antes do golpe (erro de 0,03 s). Inimigo desequilibrado a até 3,5 m → anda até ele e ataca (vira visceral ou execução). Senão, ataca leve quando nenhum golpe que ele já viu cai nos próximos 0,6 s e sobra estamina para um quickstep; fica entre 1,3 e 2,3 m do alvo. Com menos de 40 de vida, corre para longe e só bebe o frasco (3 por luta, cura de 42) com todos a mais de 7,5 m. Tem as 8 balas do jogo.
- **ESQUIVA** (opcional, "esquiva e bate"): igual ao hábil, mas nunca atira nem pula: responde a todo golpe com o quickstep.
- O hábil sabe o instante do golpe (com o erro acima), como quem já aprendeu a pose e o som; ele não vê o golpe antes do tempo de reação.

### Antes e depois (60 lutas por cenário: vitórias, mediana de vida nas vitórias)

| Cenário | SPAM antes | SPAM depois | HÁBIL antes | HÁBIL depois | ESQUIVA antes | ESQUIVA depois |
| --- | --- | --- | --- | --- | --- | --- |
| Guardião | 42/60 (70%), 27 | 4/60 (7%), 15 | 60/60, 86 | 60/60, 90 | 60/60, 89 | 60/60, 81 |
| 2 cavaleiros | 44/60 (73%), 57 | 9/60 (15%), 24 | 59/60, 100 | 59/60, 100 | 60/60, 96 | 60/60, 92 |
| 3 cavaleiros | 19/60 (32%), 29 | 0/60 (0%), — | 57/60, 90 | 57/60, 85 | 58/60, 89 | 58/60, 89 |
| 3 mistos | 42/60 (70%), 50 | 8/60 (13%), 27 | 59/60, 90 | 60/60, 91 | 59/60, 90 | 57/60, 82 |

Tempo médio depois: Guardião 14,5 s (spam), 14,9 s (hábil) e 28,9 s (esquiva); grupos de 6 a 23 s. Conferido com 200 lutas (spam depois): Guardião 14%, 2 cavaleiros 16%, 3 cavaleiros 1%, 3 mistos 14%.

Os números do "antes" não batem com os do PASSAGEM (Guardião 58 de 60) porque a rotina antiga não ficou guardada; a comparação vale entre as duas colunas desta tabela, feitas com o mesmo simulador.

### Números mudados (2 rodadas)

| Onde | Antes | Depois | Por quê |
| --- | --- | --- | --- |
| `combate.leve.custo` | 14 | 18 | o spam esgota a estamina com 5 golpes em vez de 7; o hábil bate menos vezes seguidas e não sente |
| `combate.rally.porDano` | 0,35 | 0,25 | o leve devolvia quase 8 de vida por acerto e sustentava o spam; o visceral continua devolvendo o rally inteiro |
| `inimigos.penitente.dano` | 19 | 24 | grupo misto |
| `inimigos.cacador.dano` | 13 | 16 | grupo misto |
| `inimigos.cacador.vida` | 62 | 70 (rodada 2) | o leve derruba o caçador rápido demais; com 62 o spam ainda vencia 27% dos mistos em 200 lutas |

Não mudaram: as janelas do parry, a regra de ouro, o Guardião (vida e dano), as fichas (`atacantesSimultaneos` continua 2) e a firmeza. Ressalva: o hábil simulado acerta o tempo melhor que muita gente (venceu quase tudo antes e depois); a meta "hábil vence mais da metade" ficou folgada, mas vale sentir jogando se o Guardião não ficou duro demais para quem ainda aprende o parry.
