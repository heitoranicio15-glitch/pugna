@echo off
rem  Liga o historico do Git nesta pasta (rode UMA vez, depois de instalar o Git).
rem  O historico das etapas ja feitas vem dentro do arquivo historico-git.bundle.
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo  O Git nao esta instalado. Baixe em https://git-scm.com , instale e abra este arquivo de novo.
  echo.
  pause
  exit /b
)
if exist .git (
  echo  Esta pasta ja tem Git configurado. Nada a fazer.
  pause
  exit /b
)
git init -b main
git config core.autocrlf false
git fetch historico-git.bundle main
git reset FETCH_HEAD
echo.
echo  Pronto. Historico das etapas:
git log --oneline
echo.
echo  Pode apagar o arquivo historico-git.bundle se quiser.
pause
