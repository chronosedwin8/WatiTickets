/**
 * Cliente HTTP de la aplicación.
 *
 * Sustituye al SDK de Supabase. Se encarga de:
 *   · añadir el token de acceso a cada petición,
 *   · renovarlo automáticamente cuando caduca (una sola vez por ráfaga),
 *   · traducir los errores del servidor a mensajes legibles.
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'

const CLAVE_ACCESO = 'tw.access_token'
const CLAVE_REFRESCO = 'tw.refresh_token'

// ── Almacén de sesión ──────────────────────────────────────────────────
export const sesion = {
    get access(): string | null {
        try { return localStorage.getItem(CLAVE_ACCESO) } catch { return null }
    },
    get refresh(): string | null {
        try { return localStorage.getItem(CLAVE_REFRESCO) } catch { return null }
    },
    guardar(accessToken: string, refreshToken: string) {
        try {
            localStorage.setItem(CLAVE_ACCESO, accessToken)
            localStorage.setItem(CLAVE_REFRESCO, refreshToken)
        } catch { /* modo privado o almacenamiento bloqueado */ }
    },
    limpiar() {
        try {
            localStorage.removeItem(CLAVE_ACCESO)
            localStorage.removeItem(CLAVE_REFRESCO)
        } catch { /* nada que hacer */ }
    },
}

/** Error con el mensaje que el servidor preparó para el usuario. */
export class ApiError extends Error {
    readonly status: number
    readonly code: string
    readonly details?: unknown

    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.code = code
        this.details = details
    }
}

// ── Avisos de cierre de sesión ─────────────────────────────────────────
type Oyente = () => void
const oyentesSesionExpirada = new Set<Oyente>()

/** Permite que AuthContext reaccione cuando la sesión deja de ser válida. */
export function alExpirarSesion(fn: Oyente): () => void {
    oyentesSesionExpirada.add(fn)
    return () => oyentesSesionExpirada.delete(fn)
}

function notificarExpiracion() {
    sesion.limpiar()
    oyentesSesionExpirada.forEach((fn) => {
        try { fn() } catch { /* un oyente no debe romper a los demás */ }
    })
}

// ── Renovación de token ────────────────────────────────────────────────
// Si varias peticiones caducan a la vez, sólo se renueva una vez.
let renovacionEnCurso: Promise<boolean> | null = null

async function renovarToken(): Promise<boolean> {
    if (renovacionEnCurso) return renovacionEnCurso

    renovacionEnCurso = (async () => {
        const refreshToken = sesion.refresh
        if (!refreshToken) return false

        try {
            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            })
            if (!res.ok) return false

            const datos = await res.json()
            if (!datos.accessToken) return false

            sesion.guardar(datos.accessToken, datos.refreshToken ?? refreshToken)
            return true
        } catch {
            return false
        } finally {
            // Se libera en el siguiente tick para que las peticiones en espera
            // reutilicen este mismo resultado.
            setTimeout(() => { renovacionEnCurso = null }, 0)
        }
    })()

    return renovacionEnCurso
}

// ── Petición base ──────────────────────────────────────────────────────
interface OpcionesPeticion {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
    body?: unknown
    /** Cuerpo ya preparado (por ejemplo FormData para subir archivos). */
    raw?: BodyInit
    signal?: AbortSignal
    /** No intentar renovar el token ante un 401 (se usa en el propio login). */
    sinReintento?: boolean
}

async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    const ejecutar = async (): Promise<Response> => {
        const cabeceras: Record<string, string> = {}
        const token = sesion.access
        if (token) cabeceras.Authorization = `Bearer ${token}`

        let cuerpo: BodyInit | undefined
        if (opciones.raw !== undefined) {
            cuerpo = opciones.raw // FormData: el navegador pone el Content-Type
        } else if (opciones.body !== undefined) {
            cabeceras['Content-Type'] = 'application/json'
            cuerpo = JSON.stringify(opciones.body)
        }

        return fetch(`${API_URL}${ruta}`, {
            method: opciones.method ?? 'GET',
            headers: cabeceras,
            body: cuerpo,
            signal: opciones.signal,
        })
    }

    let respuesta: Response
    try {
        respuesta = await ejecutar()
    } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err
        throw new ApiError(
            0,
            'SIN_CONEXION',
            'No se pudo conectar con el servidor. Comprueba tu conexión o que el servicio esté activo.'
        )
    }

    // Token caducado: se renueva y se repite la petición una sola vez.
    if (respuesta.status === 401 && !opciones.sinReintento) {
        const renovado = await renovarToken()
        if (renovado) {
            respuesta = await ejecutar()
        } else {
            notificarExpiracion()
        }
    }

    if (respuesta.status === 204) return undefined as T

    const texto = await respuesta.text()
    let datos: any = null
    if (texto) {
        try { datos = JSON.parse(texto) } catch { datos = texto }
    }

    if (!respuesta.ok) {
        const error = datos?.error
        throw new ApiError(
            respuesta.status,
            error?.code ?? 'ERROR',
            error?.message ?? mensajePorEstado(respuesta.status),
            error?.details
        )
    }

    return datos as T
}

function mensajePorEstado(status: number): string {
    if (status === 403) return 'No tienes permisos para realizar esta acción.'
    if (status === 404) return 'No se encontró lo que buscabas.'
    if (status === 429) return 'Demasiadas peticiones. Espera un momento.'
    if (status >= 500) return 'El servidor tuvo un problema. Inténtalo de nuevo en unos instantes.'
    return 'La operación no se pudo completar.'
}

// ── Construcción de la query string ────────────────────────────────────
export type ValorConsulta = string | number | boolean | string[] | undefined | null

export function query(params: Record<string, ValorConsulta>): string {
    const partes: string[] = []
    for (const [clave, valor] of Object.entries(params)) {
        if (valor === undefined || valor === null || valor === '') continue
        const v = Array.isArray(valor) ? valor.join(',') : String(valor)
        partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(v)}`)
    }
    return partes.length > 0 ? `?${partes.join('&')}` : ''
}

// ── API pública ────────────────────────────────────────────────────────
export const http = {
    get: <T>(ruta: string, signal?: AbortSignal) => peticion<T>(ruta, { signal }),
    post: <T>(ruta: string, body?: unknown, extra?: Partial<OpcionesPeticion>) =>
        peticion<T>(ruta, { method: 'POST', body, ...extra }),
    patch: <T>(ruta: string, body?: unknown) => peticion<T>(ruta, { method: 'PATCH', body }),
    put: <T>(ruta: string, body?: unknown) => peticion<T>(ruta, { method: 'PUT', body }),
    delete: <T>(ruta: string) => peticion<T>(ruta, { method: 'DELETE' }),
    /** Subida de archivos con FormData. */
    upload: <T>(ruta: string, formData: FormData) =>
        peticion<T>(ruta, { method: 'POST', raw: formData }),
}

/** Forma estándar de las respuestas del servidor. */
export interface RespuestaLista<T> {
    data: T[]
    total?: number
    limit: number
    offset: number
}

export interface RespuestaItem<T> {
    data: T
}

export { API_URL }
