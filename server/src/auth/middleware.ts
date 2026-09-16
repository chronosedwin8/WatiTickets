/**
 * Middleware de autenticación y autorización.
 *
 * Sustituye a las políticas RLS de PostgreSQL: cada petición queda acotada
 * al tenant del usuario y a lo que su rol permite. El aislamiento entre
 * organizaciones se decide aquí, en un único punto.
 */
import type { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'
import { verifyAccessToken, type AccessPayload, type UserRole } from './tokens.js'
import { unauthorized, forbidden } from '../core/errors.js'
import { query, queryOne } from '../db/pool.js'

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AccessPayload
            apiKey?: { tenantId: string; scopes: string[]; id: string }
        }
    }
}

/** Jerarquía de roles: un rol incluye las capacidades de los inferiores. */
const JERARQUIA: Record<UserRole, number> = {
    owner: 70,
    admin: 60,
    manager: 50,
    technician: 30,
    agent: 30,
    developer: 30,
    customer: 10,
}

export const RANGO_STAFF: UserRole[] = ['owner', 'admin', 'manager', 'agent', 'technician', 'developer']
export const RANGO_ADMIN: UserRole[] = ['owner', 'admin']
export const RANGO_GESTION: UserRole[] = ['owner', 'admin', 'manager']

function extraerToken(req: Request): string | null {
    const h = req.headers.authorization
    if (h && h.startsWith('Bearer ')) return h.slice(7).trim()
    return null
}

/** Exige un usuario autenticado. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
    const token = extraerToken(req)
    if (!token) return next(unauthorized('Falta el token de acceso.'))
    try {
        req.user = verifyAccessToken(token)
        next()
    } catch (err) {
        next(err)
    }
}

/**
 * Autenticación opcional: si hay token válido rellena req.user, si no,
 * deja pasar. Útil en endpoints públicos que enriquecen si hay sesión.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    const token = extraerToken(req)
    if (!token) return next()
    try {
        req.user = verifyAccessToken(token)
    } catch {
        /* token inválido: se trata como anónimo */
    }
    next()
}

/** Exige que el rol del usuario esté entre los permitidos. */
export function requireRole(...roles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) return next(unauthorized())
        if (!roles.includes(req.user.role)) {
            return next(forbidden('Tu rol no tiene acceso a esta sección.'))
        }
        next()
    }
}

/** Exige un nivel mínimo en la jerarquía de roles. */
export function requireMinRole(minimo: UserRole) {
    const umbral = JERARQUIA[minimo]
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) return next(unauthorized())
        if ((JERARQUIA[req.user.role] ?? 0) < umbral) {
            return next(forbidden('Tu rol no tiene permisos suficientes para esta acción.'))
        }
        next()
    }
}

/** Exige que el usuario pertenezca a una organización. */
export function requireTenant(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) return next(unauthorized())
    if (!req.user.tenant) {
        return next(forbidden('Tu usuario no está asociado a ninguna organización.'))
    }
    next()
}

/** Devuelve el tenant de la petición; lanza si no hay. */
export function tenantId(req: Request): string {
    const t = req.user?.tenant
    if (!t) throw forbidden('Tu usuario no está asociado a ninguna organización.')
    return t
}

export function userId(req: Request): string {
    const u = req.user?.sub
    if (!u) throw unauthorized()
    return u
}

export function esStaff(req: Request): boolean {
    return req.user ? RANGO_STAFF.includes(req.user.role) : false
}

/**
 * Autentica una integración por clave de API (cabecera X-Agent-Key).
 * La usa el agente de inventario en Python.
 */
export function requireApiKey(scope: string) {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        const raw = req.header('X-Agent-Key') ?? req.header('X-Api-Key')
        if (!raw) return next(unauthorized('Falta la cabecera X-Agent-Key.'))

        const keyHash = crypto.createHash('sha256').update(raw).digest('hex')
        const row = await queryOne<{ id: string; tenant_id: string; scopes: string[] }>(
            `SELECT id, tenant_id, scopes FROM api_keys
        WHERE key_hash = $1 AND revoked_at IS NULL`,
            [keyHash]
        )

        if (!row) return next(unauthorized('La clave de integración no es válida.'))
        if (!row.scopes.includes(scope)) {
            return next(forbidden(`Esta clave no tiene el permiso "${scope}".`))
        }

        req.apiKey = { id: row.id, tenantId: row.tenant_id, scopes: row.scopes }
        // Registro de uso, sin bloquear la petición si falla.
        query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [row.id]).catch(() => { })
        next()
    }
}
