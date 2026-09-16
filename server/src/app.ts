/**
 * Ensamblado de la aplicación Express.
 */
import express, { type Request, type Response, type NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { AppError, fromDatabaseError, notFound } from './core/errors.js'
import { checkConnection } from './db/pool.js'
import { authRouter } from './routes/auth.routes.js'
import { usersRouter } from './routes/users.routes.js'
import { resourcesRouter, metaRouter } from './routes/resources.routes.js'
import { statsRouter } from './routes/stats.routes.js'
import { filesRouter } from './routes/files.routes.js'
import { hardwareRouter } from './routes/hardware.routes.js'
import { ticketsRouter } from './routes/tickets.routes.js'
import { asignacionesRouter } from './routes/asignaciones.routes.js'
import { configuracionRouter } from './routes/configuracion.routes.js'
import { notificacionesRouter } from './routes/notificaciones.routes.js'

export function crearApp() {
    const app = express()

    if (config.trustProxy) app.set('trust proxy', 1)
    app.disable('x-powered-by')

    app.use(helmet({
        // La API sirve JSON y adjuntos; no necesita CSP de documento.
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }))

    app.use(
        cors({
            origin(origin, callback) {
                // Peticiones sin origen (curl, apps móviles, el agente Python).
                if (!origin) return callback(null, true)
                if (config.cors.origins.includes(origin)) return callback(null, true)
                callback(new Error(`Origen no permitido por CORS: ${origin}`))
            },
            credentials: true,
        })
    )

    app.use(compression())
    app.use(express.json({ limit: '5mb' }))
    app.use(express.urlencoded({ extended: true, limit: '5mb' }))

    app.use(
        rateLimit({
            windowMs: config.rateLimit.windowMs,
            max: config.rateLimit.max,
            standardHeaders: true,
            legacyHeaders: false,
            message: {
                error: {
                    code: 'DEMASIADAS_PETICIONES',
                    message: 'Has hecho demasiadas peticiones. Espera un momento.',
                },
            },
        })
    )

    // ── Salud ────────────────────────────────────────────────────
    app.get('/health', async (_req, res) => {
        const db = await checkConnection()
        res.status(db.ok ? 200 : 503).json({
            estado: db.ok ? 'ok' : 'sin base de datos',
            baseDatos: db.ok ? 'conectada' : db.error,
            entorno: config.env,
            version: '1.0.0',
        })
    })

    // ── Rutas ────────────────────────────────────────────────────
    const api = '/api/v1'
    app.use(`${api}/auth`, authRouter)
    app.use(`${api}/usuarios`, usersRouter)
    app.use(`${api}/estadisticas`, statsRouter)
    app.use(`${api}/archivos`, filesRouter)
    app.use(`${api}/hardware`, hardwareRouter)
    app.use(`${api}/tickets`, ticketsRouter)   // operaciones específicas de tickets
    app.use(`${api}/maintenance_activities`, asignacionesRouter)
    app.use(`${api}/configuracion`, configuracionRouter)
    app.use(`${api}/notificaciones`, notificacionesRouter)
    app.use(`${api}/meta`, metaRouter)
    // El router genérico va al final: atiende el resto de recursos.
    app.use(api, resourcesRouter)

    // ── 404 ──────────────────────────────────────────────────────
    app.use((req, _res, next) => {
        next(notFound(`La ruta ${req.method} ${req.path}`))
    })

    // ── Errores ──────────────────────────────────────────────────
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
        let error: AppError

        if (err instanceof AppError) {
            error = err
        } else if (err?.code && typeof err.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code)) {
            error = fromDatabaseError(err)
        } else if (err?.type === 'entity.parse.failed') {
            error = new AppError(400, 'JSON_INVALIDO', 'El cuerpo de la petición no es JSON válido.')
        } else if (err?.message?.startsWith('Origen no permitido')) {
            error = new AppError(403, 'CORS_BLOQUEADO', err.message)
        } else {
            error = new AppError(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado en el servidor.')
        }

        // El detalle técnico va al log, nunca al cliente.
        if (error.status >= 500) {
            console.error(
                `[error] ${req.method} ${req.path} → ${err?.message ?? err}`,
                err?.sqlSnippet ? `\n  SQL: ${err.sqlSnippet}` : '',
                err?.stack ? `\n${err.stack.split('\n').slice(1, 4).join('\n')}` : ''
            )
        }

        res.status(error.status).json({
            error: {
                code: error.code,
                message: error.message,
                ...(error.details ? { details: error.details } : {}),
            },
        })
    })

    return app
}
