# CLAUDE.md — Tennis Tracker

## Descripción

PWA de seguimiento de partidos de tenis. Marcador punto a punto en tiempo real, historial de partidos y estadísticas por rival.

**URL en GitHub Pages:** `https://jdc-testing.github.io/Test-claude/proyectos/tennis-tracker/`

---

## Stack

- HTML + CSS + JS vanilla, todo en `index.html` (sin frameworks, sin build)
- Persistencia: localStorage (`tt_profile`, `tt_rivals`, `tt_matches`, `tt_current`)
- PWA: `manifest.json` + `sw.js` (estrategia network-first, actualmente v2)

---

## Lógica de puntuación de tenis

### Puntos (representación interna: enteros 0, 1, 2, 3, 4…)
- `0→"0"`, `1→"15"`, `2→"30"`, `3→"40"`
- Ambos ≥ 3 e iguales → **Deuce**
- Diferencia de 1 → **Ad** (líder) / **—** (otro)
- Diferencia ≥ 2 con ambos ≥ 4 → **juego ganado**

### Juegos en un set
- Ganar set: primero en llegar a 6 con 2+ de ventaja (6-0 … 6-4, 7-5)
- En 6-6: se activa el tiebreak (si `tiebreakTarget > 0`)

### Tiebreak
- `tiebreakTarget = 7` → tiebreak estándar (primero a 7 con 2+ de diferencia)
- `tiebreakTarget = 10` → super tiebreak (primero a 10 con 2+ de diferencia)
- `tiebreakTarget = 0` → sin tiebreak, ventaja indefinida

---

## Funciones clave (JS)

| Función | Descripción |
|---------|-------------|
| `addPoint(player)` | Suma un punto y actualiza todo el estado |
| `addGame(player)` | Suma un juego completo directamente (sin pasar por puntos) |
| `undoLastPoint()` | Deshace la última acción (max 30 snapshots) |
| `getPointDisplay(my, rival)` | Devuelve strings para mostrar en marcador |
| `startMatch()` | Inicializa `current` con el formato elegido |
| `confirmFinish()` | Guarda el partido en `matches`, limpia `current` |
| `saveEditMatch()` | Edita un partido ya guardado (sets + resultado + fecha) |

---

## Estructura de datos (localStorage)

```js
// tt_current — partido en curso
{
  rivalId, rivalName,
  format: { numSets: 3, tiebreakTarget: 7 },
  completedSets: [{ my, rival, tiebreak: null | { my, rival, target } }],
  currentSetGames: { my, rival },
  isTiebreak: false,
  tbPoints: { my, rival },
  gamePoints: { my, rival },
  history: []   // snapshots para undo
}

// tt_matches — partidos terminados
[{
  id, date, rivalId, rivalName,
  result: "win" | "loss" | "abandoned",
  sets: [{ my, rival, tiebreak }],
  setsWon: { my, rival },
  format: { numSets, tiebreakTarget }
}]
```

---

## Convenciones

- Nunca añadir dependencias externas (CDN, npm)
- Mantener todo en un único `index.html`
- Si se actualiza el service worker, incrementar `CACHE_NAME` en `sw.js` (actualmente `tennis-tracker-v2`)
- Al modificar el proyecto, actualizar `README.md` y `CLAUDE.md` raíz si aplica
