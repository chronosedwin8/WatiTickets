/**
 * Asignaciones de actividades del planificador.
 *
 * `activity_assignees` usa clave compuesta (actividad + persona) y no tiene
 * columna `id`, por lo que el CRUD genérico no puede operar sobre ella.
 * Estas rutas la tratan como lo que es: el conjunto de personas de una
 * actividad, que se reemplaza entero.
 */
import { Router } from 'express'
import { z } from 'zod'
import { query, queryOne, transaction } from '../db/pool.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { badRequest, notFound, forbidden } from '../core/errors.js'
import { requireAuth, tenantId, esStaff } from '../auth/middleware.js'

export const asignacionesRouter = Router()
asignacionesRouter.use(requireAuth)

async function actividadDelTenant(id: string, tenant: string) {
    const fila = await queryOne<{ id: string }>(
        'SELECT id FROM maintenance_activities WHERE id = $1 AND tenant_id = $2',
        [id, tenant]
    )
    if (!fila) throw notFound('La actividad')
    return fila
}

/** Personas asignadas a una actividad. */
asignacionesRouter.get(
    '/:actividadId/asignados',
    asyncHandler(async (req, res) => {
        const tenant = tenantId(req)
        await actividadDelTenant(req.params.actividadId, tenant)

        const filas = await query(
            `SELECT p.id, p.full_name, p.avatar_url, p.email, p.role
         FROM activity_assignees a
         JOIN profiles p ON p.id = a.user_id
        WHERE a.activity_id = $1
        ORDER BY p.full_name`,
            [req.params.actividadId]
        )

        res.json({ data: filas })
    })
)

/** Reemplaza el conjunto de personas asignadas. */
asignacionesRouter.put(
    '/:actividadId/asignados',
    asyncHandler(async (req, res) => {
        if (!esStaff(req)) throw forbidden('Sólo el personal puede asignar actividades.')

        const parsed = z
            .object({ asignados: z.array(z.string().uuid()) })
            .safeParse(req.body)
        if (!parsed.success) throw badRequest('La lista de personas asignadas no es válida.')

        const tenant = tenantId(req)
        await actividadDelTenant(req.params.actividadId, tenant)
        const ids = [...new Set(parsed.data.asignados)]

        if (ids.length > 0) {
            const validos = await query<{ id: string }>(
                'SELECT id FROM profiles WHERE id = ANY($1) AND tenant_id = $2',
                [ids, tenant]
            )
            if (validos.length !== ids.length) {
                throw badRequest('Alguna de las personas indicadas no pertenece a la organización.')
            }
        }

        await transaction(async () => {
            await query('DELETE FROM activity_assignees WHERE activity_id = $1', [
                req.params.actividadId,
            ])
            for (const uid of ids) {
                await query(
                    `INSERT INTO activity_assignees (activity_id, user_id, tenant_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                    [req.params.actividadId, uid, tenant]
                )
            }
        })

        res.json({ message: 'Asignaciones actualizadas.', data: { asignados: ids } })
    })
)
