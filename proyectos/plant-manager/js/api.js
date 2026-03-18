// ── API — Perenual plant database ──
// Get a free key at https://perenual.com/docs/api (100 req/day free)

async function searchPlants(query) {
  const apiKey = settings.perenualApiKey || '';
  if (!apiKey) return [];
  try {
    const url = `${PERENUAL_BASE}/species-list?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&indoor=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.data || []).slice(0, 12).map(normalizeApiPlant);
  } catch (e) {
    console.warn('Perenual search error:', e);
    return [];
  }
}

async function getPlantDetail(perenualId) {
  const apiKey = settings.perenualApiKey || '';
  if (!apiKey) return null;
  try {
    const url = `${PERENUAL_BASE}/species/details/${perenualId}?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return normalizeApiDetail(data);
  } catch (e) {
    console.warn('Perenual detail error:', e);
    return null;
  }
}

// Map Perenual species-list item to our internal shape
function normalizeApiPlant(item) {
  return {
    perenualId:   item.id,
    name:         item.common_name || item.scientific_name?.[0] || 'Planta',
    scientificName: item.scientific_name?.[0] || '',
    thumbnail:    item.default_image?.thumbnail || item.default_image?.small_url || null,
    cycle:        item.cycle || '',
    sunlight:     item.sunlight || [],
    watering:     item.watering || '',
  };
}

// Map Perenual species/details to our internal shape (richer)
function normalizeApiDetail(item) {
  const normalized = normalizeApiPlant(item);
  return {
    ...normalized,
    description:  item.description || '',
    careLevel:    item.care_level || '',
    growthRate:   item.growth_rate || '',
    maintenance:  item.maintenance || '',
    flowers:      item.flowers || false,
    poisonous:    item.poisonous_to_humans || false,
    image:        item.default_image?.original_url || item.default_image?.regular_url || null,
    // Map Perenual watering to our frequency (days)
    wateringFrequencyDays: mapWateringFrequency(item.watering),
    // Map Perenual sunlight to our light levels
    lightRequirement: mapSunlight(item.sunlight),
  };
}

function mapWateringFrequency(watering) {
  if (!watering) return 7;
  const w = watering.toLowerCase();
  if (w.includes('frequent')) return 3;
  if (w.includes('average'))  return 7;
  if (w.includes('minimum') || w.includes('rare')) return 14;
  return 7;
}

function mapSunlight(sunlight) {
  if (!sunlight || !sunlight.length) return 'indirect';
  const s = sunlight.join(' ').toLowerCase();
  if (s.includes('full sun'))  return 'direct';
  if (s.includes('low'))       return 'low';
  return 'indirect';
}
