export const DEFAULT_ENTITY_MAX_HEALTH = 100;

export type EntityHealthState = {
	currentHealth: number;
	maxHealth: number;
};

export function createEntityHealthState(config?: {
	maxHealth?: number;
	currentHealth?: number;
}): EntityHealthState {
	const maxHealth = config?.maxHealth ?? DEFAULT_ENTITY_MAX_HEALTH;
	const currentHealth = config?.currentHealth ?? maxHealth;

	return {
		currentHealth,
		maxHealth,
	};
}
