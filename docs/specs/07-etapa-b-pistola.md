# 07 — Etapa B: pistola (parry), visceral, execução e quickstep

**Modelo recomendado:** Opus ou Fable. **Mexe na partida:** sim (`npm run test:browser` obrigatório).
**Fonte:** item B do Plano, "Decisões já tomadas" e "regra de ouro do combate" do PASSAGEM. Onde o PASSAGEM não fala, vale o marcado **(IA)** = decidido pela IA, o Heitor revisa.

## Objetivo

A pistola vira a mão secundária e o **único parry** do jogo: um tiro no momento certo do golpe inimigo desequilibra, e o ataque seguinte vira **visceral** (ou **execução**, se o golpe aparado era pesado). O bloqueio e o aparo do broquel **saem**. A esquiva com mira travada vira **quickstep**. Tudo o que é número fica em `CONFIG.combate`.

Fluidez (da pesquisa do PASSAGEM): o gesto é instantâneo, o erro não trava o jogador, o spam custa bala, a recompensa emenda na hora.

## Entregar em 3 PRs pequenos, nesta ordem

Cada PR passa `npm test`, `npm run build`, `npm run test:browser` e é integrado antes do próximo (o Heitor mexe nos mesmos arquivos).

### PR B1 — pistola, parry, munição, saída do broquel

**Controles.** Clique direito (`botoesApertados[2]`) atira; **C** também atira **(IA)**. É toque, não segurar. Não mexer em `Toque.js` nem criar botão de toque.

**Config novo** (`CONFIG.combate.pistola`, com comentários em português simples):

```
pistola: {
  balasMax: 8,            // (IA) recarrega ao descansar, renascer ou usar o Osso
  dano: 6,                // tiro fora da janela: arranhão, não faz cambalear
  alcance: 9,             // metros; "curto alcance", sem bala voando
  abertura: 0.8,          // cosseno do cone à frente (sem mira travada)
  recuperacao: 0.3,       // tempo sem poder atacar depois do tiro
  liberarEsquiva: 0.1,    // a esquiva pode cortar a recuperação a partir daqui
  fila: 0.15,             // aperto guardado se o caçador estiver ocupado
  janelaNoAviso: 0.09,    // últimos segundos do preparo do inimigo
  janelaNoGolpe: 0.04,    // primeiros segundos do golpe ativo (se ainda não resolveu)
  desequilibrio: 1.9,     // duração do inimigo aberto (era aparar.desequilibrio)
  pausa: 0.12, tremor: 0.045,
}
```

Janela total = `(janelaNoAviso + janelaNoGolpe) × golpe.janelaAparar`: alto 0,13 s; pesado 0,08 s (mudar `ataquesInimigos.pesado.janelaAparar` de 0,55 para 0,6). O multiplicador encolhe as duas partes. O Guardião continua com o `desequilibrio` próprio dele (1,15).

**`Ataques.js`.** Método novo e puro em `MaquinaDeAtaque`: `naJanelaDeAparo(cfgPistola)` → `true` se há golpe, `golpe.aparavel`, `!resolvido` e (`fase === 'preparo'` e `golpe.preparo - t <= janelaNoAviso × janelaAparar`) ou (`fase === 'ativo'` e `t <= janelaNoGolpe × janelaAparar`). É isto que prende a janela à animação do inimigo.

**`Jogador.js`.**
- Estado novo: `balas` (começa em `balasMax`), `tiroNaFila`, ação `'tiro'`.
- `atirar()`: exige `acao === 'livre'`, `tEsquiva <= 0`, não estar `curando`/`atordoado`, `balas > 0`. No chão ou no ar **(IA)**. Não gasta estamina. Sem bala: emite `jogador:sem-bala` (clique seco) e nada mais.
- O tiro resolve **no mesmo quadro do aperto** (sem preparo): gasta 1 bala sempre (errar gasta: é o anti-spam), chama `orientarParaGolpe()`, escolhe o alvo e entra em `'tiro'` por `recuperacao` (velocidade normal; a esquiva pode cortar depois de `liberarEsquiva`, no mesmo esquema de `podeCancelar`).
- Alvo: o `this.alvo` da mira travada se estiver dentro do `alcance`; senão o inimigo vivo mais próximo dentro do cone `abertura` e do `alcance`. Parede no caminho bloqueia (`colisores.bloqueiaTrecho`, como em `varrerGolpe`).
- Acertou e `alvo.ataque.naJanelaDeAparo(cfg)`: `alvo.serAparado(golpe)`, `pausaDeImpacto(pausa)`, tremor, `invencivel = max(invencivel, 0.25)` (o golpe em curso não entra), emite `jogador:aparou`. Marcar `ataque.resolvido = true`.
- Acertou fora da janela: `alvo.levarTiro(dano)`. Se o golpe em curso tem `aparavel === false` (rasteira), emite também `jogador:resposta-errada { resposta: 'aparar', tipo }` (o aviso já existe).
- Sempre emite `jogador:tiro { acertou, aparou }`.
- **Remover:** ação `'aparar'`, `apararNaFila`, o trecho de KeyC, `bloqueando = e.botoes[2]...`, e os ramos de aparo e bloqueio de `receberDano` (ele passa a devolver só `'ignorado' | 'esquivou' | 'pulou' | 'ferido'`). Manter o campo `bloqueando` sempre `false` em `exportarEstado()` para não quebrar quem lê. Os multiplicadores de velocidade de bloqueio/aparo saem.

**`Inimigo.js`.**
- `levarTiro(dano)`: tira vida, pisca, emite `inimigo:ferido`, acorda quem estava em patrulha; **não** cambaleia, **não** consome o desequilíbrio (não aplica crítico) e trata a morte e a fase final como `receberDano`.
- `serAparado` passa a ler a duração em `pistola.desequilibrio` (ou a do inimigo). O resto fica.

**`Jogo.js`.** Onde descansar restaura vida (bloco do `tDescanso`), em `renascer` e no Osso de Retorno: `jogador.balas = balasMax`. As balas **não vão para o save** (recarregar a página já renasce na lanterna, com balas cheias). Sem mudança no formato do save.

**`Hud.js` / `index.html` / `estilo.css`.** Contador de balas ao lado dos frascos (`mostrarBalas(n)`), discreto. `destacar` ganha `'APARADO'` pelo tiro (já existe o texto).

**`Boneco.js`.** Tirar o broquel do braço esquerdo e pôr uma pistola de caixas (cano + coronha). Pose curta de tiro: braço esquerdo estica e dá um coice. Tirar as poses de aparar e bloquear.

**`Som.js`.** `jogador:tiro` (estampido seco sintetizado + eco curto), `jogador:sem-bala` (clique). `jogador:aparou` continua. Remover os sons de `jogador:aparar`/`jogador:bloqueou` se ficarem sem uso.

**`config.js`.** Remover `aparar` e `bloqueio` (as ideias do broquel já estão guardadas no PASSAGEM). Os campos `bloqueavel`/`custoBloqueio` dos golpes podem ficar: servem ao broquel futuro.

**Celular.** Congelado: não tocar em `Toque.js`. Se `npm run test:celular` (opcional) quebrar por causa do bloqueio, registrar no PR e no PASSAGEM; não consertar.

### PR B2 — visceral, execução e ataque forte carregado

```
visceral: { multiplicador: 3.5, alcance: 2.3, duracao: 0.7, momento: 0.25, pausa: 0.18, tremor: 0.12 },
execucao: { multiplicador: 5,   pausa: 0.28, tremor: 0.18 },
carga:    { multiplicadorMax: 1.6, abrePelasCostas: true },
```

- **Disparo:** ao iniciar um ataque (leve ou forte), se existe inimigo `desequilibrado`, de frente para o caçador dentro de `visceral.alcance` e sem parede no meio, o ataque vira `iniciarVisceral(inimigo)` em vez do golpe normal. Não gasta estamina **(IA)**.
- **Durante:** ação `'visceral'` por `duracao`; `invencivel = duracao`; o caçador cola e encara o alvo; o inimigo fica preso no desequilíbrio até o golpe entrar. Em `momento`: `inimigo.receberVisceral(dano, direcao, execucao)` com `dano = leve.dano × multiplicador` (o de `execucao` se `inimigo.abertoParaExecucao`). Pausa e tremor do tipo. Depois, `recuperarComGolpe(Infinity)` = **rally cheio** (devolve todo o `recuperavel`; ajustar a função para aceitar isso sem multiplicar por `porDano`).
- `Inimigo.receberVisceral`: aplica o dano **sem** multiplicar de novo pelo crítico, empurra forte, sai do desequilíbrio para `atordoado`. Emite `golpe:visceral { execucao }`.
- Golpe comum num inimigo desequilibrado que **não** vira visceral (de lado, de longe) continua sendo o crítico de 2,6× de hoje.
- HUD: `destacar('VISCERAL')` / `destacar('EXECUÇÃO')`. Som: impacto grave + sino (execução: mais grave e mais longo). Boneco: pose de estocada.
- **Carga do forte:** dano = `forte.dano × (1 + (multiplicadorMax − 1) × carga)`, com `carga` de 0 a 1 entre `tempoSegurarForte` e `tempoMaximoCarga`. Carga completa (≥ 0,95) acertando **pelas costas** (o caçador atrás do inimigo: produto escalar da frente do inimigo com a direção inimigo→caçador < −0,3) chama `inimigo.desequilibrar()` (extrair de `serAparado`; sem execução) e abre o visceral.

### PR B3 — quickstep

```
quickstep: { custo: 14, duracao: 0.2, invencivel: 0.13, velocidade: 11, espera: 0.12 },
esquiva.invencivel: 0.26 → 0.22
```

Com a mira travada (`this.alvo`), a esquiva usa o bloco `quickstep`: passo curto na direção apertada (parado: para trás), sem animação de rolamento (`rolando = false`, pose de passo no Boneco), evento `jogador:esquiva { quickstep: true }` com som mais curto. Sem mira, é o rolamento de hoje.

## Testes

**`tests/jogabilidade.test.js` — reescrever** (hoje nas linhas ~182, 208, 335, 368, 473; usar `grep -n`):
- tiro na janela desequilibra e não leva dano; antes e depois da janela só arranha e o golpe entra;
- a janela do pesado é menor que a do alto (testar um instante que vale para o alto e não para o pesado);
- rasteira: tiro não apara, gasta bala e emite `resposta-errada`; pular continua valendo;
- pesado aparado liga `abertoParaExecucao`.

**Novos:** `naJanelaDeAparo` nas bordas das fases; tiro gasta bala acertando ou errando; sem bala não atira; descansar repõe; parede bloqueia o tiro; tiro não cambaleia nem gasta o desequilíbrio; não existe mais bloqueio (clique direito segurado não reduz dano); visceral 3,5× com invencibilidade e rally cheio; execução 5×; crítico comum 2,6× preservado de lado; dano do forte cresce com a carga; carga completa pelas costas desequilibra; quickstep só com mira e com menos invencibilidade; rolamento com 0,22.

**`tests/catedral.mjs`:** um trecho curto: atirar baixa o contador, descansar na lanterna repõe. O resto do percurso (até derrotar o Guardião) tem que continuar passando.

## Documentos

LEIAME: tabela de controles (sai Bloquear e Aparar; entra Atirar), "Como o combate funciona", tabela de tipos de ataque, "O que existe hoje", "Onde mexer para…", roadmap. PASSAGEM: Estado atual, marcar B no Plano e na Fila do Gabriel, tirar "até a Etapa B…" da Visão e das Decisões.

## Critérios de aceite

1. Não existe mais bloqueio nem aparo com C; o boneco carrega pistola.
2. Parry só acontece com tiro dentro da janela presa à fase do golpe; rasteira nunca é aparada.
3. Bala é gasta em todo tiro e só volta na lanterna, ao renascer ou com o Osso.
4. Visceral e execução causam o dano configurado, com pausa, tremor, invencibilidade e rally cheio.
5. Quickstep só com mira travada.
6. Nenhum número novo fora de `src/config.js`. Nenhuma mudança em `Toque.js`. Save antigo carrega igual.
7. Todos os testes passam em cada um dos 3 PRs.

## Ficou de fora (anotar no PASSAGEM como ideia)

Gastar vida para fazer balas (ideia do Bloodborne); balas como item encontrado no mapa; penalidade por morrer.
