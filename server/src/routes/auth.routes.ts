/**
 * Rutas de autenticación. Sustituyen por completo a Supabase Auth (GoTrue).
 *
 *   POST /auth/login             iniciar sesión
 *   POST /auth/refresh           renovar el token de acceso
 *   POST /auth/logout            cerrar sesión
 *   GET  /auth/me                usuario actual + organización
 *   POST /auth/forgot-password   solicitar recuperación
 *   POST /auth/reset-password    fijar nueva contraseña con el token
 *   POST /auth/change-password   cambiar la propia contraseña
 *   POST /auth/register          alta pública (sólo si está habilitada)
 */
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config } from '../config.js'
import { query, queryOne, transaction } from '../db/pool.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { badRequest, unauthorized, forbidden, notFound, conflict } from '../core/errors.js'
import { hashPassword, verifyPassword, validarPassword } from '../auth/password.js'
import {
    signAccessToken, issueRefreshToken, rotateRefreshToken,
    revokeRefreshToken, revokeAllUserTokens,
    issuePasswordResetToken, consumePasswordResetToken,
    type UserRole,
} from '../auth/tokens.js'
import { requireAuth } from '../auth/middleware.js'
import { enviarCorreo, plantillaRecuperacion } from '../services/email.service.js'

export const authRouter = Router()

const limitador = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: 'DEMASIADAS_PETICIONES',
            message: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
        },
    },
})

interface FilaUsuario {
    id: string
    email: string
    full_name: string | null
    role: UserRole
    tenant_id: string | null
    avatar_url: string | null
    department: string | null
    is_active: boolean
    password_hash: string | null
    failed_attempts: number
    locked_until: string | null
}

const CAMPOS_PUBLICOS = `
  id, tenant_id, email, full_name, avatar_url, role, department,
  skills, is_active, metadata, created_at, updated_at, last_sign_in_at
`

const MAX_INTENTOS = 8
const BLOQUEO_MINUTOS = 15

// ─────────────────────────────────────────── LOGIN
authRouter.post(
    '/login',
    limitador,
    asyncHandler(async (req, res) => {
        const esquema = z.object({
            email: z.string().email('Introduce un correo electrónico válido.'),
            password: z.string().min(1, 'Escribe tu contraseña.'),
        })
        const parsed = esquema.safeParse(req.body)
        if (!parsed.success) {
            throw badRequest(parsed.error.issues[0]?.message ?? 'Datos de acceso incompletos.')
        }

        const email = parsed.data.email.toLowerCase().trim()

        const user = await queryOne<FilaUsuario>(
            `SELECT id, email, full_name, role, tenant_id, avatar_url, department,
              is_active, password_hash, failed_attempts, locked_until
         FROM profiles WHERE lower(email) = $1`,
            [email]
        )

        // Mensaje idéntico si el usuario no existe o la clave es incorrecta:
        // no se revela qué correos están registrados.
        const credencialesInvalidas = unauthorized('Correo o contraseña incorrectos.')

        if (!user) {
            // Se compara igualmente para no delatar por tiempo de respuesta.
            await verifyPassword(parsed.data.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
            throw credencialesInvalidas
        }

        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            throw forbidden(
                `Tu cuenta está bloqueada temporalmente por varios intentos fallidos. ` +
                `Inténtalo de nuevo en unos minutos.`
            )
        }

        const ok = await verifyPassword(parsed.data.password, user.password_hash)

        if (!ok) {
            const intentos = user.failed_attempts + 1
            const bloquear = intentos >= MAX_INTENTOS
            await query(
                `UPDATE profiles
            SET failed_attempts = $2,
                locked_until = CASE WHEN $3 THEN now() + ($4 || ' minutes')::interval ELSE locked_until END
          WHERE id = $1`,
                [user.id, intentos, bloquear, String(BLOQUEO_MINUTOS)]
            )
            throw credencialesInvalidas
        }

        if (!user.is_active) {
            throw forbidden('Tu cuenta está desactivada. Contacta con el administrador.')
        }

        await query(
            `UPDATE profiles SET failed_attempts = 0, locked_until = NULL, last_sign_in_at = now()
        WHERE id = $1`,
            [user.id]
        )

        const accessToken = signAccessToken({
            sub: user.id,
            tenant: user.tenant_id,
            role: user.role,
            email: user.email,
        })

        const { token: refreshToken, expiresAt } = await issueRefreshToken(user.id, {
            userAgent: req.get('user-agent') ?? undefined,
            ip: req.ip,
        })

        const perfil = await queryOne(`SELECT ${CAMPOS_PUBLICOS} FROM profiles WHERE id = $1`, [user.id])
        const tenant = user.tenant_id
            ? await queryOne('SELECT * FROM tenants WHERE id = $1', [user.tenant_id])
            : null

        res.json({
            accessToken,
            refreshToken,
            expiresAt,
            user: perfil,
            tenant,
        })
    })
)

// ─────────────────────────────────────────── REFRESH
authRouter.post(
    '/refresh',
    asyncHandler(async (req, res) => {
        const token = z.string().min(10).safeParse(req.body?.refreshToken)
        if (!token.success) throw badRequest('Falta el token de sesión.')

        const rotado = await rotateRefreshToken(token.data, {
            userAgent: req.get('user-agent') ?? undefined,
            ip: req.ip,
        })

        const user = await queryOne<FilaUsuario>(
            `SELECT id, email, role, tenant_id, is_active FROM profiles WHERE id = $1`,
            [rotado.userId]
        )
        if (!user) throw unauthorized()
        if (!user.is_active) throw forbidden('Tu cuenta está desactivada.')

        res.json({
            accessToken: signAccessToken({
                sub: user.id,
                tenant: user.tenant_id,
                role: user.role,
                email: user.email,
            }),
            refreshToken: rotado.token,
            expiresAt: rotado.expiresAt,
        })
    })
)

// ─────────────────────────────────────────── LOGOUT
authRouter.post(
    '/logout',
    asyncHandler(async (req, res) => {
        const token = req.body?.refreshToken
        if (typeof token === 'string' && token.length > 10) {
            await revokeRefreshToken(token)
        }
        res.status(204).end()
    })
)

// ─────────────────────────────────────────── USUARIO ACTUAL
authRouter.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
        const perfil = await queryOne(
            `SELECT ${CAMPOS_PUBLICOS} FROM profiles WHERE id = $1`,
            [req.user!.sub]
        )
        if (!perfil) throw notFound('Tu perfil')

        const tenant = (perfil as any).tenant_id
            ? await queryOne('SELECT * FROM tenants WHERE id = $1', [(perfil as any).tenant_id])
            : null

        res.json({ user: perfil, tenant })
    })
)

// ─────────────────────────────────────────── RECUPERAR CONTRASEÑA
authRouter.post(
    '/forgot-password',
    limitador,
    asyncHandler(async (req, res) => {
        const parsed = z.object({ email: z.string().email() }).safeParse(req.body)

        // Siempre se responde igual, exista o no el correo: así no se puede
        // usar este endpoint para averiguar qué cuentas están registradas.
        const respuesta = {
            message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
        }

        if (!parsed.success) return res.json(respuesta)

        const email = parsed.data.email.toLowerCase().trim()
        const user = await queryOne<{ id: string; full_name: string | null }>(
            'SELECT id, full_name FROM profiles WHERE lower(email) = $1 AND is_active = true',
            [email]
        )

        if (user) {
            const token = await issuePasswordResetToken(user.id)
            const enlace = `${config.appPublicUrl}/reset-password?token=${encodeURIComponent(token)}`

            if (config.mail.enabled) {
                await enviarCorreo({
                    to: email,
                    subject: 'Restablece tu contraseña de TicketWati',
                    html: plantillaRecuperacion(user.full_name ?? 'Hola', enlace),
                }).catch((err) => console.error('[auth] No se pudo enviar el correo:', err.message))
            } else {
                // Sin SMTP configurado se registra el enlace para uso manual.
                console.warn(
                    `[auth] SMTP no configurado. Enlace de recuperación para ${email}:\n   ${enlace}`
                )
            }
        }

        res.json(respuesta)
    })
)

authRouter.post(
    '/reset-password',
    limitador,
    asyncHandler(async (req, res) => {
        const parsed = z
            .object({ token: z.string().min(10), password: z.string() })
            .safeParse(req.body)
        if (!parsed.success) throw badRequest('Faltan datos para restablecer la contraseña.')

        validarPassword(parsed.data.password)

        const userId = await consumePasswordResetToken(parsed.data.token)
        if (!userId) {
            throw badRequest('El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.')
        }

        const hash = await hashPassword(parsed.data.password)
        await transaction(async () => {
            await query(
                'UPDATE profiles SET password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $1',
                [userId, hash]
            )
            await revokeAllUserTokens(userId)
        })

        res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
    })
)

// ─────────────────────────────────────────── CAMBIAR PROPIA CONTRASEÑA
authRouter.post(
    '/change-password',
    requireAuth,
    asyncHandler(async (req, res) => {
        const parsed = z
            .object({ currentPassword: z.string(), newPassword: z.string() })
            .safeParse(req.body)
        if (!parsed.success) throw badRequest('Debes indicar la contraseña actual y la nueva.')

        validarPassword(parsed.data.newPassword)

        const user = await queryOne<{ password_hash: string | null }>(
            'SELECT password_hash FROM profiles WHERE id = $1',
            [req.user!.sub]
        )
        if (!user) throw notFound('Tu perfil')

        const ok = await verifyPassword(parsed.data.currentPassword, user.password_hash)
        if (!ok) throw badRequest('La contraseña actual no es correcta.')

        const hash = await hashPassword(parsed.data.newPassword)
        await query('UPDATE profiles SET password_hash = $2 WHERE id = $1', [req.user!.sub, hash])
        await revokeAllUserTokens(req.user!.sub)

        res.json({ message: 'Contraseña actualizada. Vuelve a iniciar sesión.' })
    })
)

// ─────────────────────────────────────────── ALTA PÚBLICA (opcional)
authRouter.post(
    '/register',
    limitador,
    asyncHandler(async (req, res) => {
        if (!config.auth.allowPublicSignup) {
            throw forbidden(
                'El registro público está deshabilitado. Solicita una cuenta al administrador.'
            )
        }

        const parsed = z
            .object({
                email: z.string().email('Introduce un correo válido.'),
                password: z.string(),
                fullName: z.string().min(2, 'Escribe tu nombre completo.'),
                tenantSlug: z.string().optional(),
            })
            .safeParse(req.body)
        if (!parsed.success) {
            throw badRequest(parsed.error.issues[0]?.message ?? 'Datos de registro incompletos.')
        }

        validarPassword(parsed.data.password)
        const email = parsed.data.email.toLowerCase().trim()

        const existe = await queryOne('SELECT 1 FROM profiles WHERE lower(email) = $1', [email])
        if (existe) throw conflict('Ya existe una cuenta con ese correo electrónico.')

        const hash = await hashPassword(parsed.data.password)

        const creado = await transaction(async () => {
            let tenantId: string
            const slug = (parsed.data.tenantSlug ?? email.split('@')[1] ?? 'organizacion')
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')

            const existente = await queryOne<{ id: string }>(
                'SELECT id FROM tenants WHERE slug = $1',
                [slug]
            )

            if (existente) {
                tenantId = existente.id
            } else {
                const nuevo = await queryOne<{ id: string }>(
                    `INSERT INTO tenants (name, slug, primary_color, settings)
           VALUES ($1, $2, $3, '{}'::jsonb) RETURNING id`,
                    [parsed.data.tenantSlug ?? `Organización de ${parsed.data.fullName}`, slug, '#5b5ef0']
                )
                tenantId = nuevo!.id
            }

            return queryOne(
                `INSERT INTO profiles (tenant_id, email, full_name, role, is_active, password_hash, email_confirmed_at)
         VALUES ($1, $2, $3, 'customer', true, $4, now())
         RETURNING ${CAMPOS_PUBLICOS}`,
                [tenantId, email, parsed.data.fullName, hash]
            )
        })

        res.status(201).json({ user: creado, message: 'Cuenta creada. Ya puedes iniciar sesión.' })
    })
)
