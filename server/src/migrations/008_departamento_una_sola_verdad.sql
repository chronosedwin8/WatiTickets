-- ============================================================================
-- 008 · Una sola fuente de verdad para el departamento
-- ============================================================================
-- Convivían dos formas de saber a qué departamento pertenece una persona:
--
--   · `profiles.department`, un texto libre con el NOMBRE del departamento.
--   · `team_members`, la pertenencia real a equipos.
--
-- Unas pantallas usaban una y otras la otra, comparando incluso por nombre
-- con coincidencia parcial. El resultado: el mismo usuario veía un alcance
-- distinto según la pantalla, y quien tenía el texto vacío (o escrito de
-- otra forma) se quedaba sin ver nada.
--
-- A partir de aquí manda `team_members`. La columna `profiles.department`
-- se conserva sólo como etiqueta para mostrar, y un disparador la mantiene
-- sincronizada para que nunca vuelva a contradecir a la relación.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Poner al día el texto a partir de la pertenencia real
-- ─────────────────────────────────────────────────────────────────────
UPDATE public.profiles p
   SET department = sub.nombre
  FROM (
    SELECT m.profile_id, min(t.name) AS nombre
      FROM team_members m
      JOIN teams t ON t.id = m.team_id
     GROUP BY m.profile_id
  ) sub
 WHERE sub.profile_id = p.id
   AND p.department IS DISTINCT FROM sub.nombre;

-- Quien no pertenece a ningún equipo no debe conservar una etiqueta que
-- sugiera lo contrario.
UPDATE public.profiles p
   SET department = NULL
 WHERE p.department IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM team_members m WHERE m.profile_id = p.id);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Mantenerlo sincronizado de aquí en adelante
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sincronizar_departamento_perfil()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  persona uuid;
BEGIN
  persona := COALESCE(NEW.profile_id, OLD.profile_id);

  UPDATE profiles p
     SET department = (
           SELECT min(t.name)
             FROM team_members m
             JOIN teams t ON t.id = m.team_id
            WHERE m.profile_id = persona
         )
   WHERE p.id = persona;

  RETURN COALESCE(NEW, OLD);
END $$;

COMMENT ON FUNCTION public.sincronizar_departamento_perfil IS
  'Mantiene profiles.department alineado con la pertenencia real a equipos.';

DROP TRIGGER IF EXISTS trg_sincronizar_departamento ON public.team_members;
CREATE TRIGGER trg_sincronizar_departamento
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_departamento_perfil();

-- Si se renombra un equipo, la etiqueta de sus integrantes debe seguirlo.
CREATE OR REPLACE FUNCTION public.sincronizar_departamento_por_equipo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE profiles p
       SET department = NEW.name
     WHERE EXISTS (
       SELECT 1 FROM team_members m
        WHERE m.profile_id = p.id AND m.team_id = NEW.id
     );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sincronizar_departamento_equipo ON public.teams;
CREATE TRIGGER trg_sincronizar_departamento_equipo
  AFTER UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_departamento_por_equipo();

COMMENT ON COLUMN public.profiles.department IS
  'Nombre del departamento, sólo para mostrar. La pertenencia real está en team_members.';
