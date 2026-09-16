/**
 * Ayudantes sobre el cliente HTTP para trabajar con recursos REST.
 *
 * Todas las llamadas del proyecto pasan por aquí, de modo que la forma de
 * hablar con el servidor está definida en un único sitio.
 */
import { http, query, type RespuestaLista, type RespuestaItem, type ValorConsulta } from '../http'

export interface OpcionesListado {
    /** Relaciones a incluir: 'requester,assignee' o '*'. */
    expand?: string
    /** Columna por la que ordenar. */
    order?: string
    dir?: 'asc' | 'desc'
    limit?: number
    offset?: number
    /** Búsqueda de texto libre sobre los campos relevantes del recurso. */
    search?: string
    /** Pedir el total de registros (para paginación). */
    count?: boolean
    /** Filtros adicionales: { status: 'open', 'created_at[gte]': '2026-01-01' } */
    filtros?: Record<string, ValorConsulta>
}

function construirConsulta(opciones: OpcionesListado = {}): string {
    const { filtros, ...resto } = opciones
    return query({ ...resto, ...(filtros ?? {}) } as Record<string, ValorConsulta>)
}

/** Lista registros de un recurso y devuelve sólo el array. */
export async function listar<T = any>(recurso: string, opciones?: OpcionesListado): Promise<T[]> {
    const res = await http.get<RespuestaLista<T>>(`/${recurso}${construirConsulta(opciones)}`)
    return res.data ?? []
}

/** Lista registros con el total, para vistas paginadas. */
export async function listarConTotal<T = any>(
    recurso: string,
    opciones?: OpcionesListado
): Promise<{ datos: T[]; total: number }> {
    const res = await http.get<RespuestaLista<T>>(
        `/${recurso}${construirConsulta({ ...opciones, count: true })}`
    )
    return { datos: res.data ?? [], total: res.total ?? res.data?.length ?? 0 }
}

/** Obtiene un registro por su identificador. */
export async function obtener<T = any>(recurso: string, id: string, expand?: string): Promise<T> {
    const res = await http.get<RespuestaItem<T>>(`/${recurso}/${id}${query({ expand })}`)
    return res.data
}

/** Obtiene un registro, devolviendo null si no existe. */
export async function obtenerONulo<T = any>(
    recurso: string,
    id: string,
    expand?: string
): Promise<T | null> {
    try {
        return await obtener<T>(recurso, id, expand)
    } catch (err: any) {
        if (err?.status === 404) return null
        throw err
    }
}

export async function crear<T = any>(recurso: string, datos: unknown): Promise<T> {
    const res = await http.post<RespuestaItem<T>>(`/${recurso}`, datos)
    return res.data
}

export async function actualizar<T = any>(recurso: string, id: string, datos: unknown): Promise<T> {
    const res = await http.patch<RespuestaItem<T>>(`/${recurso}/${id}`, datos)
    return res.data
}

export async function eliminar(recurso: string, id: string): Promise<void> {
    await http.delete(`/${recurso}/${id}`)
}

/**
 * Traduce una lista de equipos a filtro.
 * `undefined` = sin filtrar. Lista vacía = no mostrar nada (comportamiento
 * que ya tenía la aplicación cuando el filtro estaba activo pero vacío).
 */
export function filtroEquipos(teamIds?: string[]): Record<string, ValorConsulta> {
    if (teamIds === undefined) return {}
    if (teamIds.length === 0) return { 'id[eq]': '00000000-0000-0000-0000-000000000000' }
    return { 'team_id[in]': teamIds }
}

export { http, query }
