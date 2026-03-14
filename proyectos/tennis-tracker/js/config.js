/**
 * config.js — Configuración de Supabase
 *
 * ANTES DE USAR: sustituye estos valores con los de tu proyecto Supabase.
 * Los encuentras en: Supabase Dashboard → Settings → API
 */

const SUPABASE_URL  = 'https://TU_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'TU_ANON_PUBLIC_KEY';

// Cliente Supabase global
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,          // guarda la sesión en localStorage
    autoRefreshToken: true,
  }
});
