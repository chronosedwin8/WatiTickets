/**
 * Subida y descarga de archivos adjuntos.
 *
 * Los archivos viajan a la API, que los guarda (disco o S3 según su
 * configuración) y los sirve comprobando la sesión. El navegador nunca
 * maneja credenciales de almacenamiento.
 */
import { http, API_URL, sesion } from './http'

export interface ArchivoSubido {
    key: string
    nombreOriginal: string
    mime: string
    tamano: number
    url: string
}

/** Carpetas admitidas por el servidor. */
export type Carpeta = 'tickets' | 'kb' | 'activos' | 'ordenes' | 'general' | 'avatares'

/**
 * Sube un archivo y devuelve sus datos, incluida la URL con la que se
 * puede volver a descargar.
 */
export async function subirArchivo(file: File, carpeta: Carpeta = 'general'): Promise<ArchivoSubido> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('carpeta', carpeta)

    const res = await http.upload<{ data: ArchivoSubido }>('/archivos', formData)
    return res.data
}

/** Sube varios archivos, devolviendo los que se guardaron correctamente. */
export async function subirArchivos(
    files: File[],
    carpeta: Carpeta = 'general'
): Promise<{ subidos: ArchivoSubido[]; fallidos: { nombre: string; motivo: string }[] }> {
    const subidos: ArchivoSubido[] = []
    const fallidos: { nombre: string; motivo: string }[] = []

    for (const file of files) {
        try {
            subidos.push(await subirArchivo(file, carpeta))
        } catch (err) {
            fallidos.push({ nombre: file.name, motivo: (err as Error).message })
        }
    }

    return { subidos, fallidos }
}

/**
 * URL absoluta de un adjunto.
 * Como la descarga exige sesión, se usa junto a `descargarArchivo` para
 * abrirlo, o directamente en un <img> si el navegador ya tiene la cookie.
 */
export function urlArchivo(keyOUrl: string): string {
    if (/^https?:\/\//i.test(keyOUrl)) return keyOUrl
    const ruta = keyOUrl.startsWith('/api/v1/archivos/')
        ? keyOUrl.replace('/api/v1', '')
        : `/archivos/${encodeURIComponent(keyOUrl)}`
    return `${API_URL}${ruta}`
}

/**
 * Descarga un adjunto y devuelve una URL temporal del navegador.
 * Se usa para mostrar imágenes o abrir documentos protegidos.
 */
export async function descargarArchivo(keyOUrl: string): Promise<string> {
    const token = sesion.access
    const respuesta = await fetch(urlArchivo(keyOUrl), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!respuesta.ok) {
        throw new Error('No se pudo descargar el archivo.')
    }

    const blob = await respuesta.blob()
    return URL.createObjectURL(blob)
}

/** Elimina un adjunto del almacenamiento. */
export async function eliminarArchivo(key: string): Promise<void> {
    await http.delete(`/archivos/${encodeURIComponent(key)}`)
}

/** Tamaño legible para mostrar junto al nombre del archivo. */
export function tamanoLegible(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '—'
    const unidades = ['B', 'KB', 'MB', 'GB']
    let valor = bytes
    let i = 0
    while (valor >= 1024 && i < unidades.length - 1) {
        valor /= 1024
        i++
    }
    return `${valor.toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`
}

// Nombres anteriores, para no romper las vistas que ya los usaban.
export const uploadFileToS3 = (file: File, path: string) => {
    const carpeta = (path.split('/')[1] ?? 'general') as Carpeta
    return subirArchivo(file, carpeta).then((a) => a.url)
}
export const getSignedFileUrl = descargarArchivo
