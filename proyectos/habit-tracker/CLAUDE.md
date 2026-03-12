# CLAUDE.md — Habit Tracker

## Qué es este proyecto

PWA de seguimiento de hábitos diarios. Stack completamente vanilla: un solo `index.html` + `sw.js`. Sin frameworks, sin build, sin dependencias. Se despliega en GitHub Pages.

## Archivos

```
habit-tracker/
├── index.html        # Toda la app: HTML + CSS + JS
├── sw.js             # Service Worker (cache network-first)
├── manifest.json     # Config PWA (nombre, iconos, colores)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── REQUIREMENTS.md   # Spec completa de funcionalidades
```

## Cómo funciona internamente

**Estado en memoria:**
```js
let habits  = []   // array de { id, label, emoji }
let records = {}   // { "YYYY-MM-DD": { [habitId]: boolean } }
```

**Persistencia — claves de localStorage:**
| Clave         | Contenido                          |
|---------------|------------------------------------|
| `ht_habits`   | Array de hábitos (orden incluido)  |
| `ht_records`  | Registro diario de cumplimiento    |
| `ht_settings` | `{ notifEnabled, notifTime }`      |

**Flujo de render:** cada pantalla tiene su propia función `renderX()` que regenera el innerHTML completo. No hay virtual DOM ni diffing.

**Service Worker:** estrategia _network-first_. Al cambiar contenido hay que subir `CACHE_NAME` (actualmente `habit-tracker-v3`).

## Convenciones

- Todo el código JS está en el `<script>` inline al final del HTML
- Las secciones del JS están separadas por comentarios `// ── NOMBRE ──`
- Las IDs del DOM siguen el patrón: `screen-X`, `nav-X`, `filter-X`
- Las fechas se manejan siempre como strings `YYYY-MM-DD` (función `todayKey()` / `localKey()`)
- `START_DATE = new Date(2026, 2, 1)` — no mostrar datos anteriores a esta fecha

## Restricciones importantes

- **No añadir dependencias externas** (ni CDN, ni npm). Todo debe funcionar con un simple `open index.html`.
- **No fragmentar en múltiples archivos JS/CSS** salvo que sea estrictamente necesario; la ventaja del proyecto es ser un único archivo desplegable.
- **Máximo 10 hábitos** — límite hardcodeado, no cambiar sin actualizar la UI.
- **No usar `seedNewHabits()`** — fue una función de migración que ya no debe llamarse en el init. Está en el código pero sin uso; se puede eliminar en una limpieza futura.
- Las notificaciones usan `setTimeout` + Web Notifications API. Sin Push API (requeriría servidor). No intentar implementar notificaciones offline reales sin un backend.

## Tareas frecuentes

### Añadir una nueva pantalla
1. Añadir `<section id="screen-X" class="screen">` en el HTML
2. Añadir botón en `<nav>` con `onclick="showScreen('X')"`
3. Añadir entrada en el objeto `titles`
4. Añadir `if (name === 'X') renderX();` en `showScreen()`
5. Implementar `function renderX() {}`

### Añadir un campo a la configuración
1. Añadir el campo al objeto por defecto en `loadSettings()`
2. Añadir el elemento HTML en `#screen-manage > .settings-card`
3. Leer/escribir en `handleNotifX()` o crear nuevo handler
4. Actualizar `renderNotifSettings()` para reflejar el estado guardado

### Subir la versión del caché (tras cambios en assets)
Cambiar `CACHE_NAME` en `sw.js`: `habit-tracker-vN` → `habit-tracker-v(N+1)`

### Cambiar `START_DATE`
Línea en `index.html`: `const START_DATE = new Date(YYYY, M-1, D);`
Afecta a: historial visible, cálculo de gráficos, racha de días.

## Despliegue

- Rama de trabajo: `claude/setup-projects-folder-QWHC5`
- GitHub Pages sirve desde `main` automáticamente
- URL: `https://jdc-testing.github.io/Test-claude/proyectos/habit-tracker/`
- Tras merge a main, los usuarios verán la nueva versión en la siguiente carga (gracias al SW network-first)
