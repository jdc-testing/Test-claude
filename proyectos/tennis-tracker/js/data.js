/**
 * data.js — Operaciones de lectura/escritura con Supabase
 *
 * Funciones:
 *   loadMatches()       — carga partidos completados del usuario
 *   clearCurrent()      — limpia el partido en curso en memoria
 *   saveProfile()       — guarda perfil del usuario
 *   downloadData()      — exporta datos del usuario como JSON
 */

'use strict';

// ── PARTIDOS COMPLETADOS ──────────────────────────────

/**
 * Carga todos los partidos completados en los que participo.
 * Filtra por player1_id o player2_id (soporta múltiples rivales).
 * Actualiza el array global `matches`.
 */
async function loadMatches() {
  if (!currentUser) return;
  try {
    const { data, error } = await sb
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${currentUser.id},player2_id.eq.${currentUser.id}`)
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
 * Limpia el partido en curso en memoria.
 * No escribe en Supabase: el marcador ya no se sincroniza por punto.
 */
function clearCurrent() {
  current = null;
}

// ── PERFIL ────────────────────────────────────────────

/**
 * Guarda el perfil del usuario actual en la tabla profiles.
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

// ── EXPORTAR DATOS ────────────────────────────────────

/**
 * Descarga todos los datos del usuario como JSON.
 */
function downloadData() {
  const exportMatches = matches.map(m => {
    const mk = m.player1_id === currentUser.id ? 'p1' : 'p2';
    const rk = mk === 'p1' ? 'p2' : 'p1';
    return {
      id:       m.id,
      date:     m.start_date,
      format:   m.format,
      result:   myResult(m),
      rival:    _getRivalName(m),
      sets:     (m.sets || []).map(s => ({
        my:    s[mk],
        rival: s[rk],
        tiebreak: s.tiebreak
          ? { my: s.tiebreak[mk], rival: s.tiebreak[rk], target: s.tiebreak.target }
          : null,
      })),
      sets_won: { my: m.sets_won?.[mk] || 0, rival: m.sets_won?.[rk] || 0 },
    };
  });

  const data = {
    exportDate: new Date().toISOString(),
    me:         myProfile,
    friends:    friends.map(f => ({ id: f.id, profile: f.otherProfile })),
    matches:    exportMatches,
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
