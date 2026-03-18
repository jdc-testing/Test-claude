// ── STATE ──

let plants   = [];   // Array of plant objects
let rooms    = [];   // Array of room objects
let settings = {};   // App settings (perenualApiKey, etc.)

let currentPlantId   = null;   // ID of plant shown in detail screen
let currentRoomFilter = null;  // Room ID filter for rooms tab (null = all)
let currentScreen    = 'screen-home';

// Search state for add-plant modal
let apiSearchResults  = [];
let selectedApiPlant  = null;
