/**
 * match.js — Ciclo de vida del partido
 *
 * Funciones expuestas al HTML:
 *   openNewMatchModal()  — abre modal de configuración
 *   startMatch()         — crea partido y estado inicial
 *   addMyPoint()         — +1 punto para mí
 *   addRivPoint()        — +1 punto para el rival
 *   addMyGame()          — +1 juego para mí (atajo)
 *   addRivGame()         — +1 juego para el rival (atajo)
 *   undoLastPoint()      — deshace la última acción (máx 30)
 *   openFinishModal()    — abre modal de fin de partido
 *   selectResult(r)      — selecciona resultado en modal finish
 *   toggleFinishOverride()
 *   confirmFinish()      — guarda partido y limpia estado
 */

'use strict';

// ── ABRIR MODAL NUEVO PARTIDO ─────────────────────────

function openNewMatchModal() {
  if (!partnerProfile) {
    showToast('Espera a que tu compañero se una');
    return;
  }
  openModal('modal-new-match');
}

// ── INICIAR PARTIDO ───────────────────────────────────

async function startMatch() {
  const numSets  = parseInt(document.querySelector('#rg-numsets  .radio-option.selected')?.dataset.val || '3');
  const tbTarget = parseInt(document.querySelector('#rg-tiebreak .radio-option.selected')?.dataset.val ?? '7');
  const noDeuce  = document.querySelector('#rg-deuce .radio-option.selected')?.dataset.val === 'nodeuce';

  try {
    // Crear registro en matches (status 'active')
    const { data: newMatch, error } = await sb
      .from('matches')
      .insert({
        friendship_id: friendship.id,
        player1_id:    friendship.player1_id,
        player2_id:    friendship.player2_id,
        format:        { numSets, tiebreakTarget: tbTarget, noDeuce },
        status:        'active',
        start_date:    new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) throw error;

    // Estado inicial del partido
    current = {
      matchId:         newMatch.id,
      format:          { numSets, tiebreakTarget: tbTarget, noDeuce },
      completedSets:   [],
      currentSetGames: { p1: 0, p2: 0 },
      isTiebreak:      false,
      tbPoints:        { p1: 0, p2: 0 },
      gamePoints:      { p1: 0, p2: 0 },
      history:         [],
      startDate:       newMatch.start_date,
    };

    await saveCurrent();
    closeModal('modal-new-match');
    renderMatch();

  } catch (e) {
    console.error('startMatch error:', e);
    showToast('Error al crear el partido');
  }
}

// ── AÑADIR PUNTOS ─────────────────────────────────────

/** Añade un punto para el jugador con clave 'p1' o 'p2'. */
async function addPoint(key) {
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

  await saveCurrent();
  renderMatch();
}

/** Wrapper: punto para mí. */
function addMyPoint()  { addPoint(myKey); }

/** Wrapper: punto para el rival. */
function addRivPoint() { addPoint(rivKey); }

// ── AÑADIR JUEGOS (ATAJOS) ────────────────────────────

async function addGame(key) {
  if (!current) return;
  if (current.isTiebreak) { showToast('Estás en tiebreak — usa +Punto'); return; }

  current.history.push(snapshotCurrent());
  if (current.history.length > 30) current.history.shift();

  current.currentSetGames[key]++;
  current.gamePoints = { p1: 0, p2: 0 };
  checkAfterGame();

  await saveCurrent();
  renderMatch();
}

function addMyGame()  { addGame(myKey); }
function addRivGame() { addGame(rivKey); }

// ── DESHACER ──────────────────────────────────────────

async function undoLastPoint() {
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

  await saveCurrent();
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

  const myName  = myProfile?.name  || 'Yo';
  const rivName = partnerProfile?.name || 'Rival';

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

  // Convertir resultado (desde mi POV) a result_p1 (desde perspectiva de p1)
  const result_p1 = _finishResult === 'abandoned' ? 'abandoned'
    : myKey === 'p1' ? _finishResult
    : (_finishResult === 'win' ? 'loss' : 'win');

  try {
    const { data: saved, error } = await sb
      .from('matches')
      .update({
        status:       'completed',
        result_p1,
        sets:         allSets,
        sets_won:     sw,
        completed_at: new Date().toISOString(),
      })
      .eq('id', current.matchId)
      .select()
      .single();

    if (error) throw error;

    await clearCurrent();
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

  document.getElementById('edit-date').value = m.start_date || '';
  document.querySelectorAll('#edit-result-options .result-opt').forEach(el =>
    el.classList.toggle('sel', el.dataset.r === _editResult));

  // Etiqueta dinámica con nombres reales
  const setLabel = document.getElementById('edit-sets-label');
  if (setLabel) {
    setLabel.textContent = `(${esc(myProfile?.name || 'Yo')} — ${esc(partnerProfile?.name || 'Rival')})`;
  }

  const container = document.getElementById('edit-sets-list');
  container.innerHTML = '';
  (m.sets || []).forEach((s, i) => appendEditSetRow(container, s[myKey], s[rivKey], i));
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

  const rows = document.querySelectorAll('#edit-sets-list .edit-set-row');
  const sets = Array.from(rows).map(row => {
    const myV  = parseInt(row.querySelector('[data-side="my"]').value)  || 0;
    const rivV = parseInt(row.querySelector('[data-side="riv"]').value) || 0;
    // Almacenar siempre en p1/p2 neutral
    return {
      p1:       myKey === 'p1' ? myV : rivV,
      p2:       myKey === 'p2' ? myV : rivV,
      tiebreak: null,
    };
  });

  let p1Sets = 0, p2Sets = 0;
  for (const s of sets) { if (s.p1 > s.p2) p1Sets++; else p2Sets++; }

  // Convertir resultado (mi POV) a result_p1
  const result_p1 = _editResult === 'abandoned' ? 'abandoned'
    : myKey === 'p1' ? _editResult
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
    showToast('Partido eliminado');
  } catch (e) {
    console.error('deleteMatch error:', e);
    showToast('Error al eliminar');
  }
}
