/**
 * auth.js — Autenticación Google, configuración de perfil e invite links
 *
 * Flujo:
 *  1. App carga → setScreen('loading')
 *  2. Supabase onAuthStateChange:
 *     - sin sesión → setScreen('auth')
 *     - con sesión → checkProfile()
 *  3. checkProfile():
 *     - sin perfil en BD → setScreen('profile-setup')
 *     - con perfil → loadFriends()
 *  4. loadFriends():
 *     - procesa ?invite=TOKEN si hay
 *     - carga TODOS los amigos activos
 *     - inicia la app (setScreen('app'))
 */

'use strict';

// ── PANTALLAS ─────────────────────────────────────────

/**
 * Muestra una pantalla y oculta las demás.
 * @param {'loading'|'auth'|'profile-setup'|'app'} name
 */
function setScreen(name) {
  document.getElementById('screen-loading').style.display       = name === 'loading'       ? 'flex' : 'none';
  document.getElementById('screen-auth').style.display          = name === 'auth'          ? 'flex' : 'none';
  document.getElementById('screen-profile-setup').style.display = name === 'profile-setup' ? 'flex' : 'none';
  document.getElementById('main-app').style.display             = name === 'app'           ? 'flex' : 'none';
}

// ── GOOGLE AUTH ───────────────────────────────────────

/** Inicia el flujo de Sign-In con Google (redirect). */
async function signInWithGoogle() {
  try {
    // Conservar ?invite=TOKEN si existe; usar pathname limpio si no
    const base = window.location.origin + window.location.pathname;
    const token = new URLSearchParams(window.location.search).get('invite');
    const redirectTo = token ? `${base}?invite=${token}` : base;

    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      console.error('OAuth error:', error);
      showToast('Error: ' + (error.message || 'no se pudo conectar con Google'));
    }
  } catch (e) {
    console.error('signInWithGoogle error:', e);
    showToast('Error al iniciar sesión');
  }
}

/** Cierra la sesión y vuelve a la pantalla de login. */
async function signOut() {
  if (!confirm('¿Cerrar sesión?')) return;
  unsubscribeAll();
  await sb.auth.signOut();
  // onAuthStateChange se encarga de volver a setScreen('auth')
}

// ── PROFILE SETUP ─────────────────────────────────────

/** Llamado al hacer clic en "Empezar →" en la pantalla de setup. */
async function saveProfileSetup() {
  const name = document.getElementById('setup-name-input').value.trim();
  if (!name) { showToast('Introduce tu nombre'); return; }

  try {
    const { error } = await sb.from('profiles').upsert({
      id:        currentUser.id,
      name,
      photo_url: _setupPhoto || null,
    });
    if (error) throw error;

    myProfile = { id: currentUser.id, name, photo_url: _setupPhoto || null };
    await loadFriends();
  } catch (e) {
    showToast('Error al guardar perfil');
    console.error(e);
  }
}

/** Picker de foto para la pantalla de setup. */
function pickSetupPhoto() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      _setupPhoto = ev.target.result;
      document.getElementById('setup-avatar').innerHTML = avatarHTML(_setupPhoto, '');
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

// ── VERIFICAR PERFIL ──────────────────────────────────

/**
 * Comprueba si el usuario ya tiene perfil en BD.
 * Si no, muestra la pantalla de setup.
 */
async function checkProfile() {
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error || !data) {
      // Pre-rellena nombre con el de Google si está disponible
      const googleName = currentUser.user_metadata?.full_name || '';
      document.getElementById('setup-name-input').value = googleName;

      // Muestra avatar de Google si hay foto
      const googlePhoto = currentUser.user_metadata?.avatar_url || null;
      _setupPhoto = googlePhoto;
      document.getElementById('setup-avatar').innerHTML = avatarHTML(googlePhoto, googleName);

      setScreen('profile-setup');
      return;
    }

    myProfile = data;
    await loadFriends();
  } catch (e) {
    console.error('checkProfile error:', e);
    // Reset auth state so the guard in initAuth allows re-init on next attempt
    currentUser = null;
    myProfile   = null;
    showToast('Error de conexión. Inténtalo de nuevo.');
    setScreen('auth');
  }
}

// ── CARGAR AMIGOS ─────────────────────────────────────

/**
 * Carga todos los amigos activos del usuario.
 * Antes comprueba si hay token de invitación en la URL y lo procesa.
 */
async function loadFriends() {
  try {
    // 1. ¿Hay token de invitación en la URL?
    const token = new URLSearchParams(window.location.search).get('invite');
    if (token) {
      window.history.replaceState({}, '', window.location.pathname);
      await _joinViaToken(token);
    }

    // 2. Cargar todas las friendships activas donde participo
    const { data: activeFriendships } = await sb
      .from('friendships')
      .select('*')
      .or(`player1_id.eq.${currentUser.id},player2_id.eq.${currentUser.id}`)
      .eq('status', 'active');

    // 3. Cargar perfiles de los otros jugadores
    const otherIds = (activeFriendships || [])
      .map(f => f.player1_id === currentUser.id ? f.player2_id : f.player1_id)
      .filter(Boolean);

    let profilesMap = {};
    if (otherIds.length > 0) {
      const { data: profiles } = await sb
        .from('profiles')
        .select('*')
        .in('id', otherIds);
      for (const p of (profiles || [])) profilesMap[p.id] = p;
    }

    friends = (activeFriendships || []).map(f => {
      const otherId = f.player1_id === currentUser.id ? f.player2_id : f.player1_id;
      return { ...f, otherProfile: profilesMap[otherId] || null };
    });

    // 4. Suscribirse a cambios de friendships pendientes (para detectar nuevos amigos)
    subscribeToFriendships();

    // 5. Iniciar la app
    await initMainApp();

  } catch (e) {
    console.error('loadFriends error:', e);
    // Reset auth state so the guard in initAuth allows re-init on next attempt
    currentUser = null;
    myProfile   = null;
    friends     = [];
    showToast('Error al cargar datos. Inténtalo de nuevo.');
    setScreen('auth');
  }
}

/**
 * Intenta unirse a una friendship via token de invitación.
 * Solo hace la operación de BD; el caller se encarga de cargar el estado.
 * @param {string} token
 */
async function _joinViaToken(token) {
  try {
    const { data: inv, error: selErr } = await sb
      .from('friendships')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single();

    if (selErr || !inv) {
      showToast('Enlace de invitación inválido o ya usado');
      return;
    }

    // Si soy el player1 (el que creó el enlace), no hacer nada
    if (inv.player1_id === currentUser.id) return;

    // Unirse como player2
    const { error: updErr } = await sb
      .from('friendships')
      .update({ player2_id: currentUser.id, status: 'active' })
      .eq('id', inv.id);

    if (updErr) {
      console.error('_joinViaToken UPDATE error:', updErr);
      showToast('Error al unirse: ' + (updErr.message || updErr.code));
      return;
    }

    showToast('¡Te has unido! 🎾');

  } catch (e) {
    console.error('_joinViaToken error:', e);
    showToast('Error al procesar el enlace');
  }
}

// ── INVITE LINK ───────────────────────────────────────

/**
 * Crea una nueva friendship pending y muestra el modal con el enlace.
 */
async function generateInviteLink() {
  try {
    const { data: newF, error } = await sb
      .from('friendships')
      .insert({ player1_id: currentUser.id })
      .select()
      .single();

    if (error) throw error;

    const url = `${window.location.origin}${window.location.pathname}?invite=${newF.invite_token}`;
    document.getElementById('invite-link-input').value = url;
    openModal('modal-invite');

    // Suscribirse para detectar cuando alguien acepta
    subscribeToFriendships();

  } catch (e) {
    console.error('generateInviteLink error:', e);
    showToast('Error al generar enlace');
  }
}

/** Copia el enlace de invitación del modal al portapapeles. */
async function copyInviteLink() {
  const input = document.getElementById('invite-link-input');
  const url = input?.value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Enlace copiado ✓');
  } catch {
    showToast('Copia el enlace manualmente');
  }
}

// ── INIT APP ──────────────────────────────────────────

/**
 * Carga datos y muestra la app principal.
 */
async function initMainApp() {
  await loadMatches();

  setScreen('app');
  document.getElementById('main-app').style.display = 'flex';

  renderMatch();
  renderProfileTab();
  updateHeaderAvatar();
}

/** Actualiza el avatar pequeño del header. */
function updateHeaderAvatar() {
  const el = document.getElementById('header-avatar');
  if (el && myProfile) {
    el.innerHTML = avatarHTML(myProfile.photo_url, myProfile.name);
  }
}

// ── SUPABASE AUTH LISTENER ────────────────────────────

/** Registra el listener de cambio de sesión. Llamado desde app.js. */
function initAuth() {
  setScreen('loading');

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      // Limpiar estado
      currentUser    = null;
      myProfile      = null;
      partnerProfile = null;
      friends        = [];
      matches        = [];
      current        = null;
      myKey          = 'p1';
      rivKey         = 'p2';
      unsubscribeAll();
      setScreen('auth');
      return;
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      if (currentUser && currentUser.id === session.user.id) return; // ya inicializado
      currentUser = session.user;
      await checkProfile();
    }
  });
}
