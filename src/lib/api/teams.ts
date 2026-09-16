/**
 * API de equipos (departamentos) y sus integrantes.
 */
import { listar, crear, actualizar, eliminar, http } from './client'
import type { Profile } from '@/types/database'

export interface Team {
    id: string
    tenant_id: string
    name: string
    description?: string | null
    leader_id?: string | null
    email_address?: string | null
    is_active?: boolean
    created_at?: string
    leader?: { id: string; full_name: string; avatar_url?: string | null } | null
    members?: { user: Profile | null }[]
    _count?: { members: number }
}

export const teamsApi = {
    async getAll(_tenantId: string): Promise<Team[]> {
        const equipos = await listar<Team>('teams', {
            expand: 'leader,members',
            order: 'name',
        })
        // La interfaz muestra el número de integrantes junto al nombre.
        return equipos.map((t) => ({
            ...t,
            _count: { members: Array.isArray(t.members) ? t.members.length : 0 },
        }))
    },

    async getById(id: string): Promise<Team | null> {
        const equipos = await listar<Team>('teams', {
            expand: 'leader,members',
            filtros: { id },
            limit: 1,
        })
        return equipos[0] ?? null
    },

    async create(team: Partial<Team>) {
        return crear<Team>('teams', team)
    },

    async update(id: string, updates: Partial<Team>) {
        return actualizar<Team>('teams', id, updates)
    },

    async delete(id: string) {
        return eliminar('teams', id)
    },

    /** Añade una persona al equipo. */
    async addMember(teamId: string, userId: string) {
        return crear('team_members', { team_id: teamId, profile_id: userId })
    },

    /** Quita a una persona del equipo. */
    async removeMember(teamId: string, userId: string) {
        const filas = await listar<{ id: string }>('team_members', {
            filtros: { team_id: teamId, profile_id: userId },
            limit: 1,
        })
        if (filas[0]) await eliminar('team_members', filas[0].id)
    },

    async getMembers(teamId: string): Promise<Profile[]> {
        const filas = await listar<{ user: Profile | null }>('team_members', {
            expand: 'user',
            filtros: { team_id: teamId },
        })
        return filas.map((f) => f.user).filter((u): u is Profile => Boolean(u))
    },

    /** Identificadores de los equipos a los que pertenece una persona. */
    async getUserTeams(userId: string): Promise<string[]> {
        const filas = await listar<{ team_id: string }>('team_members', {
            filtros: { profile_id: userId },
        })
        return filas.map((f) => f.team_id)
    },

    /** Equipos completos a los que pertenece una persona. */
    async getUserTeamsDetalle(userId: string): Promise<Team[]> {
        const ids = await teamsApi.getUserTeams(userId)
        if (ids.length === 0) return []

        return listar<Team>('teams', {
            filtros: { 'id[in]': ids },
            order: 'name',
        })
    },
}

/** Personas de la organización. */
export const profilesApi = {
    async getAll(_tenantId?: string): Promise<Profile[]> {
        const res = await http.get<{ data: Profile[] }>('/usuarios')
        return res.data ?? []
    },

    async getById(id: string): Promise<Profile | null> {
        try {
            const res = await http.get<{ data: Profile }>(`/usuarios/${id}`)
            return res.data
        } catch (err: any) {
            if (err?.status === 404) return null
            throw err
        }
    },

    /** Alta de persona: crea la cuenta de acceso y el perfil. */
    async create(datos: {
        email: string
        password: string
        full_name: string
        role?: string
        department?: string | null
        team_id?: string | null
        avatar_url?: string | null
    }): Promise<Profile> {
        const res = await http.post<{ data: Profile }>('/usuarios', datos)
        return res.data
    },

    async update(id: string, updates: Partial<Profile>): Promise<Profile> {
        const res = await http.patch<{ data: Profile }>(`/usuarios/${id}`, updates)
        return res.data
    },

    /** Cambia la contraseña de otra persona (sólo administradores). */
    async setPassword(id: string, password: string): Promise<void> {
        await http.post(`/usuarios/${id}/password`, { password })
    },

    /** Trabajo que quedaría huérfano si se elimina a esta persona. */
    async getImpacto(id: string) {
        const res = await http.get<{ data: any }>(`/usuarios/${id}/impacto`)
        return res.data
    },

    /** Elimina a una persona, reasignando opcionalmente su trabajo. */
    async delete(id: string, reasignarA?: string): Promise<void> {
        const sufijo = reasignarA ? `?reasignar_a=${encodeURIComponent(reasignarA)}` : ''
        await http.delete(`/usuarios/${id}${sufijo}`)
    },
}
