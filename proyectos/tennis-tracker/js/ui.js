/**
 * ui.js — Helpers de interfaz
 *
 * esc()             — escapa HTML
 * avatarHTML()      — genera HTML de avatar (foto o letra)
 * showToast()       — notificación temporal
 * openModal()       — abre un modal bottom sheet
 * closeModal()      — cierra un modal
 * switchTab()       — navega entre tabs
 * pickProfilePhoto()— selector de foto de perfil
 */

'use strict';

// ── ESCAPE HTML ───────────────────────────────────────

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── AVATAR ────────────────────────────────────────────

/**
 * Genera el HTML interior de un elemento .avatar.
 * Si hay foto (URL o base64) la muestra; si no, muestra la inicial en SVG.
 * @param {string|null} photoUrl
 * @param {string}      name
 */
function avatarHTML(photoUrl, name) {
  if (photoUrl) {
    return `<img src="${photoUrl}" alt="${esc(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  }
  const letter = (String(name || '?')[0] || '?').toUpperCase();
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <circle cx="20" cy="20" r="20" fill="#2d6a4f"/>
    <text x="20" y="27" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#fff" font-weight="bold">${esc(letter)}</text>
  </svg>`;
}

// ── TOAST ─────────────────────────────────────────────

let _toastTimer;

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── MODALS ────────────────────────────────────────────

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── NAVEGACIÓN ────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t    => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const tabEl = document.getElementById(tab + '-tab');
  const navEl = document.getElementById('nav-' + tab);
  if (tabEl) tabEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  if (tab === 'stats')   renderStats();
  if (tab === 'profile') renderProfileTab();
  if (tab === 'match')   renderMatch(friendship?.status === 'pending');
}

// ── FOTO DE PERFIL ────────────────────────────────────

/**
 * Abre el selector de imagen del navegador para el perfil principal.
 * Almacena el resultado en _pendingPhoto y actualiza el preview.
 */
function pickProfilePhoto() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      _pendingPhoto = ev.target.result;
      document.getElementById('profile-av').innerHTML = avatarHTML(_pendingPhoto, myProfile?.name || '');
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}
