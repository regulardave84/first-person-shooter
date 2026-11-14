import { describe, expect, it } from 'vitest';
import {
	DEFAULT_ENTITY_MAX_HEALTH,
	createEntityHealthState,
} from './entityHealth';

describe('entityHealth', () => {
	it('creates a default health state of 100/100', () => {
		const health = createEntityHealthState();

		expect(health).toEqual({
			currentHealth: 100,
			maxHealth: 100,
		});
		expect(DEFAULT_ENTITY_MAX_HEALTH).toBe(100);
	});

	it('defaults current health to max when max is overridden', () => {
		const health = createEntityHealthState({
			maxHealth: 250,
		});

		expect(health).toEqual({
			currentHealth: 250,
			maxHealth: 250,
		});
	});

	it('allows explicit current health override', () => {
		const health = createEntityHealthState({
			maxHealth: 250,
			currentHealth: 90,
		});

		expect(health).toEqual({
			currentHealth: 90,
			maxHealth: 250,
		});
	});
});
