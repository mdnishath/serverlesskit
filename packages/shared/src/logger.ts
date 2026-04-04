/** Log levels ordered by severity */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Structured log entry */
type LogEntry = {
	level: LogLevel;
	message: string;
	timestamp: string;
	context?: string;
	data?: Record<string, unknown>;
};

/** Logger configuration */
type LoggerConfig = {
	/** Minimum log level to output */
	level: LogLevel;
	/** Logger context name (e.g., module name) */
	context?: string;
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

/**
 * Creates a structured JSON logger.
 * @param config - Logger configuration
 * @returns A logger instance with debug, info, warn, error methods
 */
export const createLogger = (config: LoggerConfig) => {
	const { level: minLevel, context } = config;

	const shouldLog = (level: LogLevel): boolean => {
		return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
	};

	const formatEntry = (
		level: LogLevel,
		message: string,
		data?: Record<string, unknown>,
	): string => {
		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			...(context && { context }),
			...(data && { data }),
		};
		return JSON.stringify(entry);
	};

	const log = (level: LogLevel, message: string, data?: Record<string, unknown>): void => {
		if (!shouldLog(level)) return;

		const formatted = formatEntry(level, message, data);

		switch (level) {
			case 'debug':
			case 'info':
				// biome-ignore lint/suspicious/noConsoleLog: Logger is the only place console is allowed
				console.log(formatted);
				break;
			case 'warn':
				console.warn(formatted);
				break;
			case 'error':
				console.error(formatted);
				break;
		}
	};

	return {
		/**
		 * Logs a debug message.
		 * @param message - Log message
		 * @param data - Optional structured data
		 */
		debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),

		/**
		 * Logs an info message.
		 * @param message - Log message
		 * @param data - Optional structured data
		 */
		info: (message: string, data?: Record<string, unknown>) => log('info', message, data),

		/**
		 * Logs a warning message.
		 * @param message - Log message
		 * @param data - Optional structured data
		 */
		warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),

		/**
		 * Logs an error message.
		 * @param message - Log message
		 * @param data - Optional structured data
		 */
		error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
	};
};

/** Pre-configured logger for general use */
export const logger = createLogger({ level: 'info' });
