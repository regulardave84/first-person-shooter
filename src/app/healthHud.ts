export const HEALTH_HUD_ID = 'health-hud';
export const HEALTH_HUD_CLASS = 'health-hud';
export const DEFAULT_HEALTH_HUD_TEXT = 'Health: 100';

export type HealthHudInitializationResult = {
	root: HTMLElement;
};

function resolveDocument(config?: { documentLike?: Document }): Document | null {
	if (config?.documentLike) {
		return config.documentLike;
	}

	if (typeof document === 'undefined') {
		return null;
	}

	return document;
}

function ensureRootElement(activeDocument: Document): HTMLElement | null {
	const existing = activeDocument.getElementById(HEALTH_HUD_ID);
	if (existing) {
		existing.classList.add(HEALTH_HUD_CLASS);
		return existing;
	}

	if (!activeDocument.body) {
		return null;
	}

	const root = activeDocument.createElement('div');
	root.id = HEALTH_HUD_ID;
	root.classList.add(HEALTH_HUD_CLASS);
	activeDocument.body.appendChild(root);
	return root;
}

export function initializeHealthHud(config?: {
	documentLike?: Document;
	text?: string;
}): HealthHudInitializationResult | null {
	const activeDocument = resolveDocument(config);
	if (!activeDocument) {
		return null;
	}

	const root = ensureRootElement(activeDocument);
	if (!root) {
		return null;
	}

	root.textContent = config?.text ?? DEFAULT_HEALTH_HUD_TEXT;
	return { root };
}
