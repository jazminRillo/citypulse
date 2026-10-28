import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { generateRequestId } from './middlewares/request-id.js';
import { requestLogger } from './middlewares/request-logger.js';
import { validateSchema } from './middlewares/validate-schema.js';
import { querySchema, type QueryOutput } from './schemas/query.schema.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFound } from './middlewares/not-found.js';

const app = express();

app.use(cors());

app.use(generateRequestId);

app.use(requestLogger);

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

type EchoLocals = {
    validatedQuery: QueryOutput;
};

app.get('/api/echo', validateSchema(querySchema), (req: Request, res: Response<unknown, EchoLocals>) => {
    const { limit } = res.locals.validatedQuery;
    console.log(`Echo endpoint called with limit: ${limit}`);
    return res.json({ limit });
});

app.get('/debug/error', async (_req, _res) => {
    throw new Error('Something went wrong');
});

app.use(notFound);

app.use(errorHandler);

export default app;
