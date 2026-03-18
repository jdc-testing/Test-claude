// ── STORAGE ──

const KEYS = {
  plants:   'pm_plants',
  rooms:    'pm_rooms',
  settings: 'pm_settings',
};

function loadData() {
  try {
    plants   = JSON.parse(localStorage.getItem(KEYS.plants))   || [];
    settings = JSON.parse(localStorage.getItem(KEYS.settings)) || {};
    const savedRooms = JSON.parse(localStorage.getItem(KEYS.rooms));
    rooms = savedRooms && savedRooms.length ? savedRooms : [...DEFAULT_ROOMS];
  } catch (e) {
    console.error('loadData error', e);
    plants   = [];
    rooms    = [...DEFAULT_ROOMS];
    settings = {};
  }
}

function savePlants() {
  localStorage.setItem(KEYS.plants, JSON.stringify(plants));
}

function saveRooms() {
  localStorage.setItem(KEYS.rooms, JSON.stringify(rooms));
}

function saveSettings() {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

// ── Plant CRUD ──

function addPlant(plant) {
  plant.id = crypto.randomUUID();
  plant.addedAt = todayKey();
  plant.careLog = plant.careLog || [];
  plants.unshift(plant);
  savePlants();
  return plant;
}

function updatePlant(id, changes) {
  const idx = plants.findIndex(p => p.id === id);
  if (idx === -1) return;
  plants[idx] = { ...plants[idx], ...changes };
  savePlants();
  return plants[idx];
}

function deletePlant(id) {
  plants = plants.filter(p => p.id !== id);
  savePlants();
}

function getPlant(id) {
  return plants.find(p => p.id === id) || null;
}

function addCareLog(plantId, type, text = '') {
  const plant = getPlant(plantId);
  if (!plant) return;
  const entry = {
    id:   crypto.randomUUID(),
    type,
    date: todayKey(),
    text,
  };
  plant.careLog = [entry, ...(plant.careLog || [])];
  if (type === 'water')     plant.lastWatered     = entry.date;
  if (type === 'fertilize') plant.lastFertilized  = entry.date;
  savePlants();
  return entry;
}

// ── Room CRUD ──

function addRoom(room) {
  room.id = 'room_' + Date.now();
  rooms.push(room);
  saveRooms();
  return room;
}

function deleteRoom(id) {
  rooms = rooms.filter(r => r.id !== id);
  saveRooms();
}

// ── Export / Import ──

function exportData() {
  const blob = new Blob([JSON.stringify({ plants, rooms, settings }, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `mis-plantas-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(jsonStr) {
  const data = JSON.parse(jsonStr);
  if (data.plants)   { plants   = data.plants;   savePlants(); }
  if (data.rooms)    { rooms    = data.rooms;     saveRooms(); }
  if (data.settings) { settings = data.settings; saveSettings(); }
}
