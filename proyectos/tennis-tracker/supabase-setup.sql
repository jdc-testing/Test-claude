-- ═══════════════════════════════════════════════════════════════
-- Tennis Tracker — Supabase Schema Setup
-- Ejecuta este script en Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── PROFILES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL,
  photo_url   text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer perfiles (necesario para cargar fotos/nombres de amigos)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── FRIENDSHIPS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  invite_token  uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'active'
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- SELECT:
--   · Participantes de la friendship siempre pueden leerla
--   · Cualquier usuario autenticado puede leer friendships PENDIENTES sin player2
--     (necesario para unirse via enlace de invitación)
CREATE POLICY "friendships_select" ON friendships
  FOR SELECT USING (
    auth.uid() = player1_id OR
    auth.uid() = player2_id OR
    (status = 'pending' AND player2_id IS NULL)
  );

-- INSERT: solo como player1
CREATE POLICY "friendships_insert" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

-- UPDATE:
--   USING   → qué filas se pueden modificar (se evalúa sobre la fila ANTIGUA)
--   WITH CHECK → cómo debe quedar la fila NUEVA tras la modificación
--
--   Caso 1: player1 actualiza su propia friendship (siempre permitido)
--   Caso 2: player2 se une a una friendship pendiente
--     · USING: la fila era pending sin player2 y yo no soy player1
--     · WITH CHECK: tras el update, yo soy player2 (ya no se puede revisar 'pending')
CREATE POLICY "friendships_update" ON friendships
  FOR UPDATE
  USING (
    auth.uid() = player1_id OR
    (status = 'pending' AND player2_id IS NULL AND auth.uid() != player1_id)
  )
  WITH CHECK (
    auth.uid() = player1_id OR
    auth.uid() = player2_id
  );

-- ── MATCHES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id  uuid REFERENCES friendships(id) ON DELETE CASCADE,
  player1_id     uuid NOT NULL REFERENCES profiles(id),
  player2_id     uuid NOT NULL REFERENCES profiles(id),
  format         jsonb,
  status         text NOT NULL DEFAULT 'completed',
  result_p1      text,   -- 'win' | 'loss' | 'abandoned'
  sets           jsonb,  -- [{ p1, p2, tiebreak: {p1, p2, target} | null }]
  sets_won       jsonb,  -- { p1, p2 }
  start_date     date DEFAULT CURRENT_DATE,
  completed_at   timestamptz
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "matches_insert" ON matches
  FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "matches_update" ON matches
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "matches_delete" ON matches
  FOR DELETE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- ── LIVE STATE (tabla legacy, ya no se usa activamente) ───────────
CREATE TABLE IF NOT EXISTS live_state (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id  uuid NOT NULL UNIQUE REFERENCES friendships(id) ON DELETE CASCADE,
  match_id       uuid REFERENCES matches(id) ON DELETE SET NULL,
  state          jsonb,
  updated_at     timestamptz DEFAULT now(),
  updated_by     uuid REFERENCES profiles(id)
);

ALTER TABLE live_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_state_all" ON live_state
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.id = friendship_id
        AND (f.player1_id = auth.uid() OR f.player2_id = auth.uid())
    )
  );

-- ── REALTIME ─────────────────────────────────────────────────────
-- Habilitar Realtime en friendships (para detectar cuando alguien acepta una invitación)
ALTER publication supabase_realtime ADD TABLE friendships;
