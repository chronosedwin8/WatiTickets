/**
 * API de sedes y ubicaciones físicas.
 */
import { listar, crear, actualizar, eliminar } from './client'

export interface Location {
    id: string
    tenant_id: string
    name: string
    address?: string | null
    city?: string | null
    country?: string | null
    buildings?: string[] | null
    contact_name?: string | null
    contact_phone?: string | null
    contact_email?: string | null
    latitude?: number | null
    longitude?: number | null
    created_at?: string
}

export const locationsApi = {
    async getAll(_tenantId: string): Promise<Location[]> {
        return listar<Location>('locations', { order: 'name' })
    },

    async create(location: Record<string, unknown>) {
        return crear<Location>('locations', location)
    },

    async update(id: string, updates: Record<string, unknown>) {
        return actualizar<Location>('locations', id, updates)
    },

    async delete(id: string) {
        return eliminar('locations', id)
    },
}
