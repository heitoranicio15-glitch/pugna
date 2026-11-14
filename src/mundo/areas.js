// =============================================================================
//  REGISTRO DE ÁREAS
//  Área nova = uma classe com os campos do contrato (docs/specs/00-contrato-de-area.md)
//  + uma linha no REGISTRO abaixo. O Jogo.js não precisa mudar.
//  A primeira área do REGISTRO é a área inicial (onde o caçador nasce).
// =============================================================================
import { Vilarejo } from './Vilarejo.js';
import { Catedral } from './Catedral.js';

export const REGISTRO = [
  { id: 'vilarejo', criar: (cena, ceu) => new Vilarejo(cena, ceu.direcaoLua) },
  { id: 'catedral', criar: (cena) => new Catedral(cena) },
];

const CAMPOS_LISTA = ['portais', 'pontosDeDescanso', 'inimigos', 'objetos'];

// Confere os campos obrigatórios e devolve a lista de problemas (vazia = ok).
export function validarArea(area) {
  const problemas = [];
  if (!area || typeof area !== 'object') return ['a área não é um objeto'];
  const nome = area.id || '(sem id)';
  if (typeof area.id !== 'string' || !area.id) problemas.push('falta `id` (texto)');
  if (typeof area.nome !== 'string' || !area.nome) problemas.push(`${nome}: falta \`nome\``);
  const l = area.limites;
  if (!l || ['minX', 'maxX', 'minZ', 'maxZ'].some((k) => typeof l[k] !== 'number')) {
    problemas.push(`${nome}: \`limites\` precisa de minX, maxX, minZ e maxZ`);
  }
  if (area.nevoa === undefined) problemas.push(`${nome}: falta \`nevoa\` (ou null)`);
  if (typeof area.luzJogador !== 'number') problemas.push(`${nome}: \`luzJogador\` precisa ser número`);
  if (typeof area.usaCeu !== 'boolean') problemas.push(`${nome}: \`usaCeu\` precisa ser verdadeiro ou falso`);
  for (const campo of CAMPOS_LISTA) {
    if (!Array.isArray(area[campo])) problemas.push(`${nome}: \`${campo}\` precisa ser uma lista`);
  }
  if (!area.chegadas || typeof area.chegadas !== 'object') problemas.push(`${nome}: falta \`chegadas\``);
  if (!area.grupo) problemas.push(`${nome}: falta \`grupo\``);
  if (!area.colisores) problemas.push(`${nome}: falta \`colisores\``);
  for (const p of area.pontosDeDescanso || []) {
    if (!p || typeof p.id !== 'string' || !p.id) problemas.push(`${nome}: ponto de descanso sem \`id\``);
  }
  return problemas;
}

// Recebe áreas já criadas, valida tudo e devolve { areas, porId, inicial, checkpoints }.
export function montarAreas(lista) {
  if (!lista || !lista.length) throw new Error('Nenhuma área para montar.');
  const porId = new Map();
  for (const area of lista) {
    const problemas = validarArea(area);
    if (problemas.length) throw new Error(`Área inválida: ${problemas.join('; ')}`);
    if (porId.has(area.id)) throw new Error(`ID de área repetido: "${area.id}"`);
    porId.set(area.id, area);
  }
  const checkpoints = new Map();
  for (const area of lista) {
    for (const ponto of area.pontosDeDescanso) {
      if (checkpoints.has(ponto.id)) throw new Error(`ID de ponto de descanso repetido: "${ponto.id}"`);
      checkpoints.set(ponto.id, { area, ponto });
    }
  }
  for (const area of lista) {
    for (const portal of area.portais) {
      const destino = porId.get(portal.destino);
      if (!destino) throw new Error(`Portal de "${area.id}" aponta para área inexistente: "${portal.destino}"`);
      if (!destino.chegadas[area.id]) {
        throw new Error(`Área "${destino.id}" não tem \`chegadas\` para quem vem de "${area.id}"`);
      }
    }
  }
  return { areas: [...lista], porId, inicial: lista[0], checkpoints };
}

export function criarAreas(cena, ceu) {
  return montarAreas(REGISTRO.map((r) => r.criar(cena, ceu)));
}
