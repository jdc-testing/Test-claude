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
 *     - con perfil → checkFriendship()
 *  4. checkFriendship():
 *     - friendship activa → iniciar app (setScreen('app'))
 *     - URL con ?invite=TOKEN → unirse como player2 → iniciar app
 *     - friendship pending propia → setScreen('app') + mostrar waiting panel
 *     - sin nada → crear friendship como player1 → waiting panel
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

/** Inicia el flujo de Sign-In con Google (popup). */
async function signInWithGoogle() {
  try {
    const redirectTo = window.location.href; // conserva ?invite=TOKEN si existe
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) showToast('Error al conectar con Google');
  } catch (e) {
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
    await checkFriendship();
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
    await checkFriendship();
  } catch (e) {
    console.error('checkProfile error:', e);
    setScreen('profile-setup');
  }
}

// ── FRIENDSHIP / INVITE ───────────────────────────────

/**
 * Determina el estado de pairing del usuario y prepara la app:
 *  - friendship activa → ready
 *  - URL con ?invite → unirse como player2
 *  - friendship pending propia → waiting
 *  - nada → crear nueva friendship como player1 → waiting
 */
async function checkFriendship() {
  try {
    // 1. ¿Tengo ya una friendship activa?
    const { data: active } = await sb
      .from('friendships')
      .select('*')
      .or(`player1_id.eq.${currentUser.id},player2_id.eq.${currentUser.id}`)
      .eq('status', 'active')
      .limit(1);

    if (active && active.length > 0) {
      friendship = active[0];
      _setPerspective();
      await loadPartnerProfile();
      await initMainApp();
      return;
    }

    // 2. ¿Hay token de invitación en la URL?
    const token = new URLSearchParams(window.location.search).get('invite');
    if (token) {
      const joined = await _joinViaToken(token);
      if (joined) return;
    }

    // 3. ¿Tengo una friendship pending como player1?
    const { data: pending } = await sb
      .from('friendships')
      .select('*')
      .eq('player1_id', currentUser.id)
      .eq('status', 'pending')
      .limit(1);

    if (pending && pending.length > 0) {
      friendship = pending[0];
      myKey  = 'p1';
      rivKey = 'p2';
      await initMainApp(true); // waiting=true
      return;
    }

    // 4. Crear nueva friendship como player1
    const { data: newF, error } = await sb
      .from('friendships')
      .insert({ player1_id: currentUser.id })
      .select()
      .single();

    if (error) throw error;
    friendship = newF;
    myKey  = 'p1';
    rivKey = 'p2';
    await initMainApp(true); // waiting=true

  } catch (e) {
    console.error('checkFriendship error:', e);
    showToast('Error al verificar pairing');
    setScreen('auth');
  }
}

/**
 * Intenta unirse a una friendship via token de invitación.
 * @param {string} token
 * @returns {boolean} true si se unió con éxito
 */
async function _joinViaToken(token) {
  try {
    // Busca la friendship por token (necesita RLS abierta para SELECT por token)
    const { data: inv } = await sb
      .from('friendships')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single();

    if (!inv) {
      showToast('Enlace de invitación inválido o ya usado');
      return false;
    }

    // Si soy el player1, solo muestro waiting
    if (inv.player1_id === currentUser.id) {
      friendship = inv;
      myKey  = 'p1';
      rivKey = 'p2';
      window.history.replaceState({}, '', window.location.pathname);
      await initMainApp(true);
      return true;
    }

    // Unirse como player2
    const { data: updated, error } = await sb
      .from('friendships')
      .update({ player2_id: currentUser.id, status: 'active' })
      .eq('id', inv.id)
      .select()
      .single();

    if (error) throw error;

    friendship = updated;
    _setPerspective();
    window.history.replaceState({}, '', window.location.pathname);
    await loadPartnerProfile();
    await initMainApp();
    return true;

  } catch (e) {
    console.error('_joinViaToken error:', e);
    return false;
  }
}

/** Fija myKey y rivKey según la posición del usuario en la friendship. */
function _setPerspective() {
  myKey  = (friendship.player1_id === currentUser.id) ? 'p1' : 'p2';
  rivKey = myKey === 'p1' ? 'p2' : 'p1';
}

// ── INIT APP ──────────────────────────────────────────

/**
 * Carga datos y muestra la app principal.
 * @param {boolean} waiting - si true, muestra el panel de "esperando compañero"
 */
async function initMainApp(waiting = false) {
  // Cargar partidos completados
  await loadMatches();

  // Cargar estado de partido en curso
  await loadLiveState();

  // Suscripciones realtime
  if (!waiting) {
    subscribeToLiveMatch();
  } else {
    subscribeToFriendship(); // para detectar cuando se une el compañero
  }

  // Mostrar app
  setScreen('app');
  document.getElementById('main-app').style.display = 'flex';

  // Render inicial
  renderMatch(waiting);
  updateHeaderAvatar();
}

// ── INVITE LINK ───────────────────────────────────────

/** Genera y copia el enlace de invitación al portapapeles. */
async function copyInviteLink() {
  if (!friendship) return;

  const url = `${window.location.origin}${window.location.pathname}?invite=${friendship.invite_token}`;
  document.getElementById('invite-link-text').textContent = url;

  try {
    await navigator.clipboard.writeText(url);
    showToast('Enlace copiado ✓');
  } catch {
    showToast('Copia el enlace manualmente');
  }
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
      friendship     = null;
      myKey          = null;
      rivKey         = null;
      matches        = [];
      current        = null;
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
