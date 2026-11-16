// Portões automáticos de uma tentativa: verificar + tamanho do diff + escopo.
// Uso: node tools/portoes.mjs <commit-base> <teto-de-linhas> <prefixo-permitido>[,<prefixo>...]
// Ex.: node tools/portoes.mjs origin/main 400 src/mundo/,src/config.js,tests/
import { spawnSync } from 'node:child_process';

const [base = 'origin/main', teto = '400', escopo = ''] = process.argv.slice(2);
const git = (...a) => spawnSync('git', a, { encoding: 'utf8' }).stdout.trim();
const permitidos = escopo.split(',').filter(Boolean);
// Arquivos de base gerados pelos testes não contam como fora do escopo.
const sempre = ['tests/orcamento-base.json', 'PASSAGEM.md'];

const numstat = git('diff', '--numstat', `${base}...HEAD`).split('\n').filter(Boolean)
  .concat(git('diff', '--numstat', 'HEAD').split('\n').filter(Boolean));
let linhas = 0;
const fora = new Set();
for (const l of numstat) {
  const [ad, rm, arq] = l.split('\t');
  if (arq.endsWith('.json') && arq.startsWith('tests/')) continue;
  linhas += (Number(ad) || 0) + (Number(rm) || 0);
  if (permitidos.length && !sempre.includes(arq) && !permitidos.some((p) => arq.startsWith(p))) fora.add(arq);
}
const v = spawnSync('npm', ['run', '-s', 'verificar'], { encoding: 'utf8' });
const okV = v.status === 0, okL = linhas <= Number(teto), okE = fora.size === 0;
console.log(v.stdout.trim().split('\n').slice(0, 10).join('\n'));
console.log(`diff: ${linhas} linhas (teto ${teto}) ${okL ? 'ok' : 'ESTOUROU'}`);
console.log(`escopo: ${okE ? 'ok' : 'FORA: ' + [...fora].join(', ')}`);
console.log(`PORTOES: ${okV && okL && okE ? 'PASSOU' : 'FALHOU'}`);
process.exit(okV && okL && okE ? 0 : 1);
