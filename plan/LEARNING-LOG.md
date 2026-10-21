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
