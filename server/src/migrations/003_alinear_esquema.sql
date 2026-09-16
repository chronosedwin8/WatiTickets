-- ============================================================================
-- 003 · Alinear el esquema con lo que la aplicación necesita
-- ============================================================================
-- Dos objetivos:
--
--   1. Uniformar el aislamiento por organización. Varias tablas no tenían
--      tenant_id y su pertenencia se deducía a través de la tabla padre.
--      Con RLS eso era frágil; con autorización en la API es directamente
--      un riesgo. Se añade tenant_id y se rellena desde el padre.
--
--   2. Dar soporte al inventario automático: el agente de cada equipo envía
--      sistema operativo, IP, MAC y fecha del último reporte, y no había
--      dónde guardarlos.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Campos que necesita el agente de inventario
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS operating_system text,
  ADD COLUMN IF NOT EXISTS ip_address       text,
  ADD COLUMN IF NOT EXISTS mac_address      text,
  ADD COLUMN IF NOT EXISTS last_seen_at     timestamptz,
  ADD COLUMN IF NOT EXISTS notes            text;

COMMENT ON COLUMN public.assets.last_seen_at IS
  'Última vez que el agente de inventario reportó este equipo.';

CREATE INDEX IF NOT EXISTS assets_last_seen_idx ON public.assets (tenant_id, last_seen_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 2. tenant_id en las tablas que no lo tenían
-- ─────────────────────────────────────────────────────────────────────

-- asset_groups: no tenía organización; los grupos se veían entre tenants.
ALTER TABLE public.asset_groups ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.asset_groups g
   SET tenant_id = COALESCE(
     (SELECT a.tenant_id FROM assets a WHERE a.asset_group_id = g.id LIMIT 1),
     (SELECT id FROM tenants ORDER BY created_at LIMIT 1)
   )
 WHERE g.tenant_id IS NULL;

-- asset_history: se acota por el activo al que pertenece.
ALTER TABLE public.asset_history ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.asset_history h
   SET tenant_id = a.tenant_id
  FROM assets a
 WHERE a.id = h.asset_id AND h.tenant_id IS NULL;

-- ticket_comments: se acota por el ticket.
ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.ticket_comments c
   SET tenant_id = t.tenant_id
  FROM tickets t
 WHERE t.id = c.ticket_id AND c.tenant_id IS NULL;

-- work_order_comments: se acota por la orden de trabajo.
ALTER TABLE public.work_order_comments ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.work_order_comments c
   SET tenant_id = w.tenant_id
  FROM work_orders w
 WHERE w.id = c.work_order_id AND c.tenant_id IS NULL;

-- team_members: se acota por el equipo.
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.team_members m
   SET tenant_id = t.tenant_id
  FROM teams t
 WHERE t.id = m.team_id AND m.tenant_id IS NULL;

-- sprints: se acota por el proyecto.
ALTER TABLE public.sprints ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.sprints s
   SET tenant_id = p.tenant_id
  FROM projects p
 WHERE p.id = s.project_id AND s.tenant_id IS NULL;

-- user_stories: se acota por el proyecto.
ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.user_stories u
   SET tenant_id = p.tenant_id
  FROM projects p
 WHERE p.id = u.project_id AND u.tenant_id IS NULL;

-- absence_approvals: se acota por la ausencia.
ALTER TABLE public.absence_approvals ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.absence_approvals ap
   SET tenant_id = a.tenant_id
  FROM absences a
 WHERE a.id = ap.absence_id AND ap.tenant_id IS NULL;

-- Las filas que quedasen sueltas se asignan a la organización principal,
-- para que ninguna quede fuera del alcance de la aplicación.
DO $$
DECLARE
  principal uuid;
  t text;
  tablas text[] := ARRAY['asset_groups','asset_history','ticket_comments',
                         'work_order_comments','team_members','sprints',
                         'user_stories','absence_approvals'];
BEGIN
  SELECT id INTO principal FROM tenants ORDER BY created_at LIMIT 1;
  IF principal IS NULL THEN RETURN; END IF;

  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NULL', t)
      USING principal;

    -- La clave foránea se añade sólo si aún no existe.
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE',
        t, t || '_tenant_fk'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN others THEN
        RAISE NOTICE 'No se pudo añadir la clave foránea en %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS asset_groups_tenant_idx        ON public.asset_groups (tenant_id);
CREATE INDEX IF NOT EXISTS asset_history_tenant_idx       ON public.asset_history (tenant_id);
CREATE INDEX IF NOT EXISTS ticket_comments_tenant_idx     ON public.ticket_comments (tenant_id);
CREATE INDEX IF NOT EXISTS wo_comments_tenant_idx         ON public.work_order_comments (tenant_id);
CREATE INDEX IF NOT EXISTS team_members_tenant_idx        ON public.team_members (tenant_id);
CREATE INDEX IF NOT EXISTS sprints_tenant_idx             ON public.sprints (tenant_id);
CREATE INDEX IF NOT EXISTS user_stories_tenant_idx        ON public.user_stories (tenant_id);
CREATE INDEX IF NOT EXISTS absence_approvals_tenant_idx   ON public.absence_approvals (tenant_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Corregir el disparador de historial de activos
-- ─────────────────────────────────────────────────────────────────────
-- La versión anterior escribía en columnas que no existen en asset_history
-- (field_name, old_value, new_value). Se reescribe contra el esquema real:
-- change_type, old_values, new_values (jsonb) y changed_by.
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
    INSERT INTO asset_history (asset_id, tenant_id, changed_by, change_type, old_values, new_values)
    VALUES (NEW.id, NEW.tenant_id, actor, 'status_change',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status));
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id THEN
    INSERT INTO asset_history (asset_id, tenant_id, changed_by, change_type, old_values, new_values)
    VALUES (NEW.id, NEW.tenant_id, actor, 'assignment',
            jsonb_build_object('assigned_user_id', OLD.assigned_user_id),
            jsonb_build_object('assigned_user_id', NEW.assigned_user_id));
  END IF;

  RETURN NEW;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Ajustes menores que la interfaz espera
-- ─────────────────────────────────────────────────────────────────────
-- Etiquetas y color en las categorías (la interfaz las muestra).
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS color     text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Motivos de ausencia: color y si requiere aprobación.
ALTER TABLE public.absence_reasons
  ADD COLUMN IF NOT EXISTS color             text,
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT true;

-- Equipos: estado de actividad.
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Decisión de aprobación de ausencias.
ALTER TABLE public.absence_approvals
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;

ANALYZE;
