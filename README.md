# Test-claude

Este repositorio es mi espacio de trabajo personal donde organizo y desarrollo mis proyectos.

## Estructura

### 📁 proyectos/

Carpeta principal donde iré creando y almacenando mis proyectos. Cada proyecto tendrá su propia subcarpeta dentro de este directorio.

## Proyectos

### 📱 [habit-tracker](proyectos/habit-tracker/)

App web progresiva (PWA) para el seguimiento de hábitos diarios desde el móvil. Permite marcar hábitos como completados, ver rachas y consultar el historial. Incluye acceso con Google y sincronización en la nube (no se pierden los datos al cambiar de dispositivo), y un horario semanal secundario con cajas arrastrables (Trabajo, Gym, Tenis...) para planificar la semana hora a hora. Funciona offline y se puede instalar en la pantalla de inicio del móvil.

**Tecnología:** HTML + CSS + JS vanilla · Supabase (Auth con Google + PostgreSQL) · Service Worker

### 🎾 [tennis-tracker](proyectos/tennis-tracker/)

App web progresiva (PWA) multijugador para gestionar partidos de tenis entre dos jugadores. Marcador en tiempo real sincronizado entre dispositivos, lógica completa de puntuación (puntos, juegos, sets, deuce, ventaja, tiebreak a 7 o 10), historial y estadísticas personalizadas por jugador. Acceso con Google (sin contraseña), invite link para unir al compañero.

**Tecnología:** HTML + CSS + JS vanilla modular · Supabase (Auth + Realtime + PostgreSQL) · Service Worker · PWA

### 🌿 [plant-manager](proyectos/plant-manager/)

App web progresiva (PWA) para gestionar y cuidar plantas de interior. Registra riegos, abonos y trasplantes; asigna plantas a habitaciones; sube fotos y añade notas personalizadas. Integración opcional con la API de Perenual para buscar especies reales con datos de cuidado. Diseño cuqui con tonos verdes, soporte de emojis y personalización.

**Tecnología:** HTML + CSS + JS vanilla modular · localStorage · Perenual API (opcional) · Service Worker · PWA

---

## ¿Cómo usar este repositorio?

Cada nuevo proyecto se añadirá como una subcarpeta dentro de `proyectos/`, manteniendo así todo organizado en un mismo lugar.
