let isShuttingDown = false;

const handleFatalError = (
	message: string,
	error: unknown,
	shutdown: () => void,
) => {
	console.error(message, error);

	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;
	shutdown();
};

const registerProcessHandlers = (shutdown: () => void) => {
	process.on("uncaughtException", (err: Error) => {
		handleFatalError("Uncaught Exception:", err, shutdown);
	});

	process.on("unhandledRejection", (reason: unknown) => {
		handleFatalError("Unhandled Rejection at:", reason, shutdown);
	});
};

export default registerProcessHandlers;
