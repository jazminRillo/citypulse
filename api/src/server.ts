import {env} from './config/env.js';
import app from './app.js';
import registerProcessHandlers from './utils/process-handlers.js';

const server = app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

registerProcessHandlers(() => {
  server.close(() => {
    process.exitCode = 1;
  });
});