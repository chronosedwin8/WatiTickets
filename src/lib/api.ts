/**
 * Punto de entrada de la capa de datos.
 *
 * Reexporta los módulos por dominio y define los tipos compartidos.
 * Toda la comunicación con el servidor pasa por `src/lib/http.ts`.
 */
import { listar, crear, actualizar, eliminar, obtenerONulo, http } from './api/client'
import type {
    Ticket, WorkOrder, Asset, Profile, TicketWithRelations, WorkOrderWithRelations,
    UserStory, Database, UserRole, Tenant, Problem, Change, ServiceItem, ImpactLevel,
} from '@/types/database'

// ── Tipos auxiliares de la base ────────────────────────────────────────
export type TicketInsert = Database['public']['Tables']['tickets']['Insert']
export type TicketUpdate = Database['public']['Tables']['tickets']['Update']
export type WorkOrderInsert = Database['public']['Tables']['work_orders']['Insert']
export type WorkOrderUpdate = Database['public']['Tables']['work_orders']['Update']
export type AssetInsert = Database['public']['Tables']['assets']['Insert']
export type AssetUpdate = Database['public']['Tables']['assets']['Update']
export type UserStoryInsert = Database['public']['Tables']['user_stories']['Insert']
export type UserStoryUpdate = Database['public']['Tables']['user_stories']['Update']
export type ProblemInsert = Database['public']['Tables']['problems']['Insert']
export type ProblemUpdate = Database['public']['Tables']['problems']['Update']
export type ChangeInsert = Database['public']['Tables']['changes']['Insert']
export type ChangeUpdate = Database['public']['Tables']['changes']['Update']
export type ServiceItemInsert = Database['public']['Tables']['service_catalog_items']['Insert']
export type ServiceItemUpdate = Database['public']['Tables']['service_catalog_items']['Update']

export type { KbArticleWithRelations } from './api/knowledge-base'
export type { Location } from './api/locations'
export type { PrioritySLAConfig } from './api/sla-config'

// ── Planificador de mantenimiento ──────────────────────────────────────
export interface MaintenancePlan {
    id: string
    tenant_id: string
    team_id?: string | null
    title: string
    description?: string | null
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    interval: number
    start_date: string
    end_date?: string | null
    priority: 'low' | 'medium' | 'high' | 'critical'
    created_by: string
    created_at: string
}

export interface MaintenanceActivity {
    id: string
    tenant_id: string
    team_id?: string | null
    plan_id?: string | null
    ticket_id?: string | null
    title: string
    description?: string | null
    scheduled_date: string
    due_date?: string | null
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
    priority: 'low' | 'medium' | 'high' | 'critical'
    completed_at?: string | null
    completed_by?: string | null
    created_by: string
    assignees?: Profile[]
}

// ── Activos con sus relaciones ─────────────────────────────────────────
export interface AssetWithRelations extends Asset {
    location?: { id: string; name: string; address?: string | null } | null
    assigned_user?: Profile | null
    type?: { id: string; name: string; category?: string | null; icon?: string | null } | null
    team?: { id: string; name: string } | null
    asset_group?: { id: string; name: string } | null
    work_orders?: WorkOrder[]
    tickets?: Ticket[]
}

// ── Reexportación de tipos ─────────────────────────────────────────────
export type {
    Ticket, WorkOrder, Asset, Profile, Tenant, TicketWithRelations,
    WorkOrderWithRelations, UserStory, UserRole, Problem, Change, ServiceItem, ImpactLevel,
}
export type { Team } from './api/teams'

/**
 * Valida que haya organización activa.
 * Se mantiene por compatibilidad: el servidor ya deriva la organización
 * del token, así que el identificador sólo se usa en la interfaz.
 */
export const getTenantId = (id?: string | null): string => {
    if (!id) {
        throw new Error('No hay una organización activa. Inicia sesión de nuevo.')
    }
    return id
}

// ── Organización ───────────────────────────────────────────────────────
export const tenantApi = {
    async get(id: string): Promise<Tenant | null> {
        return obtenerONulo<Tenant>('tenants', id)
    },
    async update(id: string, updates: Partial<Tenant>) {
        return actualizar<Tenant>('tenants', id, updates)
    },
}

// ── Configuración de la organización ───────────────────────────────────
export const tenantSettingsApi = {
    async get(): Promise<Record<string, unknown> | null> {
        const filas = await listar<Record<string, unknown>>('tenant_settings', { limit: 1 })
        return filas[0] ?? null
    },
    async update(id: string, updates: Record<string, unknown>) {
        return actualizar('tenant_settings', id, updates)
    },
    async create(datos: Record<string, unknown>) {
        return crear('tenant_settings', datos)
    },
}

// ── Categorías ─────────────────────────────────────────────────────────
export const categoriesApi = {
    async getAll(_tenantId?: string) {
        return listar('categories', { order: 'name' })
    },
    async create(categoria: Record<string, unknown>) {
        return crear('categories', categoria)
    },
    async update(id: string, updates: Record<string, unknown>) {
        return actualizar('categories', id, updates)
    },
    async delete(id: string) {
        return eliminar('categories', id)
    },
}

// ── Permisos de menú por rol ───────────────────────────────────────────
export const menuPermissionsApi = {
    async getAll() {
        return listar<{ id: string; role: string; menu_item: string; is_visible: boolean }>(
            'menu_permissions',
            { limit: 500 }
        )
    },
    async getForRole(role: string) {
        return listar<{ id: string; menu_item: string; is_visible: boolean }>('menu_permissions', {
            filtros: { role },
            limit: 200,
        })
    },
    async upsert(role: string, menuItem: string, isVisible: boolean) {
        const existentes = await listar<{ id: string }>('menu_permissions', {
            filtros: { role, menu_item: menuItem },
            limit: 1,
        })
        if (existentes[0]) {
            return actualizar('menu_permissions', existentes[0].id, { is_visible: isVisible })
        }
        return crear('menu_permissions', { role, menu_item: menuItem, is_visible: isVisible })
    },
}

// ── Problemas, cambios y catálogo ──────────────────────────────────────
export const problemsApi = {
    async getAll(_tenantId?: string) {
        return listar<Problem>('problems', {
            expand: 'assignee,team,category',
            order: 'created_at',
            dir: 'desc',
            limit: 300,
        })
    },
    async getById(id: string) {
        return obtenerONulo<Problem>('problems', id, 'assignee,team,category')
    },
    async create(p: ProblemInsert) {
        return crear<Problem>('problems', p)
    },
    async update(id: string, updates: ProblemUpdate) {
        return actualizar<Problem>('problems', id, updates)
    },
    async delete(id: string) {
        return eliminar('problems', id)
    },
}

export const changesApi = {
    async getAll(_tenantId?: string) {
        return listar<Change>('changes', {
            expand: 'assignee,requester,team',
            order: 'created_at',
            dir: 'desc',
            limit: 300,
        })
    },
    async getById(id: string) {
        return obtenerONulo<Change>('changes', id, 'assignee,requester,team')
    },
    async create(c: ChangeInsert) {
        return crear<Change>('changes', c)
    },
    async update(id: string, updates: ChangeUpdate) {
        return actualizar<Change>('changes', id, updates)
    },
    async delete(id: string) {
        return eliminar('changes', id)
    },
}

export const serviceCatalogApi = {
    async getAll(_tenantId?: string) {
        return listar<ServiceItem>('service_catalog_items', {
            expand: 'category',
            order: 'name',
        })
    },
    async getById(id: string) {
        return obtenerONulo<ServiceItem>('service_catalog_items', id, 'category')
    },
    async create(item: ServiceItemInsert) {
        return crear<ServiceItem>('service_catalog_items', item)
    },
    async update(id: string, updates: ServiceItemUpdate) {
        return actualizar<ServiceItem>('service_catalog_items', id, updates)
    },
    async delete(id: string) {
        return eliminar('service_catalog_items', id)
    },
}

// ── Ausencias ──────────────────────────────────────────────────────────
export const absencesApi = {
    async getAll(_tenantId?: string) {
        return listar('absences', {
            expand: 'requester,reason',
            order: 'start_date',
            dir: 'desc',
            limit: 300,
        })
    },
    async create(a: Record<string, unknown>) {
        return crear('absences', a)
    },
    async update(id: string, updates: Record<string, unknown>) {
        return actualizar('absences', id, updates)
    },
    async delete(id: string) {
        return eliminar('absences', id)
    },
    async getReasons() {
        return listar('absence_reasons', { order: 'name' })
    },
    async getApprovals(absenceId: string) {
        return listar('absence_approvals', {
            expand: 'approver',
            filtros: { absence_id: absenceId },
        })
    },
    async decidir(absenceId: string, approverId: string, status: string, comments?: string) {
        return crear('absence_approvals', {
            absence_id: absenceId,
            approver_id: approverId,
            status,
            comments: comments ?? null,
            decided_at: new Date().toISOString(),
        })
    },
}

// ── Reexportación de los módulos por dominio ───────────────────────────
export { ticketsApi, searchByTags } from './api/tickets'
export { workOrdersApi } from './api/work-orders'
export { assetsApi, assetGroupsApi, assetTypesApi } from './api/assets'
export { userStoriesApi } from './api/user-stories'
export { kbApi } from './api/knowledge-base'
export { locationsApi } from './api/locations'
export { projectsApi, sprintsApi } from './api/projects'
export { teamsApi, profilesApi } from './api/teams'
export { maintenanceApi } from './api/maintenance'
export { slaConfigApi, slaPoliciesApi } from './api/sla-config'
export { analyticsApi } from './api/analytics'
export { listar, crear, actualizar, eliminar, obtenerONulo, http }
