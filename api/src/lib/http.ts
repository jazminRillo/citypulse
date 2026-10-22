type ExternalApiErrorKind = "network" | "http" | "timeout" | "invalid-json";

export class ExternalApiError extends Error {
	constructor(
		message: string,
		public readonly kind: ExternalApiErrorKind,
		public readonly url?: string,
		public readonly status?: number,
		public readonly retryable?: boolean,
	) {
		super(message);
		this.name = "ExternalApiError";
	}
}

export interface FetchJsonOptions extends RequestInit {
	timeoutMs?: number;
	retries?: number;
	backoffMs?: number;
}

const validateOptions = (options: FetchJsonOptions) => {
	const { timeoutMs = 5_000, retries = 3 } = options;

	if (timeoutMs < 0 || retries < 0 || !Number.isInteger(retries))
		throw new RangeError(
			"Invalid options: timeoutMs and retries must be non-negative integers.",
		);
};

const delay = async (
	url: string,
	error: string,
	backoffMs: number,
	attempt: number,
) => {
	const delay = backoffMs * Math.pow(2, attempt);
	console.warn(
		`[retry] ${url} | ${error} | Attempt ${attempt} failed. Retrying in ${delay}ms...`,
	);
	await new Promise((resolve) => setTimeout(resolve, delay));
};

export const fetchJson = async <T>(
	url: string,
	options: FetchJsonOptions = {},
): Promise<T> => {
	const {
		timeoutMs = 5_000,
		retries = 3,
		backoffMs = 1000,
		...requestOptions
	} = options;

	validateOptions({ timeoutMs, retries });

	for (let attempt = 1; attempt <= retries; attempt++) {
		let timedOut = false;
		const controller = new AbortController();

		const timer = setTimeout(() => {
			timedOut = true;
			controller.abort();
		}, timeoutMs);

		let response: Response | undefined;
		let body: string = "";
		let networkError: ExternalApiError | undefined;

		try {
			response = await fetch(url, {
				...requestOptions,
				signal: controller.signal,
			});
			body = await response.text();
		} catch (error) {
			const kind: ExternalApiErrorKind = timedOut ? "timeout" : "network";
			const detail = error instanceof Error ? error.message : String(error);

			networkError = new ExternalApiError(
				`${kind === "timeout" ? "Request timed out" : "Network error"}: ${detail}`,
				kind,
				url,
				undefined,
				true,
			);
		} finally {
			clearTimeout(timer);
		}

		if (networkError) {
			if (attempt === retries) throw networkError;

			await delay(url, networkError.kind ?? "network", backoffMs, attempt);
			continue;
		}

		if (!response) {
			throw new Error("No response received from fetch.");
		}

		if (!response.ok) {
			const error = new ExternalApiError(
				`HTTP ${response.status} ${response.statusText}: ${body}`,
				"http",
				url,
				response.status,
				response.status >= 500 && response.status < 600,
			);

			if (error.retryable || attempt === retries) throw error;

			await delay(url, response.status.toString(), backoffMs, attempt);
			continue;
		}

		try {
			return JSON.parse(body) as T;
		} catch {
			throw new ExternalApiError(
				`Failed to parse JSON response: ${body}`,
				"invalid-json",
				url,
				response.status,
				false,
			);
		}
	}

	throw new Error("Request failed after all retry attempts.");
};
