/**
 * app.js — Bootstrap y event listeners globales
 *
 * Punto de entrada: se ejecuta al cargar la página.
 * Registra el service worker, inicializa la auth y
 * configura los event listeners de modales, radio groups y gráfico.
 */

'use strict';

// ── SERVICE WORKER ────────────────────────────────────

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ── MODALS: cerrar al clicar fondo ────────────────────

document.querySelectorAll('.modal-overlay').forEach(ov =>
  ov.addEventListener('click', e => {
    if (e.target === ov) closeModal(ov.id);
  })
);

// ── RADIO GROUPS ─────────────────────────────────────

document.querySelectorAll('.radio-group').forEach(g =>
  g.addEventListener('click', e => {
    const opt = e.target.closest('.radio-option'); if (!opt) return;
    g.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
  })
);

// ── GRÁFICO: filtro de periodo ────────────────────────

document.getElementById('chart-filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (btn) renderChart(btn.dataset.f);
});

// ── SOFT REFRESH (evita recargas de página en mobile) ─

/**
 * Refresca los datos cuando el usuario vuelve a la app
 * (cambio de pestaña, bloqueo/desbloqueo del móvil, etc.)
 * y cada 5 minutos si la app está activa.
 * Evita la necesidad de hacer un full reload que puede colgar en mobile.
 */
let _lastRefresh = 0;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const minsSince = (Date.now() - _lastRefresh) / 60000;
  if (minsSince >= 1) {
    _lastRefresh = Date.now();
    softRefresh();
  }
});

setInterval(() => {
  if (document.visibilityState === 'visible') {
    _lastRefresh = Date.now();
    softRefresh();
  }
}, 5 * 60 * 1000);

// ── INIT ──────────────────────────────────────────────

/**
 * Arranca la app: inicializa el listener de auth de Supabase.
 * initAuth() (en auth.js) gestiona toda la lógica de autenticación.
 */
initAuth();
