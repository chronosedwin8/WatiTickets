/**
 * API de analítica e indicadores ITSM.
 *
 * Los cálculos ocurren en el servidor (SQL), no en el navegador: así las
 * vistas no tienen que descargar miles de tickets para sacar un promedio.
 */
import { http, query } from './client'

function consultaEquipos(teamIds?: string[]): string {
    return teamIds !== undefined ? query({ teams: teamIds }) : ''
}

export const analyticsApi = {
    /** Tiempo medio de primera respuesta, agrupado por prioridad. */
    async getResponseTimeDistribution(
        _tenantId: string,
        startDate: string,
        endDate: string,
        teamIds?: string[]
    ): Promise<Record<string, { avgHours: number; count: number }>> {
        const res = await http.get<{ data: { prioridad: string; horas_promedio: number; cantidad: number }[] }>(
            `/estadisticas/tiempo-respuesta${query({
                desde: startDate,
                hasta: endDate,
                teams: teamIds,
            })}`
        )

        const salida: Record<string, { avgHours: number; count: number }> = {}
        for (const fila of res.data ?? []) {
            salida[fila.prioridad] = {
                avgHours: Number(fila.horas_promedio ?? 0),
                count: fila.cantidad ?? 0,
            }
        }
        return salida
    },

    /** Tickets que ya superaron su fecha límite de SLA. */
    async getSLARiskTickets(_tenantId: string, teamIds?: string[]) {
        const res = await http.get<{ data: any[] }>(
            `/estadisticas/sla-riesgo${consultaEquipos(teamIds)}`
        )
        return res.data ?? []
    },

    /** Reparto de tickets por nivel de impacto. */
    async getImpactDistribution(_tenantId: string, teamIds?: string[]) {
        const res = await http.get<{ data: { impacto: string; cantidad: number }[] }>(
            `/estadisticas/impacto${consultaEquipos(teamIds)}`
        )
        return res.data ?? []
    },

    /** Indicadores del periodo: MTTR, satisfacción, volumen. */
    async getIndicadores(dias = 30) {
        const res = await http.get<{ data: any }>(`/estadisticas/indicadores${query({ dias })}`)
        return res.data ?? {}
    },

    /** Carga de trabajo por persona. */
    async getCargaPorPersona() {
        const res = await http.get<{ data: { name: string; value: number }[] }>(
            '/estadisticas/carga-por-persona'
        )
        return res.data ?? []
    },

    /**
     * Precisión de la planificación: compara lo planificado con lo real.
     * Se calcula sobre los tickets que tienen ambas marcas de tiempo.
     */
    async getPlanningAccuracy(_tenantId: string, teamIds?: string[]) {
        const res = await http.get<{ data: any[] }>(
            `/estadisticas/sla-riesgo${consultaEquipos(teamIds)}`
        )
        return res.data ?? []
    },

    /** Búsqueda global sobre tickets, activos y base de conocimiento. */
    async buscar(termino: string) {
        const res = await http.get<{ data: { tickets: any[]; activos: any[]; articulos: any[] } }>(
            `/estadisticas/buscar${query({ q: termino })}`
        )
        return res.data ?? { tickets: [], activos: [], articulos: [] }
    },
}
