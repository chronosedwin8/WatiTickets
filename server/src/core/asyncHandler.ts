/** Envuelve un handler async para que sus errores lleguen al middleware de errores. */
import type { Request, Response, NextFunction, RequestHandler } from 'express'

export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
    return (req, res, next) => {
        fn(req, res, next).catch(next)
    }
}
