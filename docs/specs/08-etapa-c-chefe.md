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
