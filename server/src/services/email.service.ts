/**
 * Envío de correo por SMTP.
 *
 * Sustituye a las Edge Functions que usaban Amazon SES. Al hablar SMTP
 * estándar funciona con cualquier proveedor (Microsoft 365, Google
 * Workspace, SES, Mailgun, un relay interno…) sin acoplar el código.
 */
import nodemailer, { type Transporter } from 'nodemailer'
import { config } from '../config.js'

let transporte: Transporter | null = null

function obtenerTransporte(): Transporter | null {
    if (!config.mail.enabled) return null
    if (transporte) return transporte

    transporte = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        auth: config.mail.user
            ? { user: config.mail.user, pass: config.mail.password }
            : undefined,
    })

    return transporte
}

export interface MensajeCorreo {
    to: string | string[]
    subject: string
    html: string
    text?: string
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    headers?: Record<string, string>
}

/** Envía un correo. Devuelve false si el correo no está configurado. */
export async function enviarCorreo(msg: MensajeCorreo): Promise<boolean> {
    const t = obtenerTransporte()
    if (!t) {
        console.warn(
            `[correo] SMTP no configurado: no se envió "${msg.subject}". ` +
            `Define SMTP_HOST y MAIL_FROM para activarlo.`
        )
        return false
    }

    await t.sendMail({
        from: `"${config.mail.fromName}" <${config.mail.from}>`,
        to: Array.isArray(msg.to) ? msg.to.join(', ') : msg.to,
        cc: msg.cc?.length ? msg.cc.join(', ') : undefined,
        bcc: msg.bcc?.length ? msg.bcc.join(', ') : undefined,
        replyTo: msg.replyTo,
        subject: msg.subject,
        html: msg.html,
        text: msg.text ?? desmarcar(msg.html),
        headers: msg.headers,
    })

    return true
}

/** Comprueba la conexión SMTP. Lo usa el diagnóstico de configuración. */
export async function verificarSmtp(): Promise<{ ok: boolean; error?: string }> {
    const t = obtenerTransporte()
    if (!t) return { ok: false, error: 'SMTP no configurado (faltan SMTP_HOST y MAIL_FROM).' }
    try {
        await t.verify()
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

function desmarcar(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

// ── Plantillas ─────────────────────────────────────────────────────────
const ENVOLTORIO = (contenido: string) => `
<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f4f4f8;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a1b29;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e3e3ef;">
    <div style="font-size:20px;font-weight:700;color:#5b5ef0;margin-bottom:20px;">TicketWati</div>
    ${contenido}
    <hr style="border:none;border-top:1px solid #e3e3ef;margin:28px 0 16px;">
    <p style="font-size:12px;color:#72748d;margin:0;">
      Este es un mensaje automático de tu mesa de ayuda. Si no esperabas este correo, puedes ignorarlo.
    </p>
  </div>
</body></html>`

const BOTON = (url: string, texto: string) => `
  <p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#5b5ef0;color:#fff;text-decoration:none;
       padding:12px 24px;border-radius:9px;font-weight:600;">${texto}</a>
  </p>
  <p style="font-size:13px;color:#72748d;">
    Si el botón no funciona, copia este enlace en tu navegador:<br>
    <span style="word-break:break-all;color:#4547c9;">${url}</span>
  </p>`

export function plantillaRecuperacion(nombre: string, enlace: string): string {
    return ENVOLTORIO(`
    <h1 style="font-size:20px;margin:0 0 12px;">Restablece tu contraseña</h1>
    <p style="line-height:1.6;margin:0 0 4px;">Hola ${escapar(nombre)},</p>
    <p style="line-height:1.6;margin:0;">
      Recibimos una solicitud para cambiar la contraseña de tu cuenta.
      El enlace caduca en 1 hora.
    </p>
    ${BOTON(enlace, 'Crear nueva contraseña')}
    <p style="line-height:1.6;margin:0;font-size:14px;">
      Si no fuiste tú, no hace falta que hagas nada: tu contraseña actual sigue siendo válida.
    </p>
  `)
}

export function plantillaTicketNuevo(opciones: {
    numero: number
    titulo: string
    solicitante: string
    enlace: string
}): string {
    return ENVOLTORIO(`
    <h1 style="font-size:20px;margin:0 0 12px;">Ticket #${opciones.numero} creado</h1>
    <p style="line-height:1.6;margin:0 0 4px;"><strong>${escapar(opciones.titulo)}</strong></p>
    <p style="line-height:1.6;margin:0;color:#494b64;">Reportado por ${escapar(opciones.solicitante)}.</p>
    ${BOTON(opciones.enlace, 'Ver el ticket')}
  `)
}

export function plantillaTicketAsignado(opciones: {
    numero: number
    titulo: string
    enlace: string
}): string {
    return ENVOLTORIO(`
    <h1 style="font-size:20px;margin:0 0 12px;">Te asignaron el ticket #${opciones.numero}</h1>
    <p style="line-height:1.6;margin:0;"><strong>${escapar(opciones.titulo)}</strong></p>
    ${BOTON(opciones.enlace, 'Atender el ticket')}
  `)
}

export function plantillaRespuestaTicket(opciones: {
    numero: number
    titulo: string
    cuerpo: string
    enlace: string
}): string {
    return ENVOLTORIO(`
    <h1 style="font-size:20px;margin:0 0 12px;">Respuesta a tu ticket #${opciones.numero}</h1>
    <p style="line-height:1.6;margin:0 0 16px;color:#494b64;">${escapar(opciones.titulo)}</p>
    <div style="background:#f4f4f8;border-radius:10px;padding:16px;line-height:1.6;">
      ${opciones.cuerpo}
    </div>
    ${BOTON(opciones.enlace, 'Ver la conversación')}
  `)
}

function escapar(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
    )
}
