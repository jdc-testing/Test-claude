/**
 * match.js — Ciclo de vida del partido
 *
 * Funciones expuestas al HTML:
 *   openNewMatchModal()  — abre modal de configuración (con selector de rival)
 *   selectRivalCard(el)  — selecciona un rival en el modal
 *   startMatch()         — inicializa el estado local del partido
 *   addMyPoint()         — +1 punto para mí
 *   addRivPoint()        — +1 punto para el rival
 *   addMyGame()          — +1 juego para mí (atajo)
 *   addRivGame()         — +1 juego para el rival (atajo)
 *   undoLastPoint()      — deshace la última acción (máx 30)
 *   openFinishModal()    — abre modal de fin de partido
 *   selectResult(r)      — selecciona resultado en modal finish
 *   toggleFinishOverride()
 *   confirmFinish()      — guarda partido en Supabase y limpia estado
 *
 * IMPORTANTE: ya NO hay sync punto a punto con Supabase.
 * El partido se guarda en BD únicamente al confirmar el resultado final.
 * El creador del partido es siempre player1 (myKey='p1', rivKey='p2').
 */

'use strict';

// ── ABRIR MODAL NUEVO PARTIDO ─────────────────────────

function openNewMatchModal() {
  if (friends.length === 0) {
    showToast('Primero invita a un amigo desde tu perfil');
    return;
  }

  // Poblar lista de rivales
  const container = document.getElementById('rival-cards-list');
  container.innerHTML = friends.map((f, i) => {
    const name  = f.otherProfile?.name     || 'Amigo';
    const photo = f.otherProfile?.photo_url || null;

    // Historial W-L contra este amigo
    const fMatches = matches.filter(m => m.friendship_id === f.id);
    let fw = 0, fl = 0;
    for (const m of fMatches) {
      const r = myResult(m);
      if (r === 'win') fw++; else if (r === 'loss') fl++;
    }

    return `<div class="rival-card${i === 0 ? ' selected' : ''}" data-friend-id="${esc(f.id)}" onclick="selectRivalCard(this)">
      <div class="avatar av-sm">${avatarHTML(photo, name)}</div>
      <div style="flex:1">
        <div class="rival-card-name">${esc(name)}</div>
        <div class="rival-card-record"><span class="rw">${fw}V</span> <span class="rl">${fl}D</span></div>
      </div>
    </div>`;
  }).join('');

  openModal('modal-new-match');
}

/** Marca el rival seleccionado en el modal. */
function selectRivalCard(el) {
  document.querySelectorAll('#rival-cards-list .rival-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── INICIAR PARTIDO ───────────────────────────────────

/**
 * Crea el estado local del partido.
 * No escribe en Supabase hasta confirmFinish().
 * El creador siempre es player1 → myKey='p1', rivKey='p2'.
 */
function startMatch() {
  const selectedCard = document.querySelector('#rival-cards-list .rival-card.selected');
  if (!selectedCard) { showToast('Selecciona un rival'); return; }

  const friendId = selectedCard.dataset.friendId;
  const selectedFriend = friends.find(f => f.id === friendId);
  if (!selectedFriend) { showToast('Rival no encontrado'); return; }

  const rivalId = selectedFriend.player1_id === currentUser.id
    ? selectedFriend.player2_id
    : selectedFriend.player1_id;

  const numSets  = parseInt(document.querySelector('#rg-numsets  .radio-option.selected')?.dataset.val || '3');
  const tbTarget = parseInt(document.querySelector('#rg-tiebreak .radio-option.selected')?.dataset.val ?? '7');
  const noDeuce  = document.querySelector('#rg-deuce .radio-option.selected')?.dataset.val === 'nodeuce';

  // Creador es siempre p1
  myKey  = 'p1';
  rivKey = 'p2';

  // Perfil del rival para el marcador
  partnerProfile = selectedFriend.otherProfile;

  // Estado local del partido (no se escribe en BD hasta el final)
  current = {
    friendshipId: selectedFriend.id,
    player1_id:   currentUser.id,
    player2_id:   rivalId,
    format:       { numSets, tiebreakTarget: tbTarget, noDeuce },
    completedSets:   [],
    currentSetGames: { p1: 0, p2: 0 },
    isTiebreak:      false,
    tbPoints:        { p1: 0, p2: 0 },
    gamePoints:      { p1: 0, p2: 0 },
    history:         [],
    startDate:       new Date().toISOString().slice(0, 10),
  };

  closeModal('modal-new-match');
  renderMatch();
}

// ── AÑADIR PUNTOS ─────────────────────────────────────

/** Añade un punto para el jugador con clave 'p1' o 'p2'. */
function addPoint(key) {
  if (!current) return;

  // Guardar snapshot para undo
  current.history.push(snapshotCurrent());
  if (current.history.length > 30) current.history.shift();

  if (current.isTiebreak) {
    current.tbPoints[key]++;
    const tw = tiebreakWinner(
      current.tbPoints.p1,
      current.tbPoints.p2,
      current.format.tiebreakTarget
    );
    if (tw) closeCurrentSet();
  } else {
    current.gamePoints[key]++;
    const gw = gameWinner(
      current.gamePoints.p1,
      current.gamePoints.p2,
      current.format.noDeuce
    );
    if (gw) {
      current.currentSetGames[gw]++;
      current.gamePoints = { p1: 0, p2: 0 };
      checkAfterGame();
    }
  }

  renderMatch();
}

/** Wrapper: punto para mí. */
function addMyPoint()  { addPoint(myKey); }

/** Wrapper: punto para el rival. */
function addRivPoint() { addPoint(rivKey); }

// ── AÑADIR JUEGOS (ATAJOS) ────────────────────────────

function addGame(key) {
  if (!current) return;
  if (current.isTiebreak) { showToast('Estás en tiebreak — usa +Punto'); return; }

  current.history.push(snapshotCurrent());
  if (current.history.length > 30) current.history.shift();

  current.currentSetGames[key]++;
  current.gamePoints = { p1: 0, p2: 0 };
  checkAfterGame();

  renderMatch();
}

function addMyGame()  { addGame(myKey); }
function addRivGame() { addGame(rivKey); }

// ── DESHACER ──────────────────────────────────────────

function undoLastPoint() {
  if (!current || current.history.length === 0) {
    showToast('Nada que deshacer');
    return;
  }
  const snap = current.history.pop();
  current.completedSets   = snap.completedSets;
  current.currentSetGames = snap.currentSetGames;
  current.isTiebreak      = snap.isTiebreak;
  current.tbPoints        = snap.tbPoints;
  current.gamePoints      = snap.gamePoints;

  renderMatch();
}

// ── TERMINAR PARTIDO ──────────────────────────────────

function openFinishModal() {
  if (!current) return;
  _finishResult = null;

  const sw = getSetsWon();
  const mySets  = sw[myKey];
  const rivSets = sw[rivKey];

  if (mySets  > rivSets) _finishResult = 'win';
  else if (rivSets > mySets) _finishResult = 'loss';

  // Todos los sets incluyendo el parcial
  const allSets = [...current.completedSets];
  if (current.currentSetGames.p1 > 0 || current.currentSetGames.p2 > 0) {
    allSets.push({
      p1: current.currentSetGames.p1,
      p2: current.currentSetGames.p2,
      tiebreak: null,
    });
  }

  const myName  = myProfile?.name        || 'Yo';
  const rivName = partnerProfile?.name   || 'Rival';

  document.getElementById('finish-sets-list').innerHTML = allSets.length === 0
    ? '<p style="color:var(--muted);font-size:.85rem">Sin sets completados aún</p>'
    : allSets.map((s, i) => `
        <div class="finish-set-row">
          <span style="color:var(--muted);width:52px">Set ${i + 1}:</span>
          <strong>${esc(myName)} ${s[myKey]} — ${s[rivKey]} ${esc(rivName)}</strong>
          ${s.tiebreak ? `<span style="font-size:.75rem;color:var(--muted)">(TB ${s.tiebreak[myKey]}-${s.tiebreak[rivKey]})</span>` : ''}
        </div>`).join('');

  const badge  = document.getElementById('finish-result-badge');
  const isTie  = mySets === rivSets;

  if (_finishResult === 'win') {
    badge.className  = 'finish-result-badge win';
    badge.textContent = '✓ Victoria';
  } else if (_finishResult === 'loss') {
    badge.className  = 'finish-result-badge loss';
    badge.textContent = '✗ Derrota';
  } else {
    badge.className  = 'finish-result-badge tie';
    badge.textContent = 'Sets empatados — elige resultado';
  }

  document.getElementById('finish-override').style.display     = isTie ? 'block' : 'none';
  document.getElementById('finish-override-btn').style.display = isTie ? 'none'  : '';
  if (isTie) {
    document.querySelectorAll('#result-options .result-opt').forEach(el => el.classList.remove('sel'));
  }

  openModal('modal-finish');
}

function toggleFinishOverride() {
  const ov = document.getElementById('finish-override');
  ov.style.display = ov.style.display === 'none' ? 'block' : 'none';
}

function selectResult(r) {
  _finishResult = r;
  document.querySelectorAll('#result-options .result-opt').forEach(el =>
    el.classList.toggle('sel', el.dataset.r === r));

  const badge = document.getElementById('finish-result-badge');
  if (r === 'win')       { badge.className = 'finish-result-badge win';  badge.textContent = '✓ Victoria'; }
  else if (r === 'loss') { badge.className = 'finish-result-badge loss'; badge.textContent = '✗ Derrota'; }
  else                   { badge.className = 'finish-result-badge tie';  badge.textContent = '⊘ Abandonado'; }
}

/**
 * Guarda el partido en Supabase (INSERT directo como 'completed').
 * El creador es siempre p1, así que result_p1 = _finishResult directamente.
 */
async function confirmFinish() {
  if (!_finishResult) { showToast('Selecciona el resultado'); return; }

  const allSets = [...current.completedSets];
  if (current.currentSetGames.p1 > 0 || current.currentSetGames.p2 > 0) {
    allSets.push({
      p1: current.currentSetGames.p1,
      p2: current.currentSetGames.p2,
      tiebreak: null,
    });
  }
  const sw = getSetsWon();

  // myKey siempre es 'p1' (el creador), así que result_p1 = resultado desde mi POV
  const result_p1 = _finishResult;

  try {
    const { data: saved, error } = await sb
      .from('matches')
      .insert({
        friendship_id: current.friendshipId,
        player1_id:    current.player1_id,
        player2_id:    current.player2_id,
        format:        current.format,
        status:        'completed',
        result_p1,
        sets:          allSets,
        sets_won:      sw,
        start_date:    current.startDate,
        completed_at:  new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    clearCurrent();
    matches.unshift(saved);
    closeModal('modal-finish');
    renderMatch();
    showToast('Partido guardado ✓');

  } catch (e) {
    console.error('confirmFinish error:', e);
    showToast('Error al guardar partido');
  }
}

// ── EDITAR PARTIDO ────────────────────────────────────

function openEditMatchModal(id) {
  const m = matches.find(x => x.id === id);
  if (!m) return;
  _editMatchId = id;
  _editResult  = myResult(m);

  const mk = m.player1_id === currentUser.id ? 'p1' : 'p2';
  const rk = mk === 'p1' ? 'p2' : 'p1';

  document.getElementById('edit-date').value = m.start_date || '';
  document.querySelectorAll('#edit-result-options .result-opt').forEach(el =>
    el.classList.toggle('sel', el.dataset.r === _editResult));

  const setLabel = document.getElementById('edit-sets-label');
  if (setLabel) {
    setLabel.textContent = `(${esc(myProfile?.name || 'Yo')} — ${esc(_getRivalName(m))})`;
  }

  const container = document.getElementById('edit-sets-list');
  container.innerHTML = '';
  (m.sets || []).forEach((s, i) => appendEditSetRow(container, s[mk], s[rk], i));
  openModal('modal-edit-match');
}

function appendEditSetRow(container, myVal, rivVal, idx) {
  const div = document.createElement('div');
  div.className = 'edit-set-row';
  div.dataset.idx = idx;
  div.innerHTML = `
    <input class="form-input" type="number" min="0" max="99" value="${myVal}"  data-side="my">
    <span class="set-sep">—</span>
    <input class="form-input" type="number" min="0" max="99" value="${rivVal}" data-side="riv">
    <button class="btn btn-ghost btn-sm" onclick="editRemoveSet(this)">✕</button>`;
  container.appendChild(div);
}

function editAddSet() {
  const c = document.getElementById('edit-sets-list');
  appendEditSetRow(c, 0, 0, c.children.length);
}

function editRemoveSet(btn) {
  const rows = document.querySelectorAll('#edit-sets-list .edit-set-row');
  if (rows.length <= 1) { showToast('Debe haber al menos 1 set'); return; }
  btn.closest('.edit-set-row').remove();
}

function editSelectResult(r) {
  _editResult = r;
  document.querySelectorAll('#edit-result-options .result-opt').forEach(el =>
    el.classList.toggle('sel', el.dataset.r === r));
}

async function saveEditMatch() {
  if (!_editResult) { showToast('Selecciona el resultado'); return; }
  const m = matches.find(x => x.id === _editMatchId);
  if (!m) return;

  // Perspectiva del usuario en este partido
  const mk = m.player1_id === currentUser.id ? 'p1' : 'p2';
  const rk = mk === 'p1' ? 'p2' : 'p1';

  const rows = document.querySelectorAll('#edit-sets-list .edit-set-row');
  const sets = Array.from(rows).map(row => {
    const myV  = parseInt(row.querySelector('[data-side="my"]').value)  || 0;
    const rivV = parseInt(row.querySelector('[data-side="riv"]').value) || 0;
    // Almacenar siempre en p1/p2 neutral
    return {
      p1:       mk === 'p1' ? myV : rivV,
      p2:       mk === 'p2' ? myV : rivV,
      tiebreak: null,
    };
  });

  let p1Sets = 0, p2Sets = 0;
  for (const s of sets) { if (s.p1 > s.p2) p1Sets++; else p2Sets++; }

  // Convertir resultado (mi POV) a result_p1
  const result_p1 = _editResult === 'abandoned' ? 'abandoned'
    : mk === 'p1' ? _editResult
    : (_editResult === 'win' ? 'loss' : 'win');

  try {
    const { error } = await sb
      .from('matches')
      .update({
        start_date: document.getElementById('edit-date').value,
        result_p1,
        sets,
        sets_won: { p1: p1Sets, p2: p2Sets },
      })
      .eq('id', _editMatchId);

    if (error) throw error;

    // Actualizar array local
    Object.assign(m, {
      start_date: document.getElementById('edit-date').value,
      result_p1,
      sets,
      sets_won: { p1: p1Sets, p2: p2Sets },
    });

    closeModal('modal-edit-match');
    renderStats();
    showToast('Partido actualizado ✓');
  } catch (e) {
    console.error('saveEditMatch error:', e);
    showToast('Error al guardar');
  }
}

async function deleteMatch() {
  if (!confirm('¿Eliminar este partido?')) return;
  try {
    const { error } = await sb.from('matches').delete().eq('id', _editMatchId);
    if (error) throw error;
    matches = matches.filter(m => m.id !== _editMatchId);
    closeModal('modal-edit-match');
    renderStats();
    renderMatch();
    showToast('Partido eliminado');
  } catch (e) {
    console.error('deleteMatch error:', e);
    showToast('Error al eliminar');
  }
}
