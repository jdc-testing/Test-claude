# CLAUDE.md — Habit Tracker

## Qué es este proyecto

PWA de seguimiento de hábitos diarios con autenticación Google y sincronización en la nube vía Supabase. Stack: un solo `index.html` + `sw.js` + Supabase JS client (CDN). Sin frameworks, sin build. Se despliega en GitHub Pages.

## Archivos

```
habit-tracker/
├── index.html        # Toda la app: HTML + CSS + JS
├── sw.js             # Service Worker (cache network-first, v5)
├── manifest.json     # Config PWA (nombre, iconos, colores)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── REQUIREMENTS.md   # Spec completa de funcionalidades
```

## Arquitectura de datos

### Estado en memoria
```js
let habits      = []   // array de { id, label, emoji }
let records     = {}   // { "YYYY-MM-DD": { [habitId]: true } } (solo días cumplidos)
let settings    = { notifEnabled: false, notifTime: '22:00' }
let currentUser = null // objeto de Supabase auth
```

### Supabase (fuente de verdad)
| Tabla      | Columnas clave                                    |
|------------|---------------------------------------------------|
| `habits`   | `user_id`, `habit_id`, `label`, `emoji`, `position` |
| `records`  | `user_id`, `date` (YYYY-MM-DD), `habit_id`        |
| `settings` | `user_id`, `notif_enabled`, `notif_time`          |

RLS activo en las tres tablas. Los usuarios solo acceden a sus propios datos.

### localStorage (caché offline)
| Clave         | Contenido                          |
|---------------|------------------------------------|
| `ht_habits`   | Copia local de habits              |
| `ht_records`  | Copia local de records             |
| `ht_settings` | Copia local de settings            |

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
```

## Flujo de autenticación

1. App carga → `onAuthStateChange` se registra (muestra spinner)
2. Sin sesión → pantalla de login con botón "Continuar con Google"
3. Con sesión → carga datos de Supabase → renderiza app
4. Primera vez con datos locales → migración automática a Supabase
5. Cerrar sesión → pantalla de login

## Flujo de datos

- **Lectura:** siempre desde estado en memoria (`habits`, `records`, `settings`)
- **Escritura local:** actualiza estado en memoria + localStorage (síncrono, inmediato)
- **Escritura remota:** `saveHabits()`, `toggleHabit()`, `saveSettings()` son async; el upsert a Supabase ocurre en background sin bloquear la UI
- **Offline:** si Supabase falla, se usa la caché de localStorage

## Convenciones

- Todo el código JS está en el `<script>` inline al final del HTML
- Las secciones del JS están separadas por comentarios `// ── NOMBRE ──`
- Las IDs del DOM siguen el patrón: `screen-X`, `nav-X`, `filter-X`
- Las fechas se manejan siempre como strings `YYYY-MM-DD`
- `START_DATE = new Date(2026, 2, 1)` — no mostrar datos anteriores a esta fecha

## Restricciones importantes

- **Supabase CDN permitido** — excepción justificada para auth + sync en la nube
- **No fragmentar en múltiples archivos JS/CSS** salvo que sea estrictamente necesario
- **Máximo 10 hábitos** — límite hardcodeado, no cambiar sin actualizar la UI
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

## Despliegue

- Rama de trabajo: `claude/habit-tracker-supabase-google-f98mg4`
- GitHub Pages sirve desde `main` automáticamente
- URL: `https://jdc-testing.github.io/Test-claude/proyectos/habit-tracker/`
