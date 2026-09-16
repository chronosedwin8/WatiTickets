/**
 * Motor CRUD genérico.
 *
 * Construye las consultas de listado, lectura, creación, edición y borrado
 * a partir del registro de recursos, aplicando siempre:
 *   · aislamiento por organización (tenant),
 *   · lista blanca de columnas,
 *   · comprobación de rol.
 *
 * Las relaciones se resuelven con subconsultas JSON para devolver la misma
 * forma anidada que consumía el frontend, sin múltiples viajes a la base.
 */
import { query, queryOne } from '../db/pool.js'
import {
    ident, col, Params, buildCondition, whereClause, orderClause,
    buildInsert, buildUpdate, type Filter, type FilterOp,
} from '../db/sql.js'
import { getResource, allowedRoles, type Resource, type Relation } from './registry.js'
import { badRequest, forbidden, notFound } from './errors.js'
import type { UserRole } from '../auth/tokens.js'

// ── Introspección de columnas ──────────────────────────────────────────
const columnCache = new Map<string, string[]>()

export async function loadTableColumns(table: string): Promise<string[]> {
    const cached = columnCache.get(table)
    if (cached) return cached
    const rows = await query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
        [table]
    )
    const cols = rows.map((r) => r.column_name)
    columnCache.set(table, cols)
    return cols
}

/**
 * Precarga las columnas de todos los recursos y comprueba que el registro
 * coincide con la base de datos.
 *
 * Devuelve las tablas que no existen y avisa por consola de las columnas
 * declaradas que la tabla no tiene: así un desajuste se ve al arrancar y
 * no como un error a mitad de una petición.
 */
export async function warmColumnCache(
    resources: Resource[]
): Promise<{ tablasFaltantes: string[]; columnasFaltantes: string[] }> {
    const tablasFaltantes: string[] = []
    const columnasFaltantes: string[] = []

    for (const r of resources) {
        const cols = await loadTableColumns(r.table)
        if (cols.length === 0) {
            tablasFaltantes.push(r.table)
            continue
        }

        const existentes = new Set(cols)
        const declaradas = new Set<string>([
            ...r.writable,
            ...(r.updatable ?? []),
            ...r.filterable,
            ...(r.readable === '*' ? [] : r.readable),
        ])
        if (r.defaultOrder) declaradas.add(r.defaultOrder.column)

        for (const c of declaradas) {
            if (!existentes.has(c)) columnasFaltantes.push(`${r.table}.${c}`)
        }

        // Las relaciones apuntan a columnas locales y remotas concretas.
        for (const rel of r.relations ?? []) {
            const remotas = new Set(await loadTableColumns(rel.table))
            if (remotas.size === 0) {
                columnasFaltantes.push(`${r.name} → tabla "${rel.table}" no existe`)
                continue
            }
            const local = rel.kind === 'one' ? existentes : remotas
            if (!local.has(rel.on)) {
                columnasFaltantes.push(
                    `${r.name}.${rel.as} → ${rel.kind === 'one' ? r.table : rel.table}.${rel.on}`
                )
            }
            for (const c of rel.columns) {
                if (!remotas.has(c)) columnasFaltantes.push(`${rel.table}.${c} (relación ${rel.as})`)
            }
            if (rel.nested) {
                const anidadas = new Set(await loadTableColumns(rel.nested.table))
                for (const c of rel.nested.columns) {
                    if (!anidadas.has(c)) {
                        columnasFaltantes.push(`${rel.nested.table}.${c} (relación ${rel.as}.${rel.nested.as})`)
                    }
                }
            }
        }
    }

    return { tablasFaltantes, columnasFaltantes }
}

async function readableColumns(resource: Resource): Promise<string[]> {
    if (resource.readable === '*') return loadTableColumns(resource.table)
    return resource.readable
}

// ── Construcción de relaciones ─────────────────────────────────────────
/**
 * Devuelve la expresión SQL que materializa una relación como JSON.
 * `alias` es el alias de la tabla base en la consulta.
 */
function relationExpression(rel: Relation, alias: string): string {
    const relTable = ident(rel.table)

    if (rel.kind === 'one') {
        // La columna local `rel.on` apunta a `rel.table.id`.
        const cols = rel.columns.map((c) => col(c, '_r')).join(', ')
        return `(
      SELECT to_jsonb(_x) FROM (
        SELECT ${cols} FROM ${relTable} _r WHERE _r."id" = ${col(rel.on, alias)}
      ) _x
    ) AS ${ident(rel.as)}`
    }

    // kind === 'many': `rel.on` es la columna de la tabla remota que apunta a la base.
    let objeto: string
    if (rel.nested) {
        const n = rel.nested
        const nestedCols = n.columns.map((c) => col(c, '_n')).join(', ')
        objeto = `jsonb_build_object(${`'${n.as}'`}, (
      SELECT to_jsonb(_y) FROM (
        SELECT ${nestedCols} FROM ${ident(n.table)} _n WHERE _n."id" = ${col(n.on, '_r')}
      ) _y
    ))`
    } else {
        const cols = rel.columns.map((c) => `'${c}', ${col(c, '_r')}`).join(', ')
        objeto = `jsonb_build_object(${cols})`
    }

    const orden = rel.orderBy ? ` ORDER BY ${col(rel.orderBy, '_r')}` : ''
    return `(
    SELECT COALESCE(jsonb_agg(${objeto}${orden}), '[]'::jsonb)
      FROM ${relTable} _r WHERE ${col(rel.on, '_r')} = ${col('id', alias)}
  ) AS ${ident(rel.as)}`
}

/** Resuelve qué relaciones expandir a partir de ?expand=a,b,c */
function resolveExpand(resource: Resource, expand?: string): Relation[] {
    if (!resource.relations || resource.relations.length === 0) return []
    if (!expand) return []
    if (expand === '*') return resource.relations
    const pedidas = new Set(expand.split(',').map((s) => s.trim()).filter(Boolean))
    const desconocidas = [...pedidas].filter((p) => !resource.relations!.some((r) => r.as === p))
    if (desconocidas.length > 0) {
        throw badRequest(`Relaciones no disponibles en "${resource.name}": ${desconocidas.join(', ')}`)
    }
    return resource.relations.filter((r) => pedidas.has(r.as))
}

// ── Filtros desde la query string ──────────────────────────────────────
const OPS: FilterOp[] = [
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'in', 'nin', 'is_null', 'not_null', 'contains', 'overlaps',
]

const RESERVADOS = new Set(['expand', 'order', 'dir', 'limit', 'offset', 'page', 'select', 'search', 'count'])

/**
 * Traduce la query string a filtros validados.
 * Formatos aceptados:
 *   ?status=open                  → status eq 'open'
 *   ?status[in]=open,pending      → status in [...]
 *   ?created_at[gte]=2026-01-01   → created_at >= ...
 */
export function parseFilters(
    resource: Resource,
    q: Record<string, unknown>
): Filter[] {
    const permitidas = new Set(resource.filterable)
    const filtros: Filter[] = []

    // Express agrupa `col[gte]=x&col[lte]=y` en un objeto anidado
    // { col: { gte: x, lte: y } }. Se aplana a la forma `col[op]` para
    // tratar ambas notaciones igual.
    const plano: Record<string, unknown> = {}
    for (const [clave, valor] of Object.entries(q)) {
        if (valor !== null && typeof valor === 'object' && !Array.isArray(valor)) {
            for (const [op, v] of Object.entries(valor as Record<string, unknown>)) {
                plano[`${clave}[${op}]`] = v
            }
        } else {
            plano[clave] = valor
        }
    }

    for (const [rawKey, rawValue] of Object.entries(plano)) {
        if (RESERVADOS.has(rawKey)) continue

        const m = rawKey.match(/^([a-zA-Z0-9_]+)(?:\[([a-z_]+)\])?$/)
        if (!m) continue

        const column = m[1]
        const op = (m[2] ?? 'eq') as FilterOp

        if (!permitidas.has(column)) {
            throw badRequest(`No se puede filtrar por "${column}" en ${resource.name}.`)
        }
        if (!OPS.includes(op)) {
            throw badRequest(`Operador de filtro no válido: "${op}".`)
        }

        let value: unknown = rawValue
        if (op === 'in' || op === 'nin' || op === 'contains' || op === 'overlaps') {
            value = typeof rawValue === 'string'
                ? rawValue.split(',').map((s) => s.trim()).filter(Boolean)
                : rawValue
        } else if (op === 'is_null' || op === 'not_null') {
            value = undefined
        } else if (rawValue === 'null') {
            value = null
        }

        filtros.push({ column, op, value })
    }

    return filtros
}

// ── Contexto de la petición ────────────────────────────────────────────
export interface Ctx {
    tenantId: string | null
    userId: string
    role: UserRole
    /**
     * Equipos a los que pertenece el usuario. Se resuelve una sola vez por
     * petición, la primera vez que un recurso lo necesita.
     */
    equipos?: string[]
}

/** Carga (y memoriza en el contexto) los equipos del usuario. */
async function equiposDe(ctx: Ctx): Promise<string[]> {
    if (ctx.equipos) return ctx.equipos
    const filas = await query<{ team_id: string }>(
        'SELECT team_id FROM team_members WHERE profile_id = $1',
        [ctx.userId]
    )
    ctx.equipos = filas.map((f) => f.team_id)
    return ctx.equipos
}

/**
 * Condición que limita QUÉ FILAS ve este usuario.
 *
 * Devuelve cadena vacía cuando el recurso no restringe, o cuando el rol del
 * usuario está autorizado a verlo todo.
 */
async function condicionVisibilidad(
    resource: Resource,
    ctx: Ctx,
    alias: string,
    p: Params
): Promise<string> {
    const v = resource.visibilidad
    if (!v) return ''
    if (v.verTodo.includes(ctx.role)) return ''

    const equipos = await equiposDe(ctx)

    return v.condicion({
        alias,
        usuario: ctx.userId,
        rol: ctx.role,
        equipos,
        param: (valor) => p.add(valor),
    })
}

function checkPermission(
    resource: Resource,
    op: 'list' | 'read' | 'create' | 'update' | 'delete',
    ctx: Ctx
): void {
    const roles = allowedRoles(resource, op)
    if (!roles.includes(ctx.role)) {
        throw forbidden(`Tu rol no permite ${traducirOp(op)} en ${resource.name}.`)
    }
}

function traducirOp(op: string): string {
    return ({
        list: 'consultar', read: 'consultar', create: 'crear',
        update: 'modificar', delete: 'eliminar',
    } as Record<string, string>)[op] ?? op
}

// ── Operaciones ────────────────────────────────────────────────────────
export interface ListOptions {
    expand?: string
    order?: string
    dir?: 'asc' | 'desc'
    limit?: number
    offset?: number
    search?: string
    withCount?: boolean
}

export interface ListResult<T = any> {
    data: T[]
    total?: number
    limit: number
    offset: number
}

/** Columnas por las que tiene sentido buscar texto libre. */
const COLUMNAS_BUSQUEDA: Record<string, string[]> = {
    tickets: ['title', 'description'],
    assets: ['name', 'asset_tag', 'serial_number', 'model', 'manufacturer'],
    kb_articles: ['title', 'content', 'excerpt'],
    problems: ['title', 'description'],
    changes: ['title', 'description'],
    work_orders: ['title', 'description'],
    profiles: ['full_name', 'email'],
    service_catalog_items: ['name', 'description'],
}

export async function list<T = any>(
    resourceName: string,
    ctx: Ctx,
    filters: Filter[],
    options: ListOptions = {}
): Promise<ListResult<T>> {
    const resource = mustGet(resourceName)
    checkPermission(resource, 'list', ctx)

    const alias = 't'
    const p = new Params()
    const conds: string[] = []

    if (resource.tenantScoped) {
        if (!ctx.tenantId) throw forbidden('Tu usuario no está asociado a ninguna organización.')
        conds.push(`${col('tenant_id', alias)} = ${p.add(ctx.tenantId)}`)
    }

    for (const f of filters) conds.push(buildCondition(f, p, alias))

    const visible = await condicionVisibilidad(resource, ctx, alias, p)
    if (visible) conds.push(visible)

    // Búsqueda de texto libre sobre las columnas relevantes del recurso.
    if (options.search && options.search.trim() !== '') {
        const columnas = COLUMNAS_BUSQUEDA[resource.table]
        if (columnas && columnas.length > 0) {
            const term = p.add(`%${options.search.trim()}%`)
            const ors = columnas.map((c) => `${col(c, alias)}::text ILIKE ${term}`)
            conds.push(`(${ors.join(' OR ')})`)
        }
    }

    const where = whereClause(conds)

    // Orden.
    // Se puede ordenar por cualquier columna visible del recurso: si un dato
    // se puede leer, también se puede usar para ordenar. Limitarlo a las
    // columnas filtrables dejaba fuera el propio orden por defecto de varios
    // recursos (por ejemplo «name» en categorías o proyectos).
    let orders: { column: string; ascending: boolean }[] = []
    if (options.order) {
        const ordenables = new Set(await readableColumns(resource))
        if (!ordenables.has(options.order)) {
            throw badRequest(`No se puede ordenar por "${options.order}" en ${resource.name}.`)
        }
        orders = [{ column: options.order, ascending: options.dir !== 'desc' }]
    } else if (resource.defaultOrder) {
        orders = [resource.defaultOrder]
    }

    const limit = clamp(options.limit ?? 100, 1, 1000)
    const offset = Math.max(0, options.offset ?? 0)

    const baseCols = (await readableColumns(resource)).map((c) => col(c, alias))
    const relCols = resolveExpand(resource, options.expand).map((r) => relationExpression(r, alias))
    const selectList = [...baseCols, ...relCols].join(',\n  ')

    const sql = `
    SELECT
      ${selectList}
    FROM ${ident(resource.table)} ${alias}
    ${where}
    ${orderClause(orders, alias)}
    LIMIT ${p.add(limit)} OFFSET ${p.add(offset)}
  `

    const data = await query<T>(sql, p.all)

    let total: number | undefined
    if (options.withCount) {
        const pc = new Params()
        const condsCount: string[] = []
        if (resource.tenantScoped) condsCount.push(`${col('tenant_id', alias)} = ${pc.add(ctx.tenantId)}`)
        for (const f of filters) condsCount.push(buildCondition(f, pc, alias))
        const visibleCount = await condicionVisibilidad(resource, ctx, alias, pc)
        if (visibleCount) condsCount.push(visibleCount)
        if (options.search && options.search.trim() !== '') {
            const columnas = COLUMNAS_BUSQUEDA[resource.table]
            if (columnas?.length) {
                const term = pc.add(`%${options.search.trim()}%`)
                condsCount.push(`(${columnas.map((c) => `${col(c, alias)}::text ILIKE ${term}`).join(' OR ')})`)
            }
        }
        const row = await queryOne<{ n: number }>(
            `SELECT count(*)::int AS n FROM ${ident(resource.table)} ${alias} ${whereClause(condsCount)}`,
            pc.all
        )
        total = row?.n ?? 0
    }

    return { data, total, limit, offset }
}

export async function getById<T = any>(
    resourceName: string,
    id: string,
    ctx: Ctx,
    expand?: string
): Promise<T> {
    const resource = mustGet(resourceName)
    checkPermission(resource, 'read', ctx)

    const alias = 't'
    const p = new Params()
    const conds = [`${col('id', alias)} = ${p.add(id)}`]

    if (resource.tenantScoped) {
        if (!ctx.tenantId) throw forbidden('Tu usuario no está asociado a ninguna organización.')
        conds.push(`${col('tenant_id', alias)} = ${p.add(ctx.tenantId)}`)
    }

    const visible = await condicionVisibilidad(resource, ctx, alias, p)
    if (visible) conds.push(visible)

    const baseCols = (await readableColumns(resource)).map((c) => col(c, alias))
    const relCols = resolveExpand(resource, expand).map((r) => relationExpression(r, alias))

    const row = await queryOne<T>(
        `SELECT ${[...baseCols, ...relCols].join(',\n ')}
       FROM ${ident(resource.table)} ${alias} ${whereClause(conds)} LIMIT 1`,
        p.all
    )

    if (!row) throw notFound('El registro')
    return row
}

export async function create<T = any>(
    resourceName: string,
    body: Record<string, unknown>,
    ctx: Ctx
): Promise<T> {
    const resource = mustGet(resourceName)
    checkPermission(resource, 'create', ctx)

    const allowed = new Set(resource.writable)
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(body)) if (allowed.has(k)) data[k] = body[k]

    // El tenant lo fija el servidor: nunca se acepta del cliente.
    if (resource.tenantScoped) {
        if (!ctx.tenantId) throw forbidden('Tu usuario no está asociado a ninguna organización.')
        data.tenant_id = ctx.tenantId
        allowed.add('tenant_id')
    }

    const cols = await loadTableColumns(resource.table)
    const efectivas = new Set([...allowed].filter((c) => cols.includes(c)))

    const { text, params } = buildInsert(resource.table, data, efectivas)
    const row = await queryOne<T>(text, params)
    if (!row) throw badRequest('No se pudo crear el registro.')
    return row
}

export async function update<T = any>(
    resourceName: string,
    id: string,
    body: Record<string, unknown>,
    ctx: Ctx
): Promise<T> {
    const resource = mustGet(resourceName)
    checkPermission(resource, 'update', ctx)

    const lista = resource.updatable ?? resource.writable
    const cols = await loadTableColumns(resource.table)
    const allowed = new Set(lista.filter((c) => cols.includes(c)))

    if (cols.includes('updated_at')) {
        ; (body as any).updated_at = new Date().toISOString()
        allowed.add('updated_at')
    }

    const extra = resource.tenantScoped
        ? [{ column: 'tenant_id', value: requireTenantCtx(ctx) }]
        : []

    const built = buildUpdate(resource.table, id, body, allowed, extra)
    if (!built) throw badRequest('No se envió ningún campo modificable.')

    const row = await queryOne<T>(built.text, built.params)
    if (!row) throw notFound('El registro')
    return row
}

export async function remove(
    resourceName: string,
    id: string,
    ctx: Ctx
): Promise<void> {
    const resource = mustGet(resourceName)
    checkPermission(resource, 'delete', ctx)

    const p = new Params()
    const conds = [`${ident('id')} = ${p.add(id)}`]
    if (resource.tenantScoped) {
        conds.push(`${ident('tenant_id')} = ${p.add(requireTenantCtx(ctx))}`)
    }

    const rows = await query(
        `DELETE FROM ${ident(resource.table)} ${whereClause(conds)} RETURNING id`,
        p.all
    )
    if (rows.length === 0) throw notFound('El registro')
}

// ── Utilidades ─────────────────────────────────────────────────────────
function mustGet(name: string): Resource {
    const r = getResource(name)
    if (!r) throw notFound(`El recurso "${name}"`)
    return r
}

function requireTenantCtx(ctx: Ctx): string {
    if (!ctx.tenantId) throw forbidden('Tu usuario no está asociado a ninguna organización.')
    return ctx.tenantId
}

function clamp(n: number, min: number, max: number): number {
    if (Number.isNaN(n)) return min
    return Math.min(Math.max(n, min), max)
}
