export class AppError extends Error {
	constructor(
		message: string,
		readonly statusCode: number = 500,
		readonly code: string = "APP_ERROR",
		readonly isOperational: boolean = true,
	) {
		super(message);
	}
}

export class NotFoundError extends AppError {
	constructor(
		message: string,
		code: string = "NOT_FOUND",
		isOperational: boolean = true,
	) {
		super(message, 404, code, isOperational);
	}
}

export class ValidationError extends AppError {
	constructor(
		message: string,
		code: string = "VALIDATION_ERROR",
		isOperational: boolean = true,
	) {
		super(message, 400, code, isOperational);
	}
}

type ExternalApiErrorKind = "network" | "http" | "timeout" | "invalid-json";

export class ExternalApiError extends AppError {
	constructor(
		message: string,
		public readonly kind: ExternalApiErrorKind,
		public readonly url?: string,
		public readonly retryable?: boolean,
        code: string = "EXTERNAL_API_ERROR",
        isOperational: boolean = true,
	) {
		super(message, 500, code, isOperational);
	}
}
