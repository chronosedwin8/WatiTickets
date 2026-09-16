/**
 * Pool de conexiones a PostgreSQL y utilidades de consulta.
 *
 * Todas las consultas del proyecto pasan por aquí. Nunca se interpola
 * valor de usuario en el SQL: siempre parámetros ($1, $2, ...).
 */
import pg from 'pg'
import { config } from '../config.js'
import { currentClient, connectionContext } from './context.js'

const { Pool, types } = pg

// PostgreSQL devuelve NUMERIC como string para no perder precisión.
// En este dominio (contadores, horas, costes) el número nativo es lo útil.
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)))
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : Number(v)))

export const pool = config.db.connectionString
    ? new Pool({
        connectionString: config.db.connectionString,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
        max: config.db.max,
    })
    : new Pool({
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
        max: config.db.max,
    })

pool.on('error', (err) => {
    console.error('[db] Error inesperado en una conexión inactiva:', err.message)
})

export type SqlParam = unknown

/**
 * Ejecuta una consulta y devuelve todas las filas.
 *
 * Si hay una conexión en el contexto actual (ver `withActor`/`transaction`),
 * la consulta viaja por ella; si no, se toma una del pool.
 */
export async function query<T = any>(text: string, params: SqlParam[] = []): Promise<T[]> {
    const started = Date.now()
    const ejecutor = currentClient() ?? pool
    try {
        const res = await ejecutor.query(text, params as any[])
        if (config.isDev) {
            const ms = Date.now() - started
            if (ms > 300) console.warn(`[db] Consulta lenta (${ms}ms): ${text.slice(0, 120)}…`)
        }
        return res.rows as T[]
    } catch (err: any) {
        // Se añade contexto sin filtrar los valores de los parámetros.
        err.sqlSnippet = text.slice(0, 300)
        throw err
    }
}

/** Ejecuta una consulta y devuelve la primera fila, o null. */
export async function queryOne<T = any>(text: string, params: SqlParam[] = []): Promise<T | null> {
    const rows = await query<T>(text, params)
    return rows.length > 0 ? rows[0] : null
}

/**
 * Ejecuta varias operaciones dentro de una transacción.
 *
 * Las llamadas a `query()` hechas dentro de `fn` usan automáticamente la
 * conexión de la transacción, sin necesidad de pasar el cliente a mano.
 */
export async function transaction<T>(
    fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        const result = await connectionContext.run(client, () => fn(client))
        await client.query('COMMIT')
        return result
    } catch (err) {
        try {
            await client.query('ROLLBACK')
        } catch {
            /* la conexión ya estaba rota */
        }
        throw err
    } finally {
        client.release()
    }
}

/** Comprueba que la base responde. Se usa en el arranque y en /health. */
export async function checkConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
    try {
        const row = await queryOne<{ version: string }>('select version()')
        return { ok: true, version: row?.version }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

export async function closePool(): Promise<void> {
    await pool.end()
}
