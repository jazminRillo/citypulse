import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { env } from "../config/env.js";

type ErrorResponse = {
	error: {
		code: string;
		message: string;
		requestId: string;
		stack?: string;
	};
};

// La respuesta tiene un formato uniforme, por ejemplo { error: { code, message, requestId } }. En desarrollo incluye el stack; en producción no.
// Los errores no operacionales responden 500 con mensaje genérico y se loguean completos.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	const isOperational = err instanceof AppError && err.isOperational;
	const statusCode =
		err instanceof AppError && err.isOperational ? err.statusCode : 500;

	const error: ErrorResponse = {
		error: {
            code: isOperational ? err.code : "INTERNAL_SERVER_ERROR",
            message: isOperational
                ? err.message
                : "An unexpected error occurred.",
            requestId: res.locals.requestId,
		},
	};

    if (!isOperational) {
        console.error(err);
    } 

	if (env.NODE_ENV !== "production" && err instanceof Error) {
		error.error.stack = err.stack;
	}

	return res.status(statusCode).json(error);
};
