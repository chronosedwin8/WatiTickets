/**
 * API de proyectos de desarrollo y sus sprints.
 */
import { listar, crear, actualizar, eliminar } from './client'

export const projectsApi = {
    async getAll(_tenantId: string) {
        return listar('projects', { order: 'created_at', dir: 'desc' })
    },

    async create(project: Record<string, unknown>) {
        return crear('projects', project)
    },

    async update(id: string, updates: Record<string, unknown>) {
        return actualizar('projects', id, updates)
    },

    async delete(id: string) {
        return eliminar('projects', id)
    },

    /** Resumen de historias del proyecto por estado. */
    async getStats(projectId: string) {
        const historias = await listar<{ status: string; story_points: number | null }>(
            'user_stories',
            { filtros: { project_id: projectId }, limit: 500 }
        )

        const porEstado: Record<string, number> = {}
        let puntos = 0
        for (const h of historias) {
            porEstado[h.status] = (porEstado[h.status] ?? 0) + 1
            puntos += h.story_points ?? 0
        }

        return {
            total: historias.length,
            porEstado,
            puntosTotales: puntos,
            completadas: porEstado.done ?? 0,
        }
    },
}

export const sprintsApi = {
    async getAll(projectId?: string) {
        return listar('sprints', {
            order: 'start_date',
            dir: 'desc',
            filtros: projectId ? { project_id: projectId } : {},
        })
    },
    async create(sprint: Record<string, unknown>) {
        return crear('sprints', sprint)
    },
    async update(id: string, updates: Record<string, unknown>) {
        return actualizar('sprints', id, updates)
    },
    async delete(id: string) {
        return eliminar('sprints', id)
    },
}
