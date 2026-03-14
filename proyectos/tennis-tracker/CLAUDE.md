# CLAUDE.md — Tennis Tracker

## Descripción

PWA multijugador para gestionar partidos de tenis. Soporta **múltiples amigos/rivales**: cada usuario puede conectar con varios amigos via enlace de invitación y crear partidos contra cualquiera de ellos. El marcador funciona de forma **local** (sin sync por punto) y los resultados se sincronizan en Supabase solo al **terminar el partido**. Lógica completa de puntuación (puntos, juegos, sets, deuce, ventaja, tiebreak a 7 o 10), historial y estadísticas por rival. Acceso con Google (sin contraseña).

**URL en GitHub Pages:** `https://jdc-testing.github.io/Test-claude/proyectos/tennis-tracker/`

---

## Stack

- HTML + CSS + JS vanilla modular (múltiples archivos en `js/`)
- Backend: **Supabase** (Auth + PostgreSQL + Realtime)
- Supabase JS client vía CDN: `@supabase/supabase-js@2`
- PWA: `manifest.json` + `sw.js` (estrategia network-first, v3)

---

## Arquitectura de archivos JS

Los scripts se cargan en este orden en `index.html`:

| Archivo | Responsabilidad |
|---------|----------------|
| `js/config.js` | Credenciales Supabase y creación del cliente `sb` |
| `js/state.js` | Variables globales mutables (currentUser, friends[], current, …) |
| `js/tennis-logic.js` | Funciones puras de puntuación (p1/p2, sin efectos laterales) |
| `js/ui.js` | Helpers de UI: esc(), avatarHTML(), showToast(), openModal(), switchTab() |
| `js/data.js` | Lectura/escritura en Supabase (matches, profiles) |
| `js/auth.js` | Flujo de autenticación, loadFriends(), generateInviteLink(), initMainApp() |
| `js/realtime.js` | Suscripción Realtime a friendships (detectar nuevos amigos) |
| `js/match.js` | Ciclo de vida del partido: startMatch(), addPoint(), confirmFinish() |
| `js/render.js` | Renderizado: renderMatch(), renderStats(), renderProfileTab() |
| `js/app.js` | Bootstrap: SW, event listeners globales, llama initAuth() |

---

## Base de datos Supabase

### Tabla `profiles`
```sql
id          uuid PRIMARY KEY (FK → auth.users.id)
name        text NOT NULL
photo_url   text
created_at  timestamptz DEFAULT now()
```

### Tabla `friendships`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
player1_id    uuid NOT NULL (FK → profiles.id)
player2_id    uuid            (FK → profiles.id, nullable hasta aceptar)
invite_token  uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE
status        text DEFAULT 'pending'  -- 'pending' | 'active'
created_at    timestamptz DEFAULT now()
```

### Tabla `matches`
```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
friendship_id  uuid NOT NULL (FK → friendships.id)
player1_id     uuid NOT NULL (FK → profiles.id)
player2_id     uuid NOT NULL (FK → profiles.id)
format         jsonb  -- { numSets, tiebreakTarget, noDeuce }
status         text DEFAULT 'active'  -- 'active' | 'completed' | 'abandoned'
result_p1      text   -- 'win' | 'loss' | 'abandoned' | null
sets           jsonb  -- [{ p1, p2, tiebreak: {p1, p2} | null }]
sets_won       jsonb  -- { p1, p2 }
start_date     date DEFAULT CURRENT_DATE
completed_at   timestamptz
```

### Tabla `live_state` _(ya no se usa activamente)_
```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
friendship_id  uuid NOT NULL UNIQUE (FK → friendships.id)
match_id       uuid (FK → matches.id, nullable)
state          jsonb  -- obsoleto: el marcador ahora es local hasta confirmFinish()
updated_at     timestamptz DEFAULT now()
updated_by     uuid (FK → profiles.id)
```

---

## Perspectiva dinámica (clave de diseño)

Los datos se almacenan siempre en neutro (`p1`/`p2`). Reglas:

- **Partido activo:** el creador del partido es siempre `player1`, por lo que `myKey = 'p1'` y `rivKey = 'p2'` fijos durante el marcador.
- **Partidos completados:** la perspectiva se calcula por partido: `mk = m.player1_id === currentUser.id ? 'p1' : 'p2'`.
- `result_p1` almacena el resultado desde el punto de vista de `player1`.
- `myResult(m)` calcula el resultado desde la perspectiva del usuario actual.

---

## Navegación (3 pestañas)

| Tab | ID | Contenido |
|-----|----|-----------|
| 🎾 Partido | `match-tab` | Balance total / marcador en curso |
| 📊 Estadísticas | `stats-tab` | Resumen, rachas, gráfico, historial por rival |
| 👤 Perfil | `profile-tab` | Mi perfil, lista de amigos (+ botón invitar), exportar datos |

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

## Tests

Abrir `tests.html` en el navegador para ejecutar la suite de tests de lógica pura.
Las funciones testeadas son las de `js/tennis-logic.js`, copiadas directamente en el archivo de tests para no tener dependencias externas.

---

## Configuración inicial (para el usuario)

1. Ir a [supabase.com](https://supabase.com) → New project (gratis)
2. En **SQL Editor** → ejecutar el script de tablas + RLS del plan
3. En **Authentication** → Providers → Google → activar con OAuth credentials de Google Cloud
4. En **Authentication** → URL Configuration → añadir `https://jdc-testing.github.io` como Site URL
5. En **Settings** → API → copiar `Project URL` y `anon public key`
6. Pegar ambos valores en `js/config.js` (`SUPABASE_URL` y `SUPABASE_ANON`)

---

## Gestión de datos como administrador

Desde el **Supabase Dashboard** (sin necesidad de código):

```sql
-- Modificar resultado de un partido
UPDATE matches SET result_p1 = 'win' WHERE id = 'UUID';

-- Resetear partido en curso colgado
UPDATE live_state SET match_id = null, state = null WHERE friendship_id = 'UUID';

-- Insertar partido histórico
INSERT INTO matches (friendship_id, player1_id, player2_id, format, status, result_p1, sets, sets_won, start_date)
VALUES ('...', '...', '...', '{"numSets":3,"tiebreakTarget":7,"noDeuce":false}'::jsonb,
        'completed', 'win', '[{"p1":6,"p2":4}]'::jsonb, '{"p1":1,"p2":0}'::jsonb, '2026-01-15');
```

---

## Convenciones

- No añadir `import/export` ES modules — los scripts usan el scope global por compatibilidad con todos los navegadores sin build
- Incrementar `CACHE_NAME` en `sw.js` al modificar cualquier asset local (actualmente `tennis-tracker-v3`)
- Las URLs de Supabase/Google/CDN nunca se cachean en el SW (`NO_CACHE_PATTERNS`)
- Al modificar el proyecto, actualizar `README.md` raíz si aplica
