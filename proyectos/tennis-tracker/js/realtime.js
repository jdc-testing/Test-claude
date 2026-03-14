/**
 * realtime.js — Suscripciones Supabase Realtime
 *
 * subscribeToLiveMatch()   — escucha cambios en live_state para sync del partido
 * subscribeToFriendship()  — escucha cuando player2 se une (estado 'waiting')
 * unsubscribeAll()         — limpia todas las suscripciones
 */

'use strict';

// ── PARTIDO EN CURSO ──────────────────────────────────

/**
 * Suscribe a cambios en live_state para esta friendship.
 * Cuando llega un update, actualiza `current` y re-renderiza el marcador.
 * Usa JSON.stringify para evitar re-renders innecesarios si el estado no cambió.
 */
function subscribeToLiveMatch() {
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  if (!friendship) return;

  realtimeChannel = sb
    .channel('live-match-' + friendship.id)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'live_state',
        filter: `friendship_id=eq.${friendship.id}`,
      },
      payload => {
        const incoming = payload.new?.state || null;

        // Evitar re-render si el estado es idéntico (p.ej. echo de nuestro propio write)
        if (JSON.stringify(incoming) === JSON.stringify(current)) return;

        current = incoming;
        renderMatch();
      }
    )
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Realtime channel error — reintentando en 5s');
        setTimeout(subscribeToLiveMatch, 5000);
      }
    });
}

// ── ESPERAR COMPAÑERO ─────────────────────────────────

/**
 * Suscribe a cambios en la friendship para detectar cuando player2 se une.
 * Cuando status pasa a 'active', recarga el estado y muestra la app completa.
 */
function subscribeToFriendship() {
  if (friendshipChannel) {
    sb.removeChannel(friendshipChannel);
    friendshipChannel = null;
  }

  if (!friendship) return;

  friendshipChannel = sb
    .channel('friendship-' + friendship.id)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'friendships',
        filter: `id=eq.${friendship.id}`,
      },
      async payload => {
        if (payload.new?.status === 'active' && payload.new?.player2_id) {
          // Player2 se ha unido
          friendship = payload.new;

          // Cargar perfil del compañero
          await loadPartnerProfile();

          // Cambiar a suscripción de partido
          sb.removeChannel(friendshipChannel);
          friendshipChannel = null;
          subscribeToLiveMatch();

          // Recargar partidos y estado
          await loadMatches();
          await loadLiveState();

          // Mostrar app completa (quitar waiting panel)
          renderMatch(false);
          renderProfileTab();
          showToast('¡Tu compañero se ha unido! 🎾');
        }
      }
    )
    .subscribe();
}

// ── CLEANUP ───────────────────────────────────────────

/**
 * Cancela todas las suscripciones activas.
 * Llamado al cerrar sesión.
 */
function unsubscribeAll() {
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  if (friendshipChannel) {
    sb.removeChannel(friendshipChannel);
    friendshipChannel = null;
  }
}
