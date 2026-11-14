# 06 — Supabase opcional (login e progresso)

**Modelo recomendado:** Sonnet. **Precisa do Heitor:** criar (ou autorizar) o projeto no Supabase e decidir o jeito de entrar.

## Objetivo

Uns 5 amigos poderem continuar o jogo em outro computador. **Local primeiro:** o jogo funciona inteiro sem conta e sem internet, como hoje. A nuvem é um extra que nunca trava a partida.

## Como

- **Login:** link mágico por e-mail (sem senha) **(decidido pela IA, o Heitor revisa)**. Botão "Entrar para guardar o progresso na nuvem" em Configurações. Sem conta, nada muda.
- **Tabela única** `progresso`: `usuario uuid primary key references auth.users`, `dados jsonb`, `atualizado_em timestamptz`. O `dados` é exatamente o mesmo objeto que hoje vai para `pugna-progresso-v1`. Preferências (volume, brilho, estilo de gráfico) **não** sobem: são de cada computador.
- **RLS ligada**, com políticas de ler, inserir e atualizar apenas onde `auth.uid() = usuario`. Sem política de apagar pelo cliente. A migração SQL fica versionada em `supabase/migrations/`.
- **Chaves:** no código só entram a URL do projeto e a chave **pública** (publishable/anon), que é feita para ficar exposta e depende da RLS. **Nunca** a `service_role` ou qualquer chave secreta, nem em arquivo, nem em workflow. O repositório é público.
- **Código:** `src/nucleo/SalvamentoNuvem.js` com os mesmos métodos do `SalvamentoLocal` (`carregar()`, `salvar(dados)`), como o LEIAME já previa. Ele **sempre grava no local primeiro** e envia para a nuvem em segundo plano (com espera de ~2 s para juntar gravações). Falha de rede só gera um aviso discreto.
- **Conflito:** ao entrar, compara `atualizado_em` local e remoto. Se forem diferentes, pergunta uma vez: "Usar o progresso deste computador ou o da nuvem?". Nunca mistura sozinho.
- **Biblioteca:** `@supabase/supabase-js` carregada só quando o jogador clica em entrar (import dinâmico), para não pesar o jogo de quem não usa.
- Limitar cadastros aos e-mails dos amigos (lista de convidados no painel do Supabase) e desligar cadastro aberto.

## Fora do escopo

Multiplayer, presença dos amigos no mapa, ranking, loja. Ficam no "Depois" do PASSAGEM.

## Arquivos

`src/nucleo/SalvamentoNuvem.js` (novo), `src/nucleo/Jogo.js` (a "uma linha" que escolhe o salvamento), menu de configurações (`index.html`, `src/interface/`), `src/config.js` (`CONFIG.nuvem = { url, chavePublica }`), `supabase/migrations/*.sql`, `package.json`, testes, LEIAME, PASSAGEM.

## Critérios de aceite

1. Sem login e sem internet, o jogo se comporta exatamente como hoje (os testes atuais passam sem mudança).
2. Com login: gravar num navegador, entrar em outro e continuar da mesma lanterna.
3. Um usuário não consegue ler nem escrever a linha de outro (teste com duas contas; conferir os avisos de segurança do Supabase).
4. `grep -ri "service_role\|secret" src/ .github/` não acha chave nenhuma.
5. Derrubar a rede no meio da partida não trava nem perde o progresso local.
6. `npm test`, `npm run build`, `npm run test:browser` passam; teste novo com um cliente de mentira cobre "local primeiro", falha de rede e escolha no conflito.
