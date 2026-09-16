-- ============================================================================
-- 004 · Corregir la función de reasignación de personas
-- ============================================================================
-- La versión anterior borraba de `team_members` filtrando por `user_id`,
-- pero esa tabla usa `profile_id`. La eliminación de una persona fallaba
-- con "columna user_id no existe".
--
-- Además se añade la limpieza de las asignaciones del planificador y de las
-- sesiones abiertas, que antes quedaban huérfanas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reassign_and_delete_team_member(
  target_user_id  uuid,
  new_assignee_id uuid
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Trabajo del que era responsable
  UPDATE tickets     SET assignee_id   = new_assignee_id WHERE assignee_id   = target_user_id;
  UPDATE work_orders SET technician_id = new_assignee_id WHERE technician_id = target_user_id;
  UPDATE problems    SET assignee_id   = new_assignee_id WHERE assignee_id   = target_user_id;
  UPDATE changes     SET assignee_id   = new_assignee_id WHERE assignee_id   = target_user_id;

  -- Asignaciones múltiples de tickets
  IF new_assignee_id IS NULL THEN
    DELETE FROM ticket_assignees WHERE user_id = target_user_id;
  ELSE
    -- Evita duplicar si el destinatario ya estaba en el mismo ticket
    DELETE FROM ticket_assignees ta
     WHERE ta.user_id = target_user_id
       AND EXISTS (SELECT 1 FROM ticket_assignees x
                    WHERE x.ticket_id = ta.ticket_id
                      AND x.user_id = new_assignee_id);
    UPDATE ticket_assignees SET user_id = new_assignee_id WHERE user_id = target_user_id;
  END IF;

  -- Actividades del planificador
  IF new_assignee_id IS NULL THEN
    DELETE FROM activity_assignees WHERE user_id = target_user_id;
  ELSE
    DELETE FROM activity_assignees aa
     WHERE aa.user_id = target_user_id
       AND EXISTS (SELECT 1 FROM activity_assignees x
                    WHERE x.activity_id = aa.activity_id
                      AND x.user_id = new_assignee_id);
    UPDATE activity_assignees SET user_id = new_assignee_id WHERE user_id = target_user_id;
  END IF;

  -- Pertenencia a equipos: la columna correcta es profile_id
  DELETE FROM team_members WHERE profile_id = target_user_id;

  -- Deja de ser líder de equipo
  UPDATE teams SET leader_id = NULL WHERE leader_id = target_user_id;

  -- Cierra sus sesiones y tokens pendientes
  DELETE FROM refresh_tokens        WHERE user_id = target_user_id;
  DELETE FROM password_reset_tokens WHERE user_id = target_user_id;

  DELETE FROM profiles WHERE id = target_user_id;
END $$;

COMMENT ON FUNCTION public.reassign_and_delete_team_member IS
  'Reasigna el trabajo de una persona y la elimina. Si new_assignee_id es NULL, el trabajo queda sin responsable.';
