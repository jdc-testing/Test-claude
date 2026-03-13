# CLAUDE.md — Tennis Tracker

## Descripción

PWA de seguimiento de partidos de tenis. Marcador punto a punto en tiempo real, historial de partidos, estadísticas por rival y gestión de perfil.

**URL en GitHub Pages:** `https://jdc-testing.github.io/Test-claude/proyectos/tennis-tracker/`

---

## Stack

- HTML + CSS + JS vanilla, todo en `index.html` (sin frameworks, sin build)
- Persistencia: localStorage (`tt_profile`, `tt_rivals`, `tt_matches`, `tt_current`)
- PWA: `manifest.json` + `sw.js` (estrategia network-first, actualmente v2)

---

## Navegación (3 pestañas)

| Tab | ID | Contenido |
|-----|----|-----------|
| 🎾 Partido | `match-tab` | Pantalla de inicio con selector de rival / marcador en vivo |
| 📊 Estadísticas | `stats-tab` | Resumen, rachas, gráfico, por rival, historial |
| 👤 Perfil | `profile-tab` | Mi perfil, rival por defecto, lista de rivales, exportar datos |

---

## Lógica de puntuación

### Puntos (representación interna: enteros 0, 1, 2, 3, 4…)
- `0→"0"`, `1→"15"`, `2→"30"`, `3→"40"`
- Sin deuce (`noDeuce=true`): a 3-3 muestra "40 | 40"; siguiente punto gana
- Con deuce (`noDeuce=false`): 3-3 → Deuce, diferencia de 1 → Ad, diferencia ≥ 2 → juego ganado

### Juegos en un set
- Ganar set: primero en 6 con 2+ de ventaja (6-0 … 6-4, 7-5)
- En 6-6: se activa tiebreak si `tiebreakTarget > 0`

### Tiebreak
- `tiebreakTarget = 7` → tiebreak estándar
- `tiebreakTarget = 10` → super tiebreak
- `tiebreakTarget = 0` → sin tiebreak (ventaja indefinida)

---

## Funciones clave (JS)

| Función | Descripción |
|---------|-------------|
| `addPoint(player)` | Suma punto y actualiza estado |
| `addGame(player)` | Suma juego completo directamente |
| `undoLastPoint()` | Deshace última acción (max 30 snapshots) |
| `getPointDisplay(my, rival)` | Devuelve strings para marcador (respeta noDeuce) |
| `gameWinner(my, rival)` | Determina ganador del juego (respeta noDeuce) |
| `startMatch()` | Inicializa `current` con formato elegido |
| `confirmFinish()` | Guarda partido, limpia `current` |
| `saveEditMatch()` | Edita partido guardado (sets + resultado + fecha) |
| `saveRivalForm()` | Guarda rival y sincroniza nombre en partidos históricos |
| `downloadData()` | Exporta JSON con profile + rivals + matches |
| `saveDefaultRival()` | Guarda rival por defecto en profile |

---

## Estructura de datos (localStorage)

```js
// tt_profile
{ name, photo, defaultRivalId }

// tt_rivals — array
[{ id, name, photo }]

// tt_current — partido en curso
{
  rivalId, rivalName,
  format: { numSets, tiebreakTarget, noDeuce },
  completedSets: [{ my, rival, tiebreak: null | { my, rival, target } }],
  currentSetGames: { my, rival },
  isTiebreak, tbPoints: { my, rival },
  gamePoints: { my, rival },
  history: []  // snapshots undo (max 30)
}

// tt_matches — partidos terminados
[{
  id, date, rivalId, rivalName,
  result: "win" | "loss" | "abandoned",
  sets: [{ my, rival, tiebreak }],
  setsWon: { my, rival },
  format: { numSets, tiebreakTarget, noDeuce }
}]
```

---

## Convenciones

- Todo en un único `index.html`, sin dependencias externas
- Gráfico de barras usa alturas en píxeles (no porcentajes) para compatibilidad con flex
- Al renombrar un rival se actualizan automáticamente todos los partidos históricos (`rivalName`)
- Si se cambia la versión del service worker, incrementar `CACHE_NAME` en `sw.js` (actualmente `tennis-tracker-v2`)
- Al modificar el proyecto, actualizar `README.md` raíz si aplica
