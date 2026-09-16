/**
 * Ayudantes para construir SQL de forma segura.
 *
 * Los VALORES siempre viajan como parámetros ($1, $2, …).
 * Los IDENTIFICADORES (tablas y columnas) nunca vienen crudos del cliente:
 * se validan contra una lista blanca definida en el registro de recursos y,
 * además, se citan con `ident()`.
 */

const IDENT_RE = /^[a-z_][a-z0-9_]*$/i

/** Cita un identificador tras comprobar que tiene forma válida. */
export function ident(name: string): string {
    if (!IDENT_RE.test(name)) {
        throw new Error(`Identificador SQL no permitido: ${name}`)
    }
    return `"${name}"`
}

/** Cita `tabla.columna` o `columna`. */
export function col(name: string, table?: string): string {
    return table ? `${ident(table)}.${ident(name)}` : ident(name)
}

/** Acumula parámetros y devuelve sus marcadores posicionales. */
export class Params {
    private values: unknown[] = []

    add(value: unknown): string {
        this.values.push(value)
        return `$${this.values.length}`
    }

    addAll(values: unknown[]): string[] {
        return values.map((v) => this.add(v))
    }

    get all(): unknown[] {
        return this.values
    }

    get length(): number {
        return this.values.length
    }
}

/** Operadores de filtro admitidos en la API de listados. */
export type FilterOp =
    | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'like' | 'ilike' | 'in' | 'nin'
    | 'is_null' | 'not_null' | 'contains' | 'overlaps'

export interface Filter {
    column: string
    op: FilterOp
    value?: unknown
}

/**
 * Traduce un filtro a SQL. `column` debe haber sido validada previamente
 * contra las columnas permitidas del recurso.
 */
export function buildCondition(f: Filter, p: Params, table?: string): string {
    const c = col(f.column, table)
    switch (f.op) {
        case 'eq':
            return f.value === null ? `${c} IS NULL` : `${c} = ${p.add(f.value)}`
        case 'neq':
            return f.value === null ? `${c} IS NOT NULL` : `${c} <> ${p.add(f.value)}`
        case 'gt': return `${c} > ${p.add(f.value)}`
        case 'gte': return `${c} >= ${p.add(f.value)}`
        case 'lt': return `${c} < ${p.add(f.value)}`
        case 'lte': return `${c} <= ${p.add(f.value)}`
        case 'like': return `${c}::text LIKE ${p.add(f.value)}`
        case 'ilike': return `${c}::text ILIKE ${p.add(f.value)}`
        case 'is_null': return `${c} IS NULL`
        case 'not_null': return `${c} IS NOT NULL`
        case 'in': {
            const arr = Array.isArray(f.value) ? f.value : [f.value]
            if (arr.length === 0) return 'FALSE'
            return `${c} = ANY(${p.add(arr)})`
        }
        case 'nin': {
            const arr = Array.isArray(f.value) ? f.value : [f.value]
            if (arr.length === 0) return 'TRUE'
            return `NOT (${c} = ANY(${p.add(arr)}))`
        }
        // Para columnas de tipo array: ¿contiene todos estos elementos?
        case 'contains': {
            const arr = Array.isArray(f.value) ? f.value : [f.value]
            return `${c} @> ${p.add(arr)}`
        }
        // Para columnas de tipo array: ¿comparte algún elemento?
        case 'overlaps': {
            const arr = Array.isArray(f.value) ? f.value : [f.value]
            return `${c} && ${p.add(arr)}`
        }
        default:
            throw new Error(`Operador de filtro no soportado: ${(f as Filter).op}`)
    }
}

/** Une condiciones con AND; devuelve la cláusula WHERE completa o ''. */
export function whereClause(conditions: string[]): string {
    const real = conditions.filter(Boolean)
    return real.length > 0 ? `WHERE ${real.join(' AND ')}` : ''
}

/** Construye `ORDER BY` a partir de entradas ya validadas. */
export function orderClause(
    orders: { column: string; ascending?: boolean; nullsLast?: boolean }[],
    table?: string
): string {
    if (orders.length === 0) return ''
    const parts = orders.map((o) => {
        const dir = o.ascending === false ? 'DESC' : 'ASC'
        const nulls = o.nullsLast ? ' NULLS LAST' : ''
        return `${col(o.column, table)} ${dir}${nulls}`
    })
    return `ORDER BY ${parts.join(', ')}`
}

/**
 * Construye un INSERT a partir de un objeto, filtrando a las columnas
 * permitidas. Devuelve el SQL y los parámetros.
 */
export function buildInsert(
    table: string,
    data: Record<string, unknown>,
    allowed: Set<string>,
    returning = '*'
): { text: string; params: unknown[] } {
    const p = new Params()
    const cols: string[] = []
    const placeholders: string[] = []

    for (const [key, value] of Object.entries(data)) {
        if (!allowed.has(key)) continue
        if (value === undefined) continue
        cols.push(ident(key))
        placeholders.push(p.add(value))
    }

    if (cols.length === 0) {
        throw new Error('No hay columnas válidas para insertar')
    }

    return {
        text: `INSERT INTO ${ident(table)} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${returning}`,
        params: p.all,
    }
}

/** Construye un UPDATE ... WHERE id = $n. */
export function buildUpdate(
    table: string,
    id: string,
    data: Record<string, unknown>,
    allowed: Set<string>,
    extraConditions: { column: string; value: unknown }[] = [],
    returning = '*'
): { text: string; params: unknown[] } | null {
    const p = new Params()
    const sets: string[] = []

    for (const [key, value] of Object.entries(data)) {
        if (!allowed.has(key)) continue
        if (value === undefined) continue
        sets.push(`${ident(key)} = ${p.add(value)}`)
    }

    if (sets.length === 0) return null

    const conds = [`${ident('id')} = ${p.add(id)}`]
    for (const c of extraConditions) {
        conds.push(`${ident(c.column)} = ${p.add(c.value)}`)
    }

    return {
        text: `UPDATE ${ident(table)} SET ${sets.join(', ')} WHERE ${conds.join(' AND ')} RETURNING ${returning}`,
        params: p.all,
    }
}
