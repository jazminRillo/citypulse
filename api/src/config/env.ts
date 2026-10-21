import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	VALENCIA_API_BASE_URL: z.url(),
	FETCH_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
});

const result = envSchema.safeParse(process.env);


if (!result.success) {
    const details = result.error.issues
		.map((issue) => `${String(issue.path[0] ?? 'environment')}: ${issue.message}`)
		.join('\n');

	console.error(`Invalid environment variables:\n${details}`);
	process.exit(1);
}

export const env = result.data;
