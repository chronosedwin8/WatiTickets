/**
 * Operaciones específicas de tickets.
 *
 * El CRUD básico lo cubre el router genérico; aquí viven las acciones
 * propias del dominio: asignación múltiple, comentarios, fusión y SLA.
 *
 * Nota de rutas: este router se monta en /api/v1/tickets ANTES que el
 * genérico, así que sus rutas tienen prioridad. Todo lo que no coincida
 * cae en el CRUD estándar.
 */
import { Router } from 'express'
import { z } from 'zod'
import { query, queryOne, transaction } from '../db/pool.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { badRequest, notFound, forbidden } from '../core/errors.js'
import { requireAuth, tenantId, userId, esStaff } from '../auth/middleware.js'
import { withActor } from '../core/actor.js'
import { config } from '../config.js'
import {
    enviarCorreo, plantillaRespuestaTicket, plantillaTicketAsignado,
} from '../services/email.service.js'

export const ticketsRouter = Router()
ticketsRouter.use(requireAuth)

/** Comprueba que el ticket pertenece a la organización del usuario. */
async function ticketDelTenant(id: string, tenant: string) {
    const fila = await queryOne<{ id: string; number: number; title: string; requester_id: string }>(
        'SELECT id, number, title, requester_id FROM tickets WHERE id = $1 AND tenant_id = $2',
        [id, tenant]
    )
    if (!fila) throw notFound('El ticket')
    return fila
}

// ─────────────────────────────── Comentarios
ticketsRouter.get(
    '/:id/comentarios',
    asyncHandler(async (req, res) => {
        const tenant = tenantId(req)
        await ticketDelTenant(req.params.id, tenant)

        // Un solicitante sólo ve los comentarios públicos.
        const soloPublicos = !esStaff(req)

        const filas = await query(
            `SELECT c.*,
              (SELECT to_jsonb(x) FROM (
                 SELECT id, full_name, avatar_url FROM profiles WHERE id = c.author_id
               ) x) AS author
         FROM ticket_comments c
        WHERE c.ticket_id = $1
          ${soloPublicos ? 'AND COALESCE(c.is_public, true) = true' : ''}
        ORDER BY c.created_at ASC`,
            [req.params.id]
        )

        res.json({ data: filas })
    })
)

ticketsRouter.post(
    '/:id/comentarios',
    asyncHandler(async (req, res) => {
        const parsed = z
            .object({
                content: z.string().min(1, 'El comentario no puede estar vacío.'),
                is_public: z.boolean().default(true),
                enviar_email: z.boolean().default(false),
                attachments: z.array(z.record(z.unknown())).optional(),
            })
            .safeParse(req.body)

        if (!parsed.success) {
            throw badRequest(parsed.error.issues[0]?.message ?? 'Comentario no válido.')
        }

        const tenant = tenantId(req)
        const autor = userId(req)
        const ticket = await ticketDelTenant(req.params.id, tenant)

        // Sólo el personal puede dejar notas internas.
        const esPublico = esStaff(req) ? parsed.data.is_public : true

        const comentario = await withActor(autor, () =>
            queryOne(
                `INSERT INTO ticket_comments (ticket_id, content, author_id, is_public, attachments)
         VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
                [
                    ticket.id, parsed.data.content, autor, esPublico,
                    JSON.stringify(parsed.data.attachments ?? []),
                ]
            )
        )

        // Marca la primera respuesta para el cálculo del SLA.
        await query(
            `UPDATE tickets SET first_response_at = now()
        WHERE id = $1 AND first_response_at IS NULL AND $2 = true`,
            [ticket.id, esStaff(req)]
        )

        // Aviso por correo al solicitante, si se pidió y hay SMTP.
        if (parsed.data.enviar_email && esPublico && config.mail.enabled) {
            const solicitante = await queryOne<{ email: string }>(
                'SELECT email FROM profiles WHERE id = $1',
                [ticket.requester_id]
            )
            if (solicitante?.email) {
                enviarCorreo({
                    to: solicitante.email,
                    subject: `Re: [#${ticket.number}] ${ticket.title}`,
                    html: plantillaRespuestaTicket({
                        numero: ticket.number,
                        titulo: ticket.title,
                        cuerpo: parsed.data.content,
                        enlace: `${config.appPublicUrl}/tickets/${ticket.id}`,
                    }),
                    headers: { 'X-Ticket-Id': ticket.id },
                }).catch((e) => console.error('[tickets] No se pudo notificar:', e.message))
            }
        }

        res.status(201).json({ data: comentario })
    })
)

// ─────────────────────────────── Asignación múltiple
ticketsRouter.put(
    '/:id/asignados',
    asyncHandler(async (req, res) => {
        if (!esStaff(req)) throw forbidden('Sólo el personal puede asignar tickets.')

        const parsed = z
            .object({ asignados: z.array(z.string().uuid()) })
            .safeParse(req.body)
        if (!parsed.success) throw badRequest('La lista de personas asignadas no es válida.')

        const tenant = tenantId(req)
        const ticket = await ticketDelTenant(req.params.id, tenant)
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

        await withActor(userId(req), () =>
            transaction(async () => {
                // El primero de la lista queda como responsable principal.
                await query('UPDATE tickets SET assignee_id = $2, updated_at = now() WHERE id = $1', [
                    ticket.id,
                    ids[0] ?? null,
                ])
                await query('DELETE FROM ticket_assignees WHERE ticket_id = $1', [ticket.id])

                for (const uid of ids) {
                    await query(
                        `INSERT INTO ticket_assignees (ticket_id, user_id, tenant_id)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                        [ticket.id, uid, tenant]
                    )
                }
            })
        )

        // Avisa a quienes acaban de recibir el ticket.
        if (ids.length > 0 && config.mail.enabled) {
            const personas = await query<{ email: string }>(
                'SELECT email FROM profiles WHERE id = ANY($1) AND email IS NOT NULL',
                [ids]
            )
            for (const p of personas) {
                enviarCorreo({
                    to: p.email,
                    subject: `Te asignaron el ticket #${ticket.number}`,
                    html: plantillaTicketAsignado({
                        numero: ticket.number,
                        titulo: ticket.title,
                        enlace: `${config.appPublicUrl}/tickets/${ticket.id}`,
                    }),
                }).catch(() => { })
            }
        }

        res.json({ message: 'Asignaciones actualizadas.', data: { asignados: ids } })
    })
)

// ─────────────────────────────── Fusionar tickets
ticketsRouter.post(
    '/:id/fusionar',
    asyncHandler(async (req, res) => {
        if (!esStaff(req)) throw forbidden('Sólo el personal puede fusionar tickets.')

        const parsed = z
            .object({ hijos: z.array(z.string().uuid()).min(1, 'Indica al menos un ticket a fusionar.') })
            .safeParse(req.body)
        if (!parsed.success) {
            throw badRequest(parsed.error.issues[0]?.message ?? 'Datos de fusión no válidos.')
        }

        const tenant = tenantId(req)
        const autor = userId(req)
        const maestro = await ticketDelTenant(req.params.id, tenant)

        const hijos = parsed.data.hijos.filter((h) => h !== maestro.id)
        if (hijos.length === 0) throw badRequest('Un ticket no se puede fusionar consigo mismo.')

        const resultado = await withActor(autor, () =>
            transaction(async () => {
                const detalles = await query<{
                    id: string; number: number; title: string; description: string | null; nombre: string | null
                }>(
                    `SELECT t.id, t.number, t.title, t.description, p.full_name AS nombre
             FROM tickets t
             LEFT JOIN profiles p ON p.id = t.requester_id
            WHERE t.id = ANY($1) AND t.tenant_id = $2`,
                    [hijos, tenant]
                )

                if (detalles.length === 0) {
                    throw badRequest('No se encontraron los tickets indicados en tu organización.')
                }

                const idsReales = detalles.map((d) => d.id)

                await query(
                    `UPDATE tickets
              SET merged_to_ticket_id = $2, status = 'closed', assignee_id = NULL,
                  closed_at = now(), updated_at = now()
            WHERE id = ANY($1) AND tenant_id = $3`,
                    [idsReales, maestro.id, tenant]
                )

                await query('DELETE FROM ticket_assignees WHERE ticket_id = ANY($1)', [idsReales])

                // Deja constancia en el ticket principal.
                let resumen = '**Tickets fusionados**\n\nSe incorporaron a este ticket:'
                for (const d of detalles) {
                    resumen += `\n\n- **#${d.number} — ${d.title}**\n  Reportado por: ${d.nombre ?? 'Desconocido'}`
                    if (d.description) {
                        const corto = d.description.length > 160
                            ? `${d.description.slice(0, 160)}…`
                            : d.description
                        resumen += `\n  ${corto}`
                    }
                }

                await query(
                    `INSERT INTO ticket_comments (ticket_id, content, author_id, is_public)
           VALUES ($1, $2, $3, false)`,
                    [maestro.id, resumen, autor]
                )

                // Etiqueta el principal como fusionado.
                await query(
                    `UPDATE tickets
              SET tags = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(tags, '{}') || ARRAY['Fusionado'])))
            WHERE id = $1`,
                    [maestro.id]
                )

                return idsReales.length
            })
        )

        res.json({ message: `Se fusionaron ${resultado} ticket(s).`, data: { fusionados: resultado } })
    })
)

/** Tickets que se fusionaron dentro de este. */
ticketsRouter.get(
    '/:id/fusionados',
    asyncHandler(async (req, res) => {
        const tenant = tenantId(req)
        await ticketDelTenant(req.params.id, tenant)

        const filas = await query(
            `SELECT t.id, t.number, t.title, t.status, t.created_at,
              (SELECT to_jsonb(x) FROM (
                 SELECT id, full_name FROM profiles WHERE id = t.requester_id
               ) x) AS requester
         FROM tickets t
        WHERE t.merged_to_ticket_id = $1 AND t.tenant_id = $2
        ORDER BY t.created_at DESC`,
            [req.params.id, tenant]
        )

        res.json({ data: filas })
    })
)

// ─────────────────────────────── Recalcular SLA
ticketsRouter.post(
    '/:id/recalcular-sla',
    asyncHandler(async (req, res) => {
        if (!esStaff(req)) throw forbidden('Sólo el personal puede recalcular el SLA.')

        const tenant = tenantId(req)
        const ticket = await queryOne<{ id: string; priority: string; created_at: string }>(
            'SELECT id, priority, created_at FROM tickets WHERE id = $1 AND tenant_id = $2',
            [req.params.id, tenant]
        )
        if (!ticket) throw notFound('El ticket')

        // La configuración de SLA se guarda en horas.
        const cfg = await queryOne<{ resolution_time_hours: number }>(
            `SELECT resolution_time_hours FROM priority_sla_config
        WHERE tenant_id = $1 AND priority = $2`,
            [tenant, ticket.priority]
        )

        if (!cfg) {
            throw badRequest(
                `No hay una política de SLA configurada para la prioridad "${ticket.priority}". ` +
                `Defínela en Configuración → Políticas SLA.`
            )
        }

        const fila = await queryOne(
            `UPDATE tickets
          SET sla_due_at = created_at + ($2 || ' hours')::interval, updated_at = now()
        WHERE id = $1 RETURNING id, sla_due_at`,
            [ticket.id, String(cfg.resolution_time_hours)]
        )

        res.json({ data: fila })
    })
)
