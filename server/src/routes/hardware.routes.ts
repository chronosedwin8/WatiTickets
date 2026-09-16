/**
 * Ingesta del inventario tecnológico.
 *
 * El agente que corre en cada equipo (tools/analisishardware) envía aquí su
 * informe. El activo se identifica por número de serie dentro de la
 * organización: si ya existe se actualiza, si no se crea.
 *
 *   POST /hardware/report   — el agente publica su informe (cabecera X-Agent-Key)
 *   GET  /hardware/equipos  — resumen del parque para la aplicación
 *
 * El agente se autentica con una clave de integración, no con un usuario:
 * así no hace falta incrustar credenciales de persona en los equipos.
 */
import { Router } from 'express'
import crypto from 'node:crypto'
import { z } from 'zod'
import { query, queryOne, transaction } from '../db/pool.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { badRequest } from '../core/errors.js'
import { requireApiKey, requireAuth, tenantId } from '../auth/middleware.js'
import { config } from '../config.js'

export const hardwareRouter = Router()

/**
 * Esquema flexible: el agente puede crecer y añadir secciones sin que la
 * API deje de aceptar sus informes. Sólo se exige lo que identifica al equipo.
 */
const esquemaInforme = z.object({
    device_info: z.object({
        device_name: z.string().min(1, 'Falta el nombre del equipo.'),
        serial_number: z.string().optional().nullable(),
        manufacturer: z.string().optional().nullable(),
        model: z.string().optional().nullable(),
        domain: z.string().optional().nullable(),
        public_ip: z.string().optional().nullable(),
        private_ip: z.string().optional().nullable(),
        last_logged_user: z.string().optional().nullable(),
        last_reboot: z.string().optional().nullable(),
    }),
    hardware: z.record(z.unknown()).optional(),
    software: z.record(z.unknown()).optional(),
    security: z.record(z.unknown()).optional(),
    licenses: z.record(z.unknown()).optional(),
    generated_at: z.string().optional(),
}).passthrough()

/** Extrae la primera MAC del informe, si viene. */
function primeraMac(informe: any): string | null {
    const adaptadores = informe?.hardware?.network_adapters?.adapters
    if (Array.isArray(adaptadores)) {
        for (const a of adaptadores) {
            if (a?.mac_address) return String(a.mac_address)
        }
    }
    return null
}

/** Construye la descripción del sistema operativo. */
function sistemaOperativo(informe: any): string | null {
    const s = informe?.software?.system
    if (!s) return null
    const partes = [s.os, s.release, s.version].filter(Boolean)
    return partes.length ? partes.join(' ') : null
}

hardwareRouter.post(
    '/report',
    requireApiKey('hardware:write'),
    asyncHandler(async (req, res) => {
        if (!config.hardwareAgent.enabled) {
            throw badRequest(
                'La ingesta de inventario está desactivada. Define HARDWARE_AGENT_KEY en el servidor.'
            )
        }

        const parsed = esquemaInforme.safeParse(req.body)
        if (!parsed.success) {
            throw badRequest(
                `El informe del agente no tiene el formato esperado: ${parsed.error.issues[0]?.message}`
            )
        }

        const informe = parsed.data
        const dispositivo = informe.device_info
        const tenant = req.apiKey!.tenantId

        // Identificador estable del equipo. Si el fabricante no expone número
        // de serie se deriva uno del nombre para no duplicar registros.
        let serie = (dispositivo.serial_number ?? '').trim()
        if (!serie || serie.toUpperCase() === 'N/A' || /^(default|to be filled)/i.test(serie)) {
            serie = `AUTO-${crypto
                .createHash('sha1')
                .update(dispositivo.device_name.toLowerCase())
                .digest('hex')
                .slice(0, 12)
                .toUpperCase()}`
        }

        const resultado = await transaction(async () => {
            const existente = await queryOne<{ id: string; status: string }>(
                'SELECT id, status FROM assets WHERE tenant_id = $1 AND serial_number = $2',
                [tenant, serie]
            )

            const campos = {
                name: dispositivo.device_name,
                manufacturer: dispositivo.manufacturer ?? null,
                model: dispositivo.model ?? null,
                hardware_info: JSON.stringify(informe),
                operating_system: sistemaOperativo(informe),
                ip_address: dispositivo.private_ip ?? null,
                mac_address: primeraMac(informe),
                last_seen_at: new Date().toISOString(),
            }

            if (existente) {
                const fila = await queryOne(
                    `UPDATE assets SET
             name = $3, manufacturer = $4, model = $5,
             hardware_info = $6::jsonb, operating_system = $7,
             ip_address = $8, mac_address = $9, last_seen_at = $10,
             updated_at = now()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, name, serial_number, status`,
                    [
                        existente.id, tenant, campos.name, campos.manufacturer, campos.model,
                        campos.hardware_info, campos.operating_system, campos.ip_address,
                        campos.mac_address, campos.last_seen_at,
                    ]
                )
                return { creado: false, activo: fila }
            }

            const fila = await queryOne(
                `INSERT INTO assets
           (tenant_id, name, serial_number, manufacturer, model, status,
            hardware_info, operating_system, ip_address, mac_address, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, 'in_use', $6::jsonb, $7, $8, $9, $10)
         RETURNING id, name, serial_number, status`,
                [
                    tenant, campos.name, serie, campos.manufacturer, campos.model,
                    campos.hardware_info, campos.operating_system, campos.ip_address,
                    campos.mac_address, campos.last_seen_at,
                ]
            )
            return { creado: true, activo: fila }
        })

        res.status(resultado.creado ? 201 : 200).json({
            message: resultado.creado
                ? 'Equipo registrado en el inventario.'
                : 'Inventario del equipo actualizado.',
            data: resultado.activo,
        })
    })
)

/** Resumen del parque informático para los paneles de la aplicación. */
hardwareRouter.get(
    '/equipos',
    requireAuth,
    asyncHandler(async (req, res) => {
        const tenant = tenantId(req)

        const equipos = await query(
            `SELECT id, name, serial_number, manufacturer, model, status,
              operating_system, ip_address, mac_address, last_seen_at,
              hardware_info->'hardware'->'cpu'->>'name'            AS cpu,
              hardware_info->'hardware'->'ram'->>'total_installed' AS memoria,
              hardware_info->'device_info'->>'last_logged_user'    AS ultimo_usuario,
              jsonb_array_length(
                COALESCE(hardware_info->'software'->'installed_software', '[]'::jsonb)
              ) AS programas_instalados
         FROM assets
        WHERE tenant_id = $1 AND hardware_info IS NOT NULL
        ORDER BY last_seen_at DESC NULLS LAST`,
            [tenant]
        )

        const resumen = await queryOne(
            `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE last_seen_at > now() - interval '7 days')::int  AS activos_semana,
         count(*) FILTER (WHERE last_seen_at < now() - interval '30 days')::int AS sin_reportar
       FROM assets
      WHERE tenant_id = $1 AND hardware_info IS NOT NULL`,
            [tenant]
        )

        res.json({ data: equipos, resumen })
    })
)

/** Detalle completo del informe de un equipo. */
hardwareRouter.get(
    '/equipos/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
        const fila = await queryOne(
            `SELECT id, name, serial_number, hardware_info, last_seen_at
         FROM assets WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, tenantId(req)]
        )
        if (!fila) throw badRequest('No se encontró el equipo en el inventario.')
        res.json({ data: fila })
    })
)
