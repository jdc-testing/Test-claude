/**
 * config.js — Configuración de Supabase
 *
 * ANTES DE USAR: sustituye estos valores con los de tu proyecto Supabase.
 * Los encuentras en: Supabase Dashboard → Settings → API
 */

const SUPABASE_URL  = 'https://bojenpvztesdjecpntjc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvamVucHZ6dGVzZGplY3BudGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTEzOTIsImV4cCI6MjA4OTA4NzM5Mn0.SBFkL3fDsEzjzxrAtiTsy5WvKPDfWtUn9nu9VMAIdBk';

// Cliente Supabase global
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,          // guarda la sesión en localStorage
    autoRefreshToken: true,
  }
});
