// ── RENDER ──

// ── Home screen ──

function renderHome() {
  const list = document.getElementById('home-grid');
  const filterRoom = currentRoomFilter;

  const filtered = filterRoom
    ? plants.filter(p => p.room === filterRoom)
    : plants;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        <div class="empty-title">¡Sin plantas aún!</div>
        <div class="empty-desc">Toca el botón <strong>+</strong> para añadir tu primera plantita</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(p => plantCard(p)).join('');
}

function plantCard(p) {
  const room  = rooms.find(r => r.id === p.room);
  const ws    = waterStatus(p);
  const bg    = p.image
    ? `background-image: url('${p.image}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%);`;

  const daysLabel = ws.days !== null
    ? `${ws.days}d`
    : '—';

  return `
    <div class="plant-card" onclick="openPlantDetail('${p.id}')">
      <div class="plant-card-photo" style="${bg}">
        ${!p.image ? `<span class="plant-card-emoji">${p.emoji || '🌿'}</span>` : ''}
        <div class="plant-card-overlay">
          <button class="water-quick-btn" onclick="quickWater(event,'${p.id}')" title="Regar">💧</button>
        </div>
      </div>
      <div class="plant-card-body">
        <div class="plant-card-name">${p.nickname || p.name}</div>
        ${p.nickname ? `<div class="plant-card-species">${p.name}</div>` : ''}
        <div class="plant-card-footer">
          ${room ? `<span class="chip chip-room">${room.emoji} ${room.label}</span>` : ''}
          <span class="chip" style="background:${ws.bg}; color:${ws.color};">💧 ${daysLabel}</span>
        </div>
      </div>
    </div>`;
}

// ── Rooms screen ──

function renderRooms() {
  const list = document.getElementById('rooms-list');
  list.innerHTML = rooms.map(r => {
    const roomPlants = plants.filter(p => p.room === r.id);
    const thumbs = roomPlants.slice(0, 4).map(p => {
      if (p.image) return `<div class="room-thumb" style="background-image:url('${p.image}'); background-size:cover; background-position:center;"></div>`;
      return `<div class="room-thumb room-thumb-emoji">${p.emoji || '🌿'}</div>`;
    }).join('');

    return `
      <div class="room-card" onclick="openRoom('${r.id}')">
        <div class="room-card-header">
          <span class="room-card-emoji">${r.emoji}</span>
          <div>
            <div class="room-card-name">${r.label}</div>
            <div class="room-card-count">${roomPlants.length} planta${roomPlants.length !== 1 ? 's' : ''}</div>
          </div>
          <button class="icon-btn danger-btn room-delete" onclick="onDeleteRoom(event,'${r.id}')" title="Eliminar">🗑️</button>
        </div>
        ${thumbs ? `<div class="room-thumbs">${thumbs}</div>` : ''}
      </div>`;
  }).join('');

  if (!rooms.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏠</div><div class="empty-title">Sin habitaciones</div></div>`;
  }
}

// ── Plant detail screen ──

function renderDetail(plantId) {
  const p = getPlant(plantId);
  if (!p) return;

  const room  = rooms.find(r => r.id === p.room);
  const ws    = waterStatus(p);
  const light = LIGHT_LEVELS[p.lightRequirement] || LIGHT_LEVELS.indirect;

  // Hero
  const hero = document.getElementById('detail-hero');
  if (p.image) {
    hero.style.backgroundImage   = `url('${p.image}')`;
    hero.style.backgroundSize    = 'cover';
    hero.style.backgroundPosition= 'center';
    hero.innerHTML = `<div class="detail-hero-gradient"></div>`;
  } else {
    hero.style.backgroundImage = 'none';
    hero.style.background = `linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%)`;
    hero.innerHTML = `<div class="detail-hero-emoji">${p.emoji || '🌿'}</div>`;
  }

  document.getElementById('detail-name').textContent    = p.nickname || p.name;
  document.getElementById('detail-species').textContent = (p.nickname ? p.name : '') + (p.apiData?.scientificName ? ` · ${p.apiData.scientificName}` : '');

  // Chips
  const chipsEl = document.getElementById('detail-chips');
  chipsEl.innerHTML = [
    room ? `<span class="chip chip-room">${room.emoji} ${room.label}</span>` : '',
    `<span class="chip" style="background:${ws.bg}; color:${ws.color};">💧 ${ws.days !== null ? ws.days + 'd' : 'Sin regar'}</span>`,
    `<span class="chip" style="background:${light.color}22; color:${light.color};">${light.emoji} ${light.label}</span>`,
  ].join('');

  // Stats
  document.getElementById('detail-last-water').textContent     = p.lastWatered    ? formatDate(p.lastWatered)    : '—';
  document.getElementById('detail-last-fertilize').textContent = p.lastFertilized ? formatDate(p.lastFertilized) : '—';
  document.getElementById('detail-freq').textContent           = `Cada ${p.wateringFrequencyDays || 7} días`;

  // API info
  const infoEl = document.getElementById('detail-api-info');
  if (p.apiData?.description) {
    infoEl.style.display  = '';
    document.getElementById('detail-description').textContent = p.apiData.description;
  } else {
    infoEl.style.display = 'none';
  }

  // Notes
  document.getElementById('detail-notes').value = p.notes || '';

  // Care log
  renderCareLog(p);
}

function renderCareLog(p) {
  const list = document.getElementById('care-log-list');
  if (!p.careLog || !p.careLog.length) {
    list.innerHTML = `<div class="empty-state small"><div class="empty-desc">Aún no hay registros de cuidado 🌱</div></div>`;
    return;
  }
  list.innerHTML = p.careLog.map(entry => {
    const ct = CARE_TYPES[entry.type] || CARE_TYPES.note;
    return `
      <div class="log-entry">
        <div class="log-icon" style="background:${ct.color}22; color:${ct.color};">${ct.emoji}</div>
        <div class="log-body">
          <div class="log-type">${ct.label}</div>
          ${entry.text ? `<div class="log-text">${escapeHtml(entry.text)}</div>` : ''}
          <div class="log-date">${formatDate(entry.date)}</div>
        </div>
        <button class="icon-btn danger-btn" onclick="deleteLogEntry('${p.id}','${entry.id}')" title="Eliminar">×</button>
      </div>`;
  }).join('');
}

// ── Add / Edit plant form ──

function renderPlantForm(plant = null) {
  const isEdit = !!plant;
  document.getElementById('plant-form-title').textContent = isEdit ? '✏️ Editar planta' : '🌱 Nueva planta';

  // Reset
  document.getElementById('field-name').value     = plant?.name     || '';
  document.getElementById('field-nickname').value = plant?.nickname || '';
  document.getElementById('field-freq').value     = plant?.wateringFrequencyDays || 7;
  document.getElementById('field-notes').value    = plant?.notes    || '';

  // Light buttons
  document.querySelectorAll('.light-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.light === (plant?.lightRequirement || 'indirect'));
  });

  // Watering mode buttons
  const currentMode = plant?.wateringMode || 'schedule';
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.mode === currentMode);
  });
  document.getElementById('field-watering-mode').value = currentMode;
  document.getElementById('mode-desc').textContent = WATERING_MODES[currentMode].desc;

  // Photo preview
  const preview = document.getElementById('photo-preview');
  preview.style.backgroundImage = plant?.image ? `url('${plant.image}')` : 'none';
  preview.style.display         = plant?.image ? 'block' : 'none';

  // API search results
  apiSearchResults = [];
  selectedApiPlant = null;
  document.getElementById('api-results').innerHTML = '';
  document.getElementById('api-results').style.display = 'none';
  document.getElementById('field-search').value   = '';

  // Emoji picker
  buildEmojiPicker('emoji-picker', plant?.emoji || '🌿', emoji => {
    document.getElementById('field-emoji').value = emoji;
  });
  document.getElementById('field-emoji').value = plant?.emoji || '🌿';

  // Room selector
  buildRoomSelector('room-selector', plant?.room || null, roomId => {
    document.getElementById('field-room').value = roomId;
  });
  document.getElementById('field-room').value = plant?.room || '';

  // Store editing ID
  document.getElementById('plant-form').dataset.editId = plant?.id || '';
}

// ── Alerts screen ──

function renderAlerts() {
  const alerts = getAlerts();
  const el = document.getElementById('alerts-list');

  if (!plants.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🌿</div><div class="empty-title">Sin plantas</div><div class="empty-desc">Añade plantas para ver sus avisos aquí</div></div>`;
    updateAlertBadge(0);
    return;
  }

  if (!alerts.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">¡Todo al día!</div><div class="empty-desc">Todas tus plantas están bien cuidadas 🌿</div></div>`;
    updateAlertBadge(0);
    return;
  }

  const groups = {
    urgent: alerts.filter(a => a.urgency === 'urgent'),
    soon:   alerts.filter(a => a.urgency === 'soon'),
    check:  alerts.filter(a => a.urgency === 'check'),
  };

  let html = '';

  if (groups.urgent.length) {
    html += `<div class="alert-group-title">🔴 Necesitan riego</div>`;
    html += groups.urgent.map(a => alertRow(a)).join('');
  }
  if (groups.soon.length) {
    html += `<div class="alert-group-title">🟡 Toca pronto</div>`;
    html += groups.soon.map(a => alertRow(a)).join('');
  }
  if (groups.check.length) {
    html += `<div class="alert-group-title">🔍 Revisar tierra</div>`;
    html += groups.check.map(a => alertRow(a)).join('');
  }

  el.innerHTML = html;

  const urgentCount = groups.urgent.length + groups.check.length;
  updateAlertBadge(urgentCount);
}

function alertRow(a) {
  const { plant: p, ws, urgency } = a;
  const room = rooms.find(r => r.id === p.room);
  const bg = p.image
    ? `background-image:url('${p.image}'); background-size:cover; background-position:center;`
    : `background:linear-gradient(135deg,var(--green) 0%,var(--green-dark) 100%);`;

  let statusMsg = '';
  if (urgency === 'urgent') {
    statusMsg = ws.days === null ? 'Nunca se ha regado' : `Lleva ${ws.days} día${ws.days !== 1 ? 's' : ''} sin regar`;
  } else if (urgency === 'soon') {
    const d = Math.abs(a.daysUntilNext);
    statusMsg = d <= 0 ? 'Toca regar hoy' : `Toca regar en ${d} día${d !== 1 ? 's' : ''}`;
  } else if (urgency === 'check') {
    statusMsg = ws.days === null ? 'Comprueba si la tierra está seca' : `Han pasado ${ws.days} días — revisa si está seca`;
  }

  const waterBtn = `<button class="alert-action-btn water" onclick="quickWaterAlert(event,'${p.id}')">💧</button>`;
  const checkBtn = urgency === 'check'
    ? `<button class="alert-action-btn checked" onclick="markChecked(event,'${p.id}')">✅</button>`
    : '';

  return `
    <div class="alert-row" onclick="openPlantDetail('${p.id}')">
      <div class="alert-thumb" style="${bg}">
        ${!p.image ? `<span>${p.emoji || '🌿'}</span>` : ''}
      </div>
      <div class="alert-body">
        <div class="alert-plant-name">${p.nickname || p.name}</div>
        ${room ? `<div class="alert-room">${room.emoji} ${room.label}</div>` : ''}
        <div class="alert-status" style="color:${ws.color}">${statusMsg}</div>
      </div>
      <div class="alert-actions" onclick="event.stopPropagation()">
        ${waterBtn}${checkBtn}
      </div>
    </div>`;
}

// ── Settings screen ──

function renderSettings() {
  document.getElementById('setting-api-key').value = settings.perenualApiKey || '';
  document.getElementById('plants-count').textContent = plants.length;
}

// ── Search results ──

function renderApiResults(results) {
  const el = document.getElementById('api-results');
  if (!results.length) {
    el.innerHTML = `<div class="search-empty">Sin resultados. Prueba otro nombre o añade manualmente.</div>`;
    return;
  }
  el.innerHTML = results.map(r => `
    <div class="search-result" onclick="selectApiPlant('${r.perenualId}')">
      ${r.thumbnail
        ? `<img class="search-thumb" src="${r.thumbnail}" alt="${r.name}" loading="lazy">`
        : `<div class="search-thumb-emoji">🌿</div>`}
      <div class="search-info">
        <div class="search-name">${r.name}</div>
        ${r.scientificName ? `<div class="search-sci">${r.scientificName}</div>` : ''}
      </div>
      <span class="search-arrow">›</span>
    </div>`).join('');
}

// ── Helpers ──

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
