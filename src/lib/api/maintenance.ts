/**
 * API del planificador de mantenimiento preventivo.
 */
import { listar, crear, actualizar, eliminar, http } from './client'
import { ticketsApi } from './tickets'
import type { Profile } from '@/types/database'
import type { MaintenancePlan, MaintenanceActivity } from '../api'

export const maintenanceApi = {
    // ── Planes ─────────────────────────────────────────────────────
    async createPlan(plan: Omit<MaintenancePlan, 'id' | 'created_at'>) {
        return crear<MaintenancePlan>('maintenance_plans', plan)
    },

    async getPlans(_tenantId: string, teamId?: string) {
        return listar<MaintenancePlan & { team?: { name: string } | null }>('maintenance_plans', {
            expand: 'team',
            order: 'start_date',
            dir: 'desc',
            filtros: teamId ? { team_id: teamId } : {},
        })
    },

    async updatePlan(planId: string, updates: Partial<MaintenancePlan>) {
        return actualizar<MaintenancePlan>('maintenance_plans', planId, updates)
    },

    async deletePlan(planId: string) {
        return eliminar('maintenance_plans', planId)
    },

    // ── Actividades ────────────────────────────────────────────────
    async createActivity(
        activity: Omit<MaintenanceActivity, 'id' | 'created_at' | 'updated_at' | 'assignees'> & {
            assignees?: string[]
        }
    ) {
        const { assignees, ...datos } = activity as any
        const creada = await crear<MaintenanceActivity>('maintenance_activities', datos)

        if (assignees?.length > 0) {
            await http.put(`/maintenance_activities/${creada.id}/asignados`, {
                asignados: assignees,
            })
        }

        return creada
    },

    /** Crea varias actividades de una vez (al generar un plan recurrente). */
    async createActivities(
        actividades: (Omit<MaintenanceActivity, 'id' | 'created_at' | 'updated_at' | 'assignees'> & {
            assignees?: string[]
        })[]
    ) {
        const creadas: MaintenanceActivity[] = []
        for (const a of actividades) {
            creadas.push(await maintenanceApi.createActivity(a))
        }
        return creadas
    },

    async getActivities(
        _tenantId: string,
        startDate?: string,
        endDate?: string,
        teamId?: string
    ): Promise<MaintenanceActivity[]> {
        const filtros: Record<string, string> = {}
        if (teamId) filtros.team_id = teamId
        if (startDate) filtros['scheduled_date[gte]'] = startDate
        if (endDate) filtros['scheduled_date[lte]'] = endDate

        const filas = await listar<MaintenanceActivity & { assignees?: { user: Profile | null }[] }>(
            'maintenance_activities',
            { expand: 'assignees,team', order: 'scheduled_date', limit: 500, filtros }
        )

        // La interfaz espera `assignees` como lista plana de personas.
        return filas.map((a) => ({
            ...a,
            assignees: (a.assignees ?? [])
                .map((x: any) => x.user)
                .filter((u: any): u is Profile => Boolean(u)),
        })) as MaintenanceActivity[]
    },

    async updateActivityStatus(activityId: string, status: string, completedBy?: string) {
        const datos: Record<string, unknown> = { status }

        if (status === 'completed') {
            datos.completed_at = new Date().toISOString()
            if (completedBy) datos.completed_by = completedBy
        } else {
            datos.completed_at = null
            datos.completed_by = null
        }

        return actualizar('maintenance_activities', activityId, datos)
    },

    async updateActivity(activityId: string, updates: Partial<MaintenanceActivity>) {
        return actualizar('maintenance_activities', activityId, updates)
    },

    async deleteActivity(activityId: string) {
        return eliminar('maintenance_activities', activityId)
    },

    /** Reemplaza la lista de personas asignadas a una actividad. */
    async setActivityAssignees(activityId: string, userIds: string[]) {
        await http.put(`/maintenance_activities/${activityId}/asignados`, { asignados: userIds })
    },

    /** Personas asignadas a una actividad. */
    async getActivityAssignees(activityId: string): Promise<Profile[]> {
        const res = await http.get<{ data: Profile[] }>(
            `/maintenance_activities/${activityId}/asignados`
        )
        return res.data ?? []
    },

    async linkActivityToTicket(activityId: string, ticketId: string) {
        return actualizar('maintenance_activities', activityId, { ticket_id: ticketId })
    },

    /** Convierte una actividad programada en un ticket de trabajo. */
    async createTicketFromActivity(
        activity: MaintenanceActivity,
        tenantId: string,
        teamId: string,
        requesterId: string
    ) {
        const ticket = await ticketsApi.create({
            tenant_id: tenantId,
            title: `[Planificador] ${activity.title}`,
            description:
                `Actividad generada automáticamente desde el planificador.\n` +
                `Fecha programada: ${activity.scheduled_date}\n` +
                `Prioridad: ${activity.priority}`,
            status: 'open',
            priority: activity.priority,
            type: 'service_request',
            team_id: teamId,
            assignees: activity.assignees?.map((a) => a.id) ?? [],
            assignee_id: activity.assignees?.[0]?.id ?? null,
            requester_id: requesterId,
            source: 'api',
        } as any)

        await maintenanceApi.linkActivityToTicket(activity.id, ticket.id)
        return ticket
    },
}
