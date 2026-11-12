# PUGNA

Base de um jogo 3D de navegador: ação e exploração em primeira pessoa num vilarejo
gótico, à noite, com visual retrô estilo PS1. Você é um caçador que enfrenta
cavaleiros e caçadores corrompidos, sob uma **lua enorme com rosto** que não tira
os olhos de você.

> Este arquivo é o ponto de partida para qualquer pessoa (ou IA) que for continuar
> o projeto. **Mantenha-o atualizado a cada mudança.**

---

## Como rodar o jogo

Você precisa do **Node.js** (versão LTS, 18 ou mais nova): https://nodejs.org

**Jeito fácil (Windows):** dê dois cliques em `jogar.bat`. Na primeira vez ele baixa
as dependências (precisa de internet) e depois abre o jogo no navegador.

**Jeito manual:** abra um terminal dentro desta pasta e rode:

```
npm install      (só na primeira vez)
npm run dev
```

Depois abra no Chrome o endereço que aparecer, normalmente **http://localhost:5173**

Para parar o jogo, feche a janela preta do terminal (ou aperte Ctrl+C nela).

## Publicar para os amigos jogarem (GitHub Pages)

O projeto já vem preparado: o arquivo `.github/workflows/publicar.yml` monta e publica
o jogo sozinho toda vez que uma versão nova é enviada ao GitHub.

**Só na primeira vez:**
1. Crie uma conta grátis em https://github.com
2. Instale o **GitHub Desktop** (https://desktop.github.com) e entre com a sua conta.
3. No GitHub Desktop: *File → Add local repository* → escolha a pasta `pugna`.
4. Clique em **Publish repository**. Desmarque "Keep this code private" (o GitHub
   Pages gratuito só funciona em repositório público) e confirme.
5. No site do GitHub, abra o repositório → **Settings → Pages** → em "Source" escolha
   **GitHub Actions**.
6. Aba **Actions** → "Publicar o jogo" → **Run workflow**. Espere ficar verde (~1 min).
7. O jogo estará em `https://SEU-USUARIO.github.io/pugna/`. Mande esse link aos amigos.

**A cada versão nova:** abra o GitHub Desktop, escreva um resumo do que mudou no campo
"Summary", clique em **Commit to main** e depois em **Push origin**. Em cerca de um
minuto o link já mostra a versão nova.

A pasta `referencias/` fica de fora do GitHub de propósito (está no `.gitignore`):
são imagens de outros autores.

## Git (histórico de versões)

O projeto foi construído com um commit por etapa. Para ligar esse histórico na sua
pasta, instale o **Git** (https://git-scm.com) e dê dois cliques em
`configurar-git.bat` **uma única vez**. Ele cria o repositório e importa o histórico
que está em `historico-git.bundle`. Depois disso, `git log` mostra as etapas e você
(ou a IA do próximo chat) pode continuar fazendo commits normalmente.

## Controles

| Ação | Tecla |
|---|---|
| Andar | W A S D |
| Olhar | Mouse |
| Correr | Shift (segurando, andando para a frente) |
| Pular | Espaço |
| Ataque leve | Clique esquerdo |
| Ataque forte | Segurar o clique esquerdo e soltar |
| Bloquear | Segurar o clique direito |
| Esquivar | Ctrl, Alt ou Q (com uma direção; parado, pula para trás) |
| Descansar na lanterna | E |
| Tela cheia | F |
| Pausar / soltar o mouse | Esc |

**Atenção com o Ctrl:** no Chrome, Ctrl+W fecha a aba, e isso não pode ser desligado
por um site. O jogo pede confirmação antes de fechar se o Ctrl estiver apertado, e em
**tela cheia (F)** o atalho deixa de fechar a aba. Se preferir não arriscar, use **Q**
ou **Alt** para esquivar.

### Como o combate funciona
- Tudo gasta **estamina** (barra verde): correr, pular, atacar, esquivar e aguentar
  golpes no bloqueio. Sem estamina você não ataca nem corre.
- Bloquear só funciona **de frente** para o inimigo. Se a estamina acabar no bloqueio,
  a guarda quebra e você fica atordoado.
- A esquiva te deixa **invencível por um instante**.
- O ataque forte **interrompe** o golpe de qualquer inimigo. O ataque leve só
  interrompe o caçador (o cavaleiro é "firme" demais).
- **Cavaleiro:** lento, forte, ergue a espada devagar. Esquive ou saia de lado e puna.
- **Caçador:** rápido, dá dois golpes seguidos e pula para trás. Bloqueie e revide.
- Ao morrer você volta à última **lanterna** em que descansou. Descansar recupera a
  vida, mas traz todos os inimigos de volta.

## O que existe hoje (fase 1)

- Vilarejo gótico pequeno: ruas de pedra, 17 casas, torres, cemitério, muralha,
  tochas e névoa.
- **Catedral** ao norte: duas torres com agulhas, rosácea, portal, transepto, abside,
  contrafortes e vitrais. A porta está **selada**, com uma luz verde vazando por
  baixo: ela é a entrada planejada para as próximas fases (a posição fica em
  `mundo.igreja.porta`).
- Céu noturno roxo-azulado com nuvens, estrelas e a **lua com rosto**: ela ocupa boa
  parte do céu, está sempre visível (a nordeste, ao lado das torres), tem um
  sorriso aberto com dentes tortos à mostra, vira o rosto e as pupilas na direção do
  jogador, e quando é encarada por alguns segundos os olhos acendem e a boca abre mais.
- Filtro PS1: baixa resolução ampliada sem suavização, texturas "nearest", tremida
  de vértices, dithering e redução de cores.
- Movimento em primeira pessoa com colisão; dá para subir em caixotes e degraus.
- Combate com ataque leve, forte, bloqueio, esquiva e estamina.
- Dois inimigos (cavaleiro e caçador) com IA: patrulhar, perseguir, atacar, morrer.
- Vida, tela de morte e duas lanternas de descanso (portão sul e adro da igreja).
- Sons sintetizados: passos, espada, impacto, metal, vento.
- Tela inicial.

> **Mudança de rumo registrada:** a ideia original tinha um gigante encapuzado no
> horizonte. Ele foi **removido** e substituído pela lua com rosto (inspirada na
> `referencias/ref04_lua_com_rosto.jpg`). Não existe mais código do gigante.

## Organização das pastas

```
pugna/
├─ index.html              página do jogo (telas e barras em HTML)
├─ .github/workflows/      publicação automática no GitHub Pages
├─ jogar.bat               atalho para rodar no Windows
├─ configurar-git.bat      liga o histórico do Git (rodar uma vez)
├─ LEIAME.md               este arquivo
├─ CREDITOS.md             origem de bibliotecas e assets
├─ referencias/            imagens-guia de estilo (não fazem parte do jogo)
├─ public/assets/          assets baixados no futuro (hoje vazio)
└─ src/
   ├─ main.js              ponto de entrada
   ├─ config.js            ★ TODOS os números ajustáveis: cores, velocidades, dano...
   ├─ nucleo/
   │  ├─ Jogo.js           junta tudo e roda o laço principal; estados do jogo
   │  ├─ Entrada.js        teclado e mouse
   │  ├─ Eventos.js        "quadro de avisos" entre as partes do jogo
   │  └─ Salvamento.js     salva o progresso (hoje no navegador; depois Supabase)
   ├─ render/
   │  ├─ RenderizadorRetro.js  baixa resolução + dithering
   │  ├─ retro.js          tremida de vértices PS1
   │  └─ texturas.js       texturas pixeladas feitas no código
   ├─ mundo/
   │  ├─ Vilarejo.js       ★ o MAPA: onde fica cada casa, tocha, inimigo, lanterna
   │  ├─ pecas.js          como construir casa, torre, igreja, tocha, árvore...
   │  ├─ Colisores.js      colisões
   │  ├─ Ceu.js            céu, nuvens, estrelas
   │  └─ Lua.js            a lua com rosto e o "olhar" dela
   ├─ entidades/
   │  ├─ Jogador.js        movimento, vida, estamina e regras do combate
   │  ├─ Arma.js           a espada que aparece na tela (só animação)
   │  ├─ Inimigo.js        aparência e IA dos dois inimigos
   │  └─ Lanterna.js       ponto de descanso
   ├─ audio/Som.js         sons sintetizados
   └─ interface/
      ├─ Hud.js            barras, avisos, telas
      └─ estilo.css        aparência da interface
```

### Onde mexer para…
- **mudar dano, velocidade, vida, cores, névoa, nível de pixelado:** `src/config.js`
- **mudar o mapa** (mover casa, pôr tocha, pôr inimigo): `src/mundo/Vilarejo.js`
- **mudar o título do jogo:** `titulo` em `src/config.js`
- **mudar o rosto da lua:** função `relevoLua` em `src/mundo/Lua.js`
- **criar um inimigo novo:** um bloco novo em `CONFIG.inimigos` + aparência em
  `montarCorpo` (`src/entidades/Inimigo.js`)

### Como o código está preparado para o futuro
- **Multiplayer (Supabase Realtime):** as partes do jogo conversam por avisos
  (`Eventos.js`: `jogador:golpe`, `inimigo:morreu`…). Um módulo de rede só precisa
  escutar esses avisos e usar `jogador.exportarEstado()`. Os outros jogadores entram
  como mais uma lista em `Jogo.js`, igual a `this.inimigos`.
- **Salvar no Supabase:** escreva uma classe com os métodos `carregar()` e
  `salvar(dados)` (iguais aos de `SalvamentoLocal`) e troque uma linha em `Jogo.js`.
- **Mapa maior / outras áreas:** cada área é uma classe como `Vilarejo`, que preenche
  `colisores`, `tochas`, `pontosDeDescanso` e `inimigos`.
- **Assets de verdade (Kenney, Quaternius):** as "peças" estão isoladas em `pecas.js`
  e `montarCorpo`; dá para trocar uma de cada vez por modelos `.glb`.

## Roadmap (o que falta)

**Polimento da fase 1**
- [ ] Testar e ajustar o "peso" do combate jogando de verdade (tempos em `config.js`)
- [ ] Inimigos contornarem obstáculos melhor (hoje só tentam desviar de lado)
- [ ] Inimigos não enxergarem através de paredes
- [ ] Mãos/braços do caçador mais detalhados e a capa aparecendo ao olhar para baixo
- [ ] Trocar sons sintetizados por gravações CC0; música ambiente
- [ ] Menu de opções (sensibilidade do mouse, volume, nível de pixelado)
- [ ] Combate menos genérico: travar a mira no inimigo, aparar (parry), golpe pelas
      costas, sequências de ataques, armas com ritmos diferentes
- [ ] Interior da catedral (próxima área) e de algumas casas

**Próximas fases**
- [ ] Mais seres cósmicos no horizonte que mudam o céu e as cores (`Ceu.definirPaleta`)
- [ ] Salvar progresso no Supabase (login simples)
- [ ] Multiplayer para ~5 amigos se verem (Supabase Realtime)
- [ ] Inventário, itens de cura, armas diferentes
- [ ] Mapa maior com áreas ligadas (floresta, castelo, caverna)
- [ ] Chefes
- [ ] Modelos e animações de verdade (Blender ou pacotes CC0)

## Notas técnicas
- **Chão e ruas não gravam profundidade** (`depthWrite: false`) e são desenhados
  primeiro, em ordem fixa. Motivo: com a tremida de vértices, superfícies enormes e
  quase coladas "piscavam" ao andar. Qualquer piso plano novo deve seguir o mesmo
  esquema (veja o comentário em `Vilarejo.js`). Consequência: nada pode ficar abaixo
  do nível do chão esperando ser escondido por ele.
- Three.js + Vite + JavaScript puro (sem TypeScript, para facilitar a leitura).
- O jogo é desenhado em 270 linhas de altura e ampliado; é muito leve para qualquer
  placa de vídeo atual.
- Abrir o jogo com `?teste` no endereço (`http://localhost:5173/?teste`) deixa jogar
  sem prender o mouse; serve para testes automáticos.
- No console do navegador (F12), a variável `jogo` dá acesso a tudo
  (ex.: `jogo.jogador.vida = 100`).
- Histórico de mudanças: `git log`.
