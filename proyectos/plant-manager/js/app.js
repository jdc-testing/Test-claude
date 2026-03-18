// ── APP — Init & Event Handlers ──

// ── Navigation ──

function goHome() {
  currentRoomFilter = null;
  renderHome();
  showScreen('screen-home', { title: '🌿 Mis Plantas' });
}

function openPlantDetail(id) {
  currentPlantId = id;
  const p = getPlant(id);
  if (!p) return;
  renderDetail(id);
  showScreen('screen-detail', { title: p.nickname || p.name, back: true });
}

function openRoom(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  currentRoomFilter = roomId;
  renderHome();
  showScreen('screen-home', { title: `${room.emoji} ${room.label}`, back: true });
}

function openAddPlant(prefillFromEdit) {
  renderPlantForm(prefillFromEdit || null);
  openModal('modal-add-plant');
}

function onBackBtn() {
  if (currentScreen === 'screen-detail') {
    goHome();
  } else {
    goHome();
  }
}

// ── Alert badge ──

function updateAlertBadge(count) {
  const badge = document.getElementById('alert-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

// ── Quick water from card ──

function quickWater(event, plantId) {
  event.stopPropagation();
  addCareLog(plantId, 'water');
  renderHome();
  updateAlertBadgeFromState();
  showToast('💧 ¡Regada!');
}

// ── Quick actions from alerts screen ──

function quickWaterAlert(event, plantId) {
  event.stopPropagation();
  addCareLog(plantId, 'water');
  renderAlerts();
  renderHome();
  showToast('💧 ¡Regada!');
}

function markChecked(event, plantId) {
  event.stopPropagation();
  addCareLog(plantId, 'note', 'Tierra revisada ✅');
  // Update lastWatered equivalent for check mode: store a pseudo-water entry
  updatePlant(plantId, { lastWatered: todayKey() });
  renderAlerts();
  showToast('✅ ¡Revisada!');
}

function updateAlertBadgeFromState() {
  const alerts = getAlerts();
  const urgent = alerts.filter(a => a.urgency === 'urgent' || a.urgency === 'check').length;
  updateAlertBadge(urgent);
}

// ── Care log actions (from detail) ──

function logCare(type) {
  if (!currentPlantId) return;
  if (type === 'note') {
    const text = prompt('📝 ¿Qué quieres anotar?');
    if (text === null) return;
    addCareLog(currentPlantId, 'note', text.trim());
  } else {
    addCareLog(currentPlantId, type);
  }
  const ct = CARE_TYPES[type];
  showToast(`${ct.emoji} ${ct.label} registrado`);
  renderDetail(currentPlantId);
  updateAlertBadgeFromState();
}

function deleteLogEntry(plantId, entryId) {
  const plant = getPlant(plantId);
  if (!plant) return;
  plant.careLog = plant.careLog.filter(e => e.id !== entryId);
  savePlants();
  renderDetail(plantId);
}

// ── Notes auto-save ──

function onNotesBlur() {
  if (!currentPlantId) return;
  const val = document.getElementById('detail-notes').value;
  updatePlant(currentPlantId, { notes: val });
}

// ── Plant form submission ──

async function submitPlantForm(e) {
  e.preventDefault();
  const form    = document.getElementById('plant-form');
  const editId  = form.dataset.editId;
  const isEdit  = !!editId;

  const name          = document.getElementById('field-name').value.trim();
  const nickname      = document.getElementById('field-nickname').value.trim();
  const freq          = parseInt(document.getElementById('field-freq').value) || 7;
  const notes         = document.getElementById('field-notes').value.trim();
  const emoji         = document.getElementById('field-emoji').value || '🌿';
  const room          = document.getElementById('field-room').value || '';
  const light         = document.querySelector('.light-btn.selected')?.dataset.light || 'indirect';
  const wateringMode  = document.getElementById('field-watering-mode').value || 'schedule';

  if (!name) { showToast('⚠️ El nombre es obligatorio', 'error'); return; }

  // Photo
  const fileInput     = document.getElementById('field-photo');
  const existingPhoto = isEdit ? getPlant(editId)?.image || null : null;
  let image = existingPhoto;
  if (fileInput.files[0]) {
    try { image = await fileToBase64(fileInput.files[0]); } catch (err) { /* keep old */ }
  }

  const plantData = {
    name, nickname, emoji, room, image,
    wateringFrequencyDays: freq,
    wateringMode,
    lightRequirement: light,
    notes,
    apiData:        selectedApiPlant || (isEdit ? getPlant(editId)?.apiData : null),
    lastWatered:    isEdit ? getPlant(editId)?.lastWatered    : null,
    lastFertilized: isEdit ? getPlant(editId)?.lastFertilized : null,
    careLog:        isEdit ? getPlant(editId)?.careLog || []  : [],
  };

  if (isEdit) {
    updatePlant(editId, plantData);
    showToast('✅ Planta actualizada');
    renderDetail(editId);
  } else {
    const plant = addPlant(plantData);
    showToast('🌱 ¡Planta añadida!');
    openPlantDetail(plant.id);
  }

  closeModal('modal-add-plant');
  renderHome();
  updateAlertBadgeFromState();
}

// ── Delete plant ──

async function onDeletePlant() {
  const ok = await customConfirm('¿Eliminar esta planta? Esta acción no se puede deshacer.');
  if (!ok) return;
  deletePlant(currentPlantId);
  showToast('🗑️ Planta eliminada');
  goHome();
  updateAlertBadgeFromState();
}

// ── Edit plant ──

function onEditPlant() {
  const plant = getPlant(currentPlantId);
  if (!plant) return;
  openAddPlant(plant);
}

// ── Rooms ──

function onDeleteRoom(event, roomId) {
  event.stopPropagation();
  customConfirm('¿Eliminar esta habitación?').then(ok => {
    if (!ok) return;
    deleteRoom(roomId);
    renderRooms();
    showToast('🗑️ Habitación eliminada');
  });
}

function onAddRoom() {
  const emoji = prompt('Emoji de la habitación (p.ej. 🌞):') || '🏠';
  const label = prompt('Nombre de la habitación:');
  if (!label) return;
  addRoom({ label: label.trim(), emoji });
  renderRooms();
  showToast('🏠 Habitación añadida');
}

// ── API search ──

let searchDebounce = null;
async function onSearchInput() {
  const q = document.getElementById('field-search').value.trim();
  const rc = document.getElementById('api-results');
  if (q.length < 2) {
    rc.innerHTML = '';
    rc.style.display = 'none';
    return;
  }
  rc.style.display = '';
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    if (!settings.perenualApiKey) {
      document.getElementById('api-results').innerHTML =
        `<div class="search-empty">🔑 Añade una API key de Perenual en Ajustes para buscar plantas.</div>`;
      return;
    }
    document.getElementById('api-results').innerHTML = `<div class="search-loading">Buscando 🔍…</div>`;
    const results = await searchPlants(q);
    apiSearchResults = results;
    renderApiResults(results);
  }, 500);
}

async function selectApiPlant(perenualId) {
  document.getElementById('api-results').innerHTML = `<div class="search-loading">Cargando datos 🌿…</div>`;
  let detail = await getPlantDetail(perenualId);
  if (!detail) {
    detail = apiSearchResults.find(r => r.perenualId == perenualId) || null;
  }
  if (!detail) { showToast('Error al obtener datos', 'error'); return; }

  selectedApiPlant = detail;

  document.getElementById('field-name').value = detail.name;
  if (detail.wateringFrequencyDays) document.getElementById('field-freq').value = detail.wateringFrequencyDays;
  if (detail.lightRequirement) {
    document.querySelectorAll('.light-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.light === detail.lightRequirement);
    });
  }

  document.getElementById('api-results').innerHTML =
    `<div class="search-selected">✅ Seleccionado: <strong>${detail.name}</strong></div>`;

  showToast('🌿 Datos cargados de Perenual');
}

// ── Settings ──

function saveApiKey() {
  settings.perenualApiKey = document.getElementById('setting-api-key').value.trim();
  saveSettings();
  showToast('🔑 Clave guardada');
}

function onExport() {
  exportData();
  showToast('📦 Datos exportados');
}

function onImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    if (!input.files[0]) return;
    const text = await input.files[0].text();
    try {
      importData(text);
      renderHome();
      renderRooms();
      renderSettings();
      updateAlertBadgeFromState();
      showToast('📥 Datos importados');
    } catch (err) {
      showToast('Error al importar', 'error');
    }
  };
  input.click();
}

// ── Photo preview ──

async function onPhotoChange() {
  const file = document.getElementById('field-photo').files[0];
  if (!file) return;
  const preview = document.getElementById('photo-preview');
  const base64 = await fileToBase64(file);
  preview.style.backgroundImage = `url('${base64}')`;
  preview.style.display = 'block';
}

// ── Event listeners wiring ──

function bindEvents() {
  // Bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (target === 'modal-add-plant') {
        openAddPlant();
        return;
      }
      if (target === 'screen-rooms')    { renderRooms(); }
      if (target === 'screen-settings') { renderSettings(); }
      if (target === 'screen-alerts')   { renderAlerts(); }
      showScreen(target, { title: btn.dataset.title || '' });
    });
  });

  // Back button
  document.getElementById('btn-back').addEventListener('click', onBackBtn);

  // Plant form
  document.getElementById('plant-form').addEventListener('submit', submitPlantForm);

  // Light buttons
  document.querySelectorAll('.light-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.light-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Watering mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const mode = btn.dataset.mode;
      document.getElementById('field-watering-mode').value = mode;
      document.getElementById('mode-desc').textContent = WATERING_MODES[mode].desc;
    });
  });

  // Photo upload
  document.getElementById('field-photo').addEventListener('change', onPhotoChange);
  document.getElementById('photo-upload-btn').addEventListener('click', () => {
    document.getElementById('field-photo').click();
  });

  // API search
  document.getElementById('field-search').addEventListener('input', onSearchInput);

  // Detail screen buttons
  document.getElementById('btn-water').addEventListener('click', () => logCare('water'));
  document.getElementById('btn-fertilize').addEventListener('click', () => logCare('fertilize'));
  document.getElementById('btn-repot').addEventListener('click', () => logCare('repot'));
  document.getElementById('btn-note').addEventListener('click', () => logCare('note'));
  document.getElementById('btn-edit-plant').addEventListener('click', onEditPlant);
  document.getElementById('btn-delete-plant').addEventListener('click', onDeletePlant);
  document.getElementById('detail-notes').addEventListener('blur', onNotesBlur);

  // Rooms screen
  document.getElementById('btn-add-room').addEventListener('click', onAddRoom);

  // Settings screen
  document.getElementById('btn-save-api-key').addEventListener('click', saveApiKey);
  document.getElementById('btn-export').addEventListener('click', onExport);
  document.getElementById('btn-import').addEventListener('click', onImport);

  // Modal close on backdrop click
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) closeModal(m.id);
    });
  });

  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Confirm dialog
  document.getElementById('confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.remove('open');
  });
}

// ── Init ──

function init() {
  loadData();
  renderHome();
  showScreen('screen-home', { title: '🌿 Mis Plantas' });
  bindEvents();
  updateAlertBadgeFromState();

  // Service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW error', e));
  }
}

document.addEventListener('DOMContentLoaded', init);
