/**
 * Envío de notificaciones por correo desde la aplicación.
 *
 * Sustituye a las Edge Functions `send-notification` y
 * `send-absence-notification`. Los destinatarios se validan contra la
 * organización: no se puede usar este endpoint para enviar correo a
 * direcciones arbitrarias.
 */
import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { badRequest, forbidden } from '../core/errors.js'
import { requireAuth, tenantId, esStaff } from '../auth/middleware.js'
import { enviarCorreo } from '../services/email.service.js'
import { config } from '../config.js'

export const notificacionesRouter = Router()
notificacionesRouter.use(requireAuth)

const PLANTILLA = (titulo: string, cuerpo: string, enlace?: string) => `
<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f4f8;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a1b29;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e3e3ef;">
    <div style="font-size:20px;font-weight:700;color:#5b5ef0;margin-bottom:20px;">TicketWati</div>
    <h1 style="font-size:20px;margin:0 0 12px;">${escapar(titulo)}</h1>
    <p style="line-height:1.6;margin:0;color:#494b64;">${escapar(cuerpo)}</p>
    ${enlace
        ? `<p style="margin:24px 0;"><a href="${enlace}" style="display:inline-block;background:#5b5ef0;color:#fff;
         text-decoration:none;padding:12px 24px;border-radius:9px;font-weight:600;">Abrir en TicketWati</a></p>`
        : ''
    }
  </div>
</body></html>`

function escapar(s: string): string {
    return String(s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
    )
}

/**
 * Notifica a un conjunto de personas de la organización.
 * Los destinatarios se indican por su identificador, no por correo:
 * así el servidor resuelve la dirección y nadie puede usar la API
 * como pasarela de envío hacia fuera.
 */
notificacionesRouter.post(
    '/enviar',
    asyncHandler(async (req, res) => {
        if (!esStaff(req)) {
            throw forbidden('Tu rol no permite enviar notificaciones.')
        }

        const parsed = z
            .object({
                destinatarios: z.array(z.string().uuid()).min(1, 'Indica al menos un destinatario.'),
                titulo: z.string().min(1, 'La notificación necesita un título.'),
                mensaje: z.string().min(1, 'La notificación necesita un mensaje.'),
                enlace: z.string().optional(),
            })
            .safeParse(req.body)

        if (!parsed.success) {
            throw badRequest(parsed.error.issues[0]?.message ?? 'Datos de notificación incompletos.')
        }

        const tenant = tenantId(req)

        const personas = await query<{ email: string; full_name: string | null }>(
            `SELECT email, full_name FROM profiles
        WHERE id = ANY($1) AND tenant_id = $2 AND email IS NOT NULL AND is_active = true`,
            [parsed.data.destinatarios, tenant]
        )

        if (personas.length === 0) {
            throw badRequest('Ninguno de los destinatarios indicados está activo en la organización.')
        }

        if (!config.mail.enabled) {
            // Sin SMTP la operación no falla: se informa para que la interfaz
            // pueda avisar de que el correo aún no está configurado.
            console.warn(
                `[notificaciones] SMTP sin configurar. No se envió "${parsed.data.titulo}" ` +
                `a ${personas.length} destinatario(s).`
            )
            return res.json({
                data: { enviados: 0, total: personas.length, correoConfigurado: false },
                message: 'El correo saliente no está configurado. La notificación no se envió.',
            })
        }

        const enlace = parsed.data.enlace
            ? `${config.appPublicUrl}${parsed.data.enlace.startsWith('/') ? '' : '/'}${parsed.data.enlace}`
            : undefined

        let enviados = 0
        for (const p of personas) {
            try {
                await enviarCorreo({
                    to: p.email,
                    subject: parsed.data.titulo,
                    html: PLANTILLA(parsed.data.titulo, parsed.data.mensaje, enlace),
                })
                enviados++
            } catch (err: any) {
                console.error(`[notificaciones] Falló el envío a ${p.email}: ${err.message}`)
            }
        }

        res.json({
            data: { enviados, total: personas.length, correoConfigurado: true },
            message: `Se notificó a ${enviados} de ${personas.length} destinatario(s).`,
        })
    })
)
