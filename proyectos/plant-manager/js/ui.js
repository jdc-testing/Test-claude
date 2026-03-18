// ── UI HELPERS ──

// ── Toast ──

let toastTimer = null;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Screen navigation ──

function showScreen(id, opts = {}) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  currentScreen = id;

  // Update bottom nav active state (only for top-level tabs)
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === id);
  });

  // Back button visibility
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.style.display = opts.back ? 'flex' : 'none';

  // Header title
  const titleEl = document.getElementById('header-title');
  if (titleEl && opts.title) titleEl.textContent = opts.title;
}

// ── Modal ──

function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.classList.add('modal-open'); }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.classList.remove('modal-open'); }
}

// ── Confirm dialog ──

function customConfirm(msg) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-msg').textContent = msg;
    overlay.classList.add('open');
    const onYes = () => { cleanup(); resolve(true); };
    const onNo  = () => { cleanup(); resolve(false); };
    function cleanup() {
      overlay.classList.remove('open');
      document.getElementById('confirm-yes').removeEventListener('click', onYes);
      document.getElementById('confirm-no').removeEventListener('click', onNo);
    }
    document.getElementById('confirm-yes').addEventListener('click', onYes);
    document.getElementById('confirm-no').addEventListener('click', onNo);
  });
}

// ── Date helpers ──

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const now   = new Date();
  const then  = new Date(dateStr + 'T12:00:00');
  return Math.floor((now - then) / 86400000);
}

// ── Watering status ──

function waterStatus(plant) {
  const days = daysSince(plant.lastWatered);
  if (days === null) return { ...WATER_STATUS.late, days: null, label: 'Sin regar' };
  const freq = plant.wateringFrequencyDays || 7;
  if (days <= freq * 0.75)  return { ...WATER_STATUS.ok,   days };
  if (days <= freq)          return { ...WATER_STATUS.soon, days };
  return { ...WATER_STATUS.late, days };
}

// ── Image helpers ──

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Emoji picker ──

function buildEmojiPicker(containerId, currentEmoji, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = PLANT_EMOJIS.map(e =>
    `<button type="button" class="emoji-btn ${e === currentEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>`
  ).join('');
  container.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(btn.dataset.emoji);
    });
  });
}

// ── Room selector ──

function buildRoomSelector(containerId, currentRoom, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = rooms.map(r =>
    `<button type="button" class="room-chip ${r.id === currentRoom ? 'selected' : ''}" data-room="${r.id}">
      ${r.emoji} ${r.label}
    </button>`
  ).join('');
  container.querySelectorAll('.room-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.room-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(btn.dataset.room);
    });
  });
}
