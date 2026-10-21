# Learning Log

## 1.1: Bootstrap and Typed Configuration

### 1. Separating `app.ts` from `server.ts`

I learned how to separate the Express application setup from the code responsible for starting the server.

- **`app.ts`** creates and exports the Express application, including its middleware and routes, but does not open a port.
- **`server.ts`** imports the application and starts the server using `app.listen()`.
- **Why separate them?** Because I can reuse the application without having to start a real HTTP server.

This will be especially useful in Exercise 8.2, when I need to test the API automatically. Tests can import `app` and send HTTP requests without manually starting the server or opening a port. This makes testing easier, avoids port conflicts, and improves maintainability.

**Key takeaway:** The application defines how the API responds; the server defines when and where it starts listening for requests.

### 2. What does "fail fast" mean?

I learned the *fail fast* principle: detect errors as early as possible and stop execution with a clear error message instead of allowing the system to continue running with invalid configuration.

In my API, I validate environment variables at startup using Zod. For example:

- If `PORT` is missing, the server should not start.
- If `FETCH_INTERVAL_MINUTES` contains `abc` instead of a valid number, the configuration should be rejected.
- If `VALENCIA_API_BASE_URL` has an invalid format, I should receive an error identifying the problem.

This prevents configuration errors from appearing later, when the application is already running or attempting to fetch data from an external API.

**Key takeaway:** It is better to fail at startup with an understandable error than to run unpredictably and discover the problem later.

### 3. Typed Configuration and Validation with Zod

I learned that TypeScript and Zod solve related but different problems:

- **TypeScript** checks types during development and compilation.
- **Zod** validates actual data at runtime, such as environment variables loaded from `.env`.

Environment variables are external input. I cannot assume they have the correct type just because I declare them as `string` or `number` in TypeScript.

By validating the configuration at startup, I can export a typed `env` object and centralize access to the application's configuration.

### 4. Environment Configuration and Security

I learned how to keep configuration outside the source code by using environment variables.

- `.env` contains local configuration and should not be committed to the repository if it contains sensitive values.
- `.env.example` documents the required variables and provides a template for other developers.
- `.gitignore` prevents generated files, dependencies, and sensitive local configuration from being committed.

This approach allows the same application to run in development, testing, and production environments without changing the source code.

### 5. Strict TypeScript and Compilation

I configured `tsconfig.json` with `strict: true` to catch more type-related errors during development.

I also learned the purpose of the main project commands:

- `npm run dev`: runs the server in development mode with automatic restarts using `tsx watch`.
- `tsc --noEmit`: checks types without generating output files.
- `npm run build`: compiles the project and generates the production output in `dist/`.
- `npm start`: runs the compiled production version.

An application working in development does not automatically guarantee that it will compile and run correctly in production. That is why both workflows need to be tested.

### 6. Health Check Endpoint: `GET /health`

I implemented a health check endpoint that returns basic information about the running process:

- `status`: indicates that the service is responding.
- `uptime`: the number of seconds the process has been running.
- `timestamp`: the date and time of the response.

This endpoint allows me to quickly check whether the API is responding and can be used for monitoring and automated health checks.

It is important to distinguish between a server responding to requests and all its external dependencies working correctly. A basic health check does not guarantee that external APIs are available.

### 7. Verifying the Exercise

I verified that:

- The server starts with `npm run dev`.
- `GET /health` returns HTTP 200.
- Invalid configuration prevents startup and produces a clear error message.
- TypeScript reports no errors with `tsc --noEmit`.
- The application builds and starts successfully in production using `npm run build && npm start`.

### Personal Summary

In this exercise, I learned that setting up a backend is not just about getting Express to listen on a port. It also involves designing a structure that makes testing easier, validating configuration before the application starts working, and detecting errors early.

The three main ideas I want to remember are:

1. **Separation of concerns:** `app` configures the API, while `server` starts it.
2. **Fail fast:** detect and report configuration errors at startup.
3. **Reliable configuration:** validate environment variables at runtime and use TypeScript to maintain type safety throughout the application.

### Questions to Ask Myself in Future Exercises

At the end of each learning log entry, I want to answer three questions:

1. **What problem does this solve?**
2. **What alternatives were available?**
3. **How would I verify that it works?**

This habit will help me develop the ability to reason about technical decisions instead of simply documenting completed tasks.