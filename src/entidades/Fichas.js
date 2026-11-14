// =============================================================================
//  FICHAS DE ATAQUE (pressão em grupo)
//  Só alguns inimigos comuns podem atacar o caçador ao mesmo tempo
//  (CONFIG.combate.grupo.atacantesSimultaneos). Cada área tem um conjunto.
//  O inimigo pede uma ficha antes de partir para o ataque e a devolve quando a
//  sequência termina, quando cambaleia, é aparado ou morre. Sem ficha, ele ronda.
//
//  Quem pediu e não levou entra numa fila: quando uma ficha volta, ela vai
//  para quem esperava há mais tempo (assim ninguém fica de fora para sempre).
//  Chefes (CONFIG.inimigos.X.chefe) não usam ficha: pedir sempre dá certo.
//  Este arquivo só tem regras: não desenha nada.
// =============================================================================
import { CONFIG } from '../config.js';

export class Fichas {
  constructor(limite = CONFIG.combate.grupo.atacantesSimultaneos) {
    this.limite = limite;
    this.donos = new Set();   // quem está com ficha
    this.fila = [];           // quem pediu e está esperando, na ordem
  }

  /** O inimigo pode atacar? Devolve true se já tinha ou acabou de pegar uma ficha. */
  pedir(inimigo) {
    if (inimigo.cfg?.chefe || this.donos.has(inimigo)) return true;
    if (!this.fila.includes(inimigo)) this.fila.push(inimigo);
    if (this.fila.indexOf(inimigo) >= this.limite - this.donos.size) return false;
    this.fila.splice(this.fila.indexOf(inimigo), 1);
    this.donos.add(inimigo);
    return true;
  }

  /** Devolve a ficha (e tira o inimigo da fila de espera). */
  devolver(inimigo) {
    this.donos.delete(inimigo);
    const i = this.fila.indexOf(inimigo);
    if (i >= 0) this.fila.splice(i, 1);
  }

  /** Esquece todas as fichas e a fila (troca de área, inimigos repostos). */
  limpar() {
    this.donos.clear();
    this.fila.length = 0;
  }

  tem(inimigo) { return this.donos.has(inimigo); }
}
