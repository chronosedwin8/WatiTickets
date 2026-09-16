/**
 * Contexto de conexión por operación.
 *
 * Permite que un grupo de consultas comparta la misma conexión del pool.
 * Es lo que hace posible fijar variables de sesión (como el autor de un
 * cambio) y que los disparadores de PostgreSQL las vean.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import type { PoolClient } from 'pg'

export const connectionContext = new AsyncLocalStorage<PoolClient>()

/** Devuelve la conexión activa del contexto, si la hay. */
export function currentClient(): PoolClient | undefined {
    return connectionContext.getStore()
}
