/**
 * Punto de entrada del servidor.
 */
import { crearApp } from './app.js'
import { config } from './config.js'
import { checkConnection, closePool } from './db/pool.js'
import { warmColumnCache } from './core/crud.js'
import { resources } from './core/registry.js'
import { prepararAlmacenamiento } from './services/storage.service.js'
import { purgeExpiredTokens } from './auth/tokens.js'

async function arrancar() {
    console.log(`\n  TicketWati · API  ·  entorno ${config.env}\n`)

    // 1. Base de datos
    const db = await checkConnection()
    if (!db.ok) {
        console.error(
            `  No se pudo conectar a PostgreSQL (${config.db.host}:${config.db.port}/${config.db.database}).\n` +
            `  ${db.error}\n\n` +
            `  Comprueba que el servicio está activo y que las credenciales de .env son correctas.\n`
        )
        process.exit(1)
    }
    console.log(`  ✓ Base de datos: ${config.db.database} en ${config.db.host}:${config.db.port}`)

    // 2. Verificar que el registro coincide con la base de datos
    const { tablasFaltantes, columnasFaltantes } = await warmColumnCache(resources)
    if (tablasFaltantes.length > 0) {
        console.error(
            `\n  Faltan tablas en la base de datos: ${tablasFaltantes.join(', ')}\n` +
            `  Ejecuta las migraciones con:  npm run migrate\n`
        )
        process.exit(1)
    }
    if (columnasFaltantes.length > 0) {
        console.warn(
            `\n  Aviso: el registro declara columnas que no existen en la base:\n` +
            columnasFaltantes.map((c) => `    · ${c}`).join('\n') +
            `\n  Revisa src/core/registry.ts o añade una migración.\n`
        )
    }
    console.log(`  ✓ Recursos disponibles: ${resources.length}`)

    // 3. Almacenamiento
    await prepararAlmacenamiento()
    console.log(
        `  ✓ Almacenamiento: ${config.storage.driver === 'local'
            ? `disco local (${config.storage.localDir})`
            : `S3 (${config.storage.s3.bucket})`
        }`
    )

    // 4. Correo
    console.log(
        config.mail.enabled
            ? `  ✓ Correo saliente: ${config.mail.host}:${config.mail.port}`
            : `  · Correo saliente: sin configurar (las notificaciones quedarán en el log)`
    )

    // 5. Agente de inventario
    console.log(
        config.hardwareAgent.enabled
            ? `  ✓ Ingesta de inventario: activa`
            : `  · Ingesta de inventario: sin clave (define HARDWARE_AGENT_KEY)`
    )

    // 6. Servidor
    const app = crearApp()
    const server = app.listen(config.port, config.host, () => {
        console.log(`\n  Escuchando en http://localhost:${config.port}`)
        console.log(`  Salud:        http://localhost:${config.port}/health`)
        console.log(`  Orígenes web: ${config.cors.origins.join(', ')}\n`)
    })

    // Limpieza periódica de tokens caducados (cada 6 horas).
    const limpieza = setInterval(() => {
        purgeExpiredTokens()
            .then((n) => n > 0 && console.log(`[mantenimiento] ${n} tokens caducados eliminados.`))
            .catch((e) => console.error('[mantenimiento] Error limpiando tokens:', e.message))
    }, 6 * 60 * 60 * 1000)
    limpieza.unref?.()

    // Cierre ordenado
    const cerrar = async (senal: string) => {
        console.log(`\n  ${senal} recibido. Cerrando…`)
        clearInterval(limpieza)
        server.close(async () => {
            await closePool()
            console.log('  Servidor detenido correctamente.\n')
            process.exit(0)
        })
        // Si algo se queda colgado, se fuerza la salida.
        setTimeout(() => process.exit(1), 10_000).unref()
    }

    process.on('SIGINT', () => cerrar('SIGINT'))
    process.on('SIGTERM', () => cerrar('SIGTERM'))
}

arrancar().catch((err) => {
    console.error('\n  Falló el arranque del servidor:', err)
    process.exit(1)
})
