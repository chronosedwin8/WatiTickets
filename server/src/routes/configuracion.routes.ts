/**
 * Operaciones de configuración que no encajan en el CRUD genérico.
 */
import { Router } from 'express'
import { z } from 'zod'
import { query, transaction } from '../db/pool.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { badRequest } from '../core/errors.js'
import { requireAuth, requireRole, tenantId, RANGO_ADMIN } from '../auth/middleware.js'
import { verificarSmtp } from '../services/email.service.js'
import { config } from '../config.js'

export const configuracionRouter = Router()
configuracionRouter.use(requireAuth)

const ROLES = ['admin', 'owner', 'manager', 'agent', 'technician', 'developer', 'customer'] as const

/**
 * Reemplaza de una vez toda la matriz de permisos de menú.
 * La alternativa era borrar e insertar fila a fila desde el navegador:
 * decenas de peticiones y un estado intermedio inconsistente.
 */
configuracionRouter.put(
    '/permisos-menu',
    requireRole(...RANGO_ADMIN),
    asyncHandler(async (req, res) => {
        const parsed = z
            .object({
                permisos: z.array(
                    z.object({
                        role: z.enum(ROLES),
                        menu_item: z.string().min(1),
                        is_visible: z.boolean(),
                    })
                ),
            })
            .safeParse(req.body)

        if (!parsed.success) {
            throw badRequest('La matriz de permisos enviada no tiene el formato esperado.')
        }

        const tenant = tenantId(req)

        await transaction(async () => {
            await query('DELETE FROM menu_permissions WHERE tenant_id = $1', [tenant])

            for (const p of parsed.data.permisos) {
                await query(
                    `INSERT INTO menu_permissions (tenant_id, role, menu_item, is_visible)
           VALUES ($1, $2, $3, $4)`,
                    [tenant, p.role, p.menu_item, p.is_visible]
                )
            }
        })

        res.json({
            message: 'Permisos guardados. Los usuarios verán los cambios al recargar.',
            data: { total: parsed.data.permisos.length },
        })
    })
)

/** Diagnóstico de la configuración del servidor. */
configuracionRouter.get(
    '/diagnostico',
    requireRole(...RANGO_ADMIN),
    asyncHandler(async (_req, res) => {
        const smtp = await verificarSmtp()

        res.json({
            data: {
                correo: {
                    configurado: config.mail.enabled,
                    conecta: smtp.ok,
                    error: smtp.error ?? null,
                    remitente: config.mail.from ?? null,
                },
                almacenamiento: {
                    tipo: config.storage.driver,
                    destino:
                        config.storage.driver === 'local'
                            ? config.storage.localDir
                            : config.storage.s3.bucket ?? 'sin bucket',
                    tamanoMaximoMb: Math.round(config.storage.maxFileBytes / 1024 / 1024),
                },
                inventario: {
                    ingestaActiva: config.hardwareAgent.enabled,
                },
                entorno: config.env,
            },
        })
    })
)
