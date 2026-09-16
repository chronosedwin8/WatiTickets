-- ============================================================================
-- 007 · Identificador propio para los usuarios
-- ============================================================================
-- Cuando la autenticación vivía en Supabase, el identificador de `profiles`
-- lo generaba `auth.users` y se copiaba al crear el perfil. Al pasar a una
-- autenticación propia, `profiles` se convirtió en la tabla de usuarios pero
-- su columna `id` se quedó sin valor por defecto.
--
-- Consecuencia: dar de alta a una persona fallaba con
-- «Falta un campo obligatorio: id». Es decir, no se podía crear ningún
-- usuario desde la aplicación.
-- ============================================================================

ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMENT ON COLUMN public.profiles.id IS
  'Identificador del usuario. Se genera solo al crear la fila.';
