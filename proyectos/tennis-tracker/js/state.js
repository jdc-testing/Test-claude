/**
 * state.js — Estado global de la aplicación
 *
 * Variables compartidas por todos los módulos.
 * Se inicializan aquí y se modifican desde auth.js, data.js, match.js, etc.
 */

'use strict';

// ── USUARIO AUTENTICADO ──────────────────────────────
let currentUser    = null;   // objeto auth.User de Supabase
let myProfile      = null;   // { id, name, photo_url } desde tabla profiles
let partnerProfile = null;   // perfil del compañero

// ── PAIRING ─────────────────────────────────────────
let friendship = null;       // { id, player1_id, player2_id, invite_token, status }
let myKey      = null;       // 'p1' si soy player1, 'p2' si soy player2
let rivKey     = null;       // opuesto a myKey

// ── DATOS ────────────────────────────────────────────
let matches = [];            // array de partidos completados (desde Supabase)
let current = null;          // estado del partido en curso (desde live_state.state)

// ── CANALES REALTIME ─────────────────────────────────
let realtimeChannel    = null;
let friendshipChannel  = null;

// ── UI TRANSIENT ─────────────────────────────────────
let _finishResult  = null;
let _editMatchId   = null;
let _editResult    = null;
let _chartFilter   = 'semana';
let _statsYear     = null;
let _statsMonth    = null;
let _pendingPhoto  = null;   // base64 de foto pendiente de guardar (perfil)
let _setupPhoto    = null;   // base64 durante el setup inicial
