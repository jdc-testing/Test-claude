# Bloqueador de YouTube Shorts

> Versión 1.0 — Android 7.0+

App Android que bloquea automáticamente los YouTube Shorts (Reels) sin afectar los videos normales.

## ¿Cómo funciona?

Usa el **Servicio de Accesibilidad** de Android para detectar cuando el app de YouTube muestra la pantalla de Shorts y navega hacia atrás automáticamente. Los videos normales de YouTube no se ven afectados.

- Sin impacto en rendimiento: solo se activa cuando YouTube está abierto
- Sin acceso a internet, sin recolección de datos
- Compatible con Android 7.0+

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

1. Abrir la app **"Bloqueador de Shorts"**
2. Tocar el botón **"Activar protección"**
3. En la pantalla de Accesibilidad que se abre:
   - Buscar **"Bloqueador de Shorts"** en la lista
   - Activarlo y confirmar en el diálogo
4. Volver a la app — el indicador cambiará a **"Protección activa"** en verde

## Uso

Una vez activado, funciona automáticamente en segundo plano:

- Abrís YouTube → ves videos normalmente
- Tocás la pestaña Shorts → la app vuelve hacia atrás automáticamente
- No necesitás hacer nada más

Para **desactivar temporalmente**: volver a la app y tocar el botón, o ir a Ajustes → Accesibilidad → Bloqueador de Shorts → desactivar.

## Tecnología

- **Lenguaje:** Kotlin
- **API mínima:** Android 7.0 (API 24)
- **Permisos:** Solo `BIND_ACCESSIBILITY_SERVICE` (requerido para monitorear eventos de UI)
- **Sin permisos de red, sin Firebase, sin analytics**
