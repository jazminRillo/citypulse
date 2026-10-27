import type { NextFunction, RequestHandler } from "express";
import { randomUUID } from "node:crypto";

// requestId: genera un id único por petición con crypto.randomUUID(), lo guarda en res.locals y lo devuelve en la cabecera X-Request-Id.
export const generateRequestId: RequestHandler = (_req, res, next) => {
    const requestId = randomUUID();

    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    
    next(); 
};