/**
 * API de historias de usuario (tablero de desarrollo).
 */
import { listar, obtenerONulo, crear, actualizar, eliminar } from './client'
import type { Database } from '@/types/database'

type UserStory = Database['public']['Tables']['user_stories']['Row']
type UserStoryInsert = Database['public']['Tables']['user_stories']['Insert']
type UserStoryUpdate = Database['public']['Tables']['user_stories']['Update']

export const userStoriesApi = {
    async getAll(_tenantId: string, projectId?: string): Promise<UserStory[]> {
        return listar<UserStory>('user_stories', {
            expand: 'assignee',
            order: 'created_at',
            dir: 'desc',
            limit: 500,
            filtros: projectId ? { project_id: projectId } : {},
        })
    },

    async getById(id: string): Promise<UserStory | null> {
        return obtenerONulo<UserStory>('user_stories', id, 'assignee')
    },

    async create(story: UserStoryInsert): Promise<UserStory> {
        return crear<UserStory>('user_stories', story)
    },

    async update(id: string, updates: UserStoryUpdate): Promise<UserStory> {
        return actualizar<UserStory>('user_stories', id, updates)
    },

    async delete(id: string): Promise<void> {
        return eliminar('user_stories', id)
    },
}
