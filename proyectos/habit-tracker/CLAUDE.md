# CLAUDE.md — Habit Tracker

## Qué es este proyecto

PWA de seguimiento de hábitos diarios con autenticación Google y sincronización en la nube vía Supabase. Incluye una segunda funcionalidad: una lista de tareas por día para organizar la semana, con categorías, franjas del día y tareas recurrentes. Stack: un solo `index.html` + `sw.js` + Supabase JS client (CDN). Sin frameworks, sin build. Se despliega en GitHub Pages.

## Archivos

```
habit-tracker/
├── index.html        # Toda la app: HTML + CSS + JS
├── sw.js             # Service Worker (cache network-first, v8)
├── manifest.json     # Config PWA (nombre, iconos, colores)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── REQUIREMENTS.md   # Spec completa de funcionalidades
```

## Pantallas

Barra de navegación (4 pestañas, en este orden): **Hoy · Semana · Gráficos · Hábitos**

1. **Hoy** — hábitos del día (uso principal) + tareas de hoy agrupadas por franja, en secciones separadas. Incluye el botón "Ver y editar historial".
2. **Semana** — lista de tareas día a día para organizar la semana (independiente de los hábitos) + gestión de categorías
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

## Arquitectura de datos — Tareas y semana

### Estado en memoria
```js
let scheduleTypes = []   // categorías: [{ id, label, emoji, color }]
let tasks         = []   // [{ id, title, categoryId, slot, startMin, date, recurrence, position }]
let taskStates    = {}   // { "taskId|YYYY-MM-DD": { done, skipped } }
let currentWeekStart = null // "YYYY-MM-DD" del lunes visible
```

**Modelo:** una tarea es *puntual* (`recurrence === null`, vive en `date`) o *recurrente*
(`recurrence === '1,3,5'`, con 1=lunes … 7=domingo; `date` marca desde cuándo aplica).
Las recurrentes **no se materializan**: `getTasksForDate()` las calcula al vuelo para cada día.
Todo el estado por día (hecha / quitada de ese día) vive en `taskStates`, así que hay un único
camino de lectura para ambos tipos de tarea.

- `slot`: `'manana' | 'tarde' | 'noche'`. Es obligatorio y define la agrupación visual.
- `startMin`: hora opcional en minutos desde medianoche (`null` = sin hora). Si el usuario pone
  hora y no toca la franja, la franja se deduce con `slotFromMinutes()`.
- Ordenación dentro de un día: franja → hora (las que no tienen, al final) → `position`.
- Borrar una categoría **no borra sus tareas**: quedan con `categoryId = null`.

### Tablas Supabase
| Tabla             | Columnas clave                                                                 |
|-------------------|--------------------------------------------------------------------------------|
| `schedule_types`  | `user_id`, `type_id`, `label`, `emoji`, `color`, `position` (categorías)         |
| `tasks`           | `user_id`, `task_id`, `title`, `category_id`, `slot`, `start_min`, `date`, `recurrence`, `position` |
| `task_instances`  | `user_id`, `task_id`, `date`, `done`, `skipped`                                 |

RLS activo en todas. `schedule_events` (la vieja rejilla) queda obsoleta: `migrateScheduleEvents()`
la convierte en tareas la primera vez y después se puede borrar la tabla.

### localStorage (caché offline)
| Clave                  | Contenido                          |
|-------------------------|------------------------------------|
| `ht_habits`             | Copia local de habits              |
| `ht_records`            | Copia local de records             |
| `ht_settings`           | Copia local de settings            |
| `ht_schedule_types`     | Copia local de las categorías      |
| `ht_tasks`              | Copia local de las tareas          |
| `ht_task_states`        | Copia local del estado por día (hecha/quitada) |

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

-- Tareas (puntuales y recurrentes)
create table public.tasks (
  user_id     uuid references auth.users(id) on delete cascade not null,
  task_id     text not null,
  title       text not null,
  category_id text,             -- referencia lógica a schedule_types.type_id (puede ser null)
  slot        text default 'manana',  -- 'manana' | 'tarde' | 'noche'
  start_min   integer,          -- hora opcional, minutos desde 00:00
  date        text,             -- puntual: el día; recurrente: desde cuándo aplica
  recurrence  text,             -- null = puntual | '1,3,5' (1=lunes … 7=domingo)
  position    integer not null default 0,
  primary key (user_id, task_id)
);
create index tasks_user_date_idx on public.tasks(user_id, date);
alter table public.tasks enable row level security;
create policy "own tasks" on public.tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Estado de cada tarea en cada día concreto
create table public.task_instances (
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id text not null,
  date    text not null,
  done    boolean not null default false,
  skipped boolean not null default false,  -- quitada solo de ese día (series)
  primary key (user_id, task_id, date)
);
create index task_instances_user_date_idx on public.task_instances(user_id, date);
alter table public.task_instances enable row level security;
create policy "own task instances" on public.task_instances for all
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

- **Lectura:** siempre desde estado en memoria (`habits`, `records`, `settings`, `scheduleTypes`, `tasks`, `taskStates`)
- **Escritura local:** actualiza estado en memoria + localStorage (síncrono, inmediato)
- **Escritura remota:** funciones async (`saveHabits()`, `toggleHabit()`, `saveSettings()`, `persistTask()`, `setTaskState()`, `deleteTaskFull()`, `saveScheduleTypes()`) hacen upsert/delete a Supabase en background sin bloquear la UI
- **Tareas:** se cargan todas de una vez en `loadTasks()` (son pocas). Si algún día crecen mucho, el punto a ventanear es esa consulta y la de `task_instances`
- **Offline:** si Supabase falla, se usa la caché de localStorage

## Interacción de las tareas

No hay rejilla de horas: en móvil cada día tenía 47 px y solo se leía el emoji. El modelo es
**lista por día**, que ocupa el ancho completo.

- **Pantalla Hoy:** hábitos arriba (sin cambios) y debajo la sección "Tareas de hoy", agrupada
  por franja (🌅 Mañana / 🌆 Tarde / 🌙 Noche). Solo se muestran las franjas con tareas.
- **Pantalla Semana:** siete tarjetas de día apiladas, con contador hecho/total y un `+` por día
  para añadir directamente a ese día. Navegación con ‹ › y toque en la fecha para volver a hoy.
- **Completar:** toque en el círculo → `toggleTaskDone()` → escribe en `task_instances`.
- **Editar:** toque en el cuerpo de la tarea → `#task-form-overlay`.
- **Borrar una recurrente:** el diálogo ofrece tres salidas gracias al botón intermedio de
  `customConfirm(..., okLabel, altLabel, onAlt)`: *Cancelar* / *Quitar solo este día*
  (marca `skipped`) / *Eliminar toda la serie*.
- **Categorías:** se gestionan al final de la pantalla Semana con la misma UX que Hábitos.

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

### Añadir una franja del día
Constante `SLOTS` al inicio del `<script>`. El orden del array define el orden visual y el de
ordenación de tareas. `slotFromMinutes()` decide la franja automática según la hora.

### Cambiar el límite de categorías
Está fijado a 12 en `renderTypeManage()` y `addScheduleType()`.

## Despliegue

- Rama de trabajo: `claude/habit-tracker-supabase-google-f98mg4`
- GitHub Pages sirve desde `main` automáticamente
- URL: `https://jdc-testing.github.io/Test-claude/proyectos/habit-tracker/`
