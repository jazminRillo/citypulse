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

## 1.2: Event Loop Laboratory

Predict the execution order of JavaScript operations, observe how synchronous code blocks the Node.js event loop, and learn how yielding control improves application responsiveness.

### 1. Execution Order: Microtasks and Macrotasks (Part a)

#### What I learned

JavaScript does not execute every scheduled callback immediately. Different types of tasks are processed at different stages of execution.

- **Synchronous code** runs first, in the order it is encountered.
- **Promises and `await`** involve asynchronous continuation through the microtask queue.
- **`setTimeout()`** schedules a callback to run after a minimum delay, when the event loop can process it.
- **`setImmediate()`** schedules a callback for the check phase of the Node.js event loop.
- The exact ordering between `setTimeout(0)` and `setImmediate()` can depend on the execution context. 

#### Experiment

I created a script containing `console.log`, `setTimeout(0)`, `setImmediate`, a Promise, and an `await` inside an `async` function.

Before executing the script, I wrote down my predicted output order as a comment. I then ran the script and compared my prediction with the actual output.

#### What I learned from the comparison

Writing the prediction first helped me distinguish what I expected to happen from what Node.js actually did.

The most important lesson is that synchronous code runs first, while Promise continuations and `await` continuations are processed asynchronously. Timer and immediate callbacks are scheduled through the event loop, and their relative order is not always guaranteed.

### 2. Measuring Event Loop Lag (Part b)

#### Objective

Measure how much a synchronous CPU-intensive operation delays scheduled callbacks.

#### Implementation

I created a lag monitor using `setInterval()` with a 100 ms interval. The monitor compares the actual execution time of each callback with its expected execution time.

At the same time, I ran a synchronous calculation designed to take approximately two seconds, such as sorting a large array.

#### Prediction

Before running the experiment, I predicted that:

1. The monitor would print relatively small delays before the calculation.
2. The monitor would stop printing while the synchronous calculation was running.
3. After the calculation finished, the monitor would report a delay clearly greater than one second.

#### What I learned

`setInterval()` does not guarantee that its callback executes exactly every 100 ms. It schedules callbacks, but they cannot run while the JavaScript main thread is occupied by synchronous code.

When the calculation blocks the event loop for approximately two seconds, the monitor cannot execute on schedule. Once the calculation finishes, the monitor can run again and detect the accumulated delay.

#### Key takeaway

A long-running synchronous operation blocks the event loop and delays unrelated callbacks, including timers and HTTP request handlers.

### 3. Reducing Lag by Processing Work in Batches (Part c)

#### Objective

Reduce event loop lag by splitting a CPU-intensive operation into smaller batches and yielding control between them with `setImmediate()`.

#### Implementation

I rewrote the calculation to process smaller chunks of work. After each batch, I used `setImmediate()` to schedule the next batch, allowing the event loop to process other callbacks in between.

#### Prediction

I expected the maximum lag to decrease significantly compared with the synchronous implementation in Part b.

The target was to keep lag within a few hundred milliseconds at most.

#### What I learned

- Processing work in batches limits how long the main thread is occupied by each batch.
- `setImmediate()` allows other event loop callbacks to run between batches.
- Smaller batches generally improve responsiveness but introduce additional scheduling overhead.
- Larger batches may improve throughput but increase the maximum event loop lag.
- `setImmediate()` does not move the calculation to another thread. Each batch still runs synchronously on the main thread.

#### Important limitation

Splitting a calculation into batches must preserve the intended result. Sorting individual chunks independently does not produce the same result as sorting the entire array globally.

Also, synchronous setup work, such as generating a very large array, can itself cause event loop lag. To evaluate batching fairly, I need to account for that work as well.

#### Comparison

| Aspect | Part b: Synchronous | Part c: Batched |
|---|---|---|
| Execution | One long operation | Multiple smaller operations |
| Event loop | Blocked for the duration of the calculation | Can process callbacks between batches |
| Maximum lag | Expected to exceed one second | Target: a few hundred milliseconds at most |
| Responsiveness | Poor during the calculation | Improved between batches |
| Parallel execution | No | No |

#### Key takeaway

Yielding control between batches improves responsiveness, even when the total calculation time does not decrease. For CPU-intensive work that needs to run independently of the main thread, worker threads may be a better solution.

### 4. Observing the Impact on HTTP Requests (Part d)

#### Objective

Demonstrate that a synchronous operation in one HTTP request can delay other requests handled by the same Node.js process.

#### Implementation

I added two temporary debugging endpoints to my Express API:

- `GET /debug/block`: blocks the main thread for approximately three seconds using a synchronous busy-wait.
- `GET /debug/fast`: returns a simple JSON response.

I called the endpoints from two separate terminals, sending a request to `/debug/fast` while `/debug/block` was still running.

#### Predictions

Before running the experiment, I predicted that:

1. `/debug/block` would take approximately three seconds to respond.
2. `/debug/fast` would also be delayed if its request arrived while the event loop was blocked.
3. `/debug/fast` would respond quickly when no blocking operation was running.

#### What I observed

The blocking endpoint occupied the JavaScript main thread for approximately three seconds.

When I sent a request to `/debug/fast` from another terminal during that period, it had to wait, even though its handler contained almost no computation.

Once the blocking operation finished, Node.js could process the pending request and return its response.

#### Why did `/debug/fast` have to wait?

The `/debug/block` handler executes synchronous JavaScript that occupies the main thread for approximately three seconds. While this code is running, Node.js cannot execute the callback for `/debug/fast`, even though the second endpoint is simple. Once the blocking operation finishes, the event loop can process the pending request and send its response.

#### Cleanup

After the experiment, I removed the debugging endpoints.

These endpoints are useful for demonstrating event loop blocking, but a deliberate busy-wait must never be exposed as a production feature.

#### Key takeaway

A single synchronous CPU-intensive operation can affect unrelated requests handled by the same Node.js process. The impact is not limited to the endpoint that initiated the calculation.

### 6. Interview Preparation: Explain the Event Loop

**Question: What is the Node.js event loop?**

The event loop is the mechanism that allows Node.js to coordinate asynchronous operations and execute their callbacks without requiring a separate JavaScript thread for every request.

Synchronous JavaScript runs to completion on the main thread. If an operation takes a long time, other callbacks cannot execute until that operation finishes.

Promises and `await` use microtask scheduling, while timers and `setImmediate()` are handled through event loop mechanisms. Understanding these differences helps explain execution order and diagnose responsiveness problems.

### Questions to Ask Myself in Future Exercises

1. Why do synchronous statements execute before Promise continuations?
2. Why is the relative ordering of `setTimeout(0)` and `setImmediate()` not universally guaranteed?
3. Why does a long synchronous calculation delay unrelated HTTP requests?
4. Why does `setImmediate()` improve responsiveness without providing parallel execution?
5. When would worker threads be a better solution than batching?
6. How can a long-running synchronous calculation affect a React application's UI?

## 1.3: Resilient HTTP Clients

Build a reusable HTTP client for external APIs, handle failures gracefully, and learn how to manage retries, timeouts, concurrent requests, and partial failures.

### 1. Building a Generic HTTP Client

I created `src/lib/http.ts` and implemented a generic `fetchJson<T>(url, options)` function using Node.js's native `fetch()` API.

The client supports:

- Configurable request timeouts.
- A custom `ExternalApiError` class.
- A configurable number of retries.
- Exponential backoff between retries.
- Different error handling strategies depending on the failure type.

#### Key takeaway

A reusable HTTP client centralizes cross-cutting concerns such as timeouts, error handling, and retries, making the rest of the application simpler and more consistent.

### 2. Understanding HTTP and Network Errors

Not all request failures mean the same thing.

- **2xx responses:** the HTTP request succeeded.
- **4xx responses:** the request was rejected because of a client-side issue, such as an invalid URL path or missing resource.
- **5xx responses:** the server encountered an error while processing the request.
- **Network errors:** the client could not successfully complete the request because of a connectivity, DNS, or similar transport problem.
- **Timeouts:** the request took longer than the configured time limit.

The native `fetch()` API does not automatically throw an exception for HTTP error responses such as 404 or 500. I need to check `response.ok` and handle non-success status codes explicitly.

### 3. Custom Errors with `ExternalApiError`

I created an `ExternalApiError` class to represent failures when communicating with external services.

The error includes information such as:

- The URL that failed.
- The type of error.
- The HTTP status code, when available.
- Whether the failure is eligible for retries.

A custom error provides more useful information than a generic error message. It allows calling code to distinguish between an HTTP error, a network failure, a timeout, and invalid JSON.

It also makes logging and debugging easier because the error contains structured information about what went wrong.

### 4. Timeouts and Cancellation

A timeout prevents a request from waiting indefinitely.

I used `AbortController` to cancel the underlying fetch operation when the configured timeout expires.

The timeout is important because external services may become slow or stop responding. Without a timeout, requests can consume resources for longer than the application can reasonably tolerate.

I also learned that cancellation needs to be handled carefully: a timeout should be distinguishable from other network errors, and the timeout timer should be cleared when the request finishes.

### 5. Retry Policies and Exponential Backoff

I added configurable retries for transient network failures and HTTP 5xx responses.

The client does not retry HTTP 4xx responses.

Between retry attempts, it waits for progressively longer periods using exponential backoff.

For example, with an initial backoff of 300 ms, the delays are:

- First retry: 300 ms.
- Second retry: 600 ms.
- Third retry: 1,200 ms.

The original request counts as the first attempt. Three retries therefore allow up to four total attempts.

Exponential backoff reduces the frequency of repeated requests while a service is failing.

#### Important considerations

- Retrying a request is not always safe for operations that modify data. Retrying a non-idempotent operation can cause duplicate effects.
- Retries should be bounded to prevent endless loops.
- Production systems may benefit from randomized jitter to reduce synchronized retry traffic.
- Timeouts, retries, and backoff all contribute to the total time a request may take.

### 6. Querying Real Valencia Open Data

Use the Valencia City Council's Open Data portal to retrieve records from three datasets concurrently.

External APIs expose different resources through predictable URL patterns. Once I identify the dataset identifier and endpoint structure, I can use the same HTTP client to query multiple datasets.

I also learned that successful HTTP responses do not automatically guarantee that the returned data matches the application's expectations. Response schemas may differ between datasets and should be validated when the data enters the application.

I used `Promise.allSettled()` to execute multiple dataset requests and inspect each result independently.

Each request produces either:

- A `fulfilled` result containing the successful response.
- A `rejected` result containing the failure reason.

I counted successful and failed requests and printed a summary.

#### What I learned

`Promise.allSettled()` waits for every input promise to settle, regardless of whether individual promises succeed or fail.

This is useful when querying independent external services because one failure does not prevent me from collecting the results of the other requests.

By contrast, `Promise.all()` rejects as soon as one input promise rejects, although the other operations may still be running.

### 7. Limiting Concurrency Without Libraries

I added a small concurrency limiter that allows no more than two requests to be active simultaneously.

The limiter maintains a queue of pending tasks and starts a new task whenever an active task finishes.

I combined the limiter with `Promise.allSettled()` so that I could limit concurrency while still collecting the outcome of every request.

Launching all requests at once can overload a remote service, consume local resources, or trigger rate limits.

A concurrency limit controls how many operations may be active simultaneously. It does not necessarily limit the total number of requests or requests per second.

The distinction is important:

- **Concurrency limit:** how many requests can be in progress at once.
- **Rate limit:** how many requests can be started during a period of time.

### 8. Deliberately Testing Failures

#### Objective

Verify that the HTTP client behaves correctly under different failure conditions.

#### Tests

I tested the following scenarios:

- A nonexistent dataset URL that returns a 404.
- An invalid domain that causes a network error.
- A request with a timeout of 50 ms.
- A successful request to a valid dataset.

#### Expected behavior

| Scenario | Expected behavior |
|---|---|
| HTTP 2xx | Return the parsed JSON |
| HTTP 404 | Throw `ExternalApiError` without retrying |
| HTTP 5xx | Retry up to the configured limit |
| Network error | Retry up to the configured limit |
| Timeout | Abort the request and retry within the configured limit |
| Invalid JSON | Throw an error without retrying |

#### What I learned

Failure injection is an effective way to test error handling instead of assuming it works.

A successful request proves only the happy path. Deliberately causing failures verifies that the application behaves predictably when external dependencies are unreliable.

### Interview Preparation

#### Question: What is the difference between `Promise.all()`, `Promise.allSettled()`, `Promise.race()`, and `Promise.any()`?

- **`Promise.all()`** fulfills when every input fulfills and rejects when an input rejects.
- **`Promise.allSettled()`** waits until every input has fulfilled or rejected and returns the outcome of each.
- **`Promise.race()`** settles with the outcome of the first input promise to settle, whether fulfilled or rejected.
- **`Promise.any()`** fulfills with the first successful input and rejects with an `AggregateError` if every input rejects.

These methods do not automatically cancel the other operations when one promise settles.

#### Question: Why use exponential backoff?

Exponential backoff increases the waiting period between retry attempts. It reduces repeated requests against an unhealthy service and gives the service time to recover.

#### Question: Why should a 404 not be retried?

A 404 generally indicates that the requested resource does not exist at the specified URL. Repeating the same request without changing the URL or resource is unlikely to fix the problem.

#### Question: Why use `Promise.allSettled()` when integrating multiple external APIs?

Independent external services can fail separately. `Promise.allSettled()` allows me to collect successful responses and individual failures without losing the results of requests that completed successfully.

#### Question: What is the difference between concurrency limiting and rate limiting?

Concurrency limiting restricts the number of operations running simultaneously. Rate limiting restricts how frequently operations can be started over a given period.

## Final Reflection

This exercise taught me that integrating external APIs requires more than sending HTTP requests and parsing JSON.

I learned to classify failures, enforce timeouts, retry transient errors, apply exponential backoff, collect partial results, and limit concurrent operations.

**The main lesson:** External services are unreliable by nature, so a robust backend needs explicit policies for timeouts, retries, error classification, and partial failures.

### 1.4 Request Middleware, Validation & TypeScript Types

- Created a request ID middleware using `crypto.randomUUID()` and added the ID to `res.locals` and the `X-Request-Id` response header.
- Implemented a request logger to record the HTTP method, URL, status code, request ID, and response duration using `performance.now()` and the `finish` event.
- Created a reusable Zod validation middleware using `safeParse()` to validate query parameters and return a `400` response when validation fails.
- Learned the difference between TypeScript types and runtime values: types describe the expected data structure, while assignments store actual values.
- Used `z.output<typeof querySchema>` and `Response<unknown, EchoLocals>` to type validated query data in the route handler.

**Key takeaway:** Middleware order matters, and TypeScript types help us catch mistakes but do not validate or store runtime data.