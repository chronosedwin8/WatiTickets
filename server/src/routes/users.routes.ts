/**
 * Gestión de personas de la organización.
 *
 * Sustituye al flujo que creaba usuarios contra Supabase Auth desde el
 * navegador y a la Edge Function `admin-update-password` (que, por cierto,
 * el frontend llamaba pero nunca llegó a existir en el repositorio).
 */
import { Router } from 'express'
import { z } from 'zod'
import { query, queryOne, transaction } from '../db/pool.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { badRequest, conflict, notFound, forbidden } from '../core/errors.js'
import { hashPassword, validarPassword } from '../auth/password.js'
import { revokeAllUserTokens } from '../auth/tokens.js'
import { requireAuth, requireRole, tenantId, esStaff, RANGO_GESTION, RANGO_ADMIN } from '../auth/middleware.js'

export const usersRouter = Router()
usersRouter.use(requireAuth)

const CAMPOS = `
  id, tenant_id, email, full_name, avatar_url, role, department,
  skills, is_active, metadata, created_at, updated_at, last_sign_in_at
`

const ROLES = ['admin', 'owner', 'manager', 'agent', 'technician', 'developer', 'customer'] as const

// ─────────────────────────────── Listar
/**
 * Directorio de la organización.
 *
 * Sólo el personal ve la lista completa. Quien tiene rol de cliente no
 * necesita el directorio con los correos de todos, así que recibe
 * únicamente su propia ficha.
 */
usersRouter.get(
    '/',
    asyncHandler(async (req, res) => {
        if (!esStaff(req)) {
            const propio = await query(
                `SELECT ${CAMPOS} FROM profiles WHERE id = $1`,
                [req.user!.sub]
            )
            return res.json({ data: propio })
        }

        const filas = await query(
            `SELECT ${CAMPOS} FROM profiles WHERE tenant_id = $1 ORDER BY full_name NULLS LAST`,
            [tenantId(req)]
        )
        res.json({ data: filas })
    })
)

usersRouter.get(
    '/:id',
    asyncHandler(async (req, res) => {
        // Un cliente sólo puede consultar su propio perfil.
        if (!esStaff(req) && req.params.id !== req.user!.sub) {
            throw forbidden('Sólo puedes consultar tu propio perfil.')
        }

        const fila = await queryOne(
            `SELECT ${CAMPOS} FROM profiles WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, tenantId(req)]
        )
        if (!fila) throw notFound('La persona')
        res.json({ data: fila })
    })
)

// ─────────────────────────────── Crear
usersRouter.post(
    '/',
    requireRole(...RANGO_GESTION),
    asyncHandler(async (req, res) => {
        const parsed = z
            .object({
                email: z.string().email('Introduce un correo válido.'),
                password: z.string(),
                full_name: z.string().min(2, 'Escribe el nombre completo.'),
                role: z.enum(ROLES).default('agent'),
                department: z.string().optional().nullable(),
                team_id: z.string().uuid().optional().nullable(),
                avatar_url: z.string().optional().nullable(),
            })
            .safeParse(req.body)

        if (!parsed.success) {
            throw badRequest(parsed.error.issues[0]?.message ?? 'Faltan datos de la persona.')
        }

        // Sólo un administrador puede crear otros administradores.
        if (
            (parsed.data.role === 'admin' || parsed.data.role === 'owner') &&
            !RANGO_ADMIN.includes(req.user!.role)
        ) {
            throw forbidden('Sólo un administrador puede crear cuentas de administrador.')
        }

        validarPassword(parsed.data.password)
        const email = parsed.data.email.toLowerCase().trim()
        const tenant = tenantId(req)

        const existe = await queryOne('SELECT 1 FROM profiles WHERE lower(email) = $1', [email])
        if (existe) throw conflict('Ya existe una persona con ese correo electrónico.')

        const hash = await hashPassword(parsed.data.password)

        const creado = await transaction(async () => {
            const fila = await queryOne<{ id: string }>(
                `INSERT INTO profiles
           (tenant_id, email, full_name, role, department, avatar_url,
            is_active, password_hash, email_confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, now())
         RETURNING ${CAMPOS}`,
                [
                    tenant, email, parsed.data.full_name, parsed.data.role,
                    parsed.data.department ?? null, parsed.data.avatar_url ?? null, hash,
                ]
            )

            if (parsed.data.team_id) {
                await query(
                    `INSERT INTO team_members (team_id, profile_id, tenant_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                    [parsed.data.team_id, (fila as any).id, tenant]
                )
            }

            return fila
        })

        res.status(201).json({ data: creado })
    })
)

// ─────────────────────────────── Modificar
usersRouter.patch(
    '/:id',
    asyncHandler(async (req, res) => {
        const esPropio = req.params.id === req.user!.sub
        const puedeGestionar = RANGO_GESTION.includes(req.user!.role)

        if (!esPropio && !puedeGestionar) {
            throw forbidden('Sólo puedes modificar tu propio perfil.')
        }

        const parsed = z
            .object({
                full_name: z.string().min(2).optional(),
                avatar_url: z.string().nullable().optional(),
                department: z.string().nullable().optional(),
                skills: z.array(z.string()).optional(),
                metadata: z.record(z.unknown()).optional(),
                role: z.enum(ROLES).optional(),
                is_active: z.boolean().optional(),
            })
            .safeParse(req.body)

        if (!parsed.success) throw badRequest('Los datos enviados no son válidos.')

        // Cambiar rol o activar/desactivar es cosa de gestión, no del propio usuario.
        if ((parsed.data.role !== undefined || parsed.data.is_active !== undefined) && !puedeGestionar) {
            throw forbidden('No puedes cambiar tu propio rol ni tu estado de activación.')
        }
        if (
            (parsed.data.role === 'admin' || parsed.data.role === 'owner') &&
            !RANGO_ADMIN.includes(req.user!.role)
        ) {
            throw forbidden('Sólo un administrador puede asignar el rol de administrador.')
        }

        const campos: string[] = []
        const valores: unknown[] = [req.params.id, tenantId(req)]

        for (const [clave, valor] of Object.entries(parsed.data)) {
            if (valor === undefined) continue
            valores.push(clave === 'metadata' ? JSON.stringify(valor) : valor)
            campos.push(`${clave} = $${valores.length}${clave === 'metadata' ? '::jsonb' : ''}`)
        }

        if (campos.length === 0) throw badRequest('No se envió ningún campo para actualizar.')

        const fila = await queryOne(
            `UPDATE profiles SET ${campos.join(', ')}, updated_at = now()
        WHERE id = $1 AND tenant_id = $2 RETURNING ${CAMPOS}`,
            valores
        )
        if (!fila) throw notFound('La persona')

        res.json({ data: fila })
    })
)

// ─────────────────────────────── Cambiar contraseña de otra persona
usersRouter.post(
    '/:id/password',
    requireRole(...RANGO_ADMIN),
    asyncHandler(async (req, res) => {
        const parsed = z.object({ password: z.string() }).safeParse(req.body)
        if (!parsed.success) throw badRequest('Indica la nueva contraseña.')

        validarPassword(parsed.data.password)

        const destino = await queryOne<{ id: string }>(
            'SELECT id FROM profiles WHERE id = $1 AND tenant_id = $2',
            [req.params.id, tenantId(req)]
        )
        if (!destino) throw notFound('La persona')

        const hash = await hashPassword(parsed.data.password)
        await query(
            'UPDATE profiles SET password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $1',
            [destino.id, hash]
        )
        await revokeAllUserTokens(destino.id)

        res.json({ message: 'Contraseña actualizada. La persona deberá iniciar sesión de nuevo.' })
    })
)

// ─────────────────────────────── Impacto antes de eliminar
usersRouter.get(
    '/:id/impacto',
    requireRole(...RANGO_GESTION),
    asyncHandler(async (req, res) => {
        const tenant = tenantId(req)
        const id = req.params.id

        const fila = await queryOne(
            `SELECT
         (SELECT count(*)::int FROM tickets      WHERE assignee_id = $1 AND tenant_id = $2) AS tickets_asignados,
         (SELECT count(*)::int FROM tickets      WHERE requester_id = $1 AND tenant_id = $2) AS tickets_reportados,
         (SELECT count(*)::int FROM work_orders  WHERE assignee_id = $1 AND tenant_id = $2) AS ordenes_asignadas,
         (SELECT count(*)::int FROM ticket_assignees WHERE user_id = $1)                     AS asignaciones_multiples,
         (SELECT count(*)::int FROM team_members WHERE user_id = $1)                         AS equipos`,
            [id, tenant]
        )

        res.json({ data: fila })
    })
)

// ─────────────────────────────── Eliminar (con reasignación)
usersRouter.delete(
    '/:id',
    requireRole(...RANGO_GESTION),
    asyncHandler(async (req, res) => {
        const id = req.params.id
        const tenant = tenantId(req)

        if (id === req.user!.sub) {
            throw badRequest('No puedes eliminar tu propia cuenta.')
        }

        const destino = await queryOne<{ id: string }>(
            'SELECT id FROM profiles WHERE id = $1 AND tenant_id = $2',
            [id, tenant]
        )
        if (!destino) throw notFound('La persona')

        const nuevoResponsable = req.query.reasignar_a as string | undefined
        if (nuevoResponsable) {
            const existe = await queryOne('SELECT 1 FROM profiles WHERE id = $1 AND tenant_id = $2', [
                nuevoResponsable, tenant,
            ])
            if (!existe) throw badRequest('La persona a la que quieres reasignar el trabajo no existe.')
        }

        await query('SELECT reassign_and_delete_team_member($1, $2)', [
            id,
            nuevoResponsable ?? null,
        ])

        res.status(204).end()
    })
)
