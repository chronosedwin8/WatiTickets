-- ============================================================================
-- 001 · Independizar la base de datos de Supabase
-- ============================================================================
-- Qué hace:
--   1. Retira las políticas RLS: la autorización pasa a la capa de API, que
--      aplica aislamiento por tenant y control por rol en cada petición.
--      (Esto además cierra la fuga cross-tenant de las políticas USING(true)).
--   2. Convierte `profiles` en la tabla de usuarios real, con contraseña.
--      Los hashes bcrypt que venían de GoTrue se reaprovechan tal cual.
--   3. Sustituye las funciones que dependían de auth.uid() por equivalentes
--      que reciben el usuario como parámetro.
--   4. Elimina el esquema auth y los roles de Supabase.
--   5. Añade lo que faltaba (work_order_history) y tablas propias de sesión.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Retirar todas las políticas RLS y desactivar RLS en public
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;

  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. `profiles` pasa a ser la tabla de usuarios (identidad + credencial)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash      text,
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_at    timestamptz,
  ADD COLUMN IF NOT EXISTS failed_attempts    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until       timestamptz;

-- El correo identifica al usuario al iniciar sesión: debe ser único.
UPDATE public.profiles SET email = lower(trim(email)) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
  ON public.profiles (lower(email)) WHERE email IS NOT NULL;

-- Traer los hashes bcrypt de GoTrue (auth.users) si ese esquema aún existe.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    UPDATE public.profiles p
       SET password_hash      = COALESCE(p.password_hash, u.encrypted_password),
           email_confirmed_at = COALESCE(p.email_confirmed_at, u.email_confirmed_at),
           last_sign_in_at    = COALESCE(p.last_sign_in_at, u.last_sign_in_at)
      FROM auth.users u
     WHERE u.id = p.id;

    -- Usuarios que existían en auth pero no tenían perfil: se crean.
    INSERT INTO public.profiles (id, email, full_name, role, is_active, password_hash,
                                 email_confirmed_at, last_sign_in_at, tenant_id, created_at)
    SELECT u.id,
           lower(u.email),
           COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
           COALESCE(u.raw_user_meta_data->>'role', 'customer'),
           true,
           u.encrypted_password,
           u.email_confirmed_at,
           u.last_sign_in_at,
           (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1),
           COALESCE(u.created_at, now())
      FROM auth.users u
     WHERE u.email IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
       AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.email) = lower(u.email));
  END IF;
END $$;

-- El rol 'owner' se usa en el frontend pero faltaba en la restricción original.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['admin','owner','manager','agent','technician','developer','customer']));

-- ─────────────────────────────────────────────────────────────────────
-- 3. Sesiones y recuperación de contraseña (sustituyen a GoTrue)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  user_agent  text,
  ip_address  text,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx    ON public.refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_idx ON public.refresh_tokens (expires_at);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON public.password_reset_tokens (user_id);

-- Claves para integraciones máquina-a-máquina (agente de inventario).
CREATE TABLE IF NOT EXISTS public.api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  key_hash    text NOT NULL UNIQUE,
  scopes      text[] NOT NULL DEFAULT ARRAY['hardware:write'],
  last_used_at timestamptz,
  revoked_at  timestamptz,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_tenant_idx ON public.api_keys (tenant_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Tabla que el frontend consultaba pero no existía
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.work_order_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        text NOT NULL,
  field_name    text,
  old_value     text,
  new_value     text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_order_history_order_idx ON public.work_order_history (work_order_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 5. Reemplazar las funciones que dependían de auth.uid()
-- ─────────────────────────────────────────────────────────────────────
-- Estas se resolvían con el JWT de Supabase. Ahora el usuario llega como
-- parámetro desde la API, que ya lo ha autenticado.
DROP FUNCTION IF EXISTS public.get_my_tenant_id();
DROP FUNCTION IF EXISTS public.confirm_user_email(uuid);
DROP FUNCTION IF EXISTS public.delete_team_member(uuid);

-- Reasignar el trabajo de un miembro y eliminarlo: ahora recibe quién ejecuta.
DROP FUNCTION IF EXISTS public.reassign_and_delete_team_member(uuid, uuid);
CREATE OR REPLACE FUNCTION public.reassign_and_delete_team_member(
  target_user_id  uuid,
  new_assignee_id uuid
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE tickets     SET assignee_id = new_assignee_id WHERE assignee_id = target_user_id;
  UPDATE work_orders SET assignee_id = new_assignee_id WHERE assignee_id = target_user_id;

  IF new_assignee_id IS NULL THEN
    DELETE FROM ticket_assignees WHERE user_id = target_user_id;
  ELSE
    -- Evita duplicar si el destinatario ya estaba asignado al mismo ticket.
    DELETE FROM ticket_assignees ta
     WHERE ta.user_id = target_user_id
       AND EXISTS (SELECT 1 FROM ticket_assignees x
                    WHERE x.ticket_id = ta.ticket_id AND x.user_id = new_assignee_id);
    UPDATE ticket_assignees SET user_id = new_assignee_id WHERE user_id = target_user_id;
  END IF;

  DELETE FROM team_members WHERE user_id = target_user_id;
  DELETE FROM profiles     WHERE id      = target_user_id;
END $$;

-- El disparador de historial de activos usaba auth.uid() para el autor.
-- Ahora la API fija `app.current_user_id` en la sesión antes de escribir.
CREATE OR REPLACE FUNCTION public.log_asset_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  actor uuid;
BEGIN
  BEGIN
    actor := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
  EXCEPTION WHEN others THEN
    actor := NULL;
  END;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO asset_history (asset_id, tenant_id, user_id, action, field_name, old_value, new_value)
    VALUES (NEW.id, NEW.tenant_id, actor, 'status_change', 'status', OLD.status, NEW.status);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO asset_history (asset_id, tenant_id, user_id, action, field_name, old_value, new_value)
    VALUES (NEW.id, NEW.tenant_id, actor, 'assignment', 'assigned_to',
            OLD.assigned_to::text, NEW.assigned_to::text);
  END IF;

  RETURN NEW;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Eliminar el esquema auth y los roles de Supabase
-- ─────────────────────────────────────────────────────────────────────
DROP SCHEMA IF EXISTS auth CASCADE;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles
            WHERE rolname IN ('anon','authenticated','service_role','authenticator','supabase_admin')
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r.rolname);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r.rolname);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r.rolname);
      EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', r.rolname);
      EXECUTE format('DROP ROLE %I', r.rolname);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo eliminar el rol % (%). Continuo.', r.rolname, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Las credenciales de proveedor salen de la base de datos
-- ─────────────────────────────────────────────────────────────────────
-- Estaban en texto plano (hallazgo de seguridad). La configuración de
-- correo y almacenamiento ahora vive en variables de entorno del servidor.
ALTER TABLE public.tenant_settings
  DROP COLUMN IF EXISTS s3_access_key,
  DROP COLUMN IF EXISTS s3_secret_key,
  DROP COLUMN IF EXISTS ses_access_key_id,
  DROP COLUMN IF EXISTS ses_secret_access_key,
  DROP COLUMN IF EXISTS ses_webhook_secret;

DROP FUNCTION IF EXISTS public.get_ses_credentials(uuid);
