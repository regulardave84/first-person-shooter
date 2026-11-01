export const WEAPON_HUD_ROOT_ID = 'weapon-hud';
export const WEAPON_HUD_IMAGE_ID = 'weapon-hud-image';
export const WEAPON_HUD_ROOT_CLASS = 'weapon-hud';
export const WEAPON_HUD_IMAGE_CLASS = 'weapon-hud__image';
export const WEAPON_HUD_FALLBACK_CLASS = 'weapon-hud--fallback';
export const WEAPON_HUD_RECOIL_CLASS = 'weapon-hud--recoil';
export const WEAPON_HUD_BACKGROUND_CLEANED_ATTR =
	'data-weapon-hud-background-cleaned';
export const DEFAULT_WEAPON_HUD_ASSET_PATH = new URL(
	'../assets/player_hand_gun.png',
	import.meta.url,
).href;

export type WeaponHudLogger = {
	warn?: (message: string, context?: Record<string, unknown>) => void;
};

export type WeaponHudInitializationResult = {
	root: HTMLElement;
	image: HTMLImageElement;
};

function isNearNeutralBrightPixel(
	red: number,
	green: number,
	blue: number,
): boolean {
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const saturation = max - min;
	const luminance = (red + green + blue) / 3;
	return saturation <= 10 && luminance >= 216;
}

export function stripWeaponHudBackgroundPixels(
	pixelData: Uint8ClampedArray,
): void {
	for (let index = 0; index < pixelData.length; index += 4) {
		const alpha = pixelData[index + 3];
		if (alpha === 0) {
			continue;
		}

		const red = pixelData[index];
		const green = pixelData[index + 1];
		const blue = pixelData[index + 2];
		if (!isNearNeutralBrightPixel(red, green, blue)) {
			continue;
		}

		pixelData[index + 3] = 0;
	}
}

function createWeaponHudCanvasContext(config: {
	activeDocument: Document;
	image: HTMLImageElement;
}): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null {
	const width = config.image.naturalWidth;
	const height = config.image.naturalHeight;
	if (width <= 0 || height <= 0) {
		return null;
	}

	const canvas = config.activeDocument.createElement(
		'canvas',
	) as HTMLCanvasElement;
	if (typeof canvas.getContext !== 'function') {
		return null;
	}

	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) {
		return null;
	}

	return { canvas, context };
}

function shouldSkipWeaponHudCleanup(image: HTMLImageElement): boolean {
	return image.getAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR) === 'true';
}

function applyWeaponHudTransparencyCleanup(config: {
	activeDocument: Document;
	image: HTMLImageElement;
	logger?: WeaponHudLogger;
}): void {
	if (shouldSkipWeaponHudCleanup(config.image)) {
		return;
	}

	const rendering = createWeaponHudCanvasContext(config);
	if (!rendering) {
		return;
	}
	const { canvas, context } = rendering;
	const width = canvas.width;
	const height = canvas.height;

	try {
		context.drawImage(config.image, 0, 0);
		const frame = context.getImageData(0, 0, width, height);
		stripWeaponHudBackgroundPixels(frame.data);
		context.putImageData(frame, 0, 0);

		const cleanedSource = canvas.toDataURL('image/png');
		if (!cleanedSource || cleanedSource === config.image.src) {
			return;
		}

		config.image.setAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR, 'true');
		config.image.src = cleanedSource;
	} catch (error) {
		config.logger?.warn?.('weapon.hud.asset.background.cleanup.failed', {
			error,
		});
	}
}

function resolveDocument(config?: {
	documentLike?: Document;
}): Document | null {
	if (config?.documentLike) {
		return config.documentLike;
	}

	if (typeof document === 'undefined') {
		return null;
	}

	return document;
}

function toImageElement(
	candidate: HTMLElement | null,
): HTMLImageElement | null {
	if (!candidate) {
		return null;
	}

	if (candidate.tagName.toLowerCase() !== 'img') {
		return null;
	}

	return candidate as HTMLImageElement;
}

function ensureRootElement(activeDocument: Document): HTMLElement | null {
	const existing = activeDocument.getElementById(WEAPON_HUD_ROOT_ID);
	if (existing) {
		existing.classList.add(WEAPON_HUD_ROOT_CLASS);
		existing.setAttribute('aria-hidden', 'true');
		return existing;
	}

	if (!activeDocument.body) {
		return null;
	}

	const root = activeDocument.createElement('div');
	root.id = WEAPON_HUD_ROOT_ID;
	root.classList.add(WEAPON_HUD_ROOT_CLASS);
	root.setAttribute('aria-hidden', 'true');
	activeDocument.body.appendChild(root);
	return root;
}

function ensureImageElement(
	activeDocument: Document,
	root: HTMLElement,
): HTMLImageElement {
	const existing = toImageElement(
		activeDocument.getElementById(WEAPON_HUD_IMAGE_ID),
	);
	if (existing) {
		existing.classList.add(WEAPON_HUD_IMAGE_CLASS);
		return existing;
	}

	const image = activeDocument.createElement('img');
	image.id = WEAPON_HUD_IMAGE_ID;
	image.alt = '';
	image.decoding = 'async';
	image.classList.add(WEAPON_HUD_IMAGE_CLASS);
	root.appendChild(image);
	return image;
}

export function initializeWeaponHud(config?: {
	documentLike?: Document;
	assetUrl?: string;
	logger?: WeaponHudLogger;
}): WeaponHudInitializationResult | null {
	const activeDocument = resolveDocument(config);
	if (!activeDocument) {
		return null;
	}

	const root = ensureRootElement(activeDocument);
	if (!root) {
		return null;
	}

	const image = ensureImageElement(activeDocument, root);
	const assetUrl = config?.assetUrl ?? DEFAULT_WEAPON_HUD_ASSET_PATH;

	image.onload = () => {
		root.classList.remove(WEAPON_HUD_FALLBACK_CLASS);
		applyWeaponHudTransparencyCleanup({
			activeDocument,
			image,
			logger: config?.logger,
		});
	};

	image.onerror = () => {
		root.classList.add(WEAPON_HUD_FALLBACK_CLASS);
		config?.logger?.warn?.('weapon.hud.asset.load.failed', {
			assetUrl,
		});
	};

	if (image.getAttribute('src') !== assetUrl) {
		image.removeAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR);
		image.src = assetUrl;
	}

	return { root, image };
}

export function triggerWeaponHudRecoil(root: HTMLElement | null): void {
	if (!root) {
		return;
	}

	root.classList.remove(WEAPON_HUD_RECOIL_CLASS);
	void root.clientWidth;
	root.classList.add(WEAPON_HUD_RECOIL_CLASS);
}
