/**
 * Runner de migraciones.
 *
 * Aplica en orden los .sql de src/migrations, registrando cada uno en
 * la tabla `schema_migrations`. Cada migración corre en su transacción.
 *
 *   npm run migrate          → aplica las pendientes
 *   npm run migrate:status   → muestra el estado
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { pool, query, closePool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations')

interface MigrationFile {
    name: string
    fullPath: string
    sql: string
    checksum: string
}

async function ensureTable(): Promise<void> {
    await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        text PRIMARY KEY,
      checksum    text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function loadFiles(): Promise<MigrationFile[]> {
    let entries: string[]
    try {
        entries = await fs.readdir(MIGRATIONS_DIR)
    } catch {
        console.error(`No existe el directorio de migraciones: ${MIGRATIONS_DIR}`)
        return []
    }

    const files = entries.filter((f) => f.endsWith('.sql')).sort()
    const out: MigrationFile[] = []

    for (const name of files) {
        const fullPath = path.join(MIGRATIONS_DIR, name)
        const sql = await fs.readFile(fullPath, 'utf8')
        out.push({
            name,
            fullPath,
            sql,
            checksum: crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16),
        })
    }
    return out
}

async function applied(): Promise<Map<string, string>> {
    const rows = await query<{ name: string; checksum: string }>(
        'SELECT name, checksum FROM schema_migrations'
    )
    return new Map(rows.map((r) => [r.name, r.checksum]))
}

async function up(): Promise<void> {
    await ensureTable()
    const files = await loadFiles()
    const done = await applied()

    const pending = files.filter((f) => !done.has(f.name))

    // Aviso si una migración ya aplicada cambió de contenido.
    for (const f of files) {
        const prev = done.get(f.name)
        if (prev && prev !== f.checksum) {
            console.warn(
                `[migrate] AVISO: ${f.name} cambió desde que se aplicó. ` +
                `Las migraciones aplicadas deben ser inmutables; crea una nueva.`
            )
        }
    }

    if (pending.length === 0) {
        console.log('[migrate] La base ya está al día. Nada que aplicar.')
        return
    }

    console.log(`[migrate] Migraciones pendientes: ${pending.length}`)

    for (const f of pending) {
        const client = await pool.connect()
        const started = Date.now()
        try {
            await client.query('BEGIN')
            await client.query(f.sql)
            await client.query(
                'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
                [f.name, f.checksum]
            )
            await client.query('COMMIT')
            console.log(`[migrate] ✓ ${f.name} (${Date.now() - started}ms)`)
        } catch (err: any) {
            await client.query('ROLLBACK').catch(() => { })
            console.error(`[migrate] ✗ ${f.name}\n   ${err.message}`)
            client.release()
            throw err
        }
        client.release()
    }

    console.log('[migrate] Listo.')
}

async function status(): Promise<void> {
    await ensureTable()
    const files = await loadFiles()
    const done = await applied()

    console.log('\nEstado de migraciones\n─────────────────────')
    for (const f of files) {
        const mark = done.has(f.name) ? '✓ aplicada ' : '· pendiente'
        console.log(`  ${mark}  ${f.name}`)
    }
    const pending = files.filter((f) => !done.has(f.name)).length
    console.log(`\n${files.length} migraciones · ${pending} pendientes\n`)
}

const command = process.argv[2] ?? 'up'

try {
    if (command === 'up') await up()
    else if (command === 'status') await status()
    else {
        console.error(`Comando desconocido: ${command}. Usa "up" o "status".`)
        process.exitCode = 1
    }
} catch (err: any) {
    console.error('[migrate] Falló la migración:', err.message)
    process.exitCode = 1
} finally {
    await closePool()
}
