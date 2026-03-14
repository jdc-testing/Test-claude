/**
 * render.js — Funciones de renderizado de los tres tabs
 *
 * renderMatch(waiting)    — Tab Partido (home / marcador / waiting)
 * renderHomeScreen()      — Pantalla de inicio (sin partido activo)
 * renderMatchScreen()     — Marcador en vivo
 * renderStats()           — Tab Estadísticas completo
 * renderChart(filter)     — Gráfico de barras
 * renderPeriodFilter()    — Selector de periodo
 * renderProfileTab()      — Tab Perfil
 * openRivalDetail()       — Modal de detalle del compañero
 *
 * Perspectiva: usa myKey / rivKey para mostrar siempre "Yo" primero.
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
  if (myKey === 'p1') return m.result_p1;
  return m.result_p1 === 'win' ? 'loss' : 'win';
}

// ── TAB PARTIDO ───────────────────────────────────────

/**
 * Punto de entrada principal del tab Partido.
 * @param {boolean} waiting - si true, mostrar el panel de espera
 */
function renderMatch(waiting = false) {
  const waitingPanel = document.getElementById('waiting-panel');
  const noMatch      = document.getElementById('no-match');
  const matchScreen  = document.getElementById('match-screen');

  if (waiting || (friendship && friendship.status === 'pending')) {
    // Mostrar panel de espera y actualizar el invite link
    waitingPanel.style.display = '';
    noMatch.style.display      = 'none';
    matchScreen.style.display  = 'none';
    const url = `${window.location.origin}${window.location.pathname}?invite=${friendship?.invite_token || ''}`;
    document.getElementById('invite-link-text').textContent = url;
    return;
  }

  waitingPanel.style.display = 'none';

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
  const myName  = myProfile?.name      || 'Yo';
  const rivName = partnerProfile?.name || 'Rival';

  // Hero propio
  document.getElementById('home-name').textContent = myName;
  document.getElementById('home-avatar').innerHTML = avatarHTML(myProfile?.photo_url, myName);

  // Tarjeta del compañero (no clickable, info solo)
  const sw = _partnerRecord();
  document.getElementById('home-partner-section').innerHTML = `
    <div class="rival-picker-label">Tu compañero:</div>
    <div class="rival-card selected" style="cursor:default">
      <div class="avatar av-sm">${avatarHTML(partnerProfile?.photo_url, rivName)}</div>
      <div style="flex:1">
        <div class="rival-card-name">${esc(rivName)}</div>
        <div class="rival-card-record">
          <span class="rw">${sw.w}V</span> <span class="rl">${sw.l}D</span>
        </div>
      </div>
    </div>`;
}

/** Calcula el historial W-L contra el compañero. */
function _partnerRecord() {
  let w = 0, l = 0;
  for (const m of matches) {
    const r = myResult(m);
    if (r === 'win') w++; else if (r === 'loss') l++;
  }
  return { w, l };
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

  // Por rival (solo el compañero)
  if (fin.length === 0) {
    document.getElementById('rivals-stats').innerHTML =
      '<div class="empty-state"><div class="es-icon">🎾</div><p>Sin partidos en este periodo</p></div>';
  } else {
    const rivName = partnerProfile?.name || 'Rival';
    const pw = fin.filter(m => myResult(m) === 'win').length;
    const pl = fin.filter(m => myResult(m) === 'loss').length;
    document.getElementById('rivals-stats').innerHTML = `
      <div class="rival-row" onclick="openRivalDetail()">
        <div class="avatar av-sm">${avatarHTML(partnerProfile?.photo_url, rivName)}</div>
        <div class="rival-rname">${esc(rivName)}</div>
        <div class="rival-rec"><span class="rw">${pw}V</span> <span class="rl">${pl}D</span></div>
        <span style="color:var(--muted);font-size:.8rem">›</span>
      </div>`;
  }

  // Historial de partidos
  document.getElementById('match-history').innerHTML = fin.length === 0
    ? '<div class="empty-state"><div class="es-icon">📋</div><p>Sin partidos en este periodo</p></div>'
    : fin.map(m => {
        const res      = myResult(m);
        const setsStr  = (m.sets || []).map(s => `${s[myKey]}-${s[rivKey]}`).join(', ') || '—';
        const resLabel = res === 'win' ? 'Victoria' : res === 'loss' ? 'Derrota' : 'Abandonado';
        return `<div class="match-item">
          <div class="m-dot ${res}"></div>
          <div class="m-info">
            <div class="m-rival">${esc(partnerProfile?.name || 'Rival')}</div>
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

// ── MODAL DETALLE DEL RIVAL (COMPAÑERO) ───────────────

function openRivalDetail() {
  const rivName = partnerProfile?.name || 'Rival';
  const ms = matches.filter(m => myResult(m) !== 'abandoned')
                    .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));

  const theirWins   = ms.filter(m => myResult(m) === 'loss').length;
  const theirLosses = ms.filter(m => myResult(m) === 'win').length;
  const total       = ms.length;
  const pct         = total > 0 ? Math.round(theirWins / total * 100) : 0;

  document.getElementById('rd-avatar').innerHTML = avatarHTML(partnerProfile?.photo_url, rivName);
  document.getElementById('rd-name').textContent  = rivName;

  document.getElementById('rd-summary').innerHTML = `
    <div class="rd-box win"><div class="rbv">${theirWins}</div><div class="rbl">Sus victorias</div></div>
    <div class="rd-box loss"><div class="rbv">${theirLosses}</div><div class="rbl">Sus derrotas</div></div>
    <div class="rd-box"><div class="rbv">${pct}%</div><div class="rbl">% victorias</div></div>`;

  const myName = myProfile?.name || 'Yo';
  document.getElementById('rd-matches').innerHTML = ms.length === 0
    ? '<p style="color:var(--muted);font-size:.85rem">Sin partidos</p>'
    : ms.map(m => {
        const theirRes = myResult(m) === 'loss' ? 'win' : 'loss';
        const label    = theirRes === 'win' ? 'Gana' : 'Pierde';
        // Marcador desde su perspectiva (invertido)
        const setsStr  = (m.sets || []).map(s => `${s[rivKey]}-${s[myKey]}`).join(', ') || '—';
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
  _pendingPhoto = undefined; // reset foto pendiente
  document.getElementById('profile-name-input').value = myProfile?.name || '';
  document.getElementById('profile-av').innerHTML = avatarHTML(myProfile?.photo_url, myProfile?.name);

  // Tarjeta del compañero
  const container = document.getElementById('partner-card-container');
  if (!partnerProfile) {
    container.innerHTML = `
      <div class="partner-card pending">
        <div class="avatar av-lg">${avatarHTML(null, '?')}</div>
        <div class="pinfo">
          <h3>Sin compañero aún</h3>
          <small>Comparte el link de invitación desde la pestaña Partido</small>
        </div>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="partner-card">
        <div class="avatar av-lg">${avatarHTML(partnerProfile.photo_url, partnerProfile.name)}</div>
        <div class="pinfo">
          <h3>${esc(partnerProfile.name)}</h3>
          <small>Tu compañero de partidos</small>
        </div>
      </div>`;
  }
}
