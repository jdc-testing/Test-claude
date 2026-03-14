/**
 * data.js — Operaciones de lectura/escritura con Supabase
 *
 * Funciones:
 *   loadMatches()       — carga partidos completados desde BD
 *   loadLiveState()     — carga el estado del partido en curso
 *   saveCurrent()       — guarda el estado del partido en curso (upsert)
 *   clearCurrent()      — limpia el partido en curso en BD
 *   saveProfile()       — guarda perfil del usuario
 *   loadPartnerProfile()— carga el perfil del compañero
 */

'use strict';

// ── PARTIDOS COMPLETADOS ──────────────────────────────

/**
 * Carga todos los partidos completados de esta friendship desde Supabase.
 * Actualiza el array global `matches`.
 */
async function loadMatches() {
  if (!friendship) return;
  try {
    const { data, error } = await sb
      .from('matches')
      .select('*')
      .eq('friendship_id', friendship.id)
      .eq('status', 'completed')
      .order('start_date', { ascending: false });

    if (error) throw error;
    matches = data || [];
  } catch (e) {
    console.error('loadMatches error:', e);
    matches = [];
  }
}

// ── ESTADO PARTIDO EN CURSO ───────────────────────────

/**
 * Carga el estado del partido en curso desde live_state.
 * Actualiza `current`.
 */
async function loadLiveState() {
  if (!friendship) return;
  try {
    const { data } = await sb
      .from('live_state')
      .select('state')
      .eq('friendship_id', friendship.id)
      .single();

    current = data?.state || null;
  } catch {
    current = null;
  }
}

/**
 * Guarda el estado actual del partido en live_state (upsert por friendship_id).
 * Si current es null, no hace nada (usar clearCurrent para borrar).
 */
async function saveCurrent() {
  if (!friendship || !current) return;
  try {
    const { error } = await sb
      .from('live_state')
      .upsert({
        friendship_id: friendship.id,
        match_id:      current.matchId || null,
        state:         current,
        updated_at:    new Date().toISOString(),
        updated_by:    currentUser.id,
      }, { onConflict: 'friendship_id' });

    if (error) throw error;
  } catch (e) {
    console.error('saveCurrent error:', e);
    showToast('Error al sincronizar');
  }
}

/**
 * Limpia el partido en curso en live_state (pone state = null).
 * También limpia la variable global `current`.
 */
async function clearCurrent() {
  current = null;
  if (!friendship) return;
  try {
    await sb
      .from('live_state')
      .update({
        match_id:   null,
        state:      null,
        updated_at: new Date().toISOString(),
      })
      .eq('friendship_id', friendship.id);
  } catch (e) {
    console.error('clearCurrent error:', e);
  }
}

// ── PERFIL ────────────────────────────────────────────

/**
 * Guarda el perfil del usuario actual en la tabla profiles.
 * @param {{ name: string, photo_url: string|null }} data
 */
async function saveProfile() {
  const name = document.getElementById('profile-name-input').value.trim();
  if (!name) { showToast('Introduce un nombre'); return; }

  try {
    const { error } = await sb.from('profiles').upsert({
      id:        currentUser.id,
      name,
      photo_url: _pendingPhoto !== undefined ? _pendingPhoto : myProfile.photo_url,
    });
    if (error) throw error;

    myProfile.name      = name;
    myProfile.photo_url = _pendingPhoto !== undefined ? _pendingPhoto : myProfile.photo_url;
    _pendingPhoto       = undefined;

    updateHeaderAvatar();
    renderMatch();
    showToast('Perfil guardado ✓');
    document.getElementById('profile-av').innerHTML = avatarHTML(myProfile.photo_url, myProfile.name);
  } catch (e) {
    console.error('saveProfile error:', e);
    showToast('Error al guardar perfil');
  }
}

/**
 * Carga el perfil del compañero y actualiza `partnerProfile`.
 */
async function loadPartnerProfile() {
  if (!friendship) return;
  const partnerId = friendship[rivKey + '_id'] || friendship.player2_id;
  if (!partnerId) { partnerProfile = null; return; }

  try {
    const { data } = await sb
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    partnerProfile = data || null;
  } catch {
    partnerProfile = null;
  }
}

// ── EXPORTAR DATOS ────────────────────────────────────

/**
 * Descarga todos los datos del usuario como JSON.
 */
function downloadData() {
  const exportMatches = matches.map(m => ({
    id:         m.id,
    date:       m.start_date,
    format:     m.format,
    result:     myResult(m),
    sets:       (m.sets || []).map(s => ({
      my:    s[myKey],
      rival: s[rivKey],
      tiebreak: s.tiebreak
        ? { my: s.tiebreak[myKey], rival: s.tiebreak[rivKey], target: s.tiebreak.target }
        : null,
    })),
    sets_won:   { my: m.sets_won?.[myKey] || 0, rival: m.sets_won?.[rivKey] || 0 },
  }));

  const data = {
    exportDate:  new Date().toISOString(),
    me:          myProfile,
    partner:     partnerProfile,
    friendship:  { id: friendship.id, status: friendship.status },
    matches:     exportMatches,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tennis-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Datos descargados ✓');
}
