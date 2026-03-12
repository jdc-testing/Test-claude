# Habit Tracker — Requisitos actuales

> Última actualización: marzo 2026

## Descripción general

PWA (Progressive Web App) de seguimiento de hábitos diarios. Funciona sin servidor, sin backend, sin frameworks. Todo en un único `index.html` + `sw.js`. Los datos se guardan en `localStorage` del dispositivo.

---

## Arquitectura

- **Stack:** HTML + CSS + JS vanilla, sin dependencias externas
- **Almacenamiento:** `localStorage` (claves: `ht_habits`, `ht_records`, `ht_settings`)
- **PWA:** Service Worker (`sw.js`) con estrategia _network-first_; funciona offline
- **Historial:** desde el 1 de marzo de 2026 (`START_DATE`)
- **Despliegue:** GitHub Pages

### Estructura de datos

```js
// ht_habits — array de hábitos
[{ id: string, label: string, emoji: string }]

// ht_records — registro diario
{ "YYYY-MM-DD": { [habitId]: boolean } }

// ht_settings — preferencias de notificación
{ notifEnabled: boolean, notifTime: "HH:MM" }
```

---

## Pantallas

### 1. Hoy (☀️)
- Muestra la fecha actual en el subtítulo del header
- Barra de progreso: `X / Y completados` + porcentaje
- Lista de hábitos con:
  - Círculo de check animado (vacío / verde con ✓)
  - Nombre del hábito tachado cuando está completado
  - Emoji del hábito
  - Racha activa en días (`🔥 Nd`) o `—` si no hay racha
- Tap en cualquier punto de la fila → toggle completado/no completado
- Estado vacío si no hay hábitos configurados

### 2. Historial (📅)
- Lista de todos los días desde `START_DATE` hasta hoy, en orden descendente
- Cada día muestra:
  - Fecha formateada en español (ej. "Jueves, 12 de marzo")
  - Contador `X/Y`
  - Fila de emojis (dots): verde = completado, gris = no completado
- Tap en emoji de **día pasado** → modal de confirmación antes de cambiar el estado
- Tap en emoji de **hoy** → toggle directo sin confirmación
- Pista informativa en la parte superior

### 3. Gráficos (📊)
- Filtros: **Semana** | **Mes** | **Año** | **Rango personalizado**
- Modo semana: lunes a hoy de la semana en curso
- Modo mes: día 1 al día actual del mes en curso
- Modo año: últimos 12 meses agrupados por mes (porcentaje de cumplimiento)
- Modo rango: selector de fecha inicio y fin con botón "Ver"
- Por cada hábito:
  - Nombre + emoji
  - Porcentaje medio de cumplimiento en el período
  - Gráfico de barras (altura proporcional al valor; mínimo visual si > 0)
  - Etiquetas de eje X: primera, media y última barra
  - Contadores: días cumplidos (verde) y no cumplidos (rojo)
- No se incluyen días anteriores a `START_DATE`

### 4. Hábitos / Gestión (⚙️)

#### Lista de hábitos
- Contador `X / 10 hábitos`
- Por cada hábito: emoji, nombre, botones subir/bajar (▲▼), botón eliminar (✕)
- Botones ▲▼ deshabilitados en los extremos de la lista
- Eliminar abre modal de confirmación (destructivo, rojo)
- Reordenar guarda inmediatamente

#### Añadir hábito
- Campo emoji (máx. 2 caracteres, placeholder 🎯)
- Campo nombre (máx. 30 caracteres)
- Botón "Añadir" (Enter en el campo nombre también añade)
- Límite: 10 hábitos. Al llegar al límite se oculta el formulario y aparece aviso
- El formulario se oculta cuando se alcanza el límite

#### Recordatorio diario
- Toggle para activar/desactivar notificaciones
  - Al activar: solicita permiso al sistema operativo
  - Si se deniega: avisa y revierte el toggle
  - Si el permiso ya fue denegado antes: instruye a activarlo en ajustes del navegador
- Selector de hora (formato HH:MM, por defecto **22:00**); visible solo cuando está activado
- Al cambiar la hora se reprograma el temporizador automáticamente
- La notificación muestra cuántos hábitos se completaron ese día
- Se reprograma cada día automáticamente via `setTimeout`
- Al arrancar la app: si el permiso ya estaba concedido, reprograma la notificación pendiente

---

## Hábitos por defecto

Cargados solo cuando no hay datos en `localStorage` (primera vez):

| ID        | Nombre         | Emoji |
|-----------|----------------|-------|
| creatine  | Tomar creatina | 💊    |
| exercise  | Hacer deporte  | 🏋️   |
| study     | Estudiar       | 📚    |
| water     | Beber agua     | 💧    |
| tennis    | Tenis          | 🎾    |
| sleep8h   | Dormir 8h      | 😴    |
| protein   | Proteína       | 🥩    |

---

## Comportamientos generales

- **Toast:** mensajes de feedback no intrusivos (2,2 s) anclados sobre la nav bar
- **Modal de confirmación:** reutilizable; color rojo para destructivos, verde para seguros
  - Se cierra al pulsar "Cancelar", el overlay exterior, o tras confirmar
- **Navegación:** bottom nav fija con 4 pestañas; el header muestra el título de la pantalla activa
- **Responsive:** max-width 480px centrado en pantallas grandes
- **PWA:** instalable en Android/iOS; icono 192px y 512px; display standalone; tema verde (#4caf50)
- **Service Worker:** caché _network-first_ (v3); borra cachés antiguas al activar
- **Offline:** si no hay red, sirve desde caché

---

## Restricciones conocidas

- Las notificaciones solo funcionan mientras el navegador/app está activo en memoria (sin Push API ni servidor)
- Historial limitado a días desde `START_DATE` (1 mar 2026); días anteriores no son accesibles
- Máximo 10 hábitos simultáneos
- Los datos son locales al dispositivo/navegador; no hay sincronización entre dispositivos
