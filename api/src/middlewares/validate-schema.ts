import type { NextFunction, RequestHandler, Request, Response } from "express";
import z from "zod";
import { ValidationError } from "../errors/app-error.js";

export function validateSchema<S extends z.ZodType>(schema: S): RequestHandler {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.query);
		if (!result.success) {
			const details = result.error.issues
				.map((issue) => `${String(issue.path[0] ?? "query")}: ${issue.message}`)
				.join("\n");

            const error = new ValidationError(
				`Invalid query parameters:\n${details}`,
				"INVALID_QUERY_PARAMETERS",
				true,
			)

			next(error);
		}
		res.locals.validatedQuery = result.data;
		next();
	};
}
