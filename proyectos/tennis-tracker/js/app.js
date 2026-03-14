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

// ── INIT ──────────────────────────────────────────────

/**
 * Arranca la app: inicializa el listener de auth de Supabase.
 * initAuth() (en auth.js) gestiona toda la lógica de autenticación.
 */
initAuth();
