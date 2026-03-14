/**
 * tennis-logic.js — Lógica pura de puntuación de tenis
 *
 * Todas las funciones son puras: no leen ni escriben estado global.
 * Reciben los datos necesarios como parámetros.
 * Esto permite testearlas fácilmente en tests.html.
 *
 * Claves usadas: 'p1' y 'p2' (neutral, sin "my"/"rival")
 */

'use strict';

/**
 * Devuelve el display de puntos para ambos jugadores.
 * @param {number} p1 - puntos de p1 (entero)
 * @param {number} p2 - puntos de p2 (entero)
 * @param {boolean} noDeuce - si true, sin ventaja (40-40 siguiente gana)
 * @returns {{ p1: string, p2: string }}
 */
function getPointDisplay(p1, p2, noDeuce) {
  const L = ['0', '15', '30', '40'];

  // Antes de 40-40
  if (p1 < 3 && p2 < 3) {
    return { p1: L[p1], p2: L[p2] };
  }

  // Sin deuce: 40-40 y siguiente punto gana
  if (noDeuce) {
    return {
      p1: p1 >= 3 ? '40' : L[p1],
      p2: p2 >= 3 ? '40' : L[p2],
    };
  }

  // Con deuce estándar
  if (p1 === p2)           return { p1: 'Deuce', p2: 'Deuce' };
  if (p1 - p2 === 1)       return { p1: 'Ad',    p2: '—' };
  if (p2 - p1 === 1)       return { p1: '—',     p2: 'Ad' };
  // por si llegan a diferencias mayores (no debería)
  return { p1: String(p1), p2: String(p2) };
}

/**
 * Determina si algún jugador ha ganado el juego.
 * @param {number} p1 - puntos de p1
 * @param {number} p2 - puntos de p2
 * @param {boolean} noDeuce
 * @returns {'p1' | 'p2' | null}
 */
function gameWinner(p1, p2, noDeuce) {
  if (noDeuce) {
    // A partir de 40-40 (pts=3 c/u), siguiente punto gana → pts=4
    if (p1 >= 4 && p1 > p2) return 'p1';
    if (p2 >= 4 && p2 > p1) return 'p2';
  } else {
    if (p1 >= 4 && p1 - p2 >= 2) return 'p1';
    if (p2 >= 4 && p2 - p1 >= 2) return 'p2';
  }
  return null;
}

/**
 * Determina si algún jugador ha ganado el set.
 * Regla: primero en llegar a 6 con 2+ de ventaja.
 * @param {number} p1 - juegos de p1
 * @param {number} p2 - juegos de p2
 * @returns {'p1' | 'p2' | null}
 */
function setWinner(p1, p2) {
  if (p1 >= 6 && p1 - p2 >= 2) return 'p1';
  if (p2 >= 6 && p2 - p1 >= 2) return 'p2';
  return null;
}

/**
 * Determina si algún jugador ha ganado el tiebreak.
 * @param {number} p1 - puntos de p1
 * @param {number} p2 - puntos de p2
 * @param {number} target - objetivo (7 normal, 10 super TB)
 * @returns {'p1' | 'p2' | null}
 */
function tiebreakWinner(p1, p2, target) {
  if (p1 >= target && p1 - p2 >= 2) return 'p1';
  if (p2 >= target && p2 - p1 >= 2) return 'p2';
  return null;
}

/**
 * Calcula sets ganados por cada jugador en el partido actual.
 * Usa la variable global `current` (estado del partido en curso).
 * @returns {{ p1: number, p2: number }}
 */
function getSetsWon() {
  let p1 = 0, p2 = 0;
  for (const s of current.completedSets) {
    if (s.p1 > s.p2) p1++; else p2++;
  }
  return { p1, p2 };
}

/**
 * Crea un snapshot del estado actual para undo (máx 30).
 * @returns {object} snapshot
 */
function snapshotCurrent() {
  return {
    completedSets:   JSON.parse(JSON.stringify(current.completedSets)),
    currentSetGames: { ...current.currentSetGames },
    isTiebreak:      current.isTiebreak,
    tbPoints:        { ...current.tbPoints },
    gamePoints:      { ...current.gamePoints },
  };
}

/**
 * Cierra el set actual y lo añade a completedSets.
 * Reinicia contadores para el siguiente set.
 */
function closeCurrentSet() {
  current.completedSets.push({
    p1: current.currentSetGames.p1,
    p2: current.currentSetGames.p2,
    tiebreak: current.isTiebreak
      ? { p1: current.tbPoints.p1, p2: current.tbPoints.p2, target: current.format.tiebreakTarget }
      : null,
  });
  current.currentSetGames = { p1: 0, p2: 0 };
  current.isTiebreak      = false;
  current.tbPoints        = { p1: 0, p2: 0 };
  current.gamePoints      = { p1: 0, p2: 0 };
}

/**
 * Comprueba, tras un juego ganado, si se ha ganado el set
 * o si hay que activar el tiebreak (6-6).
 */
function checkAfterGame() {
  const sw = setWinner(current.currentSetGames.p1, current.currentSetGames.p2);
  if (sw) {
    closeCurrentSet();
    return;
  }
  if (current.currentSetGames.p1 === 6 && current.currentSetGames.p2 === 6) {
    if (current.format.tiebreakTarget > 0) {
      current.isTiebreak = true;
    }
  }
}
