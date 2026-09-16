/**
 * API de tickets — el núcleo de la mesa de ayuda.
 */
import { http, listar, listarConTotal, obtenerONulo, crear, actualizar, eliminar, filtroEquipos, type OpcionesListado } from './client'
import type { Database, TicketWithRelations } from '@/types/database'

type Ticket = Database['public']['Tables']['tickets']['Row']
type TicketInsert = Database['public']['Tables']['tickets']['Insert']
type TicketUpdate = Database['public']['Tables']['tickets']['Update']

/** Relaciones que necesitan las vistas de listado y detalle. */
const RELACIONES_LISTA = 'requester,assignee,team,asset,assignees'
const RELACIONES_DETALLE = 'requester,assignee,team,asset,assignees,category'

export const ticketsApi = {
    /**
     * Lista los tickets de la organización.
     * `teamIds` filtra por departamentos; omitirlo devuelve todos.
     */
    async getAll(_tenantId: string, teamIds?: string[]): Promise<TicketWithRelations[]> {
        return listar<TicketWithRelations>('tickets', {
            expand: RELACIONES_LISTA,
            order: 'created_at',
            dir: 'desc',
            limit: 500,
            filtros: filtroEquipos(teamIds),
        })
    },

    /** Lista paginada, para vistas con muchos registros. */
    async getPagina(
        opciones: OpcionesListado & { teamIds?: string[] } = {}
    ): Promise<{ datos: TicketWithRelations[]; total: number }> {
        const { teamIds, filtros, ...resto } = opciones
        return listarConTotal<TicketWithRelations>('tickets', {
            expand: RELACIONES_LISTA,
            order: 'created_at',
            dir: 'desc',
            ...resto,
            filtros: { ...filtroEquipos(teamIds), ...(filtros ?? {}) },
        })
    },

    async getById(id: string): Promise<TicketWithRelations | null> {
        return obtenerONulo<TicketWithRelations>('tickets', id, RELACIONES_DETALLE)
    },

    async create(ticket: TicketInsert & { assignees?: string[] }): Promise<Ticket> {
        const { assignees, ...datos } = ticket as any

        // El primer asignado queda como responsable principal.
        if (assignees?.length > 0 && !datos.assignee_id) {
            datos.assignee_id = assignees[0]
        }

        const creado = await crear<Ticket>('tickets', datos)

        if (assignees?.length > 0) {
            await ticketsApi.updateAssignees(creado.id, assignees).catch(() => {
                // El ticket ya existe; un fallo al asignar no debe perderlo.
            })
        }

        return creado
    },

    async update(id: string, updates: TicketUpdate): Promise<Ticket> {
        return actualizar<Ticket>('tickets', id, updates)
    },

    async delete(id: string): Promise<void> {
        return eliminar('tickets', id)
    },

    async getRecent(_tenantId: string, limit = 5, teamIds?: string[]): Promise<Ticket[]> {
        return listar<Ticket>('tickets', {
            order: 'created_at',
            dir: 'desc',
            limit,
            filtros: filtroEquipos(teamIds),
        })
    },

    /** Indicadores del panel principal. */
    async getStats(_tenantId: string, teamIds?: string[]) {
        const res = await http.get<{ data: any }>(
            `/estadisticas/dashboard${teamIds !== undefined ? `?teams=${teamIds.join(',')}` : ''}`
        )
        const d = res.data ?? {}
        return {
            openTickets: d.tickets_abiertos ?? 0,
            resolvedToday: d.resueltos_hoy ?? 0,
            avgResponseTime: Number(d.horas_resolucion_promedio ?? 0),
            slaBreach: d.sla_incumplido ?? 0,
            unassigned: d.sin_atender ?? 0,
            total: d.total ?? 0,
        }
    },

    // ── Comentarios ────────────────────────────────────────────────
    async getComments(ticketId: string) {
        const res = await http.get<{ data: any[] }>(`/tickets/${ticketId}/comentarios`)
        return res.data ?? []
    },

    async addComment(ticketId: string, content: string, _userId?: string, opciones?: {
        esPublico?: boolean
        enviarEmail?: boolean
        adjuntos?: unknown[]
    }) {
        const res = await http.post<{ data: any }>(`/tickets/${ticketId}/comentarios`, {
            content,
            is_public: opciones?.esPublico ?? true,
            enviar_email: opciones?.enviarEmail ?? false,
            attachments: opciones?.adjuntos ?? [],
        })
        return res.data
    },

    // ── Asignaciones múltiples ─────────────────────────────────────
    async updateAssignees(ticketId: string, assigneeIds: string[], _tenantId?: string) {
        await http.put(`/tickets/${ticketId}/asignados`, { asignados: assigneeIds })
    },

    // ── Fusión ─────────────────────────────────────────────────────
    async merge(masterId: string, childIds: string[], _userId?: string) {
        await http.post(`/tickets/${masterId}/fusionar`, { hijos: childIds })
        return true
    },

    async getMergedTickets(masterId: string) {
        const res = await http.get<{ data: any[] }>(`/tickets/${masterId}/fusionados`)
        return res.data ?? []
    },

    /** Recalcula la fecha límite de SLA según la política de la prioridad. */
    async recalcularSLA(ticketId: string) {
        const res = await http.post<{ data: any }>(`/tickets/${ticketId}/recalcular-sla`)
        return res.data
    },

    // ── Reparto de carga ───────────────────────────────────────────
    async getTicketsPerUser(_tenantId: string) {
        const res = await http.get<{ data: { name: string; value: number }[] }>(
            '/estadisticas/carga-por-persona'
        )
        return res.data ?? []
    },
}

/** Busca tickets que contengan todas las etiquetas indicadas. */
export const searchByTags = async (
    _tenantId: string,
    tags: string[],
    teamIds?: string[]
): Promise<TicketWithRelations[]> => {
    return listar<TicketWithRelations>('tickets', {
        expand: RELACIONES_LISTA,
        order: 'created_at',
        dir: 'desc',
        filtros: { 'tags[contains]': tags, ...filtroEquipos(teamIds) },
    })
}
