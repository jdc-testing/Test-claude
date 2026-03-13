# CLAUDE.md — Instrucciones generales del repositorio

Este archivo contiene instrucciones que Claude debe seguir en todas las sesiones de trabajo en este repositorio.

---

## Regla: Mantener la documentación al día

**Siempre que se cree un proyecto nuevo o se hagan modificaciones relevantes en uno existente, hay que actualizar:**

1. **`/home/user/Test-claude/README.md`** — Añadir o actualizar la entrada del proyecto con una descripción breve y el stack tecnológico.
2. **`/home/user/Test-claude/CLAUDE.md`** (este archivo) — Actualizar si cambian las convenciones generales del repositorio.
3. **`proyectos/<nombre-proyecto>/CLAUDE.md`** — Actualizar si cambia la arquitectura, convenciones o restricciones del proyecto concreto.

Esto debe hacerse **en el mismo commit** que los cambios del proyecto, no después.

---

## Estructura del repositorio

```
Test-claude/
├── README.md              # Índice de proyectos (mantener actualizado)
├── CLAUDE.md              # Este archivo (instrucciones para Claude)
└── proyectos/
    ├── habit-tracker/     # PWA de seguimiento de hábitos
    │   ├── CLAUDE.md      # Instrucciones específicas del proyecto
    │   └── REQUIREMENTS.md
    ├── tennis-tracker/    # PWA de gestión de partidos de tenis
    └── youtube-shorts-blocker/
```

---

## Proyectos activos

| Proyecto | Ruta | URL en GitHub Pages |
|----------|------|---------------------|
| Habit Tracker | `proyectos/habit-tracker/` | `https://jdc-testing.github.io/Test-claude/proyectos/habit-tracker/` |
| Tennis Tracker | `proyectos/tennis-tracker/` | `https://jdc-testing.github.io/Test-claude/proyectos/tennis-tracker/` |

---

## Convenciones generales

- **Stack:** HTML + CSS + JS vanilla. Sin frameworks, sin build, sin npm. Todo en un único `index.html` por proyecto.
- **Despliegue:** GitHub Pages desde la rama principal. Las ramas de trabajo siguen el patrón `claude/<descripcion-corta>`.
- **Persistencia:** localStorage. Sin backend ni base de datos externa.
- **PWA:** Cada proyecto incluye `manifest.json` y `sw.js` con estrategia network-first.
- **Sin dependencias externas:** No añadir CDNs ni paquetes npm salvo causa mayor.

---

## Al crear un nuevo proyecto

1. Crear carpeta en `proyectos/<nombre>/`
2. Incluir `index.html`, `manifest.json`, `sw.js`
3. Crear `proyectos/<nombre>/CLAUDE.md` con instrucciones específicas
4. **Actualizar `README.md`** con la entrada del nuevo proyecto
5. **Actualizar este `CLAUDE.md`**: añadir el proyecto a la tabla de "Proyectos activos"
6. **Añadir una tarjeta en `/home/user/Test-claude/index.html`** (la landing page raíz) con el nombre, emoji/icono, descripción breve y enlace al proyecto — **hacerlo siempre salvo que se indique explícitamente lo contrario**
