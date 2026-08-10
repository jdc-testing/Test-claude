# CLAUDE.md — Habit Tracker

## Qué es este proyecto

PWA de seguimiento de hábitos diarios con autenticación Google y sincronización en la nube vía Supabase. Incluye una segunda funcionalidad: un horario semanal con "cajas" arrastrables (Trabajo, Gym, Tenis...) para planificar la semana hora a hora. Stack: un solo `index.html` + `sw.js` + Supabase JS client (CDN). Sin frameworks, sin build. Se despliega en GitHub Pages.

## Archivos

```
habit-tracker/
├── index.html        # Toda la app: HTML + CSS + JS
├── sw.js             # Service Worker (cache network-first, v6)
├── manifest.json     # Config PWA (nombre, iconos, colores)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── REQUIREMENTS.md   # Spec completa de funcionalidades
```

## Pantallas

Barra de navegación (4 pestañas, en este orden): **Hoy · Horario · Gráficos · Hábitos**

1. **Hoy** — tracking diario de hábitos (funcionalidad principal). Incluye el botón "Ver y editar historial".
2. **Horario** — planificador semanal con cajas arrastrables (funcionalidad secundaria, independiente de los hábitos)
3. **Gráficos** — panel de estadísticas (resumen global, patrón semanal, rachas, ranking y detalle por hábito)
4. **Hábitos** — gestión de hábitos, notificaciones, exportar datos, cuenta
5. **Historial** — editar días anteriores. **No es pestaña principal**: se accede con el botón de la pantalla Hoy y vuelve con "‹ Volver a Hoy". En `showScreen()` mantiene activo el botón `nav-today`.

## Arquitectura de datos — Hábitos

### Estado en memoria
```js
let habits      = []   // array de { id, label, emoji }
let records     = {}   // { "YYYY-MM-DD": { [habitId]: true } } (solo días cumplidos)
let settings    = { notifEnabled: false, notifTime: '22:00' }
let currentUser = null // objeto de Supabase auth
```

### Tablas Supabase
| Tabla      | Columnas clave                                    |
|------------|---------------------------------------------------|
| `habits`   | `user_id`, `habit_id`, `label`, `emoji`, `position` |
| `records`  | `user_id`, `date` (YYYY-MM-DD), `habit_id`        |
| `settings` | `user_id`, `notif_enabled`, `notif_time`          |

## Arquitectura de datos — Horario semanal

### Estado en memoria
```js
let scheduleTypes    = []   // catálogo de cajas: [{ id, label, emoji, color }]
let scheduleEvents   = {}   // { "YYYY-MM-DD": [{ id, typeId, start, duration }] }
                             // start y duration en minutos (start=0 → 00:00)
let currentWeekStart = null // "YYYY-MM-DD" del lunes de la semana visible
```

- Cada semana es independiente (no es una plantilla fija): se navega con ‹ › y los eventos se cargan/guardan por rango de fechas, igual que el historial de hábitos.
- El catálogo de cajas (`scheduleTypes`) es común a todas las semanas y lo edita el usuario libremente (máx. 12), igual que los hábitos.
- El horario **no** está vinculado al sistema de hábitos: son datos y pantallas independientes.

### Rango horario visible (rejilla)

```js
const DEFAULT_GRID_START = 7 * 60;   // 07:00 — arranque visible por defecto
const DEFAULT_GRID_END   = 26 * 60;  // 02:00 del día siguiente
const MAX_DURATION       = 480;      // 8 h máximo por bloque
let gridStartMin, gridEndMin;        // rango real, calculado por semana
```

- `computeGridRange()` recorre los bloques de la semana visible y **amplía** el rango si hay algo antes de las 07:00 o después de las 02:00. Por defecto la rejilla arranca a las 07:00.
- `scrollScheduleToDefaultStart()` deja las 07:00 arriba aunque el rango se haya ampliado hacia atrás.
- Los bloques nocturnos se guardan como minutos desde medianoche del **mismo día**, pudiendo superar 1440 (p. ej. `1500` = 01:00 del día siguiente). `minToHHMM()` hace el módulo para mostrarlos y el selector de hora los etiqueta como `01:00 (+1 día)`.

### Tablas Supabase
| Tabla             | Columnas clave                                                        |
|-------------------|------------------------------------------------------------------------|
| `schedule_types`  | `user_id`, `type_id`, `label`, `emoji`, `color`, `position`            |
| `schedule_events` | `user_id`, `event_id`, `date` (YYYY-MM-DD), `type_id`, `start_min`, `duration_min` |

RLS activo en las cinco tablas. Los usuarios solo acceden a sus propios datos.

### localStorage (caché offline)
| Clave                  | Contenido                          |
|-------------------------|------------------------------------|
| `ht_habits`             | Copia local de habits              |
| `ht_records`            | Copia local de records             |
| `ht_settings`           | Copia local de settings            |
| `ht_schedule_types`     | Copia local del catálogo de cajas  |
| `ht_schedule_events`    | Copia local de eventos cargados (por semanas ya visitadas) |

### Configuración Supabase
```js
// Al inicio de index.html — reemplazar con los valores reales del proyecto
const SUPABASE_URL      = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

## SQL para crear las tablas en Supabase

```sql
-- Habits
create table public.habits (
  user_id  uuid references auth.users(id) on delete cascade not null,
  habit_id text not null,
  label    text not null,
  emoji    text not null default '🎯',
  position integer not null default 0,
  primary key (user_id, habit_id)
);
alter table public.habits enable row level security;
create policy "own habits" on public.habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Records
create table public.records (
  user_id  uuid references auth.users(id) on delete cascade not null,
  date     text not null,
  habit_id text not null,
  primary key (user_id, date, habit_id)
);
alter table public.records enable row level security;
create policy "own records" on public.records for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Settings
create table public.settings (
  user_id      uuid references auth.users(id) on delete cascade not null primary key,
  notif_enabled boolean default false,
  notif_time    text    default '22:00'
);
alter table public.settings enable row level security;
create policy "own settings" on public.settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Schedule types (catálogo de cajas: Trabajo, Gym, Tenis...)
create table public.schedule_types (
  user_id  uuid references auth.users(id) on delete cascade not null,
  type_id  text not null,
  label    text not null,
  emoji    text not null default '📦',
  color    text not null default '#4caf50',
  position integer not null default 0,
  primary key (user_id, type_id)
);
alter table public.schedule_types enable row level security;
create policy "own schedule types" on public.schedule_types for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Schedule events (bloques colocados en el horario semanal)
create table public.schedule_events (
  user_id      uuid references auth.users(id) on delete cascade not null,
  event_id     text not null,
  date         text not null, -- YYYY-MM-DD
  type_id      text not null,
  start_min    integer not null, -- minutos desde las 00:00 (0-1439)
  duration_min integer not null default 60,
  primary key (user_id, event_id)
);
create index schedule_events_user_date_idx on public.schedule_events(user_id, date);
alter table public.schedule_events enable row level security;
create policy "own schedule events" on public.schedule_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## Flujo de autenticación

1. App carga → `onAuthStateChange` se registra (muestra spinner)
2. Sin sesión → pantalla de login con botón "Continuar con Google"
3. Con sesión → carga hábitos/registros/ajustes/catálogo de cajas desde Supabase → renderiza app
4. Primera vez con datos locales de hábitos → migración automática a Supabase
5. Primera vez sin catálogo de cajas → se siembran 3 tipos por defecto (Trabajo, Gym, Tenis)
6. Cerrar sesión → pantalla de login

## Flujo de datos

- **Lectura:** siempre desde estado en memoria (`habits`, `records`, `settings`, `scheduleTypes`, `scheduleEvents`)
- **Escritura local:** actualiza estado en memoria + localStorage (síncrono, inmediato)
- **Escritura remota:** funciones async (`saveHabits()`, `toggleHabit()`, `saveSettings()`, `addScheduleEvent()`, `updateScheduleEvent()`, `deleteScheduleEvent()`, `saveScheduleTypes()`) hacen upsert/delete a Supabase en background sin bloquear la UI
- **Eventos del horario:** se cargan por semana (`loadWeekEvents(mondayKey)`) al navegar a la pantalla Horario o cambiar de semana, no se cargan todos de golpe
- **Offline:** si Supabase falla, se usa la caché de localStorage

## Interacción del horario

Implementado con Pointer Events nativos (sin librerías). Hay **dos formas de crear** un bloque, la táctil es la principal:

- **Tocar y colocar (principal, más intuitivo):** un toque en una caja de la paleta la deja "armada" (`armedTypeId`, chip con clase `.armed`); el siguiente toque en la rejilla la coloca ahí con 1 h de duración. El texto de `#schedule-hint` refleja el estado.
- **Arrastrar:** `pointerdown` sobre una caja → "ghost" que sigue el dedo/cursor → al soltar sobre una columna se calcula día + hora (ajustada a `SNAP_MIN` = 15 min). Un `pointerup` sin desplazamiento (`moved === false`) se interpreta como toque, no como arrastre.
- **Hueco vacío:** tocar la rejilla sin ninguna caja armada abre `#event-form-overlay` en modo "Nuevo bloque" con día y hora ya rellenados.
- **Mover bloque:** arrastrar un `.event-block` existente; puede cambiar de día y de hora.
- **Editar/eliminar bloque:** un toque sobre un bloque abre el mismo modal en modo edición (caja/día/hora/duración + botón eliminar).
- **Gestión de cajas:** tarjeta bajo la rejilla con la **misma UX que la pantalla Hábitos** (filas con ▲▼ para reordenar, ✏️ para editar inline, ✕ para borrar, y formulario "Añadir caja" con emoji, nombre y paleta de colores `SCHEDULE_COLORS`).
- Los chips usan `touch-action: pan-x` para que la paleta siga desplazándose en horizontal; `pointercancel` limpia el ghost si el navegador se queda el gesto.
- No hay detección de solapamientos entre bloques (si dos eventos coinciden en hora, se dibujan superpuestos). No implementado por estar fuera del alcance inicial.

## Pantalla de Gráficos

`renderCharts()` pinta dos zonas: `#charts-summary` (paneles de análisis) y `#charts-list` (detalle por hábito).

Funciones de cálculo:
- `getPeriodDates()` — array de días `YYYY-MM-DD` del periodo del filtro activo (semana/mes/año/rango). Base de todas las estadísticas globales.
- `getPeriodStats(dates)` — `{ pct, totalDone, totalPossible, perfectDays, perHabit[] }`.
- `getWeekdayStats(dates)` — array de 7 posiciones (0 = lunes) con el % medio de cumplimiento por día de la semana; `null` si no hay datos ese día.
- `getBestStreak(habitId)` — récord histórico de días consecutivos (complementa a `getStreak()`, que da la racha actual).

Paneles renderizados, en orden: **Cumplimiento global** (anillo SVG + días perfectos + mejor/peor hábito) → **Patrón semanal** (barras L-D, verde el mejor día, rojo el peor) → **Rachas** (actual + récord por hábito) → **Ranking del periodo** (barras ordenadas) → **Detalle por hábito** (gráfico de barras diario existente).

## Convenciones

- Todo el código JS está en el `<script>` inline al final del HTML
- Las secciones del JS están separadas por comentarios `// ── NOMBRE ──`
- Las IDs del DOM siguen el patrón: `screen-X`, `nav-X`, `filter-X`
- Las fechas se manejan siempre como strings `YYYY-MM-DD`
- `START_DATE = new Date(2026, 2, 1)` — no mostrar datos de hábitos anteriores a esta fecha (no aplica al horario, que no tiene fecha de inicio)
- El horario usa minutos desde medianoche (`start`, `duration`) en vez de strings de hora

## Restricciones importantes

- **Supabase CDN permitido** — excepción justificada para auth + sync en la nube
- **No fragmentar en múltiples archivos JS/CSS** salvo que sea estrictamente necesario
- **Máximo 10 hábitos** y **máximo 12 tipos de caja** — límites hardcodeados, no cambiar sin actualizar la UI
- Las notificaciones usan `setTimeout` + Web Notifications API. Sin Push API (requeriría servidor)

## Tareas frecuentes

### Cambiar credenciales de Supabase
Buscar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `index.html` y reemplazar los valores.

### Subir la versión del caché (tras cambios en assets)
Cambiar `CACHE_NAME` en `sw.js`: `habit-tracker-vN` → `habit-tracker-v(N+1)`

### Añadir una nueva pantalla
1. Añadir `<section id="screen-X" class="screen">` en el HTML
2. Añadir botón en `<nav>` con `onclick="showScreen('X')"`
3. Añadir entrada en el objeto `titles`
4. Añadir `if (name === 'X') renderX();` en `showScreen()`
5. Implementar `function renderX() {}`

### Cambiar la altura de hora en el horario
Constante `HOUR_HEIGHT` (px por hora) al inicio del `<script>`. Afecta a la rejilla, al gutter de horas y al cálculo de posición al arrastrar.

### Cambiar el ajuste (snap) del arrastre en el horario
Constante `SNAP_MIN` (minutos). Por defecto 15.

### Cambiar el rango horario visible o la duración máxima
Constantes `DEFAULT_GRID_START` (07:00), `DEFAULT_GRID_END` (26:00 = 02:00 del día siguiente) y `MAX_DURATION` (480 min = 8 h). Si se cambia `MAX_DURATION` hay que actualizar también las `<option>` de `#event-duration-select` en el HTML.

## Despliegue

- Rama de trabajo: `claude/habit-tracker-supabase-google-f98mg4`
- GitHub Pages sirve desde `main` automáticamente
- URL: `https://jdc-testing.github.io/Test-claude/proyectos/habit-tracker/`
