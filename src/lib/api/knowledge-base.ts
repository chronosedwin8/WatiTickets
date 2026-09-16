/**
 * API de la base de conocimiento.
 */
import { listar, obtenerONulo, crear, actualizar, eliminar } from './client'

export interface KbArticleWithRelations {
    id: string
    tenant_id: string
    title: string
    content: string
    category_id?: string | null
    department_id?: string | null
    author_id?: string | null
    status?: string | null
    content_type?: string | null
    media_url?: string | null
    view_count?: number | null
    helpful_count?: number | null
    created_at?: string
    updated_at?: string
    author?: { id: string; full_name: string; avatar_url?: string | null } | null
    department_team?: { id: string; name: string } | null
    category?: { id: string; name: string } | null
}

const RELACIONES = 'author,department_team,category'

export const kbApi = {
    async getAll(_tenantId: string, departmentId?: string): Promise<KbArticleWithRelations[]> {
        return listar<KbArticleWithRelations>('kb_articles', {
            expand: RELACIONES,
            order: 'created_at',
            dir: 'desc',
            limit: 300,
            filtros: departmentId ? { department_id: departmentId } : {},
        })
    },

    async getById(id: string): Promise<KbArticleWithRelations | null> {
        return obtenerONulo<KbArticleWithRelations>('kb_articles', id, RELACIONES)
    },

    /** Busca artículos por texto en título y contenido. */
    async buscar(termino: string): Promise<KbArticleWithRelations[]> {
        return listar<KbArticleWithRelations>('kb_articles', {
            expand: RELACIONES,
            search: termino,
            limit: 50,
        })
    },

    async create(article: Record<string, unknown>) {
        return crear<KbArticleWithRelations>('kb_articles', article)
    },

    async update(id: string, updates: Record<string, unknown>) {
        return actualizar<KbArticleWithRelations>('kb_articles', id, updates)
    },

    async delete(id: string) {
        return eliminar('kb_articles', id)
    },

    /** Suma una visita al artículo. */
    async registrarVista(id: string, vistasActuales: number) {
        return actualizar('kb_articles', id, { view_count: (vistasActuales ?? 0) + 1 })
    },
}
