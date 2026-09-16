/**
 * Registro de recursos.
 *
 * Define de forma declarativa qué tablas expone la API, qué columnas se
 * pueden leer y escribir, qué relaciones se pueden anidar y qué roles
 * pueden hacer cada operación.
 *
 * Es la lista blanca que sustituye a PostgREST: nada que no esté aquí es
 * alcanzable desde el exterior. Los nombres de columna corresponden al
 * esquema real de la base de datos.
 */
import type { UserRole } from '../auth/tokens.js'

export interface Relation {
    /** Nombre con el que se devuelve la relación en el JSON. */
    as: string
    /** Tabla relacionada. */
    table: string
    /** Tipo de relación. */
    kind: 'one' | 'many'
    /** Columna local (para 'one') o columna remota (para 'many'). */
    on: string
    /** Columnas de la tabla relacionada que se devuelven. */
    columns: string[]
    /** Sólo para 'many': relación anidada de segundo nivel. */
    nested?: Relation
    /** Sólo para 'many': orden. */
    orderBy?: string
}

export interface Resource {
    /** Nombre en la URL: /api/v1/<name> */
    name: string
    table: string
    /** Columnas que se pueden devolver. '*' expande a todas las de la tabla. */
    readable: string[] | '*'
    /** Columnas que el cliente puede enviar al crear. */
    writable: string[]
    /** Columnas que el cliente puede modificar (por defecto, las de writable). */
    updatable?: string[]
    /** Columnas por las que se puede filtrar y ordenar. */
    filterable: string[]
    /** ¿La tabla tiene tenant_id? Si sí, se fuerza el aislamiento. */
    tenantScoped: boolean
    /** Orden por defecto en los listados. */
    defaultOrder?: { column: string; ascending: boolean }
    /** Relaciones que se pueden pedir con ?expand=. */
    relations?: Relation[]
    /** Roles autorizados por operación. Si se omite, se permite al staff. */
    permissions?: {
        list?: UserRole[]
        read?: UserRole[]
        create?: UserRole[]
        update?: UserRole[]
        delete?: UserRole[]
    }
}

const STAFF: UserRole[] = ['owner', 'admin', 'manager', 'agent', 'technician', 'developer']
const TODOS: UserRole[] = [...STAFF, 'customer']
const ADMIN: UserRole[] = ['owner', 'admin']
const GESTION: UserRole[] = ['owner', 'admin', 'manager']

// ── Relaciones reutilizadas ────────────────────────────────────────────
const perfil = (as: string, on: string, columns = ['id', 'full_name', 'avatar_url', 'email']): Relation =>
    ({ as, table: 'profiles', kind: 'one', on, columns })

const equipoPorDepartamento: Relation = {
    as: 'team', table: 'teams', kind: 'one', on: 'department_id', columns: ['id', 'name'],
}
/** La interfaz llama 'department' a la misma relación. */
const departamento: Relation = {
    as: 'department', table: 'teams', kind: 'one', on: 'department_id', columns: ['id', 'name'],
}
const categoria: Relation = {
    as: 'category', table: 'categories', kind: 'one', on: 'category_id', columns: ['id', 'name', 'color'],
}

export const resources: Resource[] = [
    // ══════════════════════ NÚCLEO: TICKETS ══════════════════════
    {
        name: 'tickets',
        table: 'tickets',
        readable: '*',
        writable: [
            'title', 'description', 'status', 'priority', 'type', 'category_id',
            'requester_id', 'assignee_id', 'team_id', 'source', 'sla_policy_id',
            'sla_due_at', 'tags', 'custom_fields', 'linked_asset_id', 'asset_id',
            'linked_user_story_id', 'impact_level', 'planned_start_at',
            'planned_end_at', 'planned_effort_minutes', 'attachments',
            'satisfaction_rating', 'merged_to_ticket_id',
            'first_response_at', 'resolved_at', 'closed_at',
        ],
        filterable: [
            'id', 'status', 'priority', 'type', 'team_id', 'assignee_id', 'requester_id',
            'category_id', 'asset_id', 'created_at', 'updated_at', 'sla_due_at',
            'resolved_at', 'closed_at', 'number', 'tags', 'merged_to_ticket_id',
            'impact_level', 'source', 'created_via_email',
        ],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [
            perfil('requester', 'requester_id'),
            perfil('assignee', 'assignee_id'),
            { as: 'team', table: 'teams', kind: 'one', on: 'team_id', columns: ['id', 'name'] },
            categoria,
            { as: 'asset', table: 'assets', kind: 'one', on: 'asset_id', columns: ['id', 'name', 'asset_tag'] },
            {
                as: 'assignees', table: 'ticket_assignees', kind: 'many', on: 'ticket_id',
                columns: ['user_id'],
                nested: perfil('user', 'user_id', ['id', 'full_name', 'avatar_url', 'email', 'role']),
            },
        ],
        permissions: { list: TODOS, read: TODOS, create: TODOS, update: STAFF, delete: GESTION },
    },
    {
        name: 'ticket_comments',
        table: 'ticket_comments',
        readable: '*',
        writable: ['ticket_id', 'content', 'author_id', 'is_public', 'is_resolution', 'attachments'],
        filterable: ['id', 'ticket_id', 'author_id', 'created_at', 'is_public'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: true },
        relations: [perfil('author', 'author_id')],
        permissions: { list: TODOS, read: TODOS, create: TODOS, update: STAFF, delete: GESTION },
    },
    {
        name: 'ticket_assignees',
        table: 'ticket_assignees',
        readable: '*',
        writable: ['ticket_id', 'user_id'],
        filterable: ['ticket_id', 'user_id'],
        tenantScoped: true,
        relations: [perfil('user', 'user_id')],
    },

    // ══════════════════════ ITSM ══════════════════════
    {
        name: 'problems',
        table: 'problems',
        readable: '*',
        writable: [
            'title', 'description', 'status', 'priority', 'root_cause', 'workaround',
            'category_id', 'assignee_id', 'source_ticket_id', 'department_id',
            'project_id', 'attachments',
        ],
        filterable: ['id', 'status', 'priority', 'assignee_id', 'department_id', 'category_id', 'created_at', 'number'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [perfil('assignee', 'assignee_id'), equipoPorDepartamento, departamento, categoria],
    },
    {
        name: 'changes',
        table: 'changes',
        readable: '*',
        writable: [
            'title', 'description', 'status', 'priority', 'type', 'reason',
            'impact_analysis', 'risk_analysis', 'rollback_plan', 'requester_id',
            'assignee_id', 'department_id', 'project_id', 'attachments',
            'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
        ],
        filterable: ['id', 'status', 'type', 'priority', 'assignee_id', 'department_id', 'created_at', 'scheduled_start', 'number'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [perfil('requester', 'requester_id'), perfil('assignee', 'assignee_id'), equipoPorDepartamento, departamento],
    },
    {
        name: 'service_catalog_items',
        table: 'service_catalog_items',
        readable: '*',
        writable: [
            'name', 'description', 'type', 'category_id', 'sla_policy_id', 'price',
            'currency', 'approval_required', 'icon_url', 'is_active', 'form_schema',
        ],
        filterable: ['id', 'type', 'category_id', 'is_active'],
        tenantScoped: true,
        defaultOrder: { column: 'name', ascending: true },
        relations: [categoria],
        permissions: { list: TODOS, read: TODOS, create: GESTION, update: GESTION, delete: GESTION },
    },
    {
        name: 'kb_articles',
        table: 'kb_articles',
        readable: '*',
        writable: [
            'title', 'content', 'category_id', 'department_id', 'author_id',
            'status', 'content_type', 'media_url', 'view_count', 'helpful_count',
        ],
        filterable: ['id', 'status', 'category_id', 'department_id', 'author_id', 'created_at'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [
            perfil('author', 'author_id'),
            { as: 'department_team', table: 'teams', kind: 'one', on: 'department_id', columns: ['id', 'name'] },
            categoria,
        ],
        permissions: { list: TODOS, read: TODOS, create: STAFF, update: STAFF, delete: GESTION },
    },

    // ══════════════════════ INVENTARIO / CMDB ══════════════════════
    {
        name: 'assets',
        table: 'assets',
        readable: '*',
        writable: [
            'name', 'asset_tag', 'serial_number', 'asset_type_id', 'status', 'description',
            'manufacturer', 'model', 'purchase_date', 'purchase_cost', 'warranty_expiry',
            'location_id', 'assigned_user_id', 'department_id', 'department', 'asset_group_id',
            'custom_fields', 'custom_fields_schema', 'hardware_info', 'notes',
            'building', 'floor', 'office', 'acquisition_date',
            'has_insurance', 'insurance_expiry', 'insurer_name', 'vendor_name',
            'operating_system', 'ip_address', 'mac_address', 'last_seen_at',
        ],
        filterable: [
            'id', 'status', 'asset_type_id', 'location_id', 'assigned_user_id',
            'department_id', 'asset_group_id', 'serial_number', 'asset_tag',
            'created_at', 'warranty_expiry', 'last_seen_at', 'building',
        ],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [
            perfil('assigned_user', 'assigned_user_id'),
            { as: 'location', table: 'locations', kind: 'one', on: 'location_id', columns: ['id', 'name', 'address'] },
            { as: 'type', table: 'asset_types', kind: 'one', on: 'asset_type_id', columns: ['id', 'name', 'category', 'ficha_tecnica', 'icon'] },
            { as: 'asset_group', table: 'asset_groups', kind: 'one', on: 'asset_group_id', columns: ['id', 'name'] },
            equipoPorDepartamento,
            departamento,
        ],
        permissions: { list: TODOS, read: TODOS, create: STAFF, update: STAFF, delete: GESTION },
    },
    {
        name: 'asset_groups',
        table: 'asset_groups',
        readable: '*',
        writable: ['name', 'description'],
        filterable: ['id', 'name'],
        tenantScoped: true,
        defaultOrder: { column: 'name', ascending: true },
    },
    {
        name: 'asset_types',
        table: 'asset_types',
        readable: '*',
        writable: ['name', 'category', 'ficha_tecnica', 'icon', 'custom_fields'],
        filterable: ['id', 'name', 'category', 'ficha_tecnica'],
        tenantScoped: true,
        defaultOrder: { column: 'name', ascending: true },
    },
    {
        name: 'asset_history',
        table: 'asset_history',
        readable: '*',
        writable: ['asset_id', 'changed_by', 'change_type', 'old_values', 'new_values'],
        filterable: ['id', 'asset_id', 'changed_by', 'created_at'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [perfil('changed_by_user', 'changed_by', ['id', 'full_name', 'email', 'avatar_url'])],
    },

    // ══════════════════════ OPERACIONES ══════════════════════
    {
        name: 'work_orders',
        table: 'work_orders',
        readable: '*',
        writable: [
            'title', 'description', 'status', 'priority', 'type', 'location_id',
            'asset_id', 'source_ticket_id', 'department_id', 'technician_id',
            'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
            'customer_signature', 'photos', 'completion_notes',
        ],
        filterable: [
            'id', 'status', 'priority', 'type', 'technician_id', 'department_id',
            'asset_id', 'location_id', 'created_at', 'scheduled_start', 'actual_end', 'number',
        ],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [
            perfil('technician', 'technician_id'),
            equipoPorDepartamento,
            departamento,
            { as: 'asset', table: 'assets', kind: 'one', on: 'asset_id', columns: ['id', 'name', 'asset_tag'] },
            { as: 'location', table: 'locations', kind: 'one', on: 'location_id', columns: ['id', 'name'] },
        ],
    },
    {
        name: 'work_order_comments',
        table: 'work_order_comments',
        readable: '*',
        writable: ['work_order_id', 'content', 'author_id'],
        filterable: ['id', 'work_order_id', 'author_id', 'created_at'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: true },
        relations: [perfil('author', 'author_id')],
    },
    {
        name: 'work_order_history',
        table: 'work_order_history',
        readable: '*',
        writable: ['work_order_id', 'user_id', 'action', 'field_name', 'old_value', 'new_value', 'notes'],
        filterable: ['id', 'work_order_id', 'user_id', 'created_at'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [perfil('user', 'user_id', ['id', 'full_name', 'email', 'avatar_url'])],
    },

    // ══════════════════════ MANTENIMIENTO ══════════════════════
    {
        name: 'maintenance_plans',
        table: 'maintenance_plans',
        readable: '*',
        writable: [
            'title', 'description', 'frequency', 'interval', 'start_date',
            'end_date', 'priority', 'team_id', 'created_by',
        ],
        filterable: ['id', 'team_id', 'frequency', 'start_date'],
        tenantScoped: true,
        defaultOrder: { column: 'start_date', ascending: false },
        relations: [{ as: 'team', table: 'teams', kind: 'one', on: 'team_id', columns: ['id', 'name'] }],
    },
    {
        name: 'maintenance_activities',
        table: 'maintenance_activities',
        readable: '*',
        writable: [
            'plan_id', 'ticket_id', 'team_id', 'title', 'description', 'scheduled_date',
            'due_date', 'status', 'priority', 'completed_at', 'completed_by', 'created_by',
        ],
        filterable: ['id', 'plan_id', 'team_id', 'status', 'scheduled_date', 'ticket_id', 'due_date'],
        tenantScoped: true,
        defaultOrder: { column: 'scheduled_date', ascending: true },
        relations: [
            { as: 'team', table: 'teams', kind: 'one', on: 'team_id', columns: ['id', 'name'] },
            {
                as: 'assignees', table: 'activity_assignees', kind: 'many', on: 'activity_id',
                columns: ['user_id'],
                nested: perfil('user', 'user_id', ['id', 'full_name', 'avatar_url']),
            },
        ],
    },
    {
        name: 'activity_assignees',
        table: 'activity_assignees',
        readable: '*',
        writable: ['activity_id', 'user_id'],
        filterable: ['activity_id', 'user_id'],
        tenantScoped: true,
        relations: [perfil('user', 'user_id')],
    },

    // ══════════════════════ DESARROLLO ══════════════════════
    {
        name: 'projects',
        table: 'projects',
        readable: '*',
        writable: ['name', 'key', 'description', 'repository_url', 'status'],
        filterable: ['id', 'status', 'key'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
    },
    {
        name: 'sprints',
        table: 'sprints',
        readable: '*',
        writable: ['project_id', 'name', 'goal', 'status', 'start_date', 'end_date', 'velocity'],
        filterable: ['id', 'project_id', 'status'],
        tenantScoped: true,
        defaultOrder: { column: 'start_date', ascending: false },
    },
    {
        name: 'user_stories',
        table: 'user_stories',
        readable: '*',
        writable: [
            'project_id', 'sprint_id', 'title', 'description', 'acceptance_criteria',
            'status', 'type', 'priority', 'story_points', 'assignee_id', 'parent_id',
            'source_ticket_id',
        ],
        filterable: ['id', 'project_id', 'sprint_id', 'status', 'assignee_id', 'type', 'number'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [perfil('assignee', 'assignee_id')],
    },
    {
        name: 'time_entries',
        table: 'time_entries',
        readable: '*',
        writable: [
            'user_id', 'ticket_id', 'work_order_id', 'user_story_id',
            'duration_minutes', 'description', 'billable', 'hourly_rate', 'date',
        ],
        filterable: ['id', 'user_id', 'ticket_id', 'work_order_id', 'date'],
        tenantScoped: true,
        defaultOrder: { column: 'date', ascending: false },
        relations: [perfil('user', 'user_id')],
    },

    // ══════════════════════ AUSENCIAS ══════════════════════
    {
        name: 'absences',
        table: 'absences',
        readable: '*',
        writable: [
            'requester_id', 'reason_id', 'start_date', 'end_date', 'start_time',
            'end_time', 'status', 'description', 'evidence_url', 'medical_certificate_url',
        ],
        filterable: ['id', 'requester_id', 'status', 'reason_id', 'start_date', 'end_date'],
        tenantScoped: true,
        defaultOrder: { column: 'start_date', ascending: false },
        relations: [
            // El panel de ausencias agrupa por departamento de quien solicita.
            perfil('requester', 'requester_id', ['id', 'full_name', 'avatar_url', 'email', 'department']),
            {
                as: 'reason', table: 'absence_reasons', kind: 'one', on: 'reason_id',
                columns: ['id', 'name', 'color', 'requires_approval'],
            },
        ],
        permissions: { list: TODOS, read: TODOS, create: TODOS, update: TODOS, delete: GESTION },
    },
    {
        name: 'absence_reasons',
        table: 'absence_reasons',
        readable: '*',
        writable: ['name', 'description', 'color', 'requires_approval', 'is_active'],
        filterable: ['id', 'is_active'],
        tenantScoped: true,
        defaultOrder: { column: 'name', ascending: true },
        permissions: { list: TODOS, read: TODOS, create: ADMIN, update: ADMIN, delete: ADMIN },
    },
    {
        name: 'absence_approvals',
        table: 'absence_approvals',
        readable: '*',
        writable: ['absence_id', 'approver_id', 'status', 'comments', 'decided_at'],
        filterable: ['id', 'absence_id', 'approver_id', 'status'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [perfil('approver', 'approver_id')],
        permissions: { list: TODOS, read: TODOS, create: GESTION, update: GESTION, delete: ADMIN },
    },

    // ══════════════════════ ORGANIZACIÓN ══════════════════════
    {
        name: 'teams',
        table: 'teams',
        readable: '*',
        writable: ['name', 'description', 'leader_id', 'email_address', 'is_active'],
        filterable: ['id', 'name', 'leader_id', 'is_active'],
        tenantScoped: true,
        defaultOrder: { column: 'name', ascending: true },
        relations: [
            perfil('leader', 'leader_id', ['id', 'full_name', 'avatar_url']),
            {
                as: 'members', table: 'team_members', kind: 'many', on: 'team_id',
                columns: ['profile_id'],
                nested: perfil('user', 'profile_id', ['id', 'full_name', 'avatar_url', 'email', 'role']),
            },
        ],
        permissions: { list: TODOS, read: TODOS, create: GESTION, update: GESTION, delete: ADMIN },
    },
    {
        name: 'team_members',
        table: 'team_members',
        readable: '*',
        writable: ['team_id', 'profile_id'],
        filterable: ['id', 'team_id', 'profile_id'],
        tenantScoped: true,
        relations: [perfil('user', 'profile_id', ['id', 'full_name', 'avatar_url', 'email', 'role'])],
        permissions: { list: TODOS, read: TODOS, create: GESTION, update: GESTION, delete: GESTION },
    },
    {
        name: 'categories',
        table: 'categories',
        readable: '*',
        writable: ['name', 'description', 'type', 'parent_id', 'sla_policy_id', 'color', 'is_active'],
        filterable: ['id', 'parent_id', 'type', 'is_active'],
        tenantScoped: true,
        defaultOrder: { column: 'name', ascending: true },
        permissions: { list: TODOS, read: TODOS, create: GESTION, update: GESTION, delete: GESTION },
    },
    {
        name: 'locations',
        table: 'locations',
        readable: '*',
        writable: [
            'name', 'address', 'city', 'country', 'latitude', 'longitude',
            'contact_name', 'contact_phone', 'contact_email', 'buildings',
        ],
        filterable: ['id', 'name', 'city'],
        tenantScoped: true,
        defaultOrder: { column: 'name', ascending: true },
        permissions: { list: TODOS, read: TODOS, create: GESTION, update: GESTION, delete: GESTION },
    },
    {
        name: 'menu_permissions',
        table: 'menu_permissions',
        readable: '*',
        writable: ['role', 'menu_item', 'is_visible'],
        filterable: ['id', 'role', 'menu_item'],
        tenantScoped: true,
        permissions: { list: TODOS, read: TODOS, create: ADMIN, update: ADMIN, delete: ADMIN },
    },
    {
        name: 'priority_sla_config',
        table: 'priority_sla_config',
        readable: '*',
        writable: [
            'priority', 'response_time_hours', 'resolution_time_hours',
            'business_hours_only', 'escalation_enabled',
        ],
        filterable: ['id', 'priority'],
        tenantScoped: true,
        defaultOrder: { column: 'priority', ascending: true },
        permissions: { list: TODOS, read: TODOS, create: ADMIN, update: ADMIN, delete: ADMIN },
    },
    {
        name: 'sla_policies',
        table: 'sla_policies',
        readable: '*',
        writable: [
            'name', 'description', 'priority', 'response_time_hours',
            'resolution_time_hours', 'business_hours_only',
        ],
        filterable: ['id', 'priority'],
        tenantScoped: true,
        defaultOrder: { column: 'name', ascending: true },
        permissions: { list: TODOS, read: TODOS, create: ADMIN, update: ADMIN, delete: ADMIN },
    },
    {
        name: 'tenant_settings',
        table: 'tenant_settings',
        readable: '*',
        writable: [
            's3_enabled', 's3_bucket', 's3_region', 's3_endpoint',
            'ses_enabled', 'ses_region', 'ses_incoming_bucket', 'ses_incoming_bucket_prefix',
            'ses_verified_domain', 'ses_default_from_email', 'ses_default_from_name',
            'ses_configuration_set', 'email_signature', 'email_default_type', 'email_default_priority',
        ],
        filterable: ['id'],
        tenantScoped: true,
        permissions: { list: ADMIN, read: ADMIN, create: ADMIN, update: ADMIN, delete: ADMIN },
    },
    {
        name: 'audit_logs',
        table: 'audit_logs',
        readable: '*',
        writable: ['user_id', 'action', 'resource_type', 'resource_id', 'old_values', 'new_values', 'ip_address', 'user_agent'],
        filterable: ['id', 'user_id', 'action', 'resource_type', 'resource_id', 'created_at'],
        tenantScoped: true,
        defaultOrder: { column: 'created_at', ascending: false },
        relations: [perfil('user', 'user_id', ['id', 'full_name', 'email'])],
        permissions: { list: ADMIN, read: ADMIN, create: STAFF, update: [], delete: [] },
    },
]

/** Índice por nombre para búsquedas rápidas. */
export const resourceByName = new Map(resources.map((r) => [r.name, r]))

export function getResource(name: string): Resource | undefined {
    return resourceByName.get(name)
}

/** Roles permitidos para una operación, con el staff como valor por defecto. */
export function allowedRoles(
    resource: Resource,
    op: 'list' | 'read' | 'create' | 'update' | 'delete'
): UserRole[] {
    const explicit = resource.permissions?.[op]
    if (explicit) return explicit
    return op === 'delete' ? GESTION : STAFF
}
