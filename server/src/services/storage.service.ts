/**
 * Almacenamiento de archivos adjuntos.
 *
 * Sustituye a la Edge Function de URLs prefirmadas de S3. Por defecto
 * guarda en el disco del servidor; si se configura S3 se usa un bucket.
 * En ambos casos el acceso pasa por la API, que comprueba la sesión: los
 * archivos no quedan expuestos públicamente.
 */
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { config } from '../config.js'
import { badRequest, notFound } from '../core/errors.js'

export interface ArchivoGuardado {
    key: string
    nombreOriginal: string
    mime: string
    tamano: number
    url: string
}

/** Carpetas lógicas admitidas. Evita que el cliente escriba donde quiera. */
const CARPETAS = new Set(['tickets', 'kb', 'activos', 'ordenes', 'general', 'avatares'])

function validarCarpeta(carpeta: string): string {
    const limpia = carpeta.trim().toLowerCase()
    if (!CARPETAS.has(limpia)) {
        throw badRequest(
            `Carpeta de destino no válida. Usa una de: ${[...CARPETAS].join(', ')}.`
        )
    }
    return limpia
}

/** Genera una clave única e inocua a partir del nombre original. */
function generarClave(tenantId: string, carpeta: string, nombreOriginal: string): string {
    const ext = path.extname(nombreOriginal).slice(0, 12).replace(/[^a-zA-Z0-9.]/g, '')
    const base = path
        .basename(nombreOriginal, path.extname(nombreOriginal))
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .slice(0, 60) || 'archivo'
    const unico = crypto.randomBytes(8).toString('hex')
    return `${tenantId}/${carpeta}/${Date.now()}-${unico}-${base}${ext}`
}

/** Comprueba tipo y tamaño antes de escribir nada. */
export function validarArchivo(mime: string, tamano: number): void {
    if (tamano > config.storage.maxFileBytes) {
        const mb = Math.round(config.storage.maxFileBytes / 1024 / 1024)
        throw badRequest(`El archivo supera el límite de ${mb} MB.`)
    }
    if (config.storage.allowedMime.length > 0 && !config.storage.allowedMime.includes(mime)) {
        throw badRequest(`No se permite subir archivos de tipo "${mime}".`)
    }
}

// ── Controlador local ──────────────────────────────────────────────────
async function guardarLocal(key: string, contenido: Buffer): Promise<void> {
    const destino = path.join(config.storage.localDir, key)
    // Defensa adicional: el destino no puede salir del directorio base.
    const base = path.resolve(config.storage.localDir)
    if (!path.resolve(destino).startsWith(base + path.sep)) {
        throw badRequest('Ruta de archivo no válida.')
    }
    await fs.mkdir(path.dirname(destino), { recursive: true })
    await fs.writeFile(destino, contenido)
}

async function leerLocal(key: string): Promise<{ stream: NodeJS.ReadableStream; tamano: number }> {
    const destino = path.join(config.storage.localDir, key)
    const base = path.resolve(config.storage.localDir)
    if (!path.resolve(destino).startsWith(base + path.sep)) {
        throw badRequest('Ruta de archivo no válida.')
    }
    try {
        const stat = await fs.stat(destino)
        return { stream: createReadStream(destino), tamano: stat.size }
    } catch {
        throw notFound('El archivo')
    }
}

async function borrarLocal(key: string): Promise<void> {
    const destino = path.join(config.storage.localDir, key)
    const base = path.resolve(config.storage.localDir)
    if (!path.resolve(destino).startsWith(base + path.sep)) return
    await fs.rm(destino, { force: true })
}

// ── Controlador S3 (opcional) ──────────────────────────────────────────
// El SDK de AWS sólo hace falta si STORAGE_DRIVER=s3. Se carga de forma
// perezosa y con el nombre en una variable, para que el proyecto compile
// y funcione sin tener el paquete instalado.
const PAQUETE_S3 = '@aws-sdk/client-s3'

let sdkS3: any = null
async function cargarSdkS3(): Promise<any> {
    if (sdkS3) return sdkS3
    try {
        sdkS3 = await import(/* @vite-ignore */ PAQUETE_S3)
        return sdkS3
    } catch {
        throw new Error(
            'El almacenamiento está configurado como S3 pero falta el paquete. ' +
            'Instálalo con:  npm install @aws-sdk/client-s3'
        )
    }
}

let clienteS3: any = null
async function obtenerS3() {
    if (clienteS3) return clienteS3
    const { S3Client } = await cargarSdkS3()
    clienteS3 = new S3Client({
        region: config.storage.s3.region,
        endpoint: config.storage.s3.endpoint,
        credentials:
            config.storage.s3.accessKeyId && config.storage.s3.secretAccessKey
                ? {
                    accessKeyId: config.storage.s3.accessKeyId,
                    secretAccessKey: config.storage.s3.secretAccessKey,
                }
                : undefined,
    })
    return clienteS3
}

// ── API pública del servicio ───────────────────────────────────────────
export async function guardarArchivo(opciones: {
    tenantId: string
    carpeta: string
    nombreOriginal: string
    mime: string
    contenido: Buffer
}): Promise<ArchivoGuardado> {
    const carpeta = validarCarpeta(opciones.carpeta)
    validarArchivo(opciones.mime, opciones.contenido.length)

    const key = generarClave(opciones.tenantId, carpeta, opciones.nombreOriginal)

    if (config.storage.driver === 's3') {
        const { PutObjectCommand } = await cargarSdkS3()
        const s3 = await obtenerS3()
        await s3.send(
            new PutObjectCommand({
                Bucket: config.storage.s3.bucket,
                Key: key,
                Body: opciones.contenido,
                ContentType: opciones.mime,
            })
        )
    } else {
        await guardarLocal(key, opciones.contenido)
    }

    return {
        key,
        nombreOriginal: opciones.nombreOriginal,
        mime: opciones.mime,
        tamano: opciones.contenido.length,
        // Se sirve siempre a través de la API, que valida la sesión.
        url: `/api/v1/archivos/${encodeURIComponent(key)}`,
    }
}

export async function leerArchivo(
    key: string
): Promise<{ stream: NodeJS.ReadableStream; tamano?: number; mime?: string }> {
    if (config.storage.driver === 's3') {
        const { GetObjectCommand } = await cargarSdkS3()
        const s3 = await obtenerS3()
        try {
            const salida = await s3.send(
                new GetObjectCommand({ Bucket: config.storage.s3.bucket, Key: key })
            )
            return {
                stream: salida.Body as NodeJS.ReadableStream,
                tamano: salida.ContentLength,
                mime: salida.ContentType,
            }
        } catch {
            throw notFound('El archivo')
        }
    }
    return leerLocal(key)
}

export async function borrarArchivo(key: string): Promise<void> {
    if (config.storage.driver === 's3') {
        const { DeleteObjectCommand } = await cargarSdkS3()
        const s3 = await obtenerS3()
        await s3.send(new DeleteObjectCommand({ Bucket: config.storage.s3.bucket, Key: key }))
        return
    }
    await borrarLocal(key)
}

/**
 * El primer segmento de la clave es el tenant. Se usa para impedir que un
 * usuario descargue adjuntos de otra organización.
 */
export function tenantDeClave(key: string): string | null {
    const partes = key.split('/')
    return partes.length > 1 ? partes[0] : null
}

/** Prepara el directorio local al arrancar. */
export async function prepararAlmacenamiento(): Promise<void> {
    if (config.storage.driver === 'local') {
        await fs.mkdir(config.storage.localDir, { recursive: true })
    }
}
