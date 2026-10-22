import {
	ExternalApiError,
	fetchJson,
	FetchJsonOptions,
} from "../src/lib/http.js";

const BASE_URL = "https://opendata.vlci.valencia.es/api/3/action/package_show";

/* Abre el portal Opendatasoft de Valencia, localiza el endpoint de registros de tres datasets 
y llámalos en paralelo con Promise.allSettled desde un script. 
Imprime un resumen: cuántos fueron bien, cuántos fallaron y por qué. */

const datasets = [
	{
		name: "Traffic status",
		url: `${BASE_URL}?id=estat-transit-temps-real`,
		options: { retries: 3, backoffMs: 300 },
	},

	{
		name: "ValenBisi availability",
		url: `${BASE_URL}?id=valenbisi-disponibilitat-valenbisi-dsiponibilidad`,
		options: { retries: 2, backoffMs: 300 },
	},
	{
		name: "Traffic intensity",
		url: `${BASE_URL}?id=intensitat-transit-trams-intensidad-trafico-tramos`,
		options: { retries: 3, backoffMs: 300 },
	},
];

// Limiter function to control concurrency
function createLimiter(maxConcurrency: number) {
	// Cuántas tareas están ejecutándose ahora mismo.
	let active = 0;
	// Tareas que esperan a que haya un cupo libre.
	const queue: Array<() => void> = [];

	function next() {
		// Inicia tareas pendientes mientras no se alcance el máximo simultáneo.
		while (active < maxConcurrency && queue.length > 0) {
			active++;
			const task = queue.shift()!;

			task();
		}
	}

	return function limit<T>(task: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			// Guardamos una función que iniciará la tarea cuando le toque.
			queue.push(() => {
				task()
					.then(resolve, reject)
					.finally(() => {
						// Tanto si termina bien como si falla, libera el cupo
						// y deja avanzar a la siguiente tarea de la cola.
						active--;
						next();
					});
			});

			// Si hay capacidad disponible, empieza una tarea sin esperar.
			next();
		});
	};
}

// Como máximo permite dos tareas simultáneas cuando las llamadas pasan por `limit`.
const limit = createLimiter(2);

async function fetchDatasets(
	datasets: { name: string; url: string; options: FetchJsonOptions }[],
) {
	console.log("Fetching datasets in parallel...");
	const results = await Promise.allSettled(
		datasets.map(({ url, options }) => limit(() => fetchJson(url, { ...options }))),
	);

	let succeeded = 0;
	let failed = 0;

	results.forEach((result, index) => {
		const name = datasets[index].name;
		if (result.status === "fulfilled") {
			succeeded++;
			console.log(`✅ ${name}: Success`);
            console.log(result.value)
		} else {
			failed++;
			const error = result.reason;
			if (error instanceof ExternalApiError) {
				console.error(`❌ ${name}: ${error.kind} error - ${error.message}`);
			} else {
				console.error(`❌ ${name}: Unknown error - ${error}`);
			}
		}
	});

	console.log(`\nSummary: ${succeeded} succeeded, ${failed} failed.`);
}

const tests = [
	{
		name: "404 — nonexistent dataset",
		url: `${BASE_URL}/dataset-that-does-not-exist/records`,
		options: { retries: 3, backoffMs: 300 },
	},
	{
		name: "Network error — invalid domain",
		url: "https://this-domain-does-not-exist.invalid/data",
		options: { retries: 2, backoffMs: 300 },
	},
	{
		name: "Timeout — 50 ms",
		url: "https://httpbin.org/delay/1",
		options: {
			timeoutMs: 50,
			retries: 2,
			backoffMs: 300,
		},
	},
];

const main = async () => {
	await fetchDatasets(datasets);
	await fetchDatasets(tests);
};

main()