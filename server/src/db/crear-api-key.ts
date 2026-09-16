/**
 * Crea una clave de integración para el agente de inventario.
 *
 *   npx tsx src/db/crear-api-key.ts "Nombre descriptivo"
 *
 * La clave se muestra UNA sola vez: en la base sólo queda su huella.
 */
import crypto from 'node:crypto'
import { queryOne, closePool } from './pool.js'

async function main() {
    const nombre = process.argv[2] ?? 'Agente de inventario'

    const tenant = await queryOne<{ id: string; name: string }>(
        'SELECT id, name FROM tenants ORDER BY created_at LIMIT 1'
    )
    if (!tenant) {
        console.error('No hay ninguna organización en la base de datos.')
        process.exit(1)
    }

    const clave = crypto.randomBytes(24).toString('base64url')
    const huella = crypto.createHash('sha256').update(clave).digest('hex')

    await queryOne(
        `INSERT INTO api_keys (tenant_id, name, key_hash, scopes)
     VALUES ($1, $2, $3, ARRAY['hardware:write']) RETURNING id`,
        [tenant.id, nombre, huella]
    )

    console.log(`
  Clave creada para "${nombre}"
  Organización: ${tenant.name}

  ${clave}

  Guárdala ahora: no se puede volver a consultar.
  Ponla en el archivo agente.ini de cada equipo, en el campo "clave".
`)
}

main()
    .catch((e) => { console.error('No se pudo crear la clave:', e.message); process.exitCode = 1 })
    .finally(() => closePool())
