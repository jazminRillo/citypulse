//requestLogger: registra método, ruta, status, duración e id cuando la respuesta termina. Pista: el evento que necesitas es de res, no de req.

import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (req, res, next) => {
	const start = performance.now();
	const method = req.method;
	const url = req.originalUrl;

	res.on("finish", () => {
		const status = res.statusCode;
		const requestId = res.locals.requestId;
		const durationMs = performance.now() - start;
		console.log(
			`[${requestId}] ${method} ${url} ${status} - ${durationMs.toFixed(2)}ms`,
		);
	});

	next();
};
