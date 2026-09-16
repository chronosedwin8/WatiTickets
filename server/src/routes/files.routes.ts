/**
 * Subida y descarga de adjuntos.
 *
 *   POST /archivos            subir (multipart: campo "file", campo "carpeta")
 *   GET  /archivos/:key       descargar
 *   DELETE /archivos/:key     eliminar
 *
 * El acceso exige sesión y la clave del archivo lleva el tenant como
 * primer segmento, de modo que nadie descarga adjuntos de otra organización.
 */
import { Router } from 'express'
import multer from 'multer'
import { requireAuth, tenantId } from '../auth/middleware.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { badRequest, forbidden } from '../core/errors.js'
import { config } from '../config.js'
import {
    guardarArchivo, leerArchivo, borrarArchivo, tenantDeClave,
} from '../services/storage.service.js'

export const filesRouter = Router()

const subida = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.storage.maxFileBytes, files: 1 },
})

filesRouter.use(requireAuth)

filesRouter.post(
    '/',
    (req, res, next) => {
        subida.single('file')(req, res, (err: any) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const mb = Math.round(config.storage.maxFileBytes / 1024 / 1024)
                    return next(badRequest(`El archivo supera el límite de ${mb} MB.`))
                }
                return next(badRequest('No se pudo procesar el archivo enviado.'))
            }
            next()
        })
    },
    asyncHandler(async (req, res) => {
        if (!req.file) throw badRequest('No se recibió ningún archivo. Adjunta uno en el campo "file".')

        const guardado = await guardarArchivo({
            tenantId: tenantId(req),
            carpeta: (req.body?.carpeta as string) ?? 'general',
            nombreOriginal: req.file.originalname,
            mime: req.file.mimetype,
            contenido: req.file.buffer,
        })

        res.status(201).json({ data: guardado })
    })
)

filesRouter.get(
    '/:key(*)',
    asyncHandler(async (req, res) => {
        const key = decodeURIComponent(req.params.key)
        const duenyo = tenantDeClave(key)

        if (!duenyo || duenyo !== tenantId(req)) {
            throw forbidden('Este archivo pertenece a otra organización.')
        }

        const archivo = await leerArchivo(key)
        if (archivo.mime) res.type(archivo.mime)
        if (archivo.tamano) res.setHeader('Content-Length', String(archivo.tamano))
        // Se fuerza descarga/visualización segura: nunca se ejecuta como HTML.
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Content-Disposition', `inline; filename="${sanear(key.split('/').pop() ?? 'archivo')}"`)
        archivo.stream.pipe(res)
    })
)

filesRouter.delete(
    '/:key(*)',
    asyncHandler(async (req, res) => {
        const key = decodeURIComponent(req.params.key)
        if (tenantDeClave(key) !== tenantId(req)) {
            throw forbidden('Este archivo pertenece a otra organización.')
        }
        await borrarArchivo(key)
        res.status(204).end()
    })
)

function sanear(nombre: string): string {
    return nombre.replace(/["\r\n]/g, '')
}
