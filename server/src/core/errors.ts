/**
 * Errores de aplicación.
 *
 * Los mensajes están pensados para mostrarse al usuario: dicen qué pasó
 * y, cuando aplica, cómo resolverlo. Los detalles técnicos van al log,
 * nunca a la respuesta.
 */

export class AppError extends Error {
    readonly status: number
    readonly code: string
    readonly details?: unknown

    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message)
        this.name = 'AppError'
        this.status = status
        this.code = code
        this.details = details
    }
}

export const badRequest = (msg: string, details?: unknown) =>
    new AppError(400, 'SOLICITUD_INVALIDA', msg, details)

export const unauthorized = (msg = 'Tu sesión no es válida. Inicia sesión de nuevo.') =>
    new AppError(401, 'NO_AUTENTICADO', msg)

export const forbidden = (msg = 'No tienes permisos para realizar esta acción.') =>
    new AppError(403, 'SIN_PERMISOS', msg)

export const notFound = (recurso = 'El recurso solicitado') =>
    new AppError(404, 'NO_ENCONTRADO', `${recurso} no existe o fue eliminado.`)

export const conflict = (msg: string) =>
    new AppError(409, 'CONFLICTO', msg)

export const tooManyRequests = (msg = 'Demasiados intentos. Espera un momento y vuelve a intentarlo.') =>
    new AppError(429, 'DEMASIADAS_PETICIONES', msg)

export const serverError = (msg = 'Ocurrió un error inesperado en el servidor.') =>
    new AppError(500, 'ERROR_INTERNO', msg)

/**
 * Traduce errores de PostgreSQL a mensajes accionables.
 * Códigos: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function fromDatabaseError(err: any): AppError {
    switch (err?.code) {
        case '23505': // unique_violation
            return conflict(
                detalleUnico(err) ?? 'Ya existe un registro con esos datos.'
            )
        case '23503': // foreign_key_violation
            return badRequest(
                'La operación hace referencia a un registro que no existe. ' +
                'Verifica los datos relacionados e inténtalo de nuevo.'
            )
        case '23502': // not_null_violation
            return badRequest(`Falta un campo obligatorio: ${err.column ?? 'desconocido'}.`)
        case '23514': // check_violation
            return badRequest('Alguno de los valores enviados no es válido para este campo.')
        case '22P02': // invalid_text_representation
            return badRequest('Alguno de los valores tiene un formato incorrecto.')
        case '42703': // undefined_column
            return badRequest('Se intentó usar un campo que no existe.')
        case '42P01': // undefined_table
            return serverError('Falta una tabla en la base de datos. Ejecuta las migraciones.')
        case '57014': // query_canceled
            return new AppError(504, 'TIEMPO_AGOTADO', 'La consulta tardó demasiado y se canceló.')
        case 'ECONNREFUSED':
            return new AppError(
                503, 'BD_NO_DISPONIBLE',
                'No hay conexión con la base de datos. Verifica que PostgreSQL esté en ejecución.'
            )
        default:
            return serverError()
    }
}

function detalleUnico(err: any): string | null {
    const detail: string | undefined = err?.detail
    if (!detail) return null
    // detail viene como: Key (email)=(x@y.com) already exists.
    const m = detail.match(/Key \(([^)]+)\)=\(([^)]*)\)/)
    if (!m) return null
    const campo = m[1].replace(/lower\(|\)|::text/g, '')
    if (/email/i.test(campo)) return 'Ya existe un usuario con ese correo electrónico.'
    return `Ya existe un registro con ese valor en "${campo}".`
}
