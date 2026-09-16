/**
 * Propaga quién ejecuta la operación hasta los disparadores de PostgreSQL.
 *
 * Algunos triggers (por ejemplo el historial de activos) necesitan saber el
 * autor del cambio. Antes lo obtenían de auth.uid(); ahora la API fija
 * `app.current_user_id` en la conexión y todas las consultas de la operación
 * viajan por esa misma conexión gracias al contexto asíncrono.
 */
import { pool } from '../db/pool.js'
import { connectionContext } from '../db/context.js'

/** Ejecuta `fn` con el usuario fijado en la sesión de PostgreSQL. */
export async function withActor<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
    if (!userId) return fn()

    const client = await pool.connect()
    try {
        await client.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId])
        return await connectionContext.run(client, fn)
    } finally {
        try {
            await client.query('SELECT set_config($1, $2, false)', ['app.current_user_id', ''])
        } catch {
            /* la conexión ya no sirve; el pool la descartará */
        }
        client.release()
    }
}
