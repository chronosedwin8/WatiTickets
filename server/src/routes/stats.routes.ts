/**
 * Estadísticas y analítica.
 *
 * Sustituye a las funciones RPC de PostgreSQL que dependían de Supabase.
 * Todo el cálculo ocurre en SQL, acotado siempre a la organización del
 * usuario y, opcionalmente, a un conjunto de equipos.
 */
import { Router } from 'express'
import { query, queryOne } from '../db/pool.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { requireAuth, tenantId } from '../auth/middleware.js'
import { Params } from '../db/sql.js'

export const statsRouter = Router()
statsRouter.use(requireAuth)

/** Lee ?teams=a,b,c y devuelve la lista, o null si no se filtró. */
function equiposDe(req: any): string[] | null {
    const raw = req.query.teams
    if (typeof raw !== 'string' || raw.trim() === '') return null
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Construye el filtro de equipos. Lista vacía = no mostrar nada. */
function filtroEquipos(equipos: string[] | null, p: Params, alias = 't'): string {
    if (equipos === null) return ''
    if (equipos.length === 0) return ' AND FALSE'
    return ` AND ${alias}."team_id" = ANY(${p.add(equipos)})`
}

// ─────────────────────────────── Panel principal
statsRouter.get(
    '/dashboard',
    asyncHandler(async (req, res) => {
        const p = new Params()
        const tenant = p.add(tenantId(req))
        const equipos = equiposDe(req)
        const fe = filtroEquipos(equipos, p)

        const fila = await queryOne(
            `SELECT
         count(*) FILTER (WHERE t.status IN ('new','open','pending'))::int          AS tickets_abiertos,
         count(*) FILTER (WHERE t.status IN ('resolved','closed')
                            AND (t.resolved_at >= date_trunc('day', now())
                              OR t.closed_at   >= date_trunc('day', now())))::int   AS resueltos_hoy,
         count(*) FILTER (WHERE t.status <> 'resolved'
                            AND t.sla_due_at IS NOT NULL
                            AND t.sla_due_at < now())::int                          AS sla_incumplido,
         count(*) FILTER (WHERE t.status = 'new')::int                              AS sin_atender,
         count(*)::int                                                              AS total,
         COALESCE(ROUND(AVG(
           EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600
         ) FILTER (WHERE t.resolved_at IS NOT NULL), 1), 0)                          AS horas_resolucion_promedio
       FROM tickets t
      WHERE t.tenant_id = ${tenant}${fe}`,
            p.all
        )

        res.json({ data: fila })
    })
)

// ─────────────────────────────── Tiempo de primera respuesta por prioridad
statsRouter.get(
    '/tiempo-respuesta',
    asyncHandler(async (req, res) => {
        const p = new Params()
        const tenant = p.add(tenantId(req))
        const desde = p.add(req.query.desde ?? '1970-01-01')
        const hasta = p.add(req.query.hasta ?? new Date().toISOString())
        const fe = filtroEquipos(equiposDe(req), p)

        const filas = await query(
            `SELECT t.priority AS prioridad,
              ROUND(AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 3600)::numeric, 2) AS horas_promedio,
              count(*)::int AS cantidad
         FROM tickets t
        WHERE t.tenant_id = ${tenant}
          AND t.first_response_at IS NOT NULL
          AND t.created_at >= ${desde} AND t.created_at <= ${hasta}${fe}
        GROUP BY t.priority`,
            p.all
        )

        res.json({ data: filas })
    })
)

// ─────────────────────────────── Tickets en riesgo de SLA
statsRouter.get(
    '/sla-riesgo',
    asyncHandler(async (req, res) => {
        const p = new Params()
        const tenant = p.add(tenantId(req))
        const fe = filtroEquipos(equiposDe(req), p)

        const filas = await query(
            `SELECT t.*,
              (SELECT to_jsonb(x) FROM (SELECT id, full_name FROM profiles WHERE id = t.requester_id) x) AS requester,
              (SELECT to_jsonb(x) FROM (SELECT id, full_name FROM profiles WHERE id = t.assignee_id)  x) AS assignee
         FROM tickets t
        WHERE t.tenant_id = ${tenant}
          AND t.sla_due_at IS NOT NULL
          AND t.status NOT IN ('resolved','closed')
          AND t.sla_due_at < now()${fe}
        ORDER BY t.sla_due_at ASC
        LIMIT 100`,
            p.all
        )

        res.json({ data: filas })
    })
)

// ─────────────────────────────── Carga de trabajo por persona
statsRouter.get(
    '/carga-por-persona',
    asyncHandler(async (req, res) => {
        const p = new Params()
        const tenant = p.add(tenantId(req))

        // Cuenta por cada persona asignada (tabla de asignaciones múltiples);
        // los tickets sin asignación múltiple usan el responsable principal.
        const filas = await query(
            `WITH asignados AS (
         SELECT COALESCE(pr.full_name, 'Sin asignar') AS nombre, t.id
           FROM tickets t
           LEFT JOIN ticket_assignees ta ON ta.ticket_id = t.id
           LEFT JOIN profiles pr ON pr.id = COALESCE(ta.user_id, t.assignee_id)
          WHERE t.tenant_id = ${tenant}
       )
       SELECT nombre AS name, count(DISTINCT id)::int AS value
         FROM asignados
        GROUP BY nombre
        ORDER BY value DESC
        LIMIT 10`,
            p.all
        )

        res.json({ data: filas })
    })
)

// ─────────────────────────────── Distribución por impacto
statsRouter.get(
    '/impacto',
    asyncHandler(async (req, res) => {
        const p = new Params()
        const tenant = p.add(tenantId(req))
        const fe = filtroEquipos(equiposDe(req), p)

        const filas = await query(
            `SELECT COALESCE(t.impact_level::text, 'sin_definir') AS impacto, count(*)::int AS cantidad
         FROM tickets t
        WHERE t.tenant_id = ${tenant}${fe}
        GROUP BY t.impact_level
        ORDER BY cantidad DESC`,
            p.all
        )

        res.json({ data: filas })
    })
)

// ─────────────────────────────── Indicadores ITSM (MTTR, FCR, CSAT)
statsRouter.get(
    '/indicadores',
    asyncHandler(async (req, res) => {
        const p = new Params()
        const tenant = p.add(tenantId(req))
        const dias = p.add(String(Number(req.query.dias ?? 30)))

        const fila = await queryOne(
            `SELECT
         COALESCE(ROUND(AVG(
           EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
         ) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 2), 0)  AS mttr_horas,
         COALESCE(ROUND(
           100.0 * count(*) FILTER (WHERE satisfaction_rating >= 4)
           / NULLIF(count(*) FILTER (WHERE satisfaction_rating IS NOT NULL), 0), 1
         ), 0)                                                       AS csat_porcentaje,
         count(*) FILTER (WHERE satisfaction_rating IS NOT NULL)::int AS respuestas_csat,
         count(*)::int                                                AS tickets_periodo,
         count(*) FILTER (WHERE status IN ('resolved','closed'))::int AS resueltos
       FROM tickets
      WHERE tenant_id = ${tenant}
        AND created_at >= now() - (${dias} || ' days')::interval`,
            p.all
        )

        res.json({ data: fila })
    })
)

// ─────────────────────────────── Estadísticas de inventario
statsRouter.get(
    '/activos',
    asyncHandler(async (req, res) => {
        const tenant = tenantId(req)

        const [resumen, porTipo] = await Promise.all([
            queryOne(
                `SELECT
             count(*)::int                                            AS total,
             count(*) FILTER (WHERE status = 'in_use')::int           AS en_uso,
             count(*) FILTER (WHERE status = 'in_stock')::int         AS en_almacen,
             count(*) FILTER (WHERE status = 'maintenance')::int      AS en_mantenimiento,
             count(*) FILTER (WHERE status = 'retired')::int          AS retirados,
             count(*) FILTER (WHERE warranty_expires IS NOT NULL
                                AND warranty_expires < now())::int    AS garantia_vencida,
             COALESCE(SUM(purchase_cost), 0)                          AS valor_total
           FROM assets WHERE tenant_id = $1`,
                [tenant]
            ),
            query(
                `SELECT COALESCE(ty.name, 'Sin categoría') AS tipo, count(*)::int AS cantidad
             FROM assets a
             LEFT JOIN asset_types ty ON ty.id = a.asset_type_id
            WHERE a.tenant_id = $1
            GROUP BY ty.name ORDER BY cantidad DESC`,
                [tenant]
            ),
        ])

        res.json({ data: { resumen, porTipo } })
    })
)

// ─────────────────────────────── Órdenes de trabajo
statsRouter.get(
    '/ordenes',
    asyncHandler(async (req, res) => {
        const p = new Params()
        const tenant = p.add(tenantId(req))

        const fila = await queryOne(
            `SELECT
         count(*)::int                                                           AS total,
         count(*) FILTER (WHERE status IN ('new','scheduled','dispatched'))::int AS pendientes,
         count(*) FILTER (WHERE status = 'in_progress')::int                     AS en_progreso,
         count(*) FILTER (WHERE status = 'completed')::int                       AS completadas,
         count(*) FILTER (WHERE status = 'completed'
                            AND actual_end >= date_trunc('day', now()))::int     AS completadas_hoy,
         count(*) FILTER (WHERE scheduled_end IS NOT NULL
                            AND scheduled_end < now()
                            AND status NOT IN ('completed','cancelled'))::int     AS vencidas,
         COALESCE(ROUND(
           100.0 * count(*) FILTER (WHERE status = 'completed') / NULLIF(count(*), 0), 1
         ), 0)                                                                   AS tasa_completado
       FROM work_orders WHERE tenant_id = ${tenant}`,
            p.all
        )

        res.json({ data: fila })
    })
)

// ─────────────────────────────── Búsqueda global (multi-entidad)
statsRouter.get(
    '/buscar',
    asyncHandler(async (req, res) => {
        const termino = String(req.query.q ?? '').trim()
        if (termino.length < 2) {
            return res.json({ data: { tickets: [], activos: [], articulos: [] } })
        }

        const tenant = tenantId(req)
        const patron = `%${termino}%`

        const [tickets, activos, articulos] = await Promise.all([
            query(
                `SELECT id, number, title, status, priority
           FROM tickets
          WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2 OR number::text = $3)
          ORDER BY created_at DESC LIMIT 8`,
                [tenant, patron, termino]
            ),
            query(
                `SELECT id, name, asset_tag, serial_number, status
           FROM assets
          WHERE tenant_id = $1 AND (name ILIKE $2 OR asset_tag ILIKE $2 OR serial_number ILIKE $2)
          ORDER BY created_at DESC LIMIT 8`,
                [tenant, patron]
            ),
            query(
                `SELECT id, title, slug, status
           FROM kb_articles
          WHERE tenant_id = $1 AND (title ILIKE $2 OR content ILIKE $2)
          ORDER BY created_at DESC LIMIT 8`,
                [tenant, patron]
            ),
        ])

        res.json({ data: { tickets, activos, articulos } })
    })
)
