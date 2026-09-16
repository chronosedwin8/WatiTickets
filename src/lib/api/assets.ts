/**
 * API de activos — inventario tecnológico y de infraestructura.
 */
import { http, listar, obtenerONulo, crear, actualizar, eliminar, type OpcionesListado } from './client'
import type { Database } from '@/types/database'
import type { AssetWithRelations } from '../api'

type AssetInsert = Database['public']['Tables']['assets']['Insert']
type AssetUpdate = Database['public']['Tables']['assets']['Update']

const RELACIONES = 'assigned_user,location,type,asset_group,team'

export const assetsApi = {
    async getAll(_tenantId: string, departmentId?: string): Promise<AssetWithRelations[]> {
        return listar<AssetWithRelations>('assets', {
            expand: RELACIONES,
            order: 'created_at',
            dir: 'desc',
            limit: 500,
            filtros: departmentId ? { department_id: departmentId } : {},
        })
    },

    async getById(id: string): Promise<AssetWithRelations | null> {
        return obtenerONulo<AssetWithRelations>('assets', id, RELACIONES)
    },

    async create(asset: AssetInsert) {
        return crear('assets', asset)
    },

    async update(id: string, updates: AssetUpdate) {
        return actualizar('assets', id, updates)
    },

    async delete(id: string) {
        return eliminar('assets', id)
    },

    /** Historial de cambios del activo. */
    async getHistory(id: string) {
        return listar('asset_history', {
            expand: 'changed_by_user',
            order: 'created_at',
            dir: 'desc',
            filtros: { asset_id: id },
        })
    },

    /** Resumen del inventario para los paneles. */
    async getStats(_tenantId: string, _departmentId?: string) {
        const res = await http.get<{ data: { resumen: any; porTipo: any[] } }>('/estadisticas/activos')
        const r = res.data?.resumen ?? {}
        return {
            total: r.total ?? 0,
            inUse: r.en_uso ?? 0,
            inStock: r.en_almacen ?? 0,
            maintenance: r.en_mantenimiento ?? 0,
            retired: r.retirados ?? 0,
            warrantyExpired: r.garantia_vencida ?? 0,
            totalValue: Number(r.valor_total ?? 0),
            byType: res.data?.porTipo ?? [],
        }
    },

    /** Equipos que reportan automáticamente mediante el agente de inventario. */
    async getEquiposReportados() {
        const res = await http.get<{ data: any[]; resumen: any }>('/hardware/equipos')
        return { equipos: res.data ?? [], resumen: res.resumen ?? {} }
    },

    /** Informe técnico completo enviado por el agente. */
    async getInformeHardware(assetId: string) {
        const res = await http.get<{ data: any }>(`/hardware/equipos/${assetId}`)
        return res.data
    },
}

export const assetGroupsApi = {
    async getAll() {
        return listar('asset_groups', { order: 'name' })
    },

    async getById(id: string) {
        const [grupo, assets] = await Promise.all([
            obtenerONulo<any>('asset_groups', id),
            listar('assets', { filtros: { asset_group_id: id }, expand: 'assigned_user,location' }),
        ])
        if (!grupo) return null
        return { ...grupo, assets }
    },

    async create(group: Record<string, unknown>) {
        return crear('asset_groups', group)
    },

    async update(id: string, updates: Record<string, unknown>) {
        return actualizar('asset_groups', id, updates)
    },

    async delete(id: string) {
        return eliminar('asset_groups', id)
    },
}

/** Tipos de activo configurables. */
export const assetTypesApi = {
    async getAll() {
        return listar('asset_types', { order: 'name' })
    },
    async create(tipo: Record<string, unknown>) {
        return crear('asset_types', tipo)
    },
    async update(id: string, updates: Record<string, unknown>) {
        return actualizar('asset_types', id, updates)
    },
    async delete(id: string) {
        return eliminar('asset_types', id)
    },
}

export type { OpcionesListado }
