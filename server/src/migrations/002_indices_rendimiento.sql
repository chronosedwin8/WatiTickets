-- ============================================================================
-- 002 · Índices de rendimiento
-- ============================================================================
-- La aplicación filtra casi siempre por tenant_id, y después por estado,
-- responsable o fecha. Sin estos índices cada listado hacía un recorrido
-- secuencial completo de la tabla.
--
-- Se crean sólo si la tabla y la columna existen, para que la migración
-- sea segura aunque el esquema evolucione.
-- ============================================================================

DO $$
DECLARE
  -- tabla, nombre del índice, definición de columnas
  idx RECORD;
  definiciones CONSTANT text[][] := ARRAY[
    -- Tickets: el corazón del sistema
    ['tickets', 'tickets_tenant_created_idx',      '(tenant_id, created_at DESC)'],
    ['tickets', 'tickets_tenant_status_idx',       '(tenant_id, status)'],
    ['tickets', 'tickets_tenant_team_idx',         '(tenant_id, team_id)'],
    ['tickets', 'tickets_assignee_idx',            '(assignee_id)'],
    ['tickets', 'tickets_requester_idx',           '(requester_id)'],
    ['tickets', 'tickets_sla_due_idx',             '(tenant_id, sla_due_at)'],
    ['tickets', 'tickets_merged_to_idx',           '(merged_to_ticket_id)'],
    ['tickets', 'tickets_asset_idx',               '(asset_id)'],
    ['tickets', 'tickets_tags_gin_idx',            'USING gin (tags)'],
    ['tickets', 'tickets_number_idx',              '(tenant_id, number)'],

    -- Comentarios y asignaciones
    ['ticket_comments',  'ticket_comments_ticket_idx',  '(ticket_id, created_at)'],
    ['ticket_assignees', 'ticket_assignees_ticket_idx', '(ticket_id)'],
    ['ticket_assignees', 'ticket_assignees_user_idx',   '(user_id)'],

    -- Inventario tecnológico
    ['assets',        'assets_tenant_idx',        '(tenant_id)'],
    ['assets',        'assets_tenant_status_idx',  '(tenant_id, status)'],
    ['assets',        'assets_serial_idx',         '(tenant_id, serial_number)'],
    ['assets',        'assets_assigned_idx',       '(assigned_to)'],
    ['assets',        'assets_group_idx',          '(asset_group_id)'],
    ['asset_history', 'asset_history_asset_idx',   '(asset_id, created_at DESC)'],

    -- Órdenes de trabajo
    ['work_orders',          'work_orders_tenant_idx',        '(tenant_id, created_at DESC)'],
    ['work_orders',          'work_orders_tenant_status_idx', '(tenant_id, status)'],
    ['work_orders',          'work_orders_assignee_idx',      '(assignee_id)'],
    ['work_order_comments',  'wo_comments_order_idx',         '(work_order_id, created_at)'],

    -- Personas y equipos
    ['profiles',     'profiles_tenant_idx',      '(tenant_id)'],
    ['team_members', 'team_members_team_idx',    '(team_id)'],
    ['team_members', 'team_members_user_idx',    '(user_id)'],
    ['teams',        'teams_tenant_idx',         '(tenant_id)'],

    -- Resto de módulos ITSM
    ['problems',              'problems_tenant_idx',      '(tenant_id, created_at DESC)'],
    ['changes',               'changes_tenant_idx',       '(tenant_id, created_at DESC)'],
    ['service_catalog_items', 'catalog_tenant_idx',       '(tenant_id)'],
    ['kb_articles',           'kb_tenant_idx',            '(tenant_id)'],
    ['categories',            'categories_tenant_idx',    '(tenant_id)'],
    ['locations',             'locations_tenant_idx',     '(tenant_id)'],
    ['user_stories',          'user_stories_tenant_idx',  '(tenant_id)'],
    ['projects',              'projects_tenant_idx',      '(tenant_id)'],
    ['time_entries',          'time_entries_tenant_idx',  '(tenant_id)'],
    ['audit_logs',            'audit_logs_tenant_idx',    '(tenant_id, created_at DESC)'],

    -- Planificador de mantenimiento
    ['maintenance_activities', 'maint_act_tenant_date_idx', '(tenant_id, scheduled_date)'],
    ['maintenance_activities', 'maint_act_plan_idx',        '(plan_id)'],
    ['maintenance_plans',      'maint_plans_tenant_idx',    '(tenant_id)'],
    ['activity_assignees',     'activity_assignees_idx',    '(activity_id)'],

    -- Ausencias
    ['absences',          'absences_tenant_idx',    '(tenant_id, start_date)'],
    ['absences',          'absences_requester_idx', '(requester_id)'],
    ['absence_approvals', 'absence_approvals_idx',  '(absence_id)'],

    -- Configuración
    ['menu_permissions', 'menu_permissions_idx', '(tenant_id, role)'],
    ['tenant_settings',  'tenant_settings_idx',  '(tenant_id)']
  ];
  t text; n text; d text;
  i int;
BEGIN
  FOR i IN 1 .. array_length(definiciones, 1) LOOP
    t := definiciones[i][1];
    n := definiciones[i][2];
    d := definiciones[i][3];

    -- La tabla debe existir
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;

    BEGIN
      IF d LIKE 'USING%' THEN
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I %s', n, t, d);
      ELSE
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I %s', n, t, d);
      END IF;
    EXCEPTION WHEN undefined_column THEN
      RAISE NOTICE 'Se omite el índice % (alguna columna no existe en %)', n, t;
    WHEN others THEN
      RAISE NOTICE 'Se omite el índice % en %: %', n, t, SQLERRM;
    END;
  END LOOP;
END $$;

-- Índice de texto para la búsqueda global de tickets.
CREATE INDEX IF NOT EXISTS tickets_busqueda_idx
  ON public.tickets
  USING gin (to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Deja las estadísticas del planificador al día tras crear los índices.
ANALYZE;
