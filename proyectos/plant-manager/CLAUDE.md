# CLAUDE.md — Plant Manager

## Descripción
PWA de gestión de plantas de interior. Permite registrar riegos, luz y cuidados; asignar plantas a habitaciones; añadir fotos y notas; y buscar especies reales vía la API de Perenual.

## URL en GitHub Pages
`https://jdc-testing.github.io/Test-claude/proyectos/plant-manager/`

---

## Stack
- HTML + CSS + JS vanilla (sin frameworks)
- localStorage para persistencia (`pm_plants`, `pm_rooms`, `pm_settings`)
- Perenual API para búsqueda de plantas reales (opcional, requiere API key gratuita)
- PWA: `manifest.json` + `sw.js` (network-first)

---

## Estructura de archivos
```
plant-manager/
├── index.html          # Shell + TODO el CSS + imports de scripts
├── manifest.json       # PWA manifest (tema verde oscuro)
├── sw.js               # Service worker (network-first, cache v1)
├── CLAUDE.md           # Este archivo
└── js/
    ├── config.js       # Constantes: PLANT_EMOJIS, DEFAULT_ROOMS, CARE_TYPES, LIGHT_LEVELS, WATER_STATUS, PERENUAL_BASE
    ├── state.js        # Variables globales: plants[], rooms[], settings{}, currentPlantId, currentScreen, ...
    ├── storage.js      # CRUD en localStorage: loadData, savePlants, addPlant, updatePlant, deletePlant, addCareLog, exportData, importData
    ├── api.js          # Perenual API: searchPlants(query), getPlantDetail(id), normalizeApiPlant, normalizeApiDetail
    ├── render.js       # Render functions: renderHome, renderRooms, renderDetail, renderCareLog, renderPlantForm, renderSettings, renderApiResults
    ├── ui.js           # UI helpers: showToast, showScreen, openModal, closeModal, customConfirm, todayKey, formatDate, daysSince, waterStatus, fileToBase64, buildEmojiPicker, buildRoomSelector
    └── app.js          # Init, event listeners, handlers de navegación, acciones (quickWater, logCare, submitPlantForm, etc.)
```

---

## Modelo de datos

### Plant (pm_plants: Plant[])
```js
{
  id: string,                   // crypto.randomUUID()
  name: string,                 // Nombre científico o común
  nickname: string,             // Apodo personalizado (opcional)
  emoji: string,                // Emoji decorativo (p.ej. '🌿')
  room: string,                 // ID de la habitación
  image: string|null,           // Base64 de foto subida por el usuario
  apiData: object|null,         // Datos normalizados de Perenual
  notes: string,                // Notas libres
  addedAt: 'YYYY-MM-DD',
  wateringFrequencyDays: number,// Intervalo de riego en días
  lightRequirement: 'low'|'indirect'|'direct',
  careLog: CareEntry[],         // Historial de cuidados (más reciente primero)
  lastWatered: 'YYYY-MM-DD'|null,
  lastFertilized: 'YYYY-MM-DD'|null,
}
```

### CareEntry
```js
{
  id: string,
  type: 'water'|'fertilize'|'repot'|'prune'|'note',
  date: 'YYYY-MM-DD',
  text: string,
}
```

### Room (pm_rooms: Room[])
```js
{ id: string, label: string, emoji: string }
```

### Settings (pm_settings)
```js
{ perenualApiKey: string }
```

---

## Navegación
- 4 tabs en el nav inferior: Plantas (`screen-home`), Habitaciones (`screen-rooms`), + (modal), Ajustes (`screen-settings`)
- Detalle de planta: `screen-detail` (con botón back)
- `showScreen(id, { title, back })` en `ui.js` gestiona la transición

---

## Convenciones
- Render pattern: re-render completo en cada cambio de estado (igual que habit-tracker)
- `todayKey()` siempre devuelve `'YYYY-MM-DD'`
- Imágenes almacenadas como base64 — cuidado con el tamaño de localStorage (~5 MB límite)
- localStorage keys con prefijo `pm_` para evitar colisiones
- Perenual API key guardada en settings; si está vacía la búsqueda está deshabilitada pero la app funciona 100% sin ella

---

## API Perenual
- Documentación: https://perenual.com/docs/api
- Endpoint búsqueda: `GET /species-list?key=KEY&q=QUERY&indoor=1`
- Endpoint detalle: `GET /species/details/ID?key=KEY`
- Plan gratuito: 100 requests/día
- Los datos se normalizan en `api.js` → `normalizeApiPlant` / `normalizeApiDetail`

---

## Restricciones y notas
- No usar CDNs ni dependencias externas salvo la Perenual API (ya es externa por diseño)
- Las fotos se guardan en base64 en localStorage; advertir al usuario si sube imágenes muy grandes
- El service worker cachea todos los archivos JS — incrementar `CACHE_NAME` al hacer cambios relevantes
- Para cambios en colores, editar las CSS custom properties en el `:root` de `index.html`
