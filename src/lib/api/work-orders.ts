/**
 * API de órdenes de trabajo — mantenimiento correctivo en campo.
 */
import { http, listar, obtenerONulo, crear, actualizar, eliminar } from './client'
import type { Database, WorkOrderWithRelations } from '@/types/database'

type WorkOrder = Database['public']['Tables']['work_orders']['Row']
type WorkOrderInsert = Database['public']['Tables']['work_orders']['Insert']
type WorkOrderUpdate = Database['public']['Tables']['work_orders']['Update']

const RELACIONES = 'technician,team,asset,location'

/** Devuelve el rango ISO de hoy (inicio y fin del día local). */
function hoy(): { desde: string; hasta: string } {
    const d = new Date()
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { desde: `${dia}T00:00:00`, hasta: `${dia}T23:59:59` }
}

export const workOrdersApi = {
    async getAll(_tenantId: string): Promise<WorkOrder[]> {
        return listar<WorkOrder>('work_orders', {
            expand: RELACIONES,
            order: 'created_at',
            dir: 'desc',
            limit: 500,
        })
    },

    async getById(id: string): Promise<WorkOrderWithRelations | null> {
        return obtenerONulo<WorkOrderWithRelations>('work_orders', id, RELACIONES)
    },

    async create(order: WorkOrderInsert): Promise<WorkOrder> {
        return crear<WorkOrder>('work_orders', order)
    },

    async update(id: string, updates: WorkOrderUpdate): Promise<WorkOrder> {
        return actualizar<WorkOrder>('work_orders', id, updates)
    },

    async delete(id: string): Promise<void> {
        return eliminar('work_orders', id)
    },

    /** Órdenes programadas para hoy. */
    async getTodaysOrders(_tenantId: string): Promise<WorkOrderWithRelations[]> {
        const { desde, hasta } = hoy()
        return listar<WorkOrderWithRelations>('work_orders', {
            expand: RELACIONES,
            order: 'scheduled_start',
            filtros: { 'scheduled_start[gte]': desde, 'scheduled_start[lte]': hasta },
        })
    },

    async getStats(_tenantId: string) {
        const res = await http.get<{ data: any }>('/estadisticas/ordenes')
        const d = res.data ?? {}
        return {
            pending: d.pendientes ?? 0,
            inProgress: d.en_progreso ?? 0,
            completed: d.completadas ?? 0,
            completedToday: d.completadas_hoy ?? 0,
            overdue: d.vencidas ?? 0,
            total: d.total ?? 0,
            completionRate: Number(d.tasa_completado ?? 0),
        }
    },

    /** Historial de cambios de la orden. */
    async getHistory(orderId: string) {
        try {
            return await listar('work_order_history', {
                expand: 'user',
                order: 'created_at',
                dir: 'desc',
                filtros: { work_order_id: orderId },
            })
        } catch {
            // La vista no debe romperse si aún no hay historial registrado.
            return []
        }
    },

    async getComments(orderId: string) {
        return listar('work_order_comments', {
            expand: 'author',
            order: 'created_at',
            filtros: { work_order_id: orderId },
        })
    },

    async addComment(orderId: string, content: string, userId: string) {
        return crear('work_order_comments', {
            work_order_id: orderId,
            content,
            author_id: userId,
        })
    },
}
