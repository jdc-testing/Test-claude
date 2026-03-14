/**
 * realtime.js — Suscripciones Supabase Realtime
 *
 * subscribeToFriendships() — detecta cuando alguien acepta una invitación
 * unsubscribeAll()         — limpia todas las suscripciones
 *
 * NOTA: El marcador ya NO se sincroniza en tiempo real punto a punto.
 * La sincronización ocurre solo al terminar el partido (INSERT en matches).
 */

'use strict';

// ── DETECTAR NUEVOS AMIGOS ────────────────────────────

/**
 * Suscribe a cambios en friendships donde soy player1 (el que invitó).
 * Cuando alguien acepta la invitación (status → 'active'), actualiza
 * el array friends[] y notifica al usuario.
 */
function subscribeToFriendships() {
  if (friendshipChannel) {
    sb.removeChannel(friendshipChannel);
    friendshipChannel = null;
  }

  if (!currentUser) return;

  friendshipChannel = sb
    .channel('my-pending-friendships-' + currentUser.id)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'friendships',
        filter: `player1_id=eq.${currentUser.id}`,
      },
      async payload => {
        if (payload.new?.status !== 'active' || !payload.new?.player2_id) return;

        const newFriendship = payload.new;

        // Evitar duplicados si ya está en la lista
        if (friends.find(f => f.id === newFriendship.id)) return;

        // Cargar perfil del nuevo amigo
        let profile = null;
        try {
          const { data } = await sb
            .from('profiles')
            .select('*')
            .eq('id', newFriendship.player2_id)
            .single();
          profile = data || null;
        } catch {}

        friends.push({ ...newFriendship, otherProfile: profile });

        renderMatch();
        renderProfileTab();
        showToast(`¡${profile?.name || 'Tu amigo'} se ha unido! 🎾`);
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
  if (friendshipChannel) {
    sb.removeChannel(friendshipChannel);
    friendshipChannel = null;
  }
}
