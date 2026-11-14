# 02 — Gráfico: PS1 (padrão) ou HD "dark fantasy"

**Modelo recomendado:** Sonnet (se o shader der trabalho duas vezes seguidas, Opus).

## Objetivo

Um botão no menu de **Configurações** para escolher o estilo de imagem:

- **PS1 (padrão):** exatamente o de hoje (270 linhas, pixelado, dithering, redução de cores, tremida de vértices). Quem nunca mexeu continua vendo isso.
- **HD:** menos pixelado e com mais cor, no clima de fantasia sombria. Mesma cena, mesmos modelos de caixas: muda só o acabamento.

## Como

- Preferência nova `estiloGrafico: 'ps1' | 'hd'` na chave de **preferências** (não na de progresso), padrão `'ps1'`. Preferência antiga sem esse campo = `'ps1'`.
- `CONFIG.render.estilos = { ps1: {...valores de hoje...}, hd: { linhas: 720, dithering: 0, niveisDeCor: 0 (sem redução), tremor: 0, saturacao: 1.15, contraste: 1.08, filtroTextura: 'linear' } }` (números são palpite).
- `RenderizadorRetro.js`: ganha `definirEstilo(nome)` que troca resolução interna e uniformes. Nada de trocar de renderizador.
- `texturas.js`: função para alternar o filtro das texturas já criadas (`NearestFilter` ↔ `LinearFilter`).
- No modo HD, os controles "pixelização" e "tremor dos vértices" ficam desativados (cinza), com o valor do PS1 guardado.
- Troca na hora, sem recarregar, tanto na tela inicial quanto na pausa.

## Fora do escopo

- A perspectiva fica em um controle próprio de câmera, entregue depois de S2.
- Modelos novos, sombras dinâmicas, pós-processamento pesado (bloom, SSAO).
- Qualquer coisa de celular.

## Arquivos

`src/render/RenderizadorRetro.js`, `src/render/texturas.js`, `src/render/retro.js` (tremor zerado no HD), `src/config.js`, menu de configurações em `src/interface/` e `index.html`, onde as preferências são salvas (`src/nucleo/Salvamento.js` ou equivalente), `tests/jogabilidade.test.js` (preferência padrão e migração), LEIAME.

## Critérios de aceite

1. Jogo aberto pela primeira vez, ou com preferências antigas, está em PS1 e idêntico ao de hoje.
2. Trocar para HD muda a imagem na hora; recarregar a página mantém a escolha; "Apagar progresso" não apaga a escolha.
3. No HD o jogo continua fluido num PC comum (o teste do navegador não fica mais que ~20% mais lento).
4. `npm test`, `npm run build`, `npm run test:browser` passam; teste novo cobre padrão e persistência da preferência.
