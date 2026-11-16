// Custo por execução de subagente, a partir dos transcritos do Claude Code.
// Uso: node tools/custo.mjs [pasta-ou-arquivo.jsonl ...]   (padrão: subagentes de todas as sessões)
// Cada mensagem do assistente traz `usage`; o mesmo id aparece várias vezes (streaming), então conta uma vez só.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const precos = JSON.parse(readFileSync(new URL('./precos.json', import.meta.url), 'utf8')).modelos;
const jsonls = (d) => readdirSync(d).filter((f) => f.endsWith('.jsonl')).map((f) => join(d, f));

function arquivosPadrao() {
  const base = join(homedir(), '.claude', 'projects');
  if (!existsSync(base)) return [];
  const saida = [];
  for (const p of readdirSync(base)) {
    const dp = join(base, p);
    if (!statSync(dp).isDirectory()) continue;
    for (const s of readdirSync(dp)) {
      const d = join(dp, s, 'subagents');
      if (existsSync(d)) saida.push(...jsonls(d));
    }
  }
  return saida;
}

export function medir(arquivo) {
  const vistos = new Map();
  let ini = Infinity;
  let fim = 0;
  let ferramentas = 0;
  for (const linha of readFileSync(arquivo, 'utf8').split('\n')) {
    if (!linha) continue;
    let e;
    try { e = JSON.parse(linha); } catch { continue; }
    const t = Date.parse(e.timestamp);
    if (t) { ini = Math.min(ini, t); fim = Math.max(fim, t); }
    const m = e.message;
    if (e.type !== 'assistant' || !m?.usage) continue;
    if (!vistos.has(m.id) && Array.isArray(m.content)) ferramentas += m.content.filter((c) => c.type === 'tool_use').length;
    vistos.set(m.id ?? linha, { modelo: m.model, u: m.usage });
  }
  const r = { modelo: '', entrada: 0, saida: 0, cacheEscrita: 0, cacheLeitura: 0, usd: 0,
    turnos: vistos.size, ferramentas, segundos: fim > ini ? Math.round((fim - ini) / 1000) : 0 };
  for (const { modelo, u } of vistos.values()) {
    r.modelo = modelo;
    const p = precos[modelo] ?? precos['claude-opus-5-5'];
    const [i, o, cw, cr] = [u.input_tokens, u.output_tokens, u.cache_creation_input_tokens, u.cache_read_input_tokens].map((x) => x ?? 0);
    r.entrada += i; r.saida += o; r.cacheEscrita += cw; r.cacheLeitura += cr;
    r.usd += (i * p.entrada + o * p.saida + cw * p.cacheEscrita + cr * p.cacheLeitura) / 1e6;
  }
  r.usd = Math.round(r.usd * 10000) / 10000;
  return r;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const alvos = process.argv.slice(2);
  const arquivos = alvos.length
    ? alvos.flatMap((a) => (statSync(a).isDirectory() ? jsonls(a) : [a]))
    : arquivosPadrao();
  for (const a of arquivos) {
    const r = medir(a);
    console.log([a.split('/').pop().replace('.jsonl', ''), r.modelo, `in ${r.entrada}`, `out ${r.saida}`,
      `cw ${r.cacheEscrita}`, `cr ${r.cacheLeitura}`, `$${r.usd}`, `${r.segundos}s`, `${r.turnos} turnos`].join(' | '));
  }
}
