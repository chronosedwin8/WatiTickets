/**
 * API de configuración de SLA por prioridad.
 *
 * Los tiempos se almacenan en HORAS, tal como están definidos en la base.
 */
import { listar, actualizar, crear, http } from './client'

export interface PrioritySLAConfig {
    id: string
    tenant_id: string
    priority: string
    response_time_hours: number
    resolution_time_hours: number
    business_hours_only?: boolean
    escalation_enabled?: boolean
    created_at?: string
    updated_at?: string
}

export const slaConfigApi = {
    async getConfig(_tenantId: string): Promise<PrioritySLAConfig[]> {
        return listar<PrioritySLAConfig>('priority_sla_config', { order: 'priority' })
    },

    async updatePriorityConfig(id: string, updates: Partial<PrioritySLAConfig>) {
        return actualizar<PrioritySLAConfig>('priority_sla_config', id, updates)
    },

    async createPriorityConfig(config: Partial<PrioritySLAConfig>) {
        return crear<PrioritySLAConfig>('priority_sla_config', config)
    },

    /**
     * Recalcula la fecha límite del ticket según la política de su prioridad.
     * El cálculo y la persistencia ocurren en el servidor.
     */
    async calculateDueDate(ticketId: string) {
        const res = await http.post<{ data: { id: string; sla_due_at: string } }>(
            `/tickets/${ticketId}/recalcular-sla`
        )
        return res.data
    },
}

/** Catálogo de políticas de SLA con nombre. */
export const slaPoliciesApi = {
    async getAll() {
        return listar('sla_policies', { order: 'name' })
    },
    async create(politica: Record<string, unknown>) {
        return crear('sla_policies', politica)
    },
    async update(id: string, updates: Record<string, unknown>) {
        return actualizar('sla_policies', id, updates)
    },
}
