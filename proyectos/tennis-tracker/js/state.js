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

// ── AMIGOS (múltiples) ───────────────────────────────
// Cada elemento: { id, player1_id, player2_id, invite_token, status, otherProfile }
let friends = [];

// ── PARTIDO EN CURSO ─────────────────────────────────
// Para el partido activo el creador es siempre p1 → myKey='p1', rivKey='p2'
let myKey          = 'p1';
let rivKey         = 'p2';
let partnerProfile = null;   // perfil del rival en el partido activo

// ── DATOS ────────────────────────────────────────────
let matches = [];            // array de partidos completados (desde Supabase)
let current = null;          // estado del partido en curso (local, sin sync por punto)

// ── CANALES REALTIME ─────────────────────────────────
let friendshipChannel  = null;  // para detectar nuevos amigos que aceptan invitación

// ── UI TRANSIENT ─────────────────────────────────────
let _finishResult  = null;
let _editMatchId   = null;
let _editResult    = null;
let _chartFilter   = 'semana';
let _statsYear     = null;
let _statsMonth    = null;
let _pendingPhoto  = null;   // base64 de foto pendiente de guardar (perfil)
let _setupPhoto    = null;   // base64 durante el setup inicial
