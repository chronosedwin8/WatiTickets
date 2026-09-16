/**
 * Router genérico de recursos.
 *
 * Expone, para cada recurso del registro:
 *   GET    /:recurso        listar (filtros, orden, paginación, ?expand=)
 *   GET    /:recurso/:id    obtener uno
 *   POST   /:recurso        crear
 *   PATCH  /:recurso/:id    modificar
 *   DELETE /:recurso/:id    eliminar
 */
import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { asyncHandler } from '../core/asyncHandler.js'
import { resources } from '../core/registry.js'
import { list, getById, create, update, remove, parseFilters, type Ctx } from '../core/crud.js'
import { getResource } from '../core/registry.js'
import { notFound } from '../core/errors.js'
import { withActor } from '../core/actor.js'

export const resourcesRouter = Router()

resourcesRouter.use(requireAuth)

function ctxFrom(req: any): Ctx {
    return {
        tenantId: req.user.tenant ?? null,
        userId: req.user.sub,
        role: req.user.role,
    }
}

/** Comprueba que el recurso existe antes de tocar la base. */
resourcesRouter.param('recurso', (req, _res, next, value) => {
    if (!getResource(value)) return next(notFound(`El recurso "${value}"`))
    next()
})

resourcesRouter.get(
    '/:recurso',
    asyncHandler(async (req, res) => {
        const resource = getResource(req.params.recurso)!
        const ctx = ctxFrom(req)
        const filters = parseFilters(resource, req.query as Record<string, unknown>)

        const result = await list(resource.name, ctx, filters, {
            expand: req.query.expand as string | undefined,
            order: req.query.order as string | undefined,
            dir: (req.query.dir as 'asc' | 'desc') ?? undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            offset: req.query.offset ? Number(req.query.offset) : undefined,
            search: req.query.search as string | undefined,
            withCount: req.query.count === 'true' || req.query.count === '1',
        })

        res.json(result)
    })
)

resourcesRouter.get(
    '/:recurso/:id',
    asyncHandler(async (req, res) => {
        const row = await getById(
            req.params.recurso,
            req.params.id,
            ctxFrom(req),
            req.query.expand as string | undefined
        )
        res.json({ data: row })
    })
)

resourcesRouter.post(
    '/:recurso',
    asyncHandler(async (req, res) => {
        const ctx = ctxFrom(req)
        const row = await withActor(ctx.userId, () =>
            create(req.params.recurso, req.body ?? {}, ctx)
        )
        res.status(201).json({ data: row })
    })
)

resourcesRouter.patch(
    '/:recurso/:id',
    asyncHandler(async (req, res) => {
        const ctx = ctxFrom(req)
        const row = await withActor(ctx.userId, () =>
            update(req.params.recurso, req.params.id, req.body ?? {}, ctx)
        )
        res.json({ data: row })
    })
)

// Se acepta PUT como alias de PATCH: el cliente envía el objeto completo.
resourcesRouter.put(
    '/:recurso/:id',
    asyncHandler(async (req, res) => {
        const ctx = ctxFrom(req)
        const row = await withActor(ctx.userId, () =>
            update(req.params.recurso, req.params.id, req.body ?? {}, ctx)
        )
        res.json({ data: row })
    })
)

resourcesRouter.delete(
    '/:recurso/:id',
    asyncHandler(async (req, res) => {
        const ctx = ctxFrom(req)
        await withActor(ctx.userId, () => remove(req.params.recurso, req.params.id, ctx))
        res.status(204).end()
    })
)

/** Catálogo de recursos disponibles: útil para depurar y documentar. */
export const metaRouter = Router()
metaRouter.get('/recursos', requireAuth, (_req, res) => {
    res.json({
        data: resources.map((r) => ({
            nombre: r.name,
            porOrganizacion: r.tenantScoped,
            relaciones: (r.relations ?? []).map((x) => x.as),
            filtrosDisponibles: r.filterable,
        })),
    })
})
