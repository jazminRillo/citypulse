import type { RequestHandler } from "express";
import { NotFoundError } from "../errors/app-error.js";

// Tu tarea: crea un middleware que lance un NotFoundError con un mensaje como "Route not found: GET /api/unknown".
export const notFound: RequestHandler = (req, _res, next) => {
    const message = `Route not found: ${req.method} ${req.originalUrl}`;
    const error = new NotFoundError(message);
    next(error);
}