@echo off
rem  Atualiza esta pasta com a versao mais nova do jogo no GitHub (branch main).
rem  De dois cliques neste arquivo. O jogar.bat tambem chama este arquivo sozinho.
rem  Nunca apaga trabalho seu: se algo atrapalhar, ele avisa e nao mexe em nada.
setlocal
cd /d "%~dp0"
set "QUIETO="
if /i "%~1"=="/quieto" set "QUIETO=1"
chcp 65001 >nul

where git >nul 2>nul
if errorlevel 1 goto sem_git
if not exist .git goto sem_repo

echo.
echo  Procurando atualizacoes no GitHub...
git fetch --quiet origin
if errorlevel 1 goto sem_rede

set "RAMO="
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "RAMO=%%i"
set "ANTES="
for /f "delims=" %%i in ('git rev-parse HEAD 2^>nul') do set "ANTES=%%i"
if /i "%RAMO%"=="main" goto na_main

rem  Fora da main: traz a main local para a versao do GitHub sem mexer nos arquivos.
git fetch --quiet origin main:main 2>nul

rem  So troca para a main se a branch atual ja estiver inteira la (nada se perde).
git diff --quiet HEAD origin/main
if errorlevel 1 goto outra_branch
git checkout --quiet main
if errorlevel 1 goto outra_branch
echo  A branch "%RAMO%" ja foi integrada. A pasta voltou para a main.

:na_main
git merge --ff-only --quiet origin/main
if errorlevel 1 goto nao_deu
set "DEPOIS="
for /f "delims=" %%i in ('git rev-parse HEAD 2^>nul') do set "DEPOIS=%%i"
if "%ANTES%"=="%DEPOIS%" goto ja_atual

echo  Pasta atualizada. O que chegou:
git log --format="   %%h  %%an: %%s" %ANTES%..%DEPOIS%
if not exist node_modules goto fim
git diff --quiet %ANTES% %DEPOIS% -- package-lock.json
if not errorlevel 1 goto fim
echo  As dependencias mudaram. Atualizando, aguarde...
call npm install
goto fim

:ja_atual
echo  A pasta ja esta na versao mais nova.
goto fim

:outra_branch
echo  Voce esta na branch "%RAMO%", que tem trabalho ainda nao integrado na main.
echo  Os arquivos da pasta nao foram alterados.
goto fim

:nao_deu
echo  Nao deu para atualizar sozinho: a main desta pasta tem mudancas suas
echo  que nao estao no GitHub. Nada foi alterado. Guarde essas mudancas numa
echo  branch pelo GitHub Desktop e rode este arquivo de novo.
goto fim

:sem_git
echo  O Git nao esta instalado, entao nao da para procurar atualizacoes.
echo  Baixe em https://git-scm.com se quiser atualizar por aqui.
goto fim

:sem_repo
echo  Esta pasta ainda nao esta ligada ao GitHub. Veja "Publicar" no LEIAME.md.
goto fim

:sem_rede
echo  Nao foi possivel falar com o GitHub. Confira a internet.
echo  A pasta continua na versao que ja estava.
goto fim

:fim
echo.
if not defined QUIETO pause
endlocal
exit /b 0
