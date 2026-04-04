import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger.js';

describe('Logger', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('logs info messages as JSON', () => {
		const log = createLogger({ level: 'info' });
		log.info('hello');

		expect(console.log).toHaveBeenCalledOnce();
		const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
		expect(output.level).toBe('info');
		expect(output.message).toBe('hello');
		expect(output.timestamp).toBeDefined();
	});

	it('includes context when configured', () => {
		const log = createLogger({ level: 'debug', context: 'auth' });
		log.debug('test');

		const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
		expect(output.context).toBe('auth');
	});

	it('includes data when provided', () => {
		const log = createLogger({ level: 'info' });
		log.info('action', { userId: '123' });

		const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
		expect(output.data).toEqual({ userId: '123' });
	});

	it('respects minimum log level', () => {
		const log = createLogger({ level: 'warn' });
		log.debug('should not appear');
		log.info('should not appear');
		log.warn('should appear');
		log.error('should appear');

		expect(console.log).not.toHaveBeenCalled();
		expect(console.warn).toHaveBeenCalledOnce();
		expect(console.error).toHaveBeenCalledOnce();
	});

	it('uses console.error for error level', () => {
		const log = createLogger({ level: 'error' });
		log.error('something broke');

		expect(console.error).toHaveBeenCalledOnce();
	});
});
