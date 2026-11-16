// npm run verificar: testes + build + git diff --check, com saída curta (≤ 15 linhas).
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const linhas = [];
const rodar = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20 });

const testes = readdirSync('tests').filter((f) => f.endsWith('.test.js')).map((f) => `tests/${f}`);
const t = rodar(process.execPath, ['--test', '--test-reporter=spec', ...testes]);
const saida = (t.stdout || '') + (t.stderr || '');
const num = (k) => (saida.match(new RegExp(`ℹ ${k} (\\d+)`)) || [])[1] ?? '?';
const falhas = [...saida.matchAll(/^\s*✖ (.+)$/gm)].map((m) => m[1]).filter((s) => !/^failing tests/.test(s));
linhas.push(`testes: ${num('pass')}/${num('tests')} passam, ${num('fail')} falham`);
for (const f of [...new Set(falhas)].slice(0, 8)) linhas.push(`  ✖ ${f.slice(0, 110)}`);

const b = rodar('npx', ['vite', 'build', '--logLevel', 'error']);
linhas.push(b.status === 0 ? 'build: ok' : `build: FALHOU\n${(b.stderr || b.stdout).trim().split('\n').slice(-3).join('\n')}`);

const d = rodar('git', ['diff', '--check', 'HEAD']);
linhas.push(d.status === 0 ? 'diff --check: ok' : `diff --check: FALHOU\n${d.stdout.trim().split('\n').slice(0, 3).join('\n')}`);

const ok = t.status === 0 && b.status === 0 && d.status === 0;
linhas.push(ok ? 'VERIFICAR: OK' : 'VERIFICAR: FALHOU');
console.log(linhas.join('\n'));
process.exit(ok ? 0 : 1);
