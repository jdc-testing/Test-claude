# Bloqueador de Shorts y Reels

> Versión 1.1 — Android 7.0+

App Android que bloquea automáticamente los **YouTube Shorts** y los **Instagram Reels** sin afectar al resto de cada app.

## ¿Cómo funciona?

Usa el **Servicio de Accesibilidad** de Android para detectar cuando YouTube muestra la pantalla de Shorts o cuando Instagram muestra la pestaña de Reels, y navega hacia atrás automáticamente. Los videos normales de YouTube y el muro de Instagram no se ven afectados.

- Sin impacto en rendimiento: solo se activa cuando YouTube o Instagram están abiertos
- Se puede activar/desactivar cada app por separado desde la pantalla principal
- Sin acceso a internet, sin recolección de datos
- Compatible con Android 7.0+

### Señales de detección

Para cada app se combinan cuatro señales, de modo que un cambio de interfaz en YouTube o Instagram no deje el bloqueo inútil:

| Señal | YouTube | Instagram |
|-------|---------|-----------|
| Nombre de clase del evento | `shorts`, `reel`, `shortspivot`… | `clipsviewer`, `reelviewer`… |
| Ids del visor a pantalla completa | `reel_recycler`, `shorts_container`… | `clips_viewer_view_pager`… |
| Pestaña seleccionada | "Shorts" | "Reels" |
| Click sobre un elemento etiquetado | "Shorts" | "Reels" |

La pestaña solo cuenta si está **seleccionada**: en el muro normal el botón de Shorts/Reels siempre está presente, y sin esa comprobación se bloquearía la app entera.

## Instalación

### Paso 1: Descargar el APK

1. Ir a la pestaña **Actions** del repositorio en GitHub
2. Hacer clic en el último workflow "Build YouTube Shorts Blocker APK" exitoso
3. En la sección **Artifacts**, descargar `youtube-shorts-blocker-vX.apk`
4. Descomprimir el archivo (GitHub lo comprime en un ZIP)

### Paso 2: Instalar en el móvil

1. Abrir el archivo APK descargado en el móvil
2. Si aparece un aviso de seguridad: **Ajustes → Seguridad → Instalar apps desconocidas** → activar para el navegador/gestor de archivos
3. Completar la instalación

### Paso 3: Activar el servicio

1. Abrir la app **"Shorts y Reels"**
2. Tocar el botón **"Activar protección"**
3. En la pantalla de Accesibilidad que se abre:
   - Buscar **"Bloqueador de Shorts y Reels"** en la lista
   - Activarlo y confirmar en el diálogo
4. Volver a la app — el indicador cambiará a **"Protección activa"** en verde

## Uso

Una vez activado, funciona automáticamente en segundo plano:

- Abrís YouTube → ves videos normalmente; tocás la pestaña Shorts → vuelve atrás
- Abrís Instagram → ves el muro y las historias normalmente; tocás la pestaña Reels → vuelve atrás
- No necesitás hacer nada más

En la tarjeta **"Apps bloqueadas"** de la pantalla principal podés desactivar el bloqueo de una sola app (por ejemplo, seguir bloqueando Shorts pero permitir Reels). Ambas vienen activadas por defecto.

Para **desactivar todo temporalmente**: ir a Ajustes → Accesibilidad → Bloqueador de Shorts y Reels → desactivar.

## Tecnología

- **Lenguaje:** Kotlin
- **API mínima:** Android 7.0 (API 24)
- **Permisos:** Solo `BIND_ACCESSIBILITY_SERVICE` (requerido para monitorear eventos de UI)
- **Apps monitoreadas:** `com.google.android.youtube`, `com.instagram.android`
- **Preferencias:** `SharedPreferences` local (qué app bloquear)
- **Sin permisos de red, sin Firebase, sin analytics**

## Estructura del código

```
app/src/main/java/com/jdc/youtubeshortsblocker/
├── MainActivity.kt           # Pantalla principal: estado + switches por app
├── ShortsBlockerService.kt   # Servicio de accesibilidad (detección + "atrás")
├── BlockTarget.kt            # Señales de detección de cada app
└── BlockerPrefs.kt           # Preferencias de bloqueo por app
```

Para añadir otra app (TikTok, Facebook Reels…) basta con agregar una entrada nueva a `BlockTarget` con su package y sus señales; el servicio y las preferencias funcionan sobre el enum sin cambios adicionales (solo hay que añadir el switch en la pantalla).
