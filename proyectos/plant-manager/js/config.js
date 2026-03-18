// ── CONFIG ──

const APP_VERSION = '1.0.0';
const CACHE_NAME  = 'plant-manager-v1';

// Perenual free API — get a free key at https://perenual.com/docs/api
// Supports 100 free requests/day. Leave empty to use manual entry only.
const PERENUAL_BASE = 'https://perenual.com/api';

// Default rooms (emoji + label)
const DEFAULT_ROOMS = [
  { id: 'salon',     label: 'Salón',     emoji: '🛋️' },
  { id: 'dormitorio',label: 'Dormitorio',emoji: '🛏️' },
  { id: 'cocina',    label: 'Cocina',    emoji: '🍳' },
  { id: 'banyo',     label: 'Baño',      emoji: '🚿' },
  { id: 'terraza',   label: 'Terraza',   emoji: '🌤️' },
  { id: 'estudio',   label: 'Estudio',   emoji: '📚' },
];

// Quick emoji palette for plant picker
const PLANT_EMOJIS = [
  '🌿','🌱','🌾','🍀','🍃','🌵','🌴','🌲','🌳','🌸',
  '🌺','🌻','🌹','🌷','💐','🪴','🎋','🎍','🍄','🌾',
  '🍂','🍁','☘️','🪷','🫧','💚','🟢','✨','⭐','🦋',
];

// Care log types
const CARE_TYPES = {
  water:      { label: 'Riego',       emoji: '💧', color: '#48cae4' },
  fertilize:  { label: 'Abono',       emoji: '🌿', color: '#52b788' },
  repot:      { label: 'Trasplante',  emoji: '🪴', color: '#f9844a' },
  prune:      { label: 'Poda',        emoji: '✂️',  color: '#adb5bd' },
  note:       { label: 'Nota',        emoji: '📝', color: '#ffd166' },
};

// Light levels
const LIGHT_LEVELS = {
  low:      { label: 'Poca luz',       emoji: '🌑', color: '#6c757d' },
  indirect: { label: 'Luz indirecta',  emoji: '🌤️', color: '#ffd166' },
  direct:   { label: 'Sol directo',    emoji: '☀️',  color: '#f9844a' },
};

// Watering status thresholds (days since last watered)
const WATER_STATUS = {
  ok:    { label: 'Bien',       color: '#52b788', bg: '#d8f3dc' },
  soon:  { label: 'Pronto',     color: '#f9844a', bg: '#ffe8d6' },
  late:  { label: '¡Toca!',    color: '#e63946', bg: '#ffe0e3' },
  check: { label: '🔍 Revisar', color: '#7b61ff', bg: '#f0edff' },
};

// Watering modes
const WATERING_MODES = {
  schedule: { label: 'Cada X días',       emoji: '📅', desc: 'Regar según un calendario fijo' },
  check:    { label: 'Revisar la tierra', emoji: '🔍', desc: 'Te aviso que compruebes si la tierra está seca' },
};
