/**
 * render.js — Funciones de renderizado de los tres tabs
 *
 * renderMatch()           — Tab Partido (home / marcador)
 * renderHomeScreen()      — Pantalla de inicio (sin partido activo)
 * renderMatchScreen()     — Marcador en vivo
 * renderStats()           — Tab Estadísticas completo
 * renderChart(filter)     — Gráfico de barras
 * renderPeriodFilter()    — Selector de periodo
 * renderProfileTab()      — Tab Perfil
 * openRivalDetail(rivalId)— Modal de detalle de un rival concreto
 *
 * Perspectiva:
 *  - Partido activo: myKey='p1', rivKey='p2' (creador siempre p1)
 *  - Partidos completados: se calcula por partido con matchMyKey(m)
 */

'use strict';

// ── HELPERS DE PERSPECTIVA ────────────────────────────

/**
 * Devuelve el resultado de un partido desde MI perspectiva.
 * @param {object} m - partido de Supabase
 * @returns {'win'|'loss'|'abandoned'}
 */
function myResult(m) {
  if (m.result_p1 === 'abandoned') return 'abandoned';
  const mk = m.player1_id === currentUser.id ? 'p1' : 'p2';
  if (mk === 'p1') return m.result_p1;
  return m.result_p1 === 'win' ? 'loss' : 'win';
}

/**
 * Devuelve el nombre del rival en un partido.
 * @param {object} m - partido de Supabase
 * @returns {string}
 */
function _getRivalName(m) {
  const rivalId = m.player1_id === currentUser.id ? m.player2_id : m.player1_id;
  const friend  = friends.find(f =>
    f.player1_id === rivalId || f.player2_id === rivalId
  );
  return friend?.otherProfile?.name || 'Rival';
}

/**
 * Devuelve el perfil del rival en un partido.
 * @param {object} m - partido de Supabase
 * @returns {object|null}
 */
function _getRivalProfile(m) {
  const rivalId = m.player1_id === currentUser.id ? m.player2_id : m.player1_id;
  const friend  = friends.find(f =>
    f.player1_id === rivalId || f.player2_id === rivalId
  );
  return friend?.otherProfile || null;
}

// ── TAB PARTIDO ───────────────────────────────────────

/**
 * Punto de entrada principal del tab Partido.
 * Muestra el marcador si hay partido activo, o la pantalla de inicio.
 */
function renderMatch() {
  const noMatch     = document.getElementById('no-match');
  const matchScreen = document.getElementById('match-screen');

  if (current) {
    noMatch.style.display     = 'none';
    matchScreen.style.display = '';
    renderMatchScreen();
  } else {
    noMatch.style.display     = '';
    matchScreen.style.display = 'none';
    renderHomeScreen();
  }
}

function renderHomeScreen() {
  const myName = myProfile?.name || 'Yo';

  document.getElementById('home-name').textContent = myName;
  document.getElementById('home-avatar').innerHTML = avatarHTML(myProfile?.photo_url, myName);

  const sec = document.getElementById('home-partner-section');
  if (friends.length === 0) {
    sec.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">👥</div>
        <p>Invita a un amigo para empezar a jugar</p>
        <button class="btn btn-secondary btn-md" onclick="switchTab('profile')" style="margin-top:10px">Ir a Perfil → Invitar</button>
      </div>`;
  } else {
    // Balance total
    let w = 0, l = 0;
    for (const m of matches) {
      const r = myResult(m);
      if (r === 'win') w++; else if (r === 'loss') l++;
    }
    const numFriends = friends.length;
    sec.innerHTML = `
      <div style="text-align:center;padding:10px 0 4px">
        <div style="font-size:1.6rem;font-weight:800;color:var(--accent)">${w}V — ${l}D</div>
        <div style="font-size:.8rem;color:var(--muted);margin-top:2px">Balance total · ${numFriends} ${numFriends === 1 ? 'amigo' : 'amigos'}</div>
      </div>`;
  }
}

function renderMatchScreen() {
  const myName  = myProfile?.name      || 'Yo';
  const rivName = partnerProfile?.name || 'Rival';

  document.getElementById('my-name-btn').textContent    = myName;
  document.getElementById('rival-name-btn').textContent = rivName;

  document.getElementById('players-row').innerHTML = `
    <div class="player-info">
      <div class="avatar av-md">${avatarHTML(myProfile?.photo_url, myName)}</div>
      <span class="pname">${esc(myName)}</span>
    </div>
    <span class="pvs">VS</span>
    <div class="player-info">
      <div class="avatar av-md">${avatarHTML(partnerProfile?.photo_url, rivName)}</div>
      <span class="pname">${esc(rivName)}</span>
    </div>`;

  // Tiebreak banner
  const banner = document.getElementById('tb-banner');
  if (current.isTiebreak) {
    banner.textContent = `🔥 Tiebreak — primero a ${current.format.tiebreakTarget}`;
    banner.classList.add('visible');
  } else {
    banner.classList.remove('visible');
  }

  // Marcador
  const sw = getSetsWon();
  const pt = current.isTiebreak
    ? { p1: String(current.tbPoints.p1), p2: String(current.tbPoints.p2) }
    : getPointDisplay(current.gamePoints.p1, current.gamePoints.p2, current.format.noDeuce);

  const myPt  = pt[myKey];
  const rivPt = pt[rivKey];
  const isSpecial = myPt === 'Deuce' || myPt === 'Ad' || rivPt === 'Ad';

  // Chips de sets completados (desde mi perspectiva)
  const chipsHTML = current.completedSets.map(s => {
    const won = s[myKey] > s[rivKey];
    const tb  = s.tiebreak
      ? `<sup style="font-size:.65em">(${s.tiebreak[myKey]}-${s.tiebreak[rivKey]})</sup>`
      : '';
    return `<span class="set-chip ${won ? 'won' : 'lost'}">${s[myKey]}-${s[rivKey]}${tb}</span>`;
  }).join('');

  document.getElementById('scoreboard').innerHTML = `
    ${current.completedSets.length > 0 ? `<div class="sets-history">${chipsHTML}</div>` : ''}
    <div class="score-row">
      <div class="score-label">Sets</div>
      <div class="score-val hi">${sw[myKey]}</div>
      <div class="score-sep">—</div>
      <div class="score-val">${sw[rivKey]}</div>
    </div>
    <div class="score-row">
      <div class="score-label">Juegos</div>
      <div class="score-val hi">${current.currentSetGames[myKey]}</div>
      <div class="score-sep">—</div>
      <div class="score-val">${current.currentSetGames[rivKey]}</div>
    </div>
    <div class="score-row">
      <div class="score-label">${current.isTiebreak ? 'TB pts' : 'Puntos'}</div>
      <div class="score-val hi${isSpecial ? ' special' : ''}">${esc(myPt)}</div>
      <div class="score-sep">—</div>
      <div class="score-val${isSpecial ? ' special' : ''}">${esc(rivPt)}</div>
    </div>`;
}

// ── TAB ESTADÍSTICAS ──────────────────────────────────

function getFilteredMatches() {
  return matches.filter(m => {
    if (myResult(m) === 'abandoned')                                    return false;
    if (_statsYear  !== null && m.start_date?.slice(0, 4)  !== String(_statsYear))  return false;
    if (_statsMonth !== null && parseInt(m.start_date?.slice(5, 7)) !== _statsMonth) return false;
    return true;
  });
}

function renderStats() {
  renderPeriodFilter();
  const fin = getFilteredMatches();

  const wins   = fin.filter(m => myResult(m) === 'win').length;
  const losses = fin.filter(m => myResult(m) === 'loss').length;
  const total  = wins + losses;
  const pct    = total > 0 ? Math.round(wins / total * 100) : 0;

  document.getElementById('summary-grid').innerHTML = `
    <div class="summary-box win"><div class="sbv">${wins}</div><div class="sbl">Victorias</div></div>
    <div class="summary-box loss"><div class="sbv">${losses}</div><div class="sbl">Derrotas</div></div>
    <div class="summary-box"><div class="sbv">${pct}%</div><div class="sbl">% victorias</div></div>`;

  const sorted = [...fin].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
  let bestStreak = 0, tmp = 0, curStreak = 0;
  for (const m of sorted) {
    if (myResult(m) === 'win') { tmp++; bestStreak = Math.max(bestStreak, tmp); }
    else tmp = 0;
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (myResult(sorted[i]) === 'win') curStreak++; else break;
  }

  document.getElementById('streak-row').innerHTML = `
    <div class="streak-box"><div class="sv">${curStreak}</div><div class="sl">Racha actual</div></div>
    <div class="streak-box"><div class="sv">${bestStreak}</div><div class="sl">Mejor racha</div></div>`;

  renderChart(_chartFilter);

  // Por rival (múltiples)
  if (fin.length === 0) {
    document.getElementById('rivals-stats').innerHTML =
      '<div class="empty-state"><div class="es-icon">🎾</div><p>Sin partidos en este periodo</p></div>';
  } else {
    // Agrupar por rival
    const rivalMap = {};
    for (const m of fin) {
      const rivalId = m.player1_id === currentUser.id ? m.player2_id : m.player1_id;
      if (!rivalMap[rivalId]) rivalMap[rivalId] = { profile: _getRivalProfile(m), w: 0, l: 0 };
      const r = myResult(m);
      if (r === 'win') rivalMap[rivalId].w++; else rivalMap[rivalId].l++;
    }

    document.getElementById('rivals-stats').innerHTML = Object.entries(rivalMap).map(([rivalId, data]) => {
      const rivName = data.profile?.name || 'Rival';
      return `<div class="rival-row" onclick="openRivalDetail('${esc(rivalId)}')">
        <div class="avatar av-sm">${avatarHTML(data.profile?.photo_url, rivName)}</div>
        <div class="rival-rname">${esc(rivName)}</div>
        <div class="rival-rec"><span class="rw">${data.w}V</span> <span class="rl">${data.l}D</span></div>
        <span style="color:var(--muted);font-size:.8rem">›</span>
      </div>`;
    }).join('');
  }

  // Historial de partidos
  document.getElementById('match-history').innerHTML = fin.length === 0
    ? '<div class="empty-state"><div class="es-icon">📋</div><p>Sin partidos en este periodo</p></div>'
    : fin.map(m => {
        const mk      = m.player1_id === currentUser.id ? 'p1' : 'p2';
        const rk      = mk === 'p1' ? 'p2' : 'p1';
        const res     = myResult(m);
        const setsStr = (m.sets || []).map(s => `${s[mk]}-${s[rk]}`).join(', ') || '—';
        const resLabel = res === 'win' ? 'Victoria' : res === 'loss' ? 'Derrota' : 'Abandonado';
        return `<div class="match-item">
          <div class="m-dot ${res}"></div>
          <div class="m-info">
            <div class="m-rival">${esc(_getRivalName(m))}</div>
            <div class="m-meta">${m.start_date || '—'} · ${resLabel}</div>
            <div class="m-sets">${setsStr}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openEditMatchModal('${m.id}')">✏️</button>
        </div>`;
      }).join('');
}

function renderPeriodFilter() {
  const years = [...new Set(matches.map(m => m.start_date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const curY  = String(new Date().getFullYear());
  if (!years.includes(curY)) years.unshift(curY);

  const yEl = document.getElementById('period-year-filter');
  yEl.innerHTML =
    `<button class="pf-chip${_statsYear === null ? ' active' : ''}" onclick="setPeriodYear(null)">Todo</button>` +
    years.map(y =>
      `<button class="pf-chip${_statsYear === y ? ' active' : ''}" onclick="setPeriodYear('${y}')">${y}</button>`
    ).join('');

  const mEl = document.getElementById('period-month-filter');
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  if (_statsYear !== null) {
    mEl.style.display = '';
    mEl.innerHTML =
      `<button class="mf-chip${_statsMonth === null ? ' active' : ''}" onclick="setPeriodMonth(null)">Todos</button>` +
      MONTHS.map((mn, i) =>
        `<button class="mf-chip${_statsMonth === (i + 1) ? ' active' : ''}" onclick="setPeriodMonth(${i + 1})">${mn}</button>`
      ).join('');
  } else {
    mEl.style.display = 'none';
  }
}

function setPeriodYear(y)  { _statsYear = y; _statsMonth = null; renderStats(); }
function setPeriodMonth(m) { _statsMonth = m; renderStats(); }

function renderChart(filter) {
  _chartFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.f === filter));

  const now = new Date();
  let periods = [];

  if (filter === 'semana') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      periods.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('es-ES', { weekday: 'narrow' }), w: 0, l: 0 });
    }
    const map = {}; for (const p of periods) map[p.key] = p;
    for (const m of matches) {
      const r = myResult(m);
      if (r === 'abandoned') continue;
      if (map[m.start_date]) { r === 'win' ? map[m.start_date].w++ : map[m.start_date].l++; }
    }
  } else if (filter === 'mes') {
    for (let w = 3; w >= 0; w--) {
      const toD = new Date(now); toD.setDate(toD.getDate() - w * 7);
      const frD = new Date(toD); frD.setDate(frD.getDate() - 6);
      periods.push({
        fromKey: frD.toISOString().slice(0, 10),
        toKey:   toD.toISOString().slice(0, 10),
        label:   frD.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''),
        w: 0, l: 0,
      });
    }
    for (const m of matches) {
      const r = myResult(m);
      if (r === 'abandoned') continue;
      for (const p of periods) {
        if (m.start_date >= p.fromKey && m.start_date <= p.toKey) { r === 'win' ? p.w++ : p.l++; break; }
      }
    }
  } else { // año
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      periods.push({ key, label: d.toLocaleDateString('es-ES', { month: 'short' }).slice(0, 3), w: 0, l: 0 });
    }
    const map = {}; for (const p of periods) map[p.key] = p;
    for (const m of matches) {
      const r = myResult(m);
      if (r === 'abandoned') continue;
      const mk = m.start_date?.slice(0, 7);
      if (mk && map[mk]) { r === 'win' ? map[mk].w++ : map[mk].l++; }
    }
  }

  const BAR_H  = 80;
  const maxVal = Math.max(...periods.map(p => p.w + p.l), 1);
  document.getElementById('chart-wrap').innerHTML = periods.map(p => {
    const wH = Math.round(p.w / maxVal * BAR_H);
    const lH = Math.round(p.l / maxVal * BAR_H);
    return `<div class="chart-col">
      <div class="bar-stack">
        <div class="bar-win"  style="height:${wH}px"></div>
        <div class="bar-loss" style="height:${lH}px"></div>
      </div>
      <div class="bar-label">${esc(p.label)}</div>
    </div>`;
  }).join('');
}

// ── MODAL DETALLE DE UN RIVAL ──────────────────────────

/**
 * Abre el modal con estadísticas de un rival concreto.
 * @param {string} rivalId - UUID del rival
 */
function openRivalDetail(rivalId) {
  const friend      = friends.find(f => f.player1_id === rivalId || f.player2_id === rivalId);
  const rivProfile  = friend?.otherProfile || null;
  const rivName     = rivProfile?.name || 'Rival';
  const myName      = myProfile?.name || 'Yo';

  const ms = matches.filter(m => {
    const rId = m.player1_id === currentUser.id ? m.player2_id : m.player1_id;
    return rId === rivalId && myResult(m) !== 'abandoned';
  }).sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));

  const theirWins   = ms.filter(m => myResult(m) === 'loss').length;
  const theirLosses = ms.filter(m => myResult(m) === 'win').length;
  const total       = ms.length;
  const pct         = total > 0 ? Math.round(theirWins / total * 100) : 0;

  document.getElementById('rd-avatar').innerHTML = avatarHTML(rivProfile?.photo_url, rivName);
  document.getElementById('rd-name').textContent  = rivName;

  document.getElementById('rd-summary').innerHTML = `
    <div class="rd-box win"><div class="rbv">${theirWins}</div><div class="rbl">Sus victorias</div></div>
    <div class="rd-box loss"><div class="rbv">${theirLosses}</div><div class="rbl">Sus derrotas</div></div>
    <div class="rd-box"><div class="rbv">${pct}%</div><div class="rbl">% victorias</div></div>`;

  document.getElementById('rd-matches').innerHTML = ms.length === 0
    ? '<p style="color:var(--muted);font-size:.85rem">Sin partidos</p>'
    : ms.map(m => {
        const mk       = m.player1_id === currentUser.id ? 'p1' : 'p2';
        const rk       = mk === 'p1' ? 'p2' : 'p1';
        const theirRes = myResult(m) === 'loss' ? 'win' : 'loss';
        const label    = theirRes === 'win' ? 'Gana' : 'Pierde';
        const setsStr  = (m.sets || []).map(s => `${s[rk]}-${s[mk]}`).join(', ') || '—';
        return `<div class="rd-match-row">
          <div class="rd-match-res ${theirRes}">${label}</div>
          <div class="rd-match-sets">${setsStr} vs ${esc(myName)}</div>
          <div class="rd-match-date">${m.start_date || '—'}</div>
        </div>`;
      }).join('');

  openModal('modal-rival-detail');
}

// ── TAB PERFIL ────────────────────────────────────────

function renderProfileTab() {
  // Mi perfil
  _pendingPhoto = undefined;
  document.getElementById('profile-name-input').value = myProfile?.name || '';
  document.getElementById('profile-av').innerHTML = avatarHTML(myProfile?.photo_url, myProfile?.name);

  // Lista de amigos
  const container = document.getElementById('partner-card-container');
  if (friends.length === 0) {
    container.innerHTML = `
      <div class="partner-card pending">
        <div class="avatar av-lg">${avatarHTML(null, '?')}</div>
        <div class="pinfo">
          <h3>Sin amigos aún</h3>
          <small>Usa el botón "+ Invitar" para conectar con alguien</small>
        </div>
      </div>`;
  } else {
    container.innerHTML = friends.map(f => {
      const name = f.otherProfile?.name || 'Amigo';
      return `
        <div class="partner-card">
          <div class="avatar av-lg">${avatarHTML(f.otherProfile?.photo_url, name)}</div>
          <div class="pinfo">
            <h3>${esc(name)}</h3>
            <small>Amigo · ${_friendRecord(f.id)}</small>
          </div>
        </div>`;
    }).join('');
  }
}

/** Devuelve el string "2V 1D" del historial contra un amigo. */
function _friendRecord(friendshipId) {
  let w = 0, l = 0;
  for (const m of matches) {
    if (m.friendship_id !== friendshipId) continue;
    const r = myResult(m);
    if (r === 'win') w++; else if (r === 'loss') l++;
  }
  return `${w}V ${l}D`;
}
