/**
 * Emisión y verificación de tokens.
 *
 * Reemplaza a GoTrue (Supabase Auth):
 *   · Access token  — JWT corto (15 min por defecto), viaja en Authorization.
 *   · Refresh token — cadena aleatoria, se guarda HASHEADA en la base.
 *     Así, aunque alguien lea la tabla, no puede reusar las sesiones.
 */
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { config } from '../config.js'
import { query, queryOne } from '../db/pool.js'
import { unauthorized } from '../core/errors.js'

export type UserRole =
    | 'admin' | 'owner' | 'manager' | 'agent' | 'technician' | 'developer' | 'customer'

export interface AccessPayload {
    sub: string          // id del usuario
    tenant: string | null
    role: UserRole
    email: string
}

/** Firma el token de acceso. */
export function signAccessToken(payload: AccessPayload): string {
    return jwt.sign(payload, config.auth.jwtSecret, {
        expiresIn: config.auth.accessTtl as any,
        issuer: 'ticketwati',
    })
}

/** Verifica el token de acceso; lanza 401 si no es válido. */
export function verifyAccessToken(token: string): AccessPayload {
    try {
        return jwt.verify(token, config.auth.jwtSecret, { issuer: 'ticketwati' }) as AccessPayload
    } catch (err: any) {
        if (err?.name === 'TokenExpiredError') {
            throw unauthorized('Tu sesión expiró. Vuelve a iniciar sesión.')
        }
        throw unauthorized()
    }
}

const hash = (t: string) => crypto.createHash('sha256').update(t).digest('hex')

/** Crea un refresh token y lo registra. Devuelve el valor en claro (única vez). */
export async function issueRefreshToken(
    userId: string,
    meta: { userAgent?: string; ip?: string } = {}
): Promise<{ token: string; expiresAt: Date }> {
    const token = crypto.randomBytes(48).toString('base64url')
    const expiresAt = new Date(Date.now() + config.auth.refreshTtlDays * 86_400_000)

    await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
        [userId, hash(token), meta.userAgent ?? null, meta.ip ?? null, expiresAt]
    )

    return { token, expiresAt }
}

/**
 * Canjea un refresh token por uno nuevo (rotación).
 * Si el token no existe, expiró o ya fue revocado, se rechaza.
 */
export async function rotateRefreshToken(
    token: string,
    meta: { userAgent?: string; ip?: string } = {}
): Promise<{ userId: string; token: string; expiresAt: Date }> {
    const row = await queryOne<{ id: string; user_id: string }>(
        `SELECT id, user_id FROM refresh_tokens
      WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
        [hash(token)]
    )

    if (!row) throw unauthorized('Tu sesión expiró. Vuelve a iniciar sesión.')

    await query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id])
    const fresh = await issueRefreshToken(row.user_id, meta)

    return { userId: row.user_id, ...fresh }
}

/** Revoca un refresh token concreto (cierre de sesión). */
export async function revokeRefreshToken(token: string): Promise<void> {
    await query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
        [hash(token)]
    )
}

/** Revoca todas las sesiones de un usuario (cambio de contraseña, baja). */
export async function revokeAllUserTokens(userId: string): Promise<void> {
    await query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
    )
}

/** Genera un token de recuperación de contraseña. Devuelve el valor en claro. */
export async function issuePasswordResetToken(
    userId: string,
    ttlMinutes = 60
): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url')
    await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
        [userId, hash(token), String(ttlMinutes)]
    )
    return token
}

/** Consume un token de recuperación. Devuelve el usuario o null. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
    const row = await queryOne<{ id: string; user_id: string }>(
        `SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
        [hash(token)]
    )
    if (!row) return null
    await query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [row.id])
    return row.user_id
}

/** Limpia tokens caducados. Se ejecuta periódicamente. */
export async function purgeExpiredTokens(): Promise<number> {
    const r1 = await query(
        `DELETE FROM refresh_tokens WHERE expires_at < now() - interval '7 days' RETURNING 1`
    )
    const r2 = await query(
        `DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day' RETURNING 1`
    )
    return r1.length + r2.length
}
