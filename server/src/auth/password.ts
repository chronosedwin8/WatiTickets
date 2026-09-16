/**
 * Hash y verificación de contraseñas.
 *
 * Se usa bcrypt con el mismo formato que generaba GoTrue ($2a$/$2b$),
 * por lo que las contraseñas existentes siguen siendo válidas tras la
 * migración: nadie tiene que restablecer su acceso.
 */
import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { badRequest } from '../core/errors.js'

/** Requisitos mínimos de una contraseña nueva. */
export const REGLAS_PASSWORD = {
    minimo: 8,
    descripcion: 'Debe tener al menos 8 caracteres e incluir letras y números.',
}

export function validarPassword(plano: string): void {
    if (typeof plano !== 'string' || plano.length < REGLAS_PASSWORD.minimo) {
        throw badRequest(`La contraseña es demasiado corta. ${REGLAS_PASSWORD.descripcion}`)
    }
    if (plano.length > 200) {
        throw badRequest('La contraseña es demasiado larga (máximo 200 caracteres).')
    }
    const tieneLetra = /[a-zA-Z]/.test(plano)
    const tieneNumero = /[0-9]/.test(plano)
    if (!tieneLetra || !tieneNumero) {
        throw badRequest(`La contraseña no cumple los requisitos. ${REGLAS_PASSWORD.descripcion}`)
    }
}

export async function hashPassword(plano: string): Promise<string> {
    return bcrypt.hash(plano, config.auth.bcryptRounds)
}

/**
 * Compara una contraseña con su hash.
 * Devuelve false (sin lanzar) si el hash está ausente o corrupto, para que
 * el flujo de login no distinga entre "no existe" y "clave incorrecta".
 */
export async function verifyPassword(plano: string, hash: string | null): Promise<boolean> {
    if (!hash) return false
    try {
        return await bcrypt.compare(plano, hash)
    } catch {
        return false
    }
}
