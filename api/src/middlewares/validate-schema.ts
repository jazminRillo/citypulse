import type { NextFunction, RequestHandler, Request, Response } from "express";
import z from "zod";

//validate(schema): factoría que recibe un esquema zod, valida req.query y responde 400 con el detalle si falla. Aplícala a un endpoint de prueba GET /api/echo?limit=....
export function validateSchema<S extends z.ZodType>(schema: S): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${String(issue.path[0] ?? 'query')}: ${issue.message}`)
                .join('\n');
            res.status(400).json({ error: `Invalid query parameters:\n${details}` });
            return;
        }
        res.locals.validatedQuery = result.data;
        next();
    };
};