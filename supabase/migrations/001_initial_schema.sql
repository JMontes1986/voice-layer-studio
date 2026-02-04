-- =====================================================
-- Voice Layer Studio - Initial Database Schema
-- =====================================================

-- Crear tabla de tracks de audio
CREATE TABLE IF NOT EXISTS public.audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_path TEXT NOT NULL UNIQUE,
  duration_ms INTEGER,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('audio/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4')),
  size_bytes BIGINT NOT NULL CHECK (size_bytes <= 15728640), -- 15MB max
  checksum TEXT,
  is_mixdown BOOLEAN DEFAULT false,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_created_at ON public.audio_tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_session_id ON public.audio_tracks(session_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_is_mixdown ON public.audio_tracks(is_mixdown) WHERE is_mixdown = true;
CREATE INDEX IF NOT EXISTS idx_audio_tracks_user_id ON public.audio_tracks(user_id) WHERE user_id IS NOT NULL;

-- Comentarios para documentación
COMMENT ON TABLE public.audio_tracks IS 'Almacena metadata de pistas de audio y mixdowns';
COMMENT ON COLUMN public.audio_tracks.file_path IS 'Ruta del archivo en Supabase Storage (bucket: audios)';
COMMENT ON COLUMN public.audio_tracks.is_mixdown IS 'TRUE si es la mezcla final, FALSE si es un track individual';
COMMENT ON COLUMN public.audio_tracks.session_id IS 'Agrupa tracks que pertenecen al mismo proyecto/sesión';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura pública (para MVP sin autenticación)
CREATE POLICY "Allow public read access"
  ON public.audio_tracks
  FOR SELECT
  USING (true);

-- Política 2: Inserción pública (validar en cliente)
CREATE POLICY "Allow public insert"
  ON public.audio_tracks
  FOR INSERT
  WITH CHECK (true);

-- Política 3: Actualización pública (solo metadata, no archivos)
CREATE POLICY "Allow public update metadata"
  ON public.audio_tracks
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política 4: Eliminación solo de tracks (no mixdown)
CREATE POLICY "Allow delete non-mixdown tracks"
  ON public.audio_tracks
  FOR DELETE
  USING (is_mixdown = false);

-- =====================================================
-- POLÍTICAS CON AUTENTICACIÓN (Descomentar si se usa Auth)
-- =====================================================

-- CREATE POLICY "Users can read own tracks"
--   ON public.audio_tracks
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert own tracks"
--   ON public.audio_tracks
--   FOR INSERT
--   WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update own tracks"
--   ON public.audio_tracks
--   FOR UPDATE
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can delete own non-mixdown tracks"
--   ON public.audio_tracks
--   FOR DELETE
--   USING (auth.uid() = user_id AND is_mixdown = false);

-- =====================================================
-- STORAGE BUCKET CONFIGURATION
-- =====================================================

-- Crear bucket 'audios' (ejecutar esto SOLO si el bucket no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audios',
  'audios',
  true,
  15728640, -- 15MB
  ARRAY['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: Lectura pública
CREATE POLICY "Allow public downloads from audios bucket"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'audios');

-- Políticas de Storage: Upload público con límites
CREATE POLICY "Allow public uploads to audios bucket"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'audios' AND
    (CASE 
      WHEN lower(substring(name from '\.([^.]+)$')) IN ('webm', 'wav', 'mp3', 'ogg', 'm4a', 'mp4') 
      THEN true 
      ELSE false 
    END)
  );

-- Políticas de Storage: Delete público
CREATE POLICY "Allow public delete from audios bucket"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'audios');

-- Políticas de Storage: Update (para sobrescribir mixdown)
CREATE POLICY "Allow public update in audios bucket"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'audios')
  WITH CHECK (bucket_id = 'audios');

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para limpiar archivos huérfanos (sin registro en DB)
CREATE OR REPLACE FUNCTION cleanup_orphan_audio_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'audios'
  AND name NOT IN (SELECT file_path FROM public.audio_tracks);
END;
$$;

COMMENT ON FUNCTION cleanup_orphan_audio_files IS 'Elimina archivos de Storage que no tienen registro en audio_tracks';

-- Función para obtener estadísticas de sesión
CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS TABLE(
  total_tracks BIGINT,
  total_duration_ms BIGINT,
  total_size_bytes BIGINT,
  has_mixdown BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE is_mixdown = false) as total_tracks,
    COALESCE(SUM(duration_ms) FILTER (WHERE is_mixdown = false), 0) as total_duration_ms,
    COALESCE(SUM(size_bytes) FILTER (WHERE is_mixdown = false), 0) as total_size_bytes,
    EXISTS(SELECT 1 FROM public.audio_tracks WHERE session_id = p_session_id AND is_mixdown = true) as has_mixdown
  FROM public.audio_tracks
  WHERE session_id = p_session_id;
END;
$$;

COMMENT ON FUNCTION get_session_stats IS 'Obtiene estadísticas de una sesión (total tracks, duración, tamaño)';

-- =====================================================
-- TRIGGERS (Opcional - para validación adicional)
-- =====================================================

-- Trigger para prevenir cambios en file_path después de insert
CREATE OR REPLACE FUNCTION prevent_file_path_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.file_path IS DISTINCT FROM NEW.file_path THEN
    RAISE EXCEPTION 'No se puede modificar file_path una vez creado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_file_path_update
  BEFORE UPDATE ON public.audio_tracks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_file_path_update();

-- =====================================================
-- DATOS INICIALES (Opcional - para testing)
-- =====================================================

-- Descomentar si quieres datos de prueba
-- INSERT INTO public.audio_tracks (file_path, mime_type, size_bytes, duration_ms, is_mixdown, session_id)
-- VALUES 
--   ('test_track_1.webm', 'audio/webm', 524288, 5000, false, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
--   ('test_track_2.webm', 'audio/webm', 612352, 7200, false, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
--   ('mixdown.wav', 'audio/wav', 1048576, 7200, true, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
