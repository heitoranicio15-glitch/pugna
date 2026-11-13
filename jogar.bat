@echo off
rem  Atalho para rodar o jogo no Windows: de dois cliques neste arquivo.
rem  Na primeira vez ele baixa as dependencias (precisa de internet).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  O Node.js nao esta instalado.
  echo  Baixe a versao LTS em https://nodejs.org , instale e abra este arquivo de novo.
  echo.
  pause
  exit /b
)
rem  Antes de abrir, busca a versao mais nova no GitHub (se der).
if exist atualizar.bat call atualizar.bat /quieto
if not exist node_modules (
  echo  Instalando dependencias pela primeira vez, aguarde...
  call npm install
)
echo.
echo  O jogo vai abrir no navegador. Para parar, feche esta janela.
echo.
call npm run dev -- --open
pause
