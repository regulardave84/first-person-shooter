export type RuntimeLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type RuntimeLogEntry = {
	level: RuntimeLogLevel;
	event: string;
	context?: Record<string, unknown>;
};

export type RuntimeLogSink = (entry: RuntimeLogEntry) => void;

export type RuntimeLogger = {
	isEnabled: boolean;
	debug: (event: string, context?: Record<string, unknown>) => void;
	info: (event: string, context?: Record<string, unknown>) => void;
	warn: (event: string, context?: Record<string, unknown>) => void;
	error: (event: string, context?: Record<string, unknown>) => void;
};

const NOOP_LOG_SINK: RuntimeLogSink = () => {
	// Intentionally empty. Logging is opt-in.
};

export function createRuntimeLogger(config?: {
	enabled?: boolean;
	sink?: RuntimeLogSink;
}): RuntimeLogger {
	const isEnabled = config?.enabled ?? false;
	const sink = config?.sink ?? NOOP_LOG_SINK;

	const emit = (
		level: RuntimeLogLevel,
		event: string,
		context?: Record<string, unknown>,
	) => {
		if (!isEnabled) {
			return;
		}
		sink({ level, event, context });
	};

	return {
		isEnabled,
		debug: (event, context) => emit('debug', event, context),
		info: (event, context) => emit('info', event, context),
		warn: (event, context) => emit('warn', event, context),
		error: (event, context) => emit('error', event, context),
	};
}
