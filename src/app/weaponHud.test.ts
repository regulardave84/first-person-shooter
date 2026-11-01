import { describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_WEAPON_HUD_ASSET_PATH,
	WEAPON_HUD_BACKGROUND_CLEANED_ATTR,
	WEAPON_HUD_FALLBACK_CLASS,
	WEAPON_HUD_IMAGE_CLASS,
	WEAPON_HUD_IMAGE_ID,
	WEAPON_HUD_RECOIL_CLASS,
	WEAPON_HUD_ROOT_ID,
	WEAPON_HUD_ROOT_CLASS,
	initializeWeaponHud,
	stripWeaponHudBackgroundPixels,
	triggerWeaponHudRecoil,
} from './weaponHud';

type FakeClassList = {
	add: (...tokens: string[]) => void;
	remove: (...tokens: string[]) => void;
	contains: (token: string) => boolean;
};

type FakeElement = {
	id: string;
	tagName: string;
	classList: FakeClassList;
	children: FakeElement[];
	attributes: Map<string, string>;
	appendChild: (child: FakeElement) => FakeElement;
	setAttribute: (name: string, value: string) => void;
	removeAttribute: (name: string) => void;
	getAttribute: (name: string) => string | null;
	clientWidth: number;
	naturalWidth: number;
	naturalHeight: number;
	src: string;
	alt: string;
	decoding: 'async' | 'auto' | 'sync';
	onload: null | (() => void);
	onerror: null | (() => void);
};

type FakeDocument = {
	body: FakeElement;
	createElement: (tagName: string) => FakeElement;
	getElementById: (id: string) => FakeElement | null;
};

function createFakeClassList(initial?: string[]): FakeClassList {
	const classes = new Set(initial ?? []);
	return {
		add: (...tokens: string[]) => {
			for (const token of tokens) {
				classes.add(token);
			}
		},
		remove: (...tokens: string[]) => {
			for (const token of tokens) {
				classes.delete(token);
			}
		},
		contains: (token: string) => classes.has(token),
	};
}

function createFakeDocument(): FakeDocument {
	const elementById = new Map<string, FakeElement>();

	function registerElement(element: FakeElement): void {
		if (element.id) {
			elementById.set(element.id, element);
		}
	}

	function createElement(tagName: string): FakeElement {
		const attributes = new Map<string, string>();
		const element: FakeElement = {
			id: '',
			tagName: tagName.toUpperCase(),
			classList: createFakeClassList(),
			children: [],
			attributes,
			appendChild: (child: FakeElement) => {
				element.children.push(child);
				registerElement(child);
				return child;
			},
			setAttribute: (name: string, value: string) => {
				attributes.set(name, value);
				if (name === 'id') {
					element.id = value;
					registerElement(element);
				}
			},
			removeAttribute: (name: string) => {
				attributes.delete(name);
			},
			getAttribute: (name: string) => attributes.get(name) ?? null,
			clientWidth: 320,
			naturalWidth: 0,
			naturalHeight: 0,
			src: '',
			alt: '',
			decoding: 'auto',
			onload: null,
			onerror: null,
		};

		return element;
	}

	const body = createElement('body');

	return {
		body,
		createElement,
		getElementById: (id: string) => elementById.get(id) ?? null,
	};
}

function createCanvasEnabledFakeDocument(config?: {
	imageData?: Uint8ClampedArray;
	toDataUrl?: string;
	throwOnGetImageData?: boolean;
	imageWidth?: number;
	imageHeight?: number;
	canvasWithoutContext?: boolean;
	contextReturnsNull?: boolean;
}): {
	documentLike: FakeDocument;
	canvasContext: {
		drawImage: ReturnType<typeof vi.fn>;
		getImageData: ReturnType<typeof vi.fn>;
		putImageData: ReturnType<typeof vi.fn>;
	};
} {
	const elementById = new Map<string, FakeElement>();
	const pixels =
		config?.imageData ??
		new Uint8ClampedArray([255, 255, 255, 255, 180, 110, 90, 255]);

	const canvasFrame = {
		data: pixels,
	} as ImageData;

	const canvasContext = {
		drawImage: vi.fn(),
		getImageData: vi.fn(() => {
			if (config?.throwOnGetImageData) {
				throw new Error('cannot read pixels');
			}
			return canvasFrame;
		}),
		putImageData: vi.fn(),
	};

	function registerElement(element: FakeElement): void {
		if (element.id) {
			elementById.set(element.id, element);
		}
	}

	function createCanvasElement(): FakeElement {
		const canvasAttributes = new Map<string, string>();
		const getContext = config?.canvasWithoutContext
			? undefined
			: vi.fn(() => {
					if (config?.contextReturnsNull) {
						return null;
					}
					return canvasContext;
				});
		const canvas = {
			id: '',
			tagName: 'CANVAS',
			classList: createFakeClassList(),
			children: [],
			attributes: canvasAttributes,
			appendChild: (child: FakeElement) => child,
			setAttribute: (name: string, value: string) => {
				canvasAttributes.set(name, value);
			},
			removeAttribute: (name: string) => {
				canvasAttributes.delete(name);
			},
			getAttribute: (name: string) => canvasAttributes.get(name) ?? null,
			clientWidth: 320,
			naturalWidth: 0,
			naturalHeight: 0,
			src: '',
			alt: '',
			decoding: 'auto' as const,
			onload: null,
			onerror: null,
			width: 0,
			height: 0,
			getContext,
			toDataURL: vi.fn(
				() => config?.toDataUrl ?? 'data:image/png;base64,cleaned',
			),
		} as FakeElement & {
			width: number;
			height: number;
			getContext?: ReturnType<typeof vi.fn>;
			toDataURL: ReturnType<typeof vi.fn>;
		};
		return canvas;
	}

	function createElement(tagName: string): FakeElement {
		if (tagName.toLowerCase() === 'canvas') {
			return createCanvasElement();
		}

		const attributes = new Map<string, string>();
		const element: FakeElement = {
			id: '',
			tagName: tagName.toUpperCase(),
			classList: createFakeClassList(),
			children: [],
			attributes,
			appendChild: (child: FakeElement) => {
				element.children.push(child);
				registerElement(child);
				return child;
			},
			setAttribute: (name: string, value: string) => {
				attributes.set(name, value);
				if (name === 'id') {
					element.id = value;
					registerElement(element);
				}
			},
			removeAttribute: (name: string) => {
				attributes.delete(name);
			},
			getAttribute: (name: string) => attributes.get(name) ?? null,
			clientWidth: 320,
			naturalWidth:
				tagName.toLowerCase() === 'img' ? (config?.imageWidth ?? 4) : 0,
			naturalHeight:
				tagName.toLowerCase() === 'img' ? (config?.imageHeight ?? 1) : 0,
			src: '',
			alt: '',
			decoding: 'auto',
			onload: null,
			onerror: null,
		};

		return element;
	}

	const body = createElement('body');

	return {
		documentLike: {
			body,
			createElement,
			getElementById: (id: string) => elementById.get(id) ?? null,
		},
		canvasContext,
	};
}

describe('weapon HUD helpers', () => {
	it('exports stable HUD constants', () => {
		expect(WEAPON_HUD_ROOT_ID).toBe('weapon-hud');
		expect(WEAPON_HUD_IMAGE_ID).toBe('weapon-hud-image');
		expect(WEAPON_HUD_BACKGROUND_CLEANED_ATTR).toBe(
			'data-weapon-hud-background-cleaned',
		);
		expect(WEAPON_HUD_ROOT_CLASS).toBe('weapon-hud');
		expect(WEAPON_HUD_IMAGE_CLASS).toBe('weapon-hud__image');
		expect(WEAPON_HUD_FALLBACK_CLASS).toBe('weapon-hud--fallback');
		expect(WEAPON_HUD_RECOIL_CLASS).toBe('weapon-hud--recoil');
		expect(DEFAULT_WEAPON_HUD_ASSET_PATH).toContain('player_hand_gun.png');
	});

	it('returns null when no document is available', () => {
		const originalDocument = (globalThis as { document?: Document }).document;
		Reflect.deleteProperty(globalThis, 'document');

		const initialized = initializeWeaponHud();

		expect(initialized).toBeNull();
		if (originalDocument) {
			(globalThis as { document?: Document }).document = originalDocument;
		}
	});

	it('creates HUD root and image with default asset source', () => {
		const fakeDocument = createFakeDocument();

		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(initialized).not.toBeNull();
		expect(initialized?.root.id).toBe(WEAPON_HUD_ROOT_ID);
		expect(initialized?.root.classList.contains(WEAPON_HUD_ROOT_CLASS)).toBe(
			true,
		);
		expect(initialized?.image.src).toBe(DEFAULT_WEAPON_HUD_ASSET_PATH);
		expect(initialized?.image.classList.contains(WEAPON_HUD_IMAGE_CLASS)).toBe(
			true,
		);
		expect(initialized?.image.alt).toBe('');
		expect(initialized?.image.decoding).toBe('async');
	});

	it('reuses existing root and image elements and reapplies accessibility attributes', () => {
		const fakeDocument = createFakeDocument();
		const root = fakeDocument.createElement('div');
		root.id = WEAPON_HUD_ROOT_ID;
		const image = fakeDocument.createElement('img');
		image.id = WEAPON_HUD_IMAGE_ID;
		root.appendChild(image);
		fakeDocument.body.appendChild(root);

		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(initialized?.root).toBe(root);
		expect(initialized?.image).toBe(image);
		expect(root.classList.contains(WEAPON_HUD_ROOT_CLASS)).toBe(true);
		expect(root.getAttribute('aria-hidden')).toBe('true');
	});

	it('creates an image element when an id collision exists on a non-image element', () => {
		const fakeDocument = createFakeDocument();
		const root = fakeDocument.createElement('div');
		root.id = WEAPON_HUD_ROOT_ID;
		const nonImage = fakeDocument.createElement('div');
		nonImage.id = WEAPON_HUD_IMAGE_ID;
		fakeDocument.body.appendChild(nonImage);
		fakeDocument.body.appendChild(root);

		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
			assetUrl: '/custom.svg',
		});

		expect(initialized?.image.tagName.toLowerCase()).toBe('img');
		expect(initialized?.image.src).toBe('/custom.svg');
	});

	it('uses fallback class and warning logger on image load error', () => {
		const fakeDocument = createFakeDocument();
		const logger = { warn: vi.fn() };
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
			logger,
		});
		initialized?.image.onerror?.(new Event('error'));

		expect(
			initialized?.root.classList.contains(WEAPON_HUD_FALLBACK_CLASS),
		).toBe(true);
		expect(logger.warn).toHaveBeenCalledWith(
			'weapon.hud.asset.load.failed',
			expect.objectContaining({
				assetUrl: DEFAULT_WEAPON_HUD_ASSET_PATH,
			}),
		);
	});

	it('handles image load error without logger safely', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(() =>
			initialized?.image.onerror?.(new Event('error')),
		).not.toThrow();
		expect(
			initialized?.root.classList.contains(WEAPON_HUD_FALLBACK_CLASS),
		).toBe(true);
	});

	it('removes fallback class when image load succeeds', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.root.classList.add(WEAPON_HUD_FALLBACK_CLASS);
		initialized.image.onload?.(new Event('load'));

		expect(initialized.root.classList.contains(WEAPON_HUD_FALLBACK_CLASS)).toBe(
			false,
		);
	});

	it('does not replace src when image already points at the desired asset', () => {
		const fakeDocument = createFakeDocument();
		const root = fakeDocument.createElement('div');
		root.id = WEAPON_HUD_ROOT_ID;
		const image = fakeDocument.createElement('img');
		image.id = WEAPON_HUD_IMAGE_ID;
		image.setAttribute('src', '/already-set.svg');
		image.src = '/keep-me.svg';
		root.appendChild(image);
		fakeDocument.body.appendChild(root);

		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
			assetUrl: '/already-set.svg',
		});

		expect(initialized?.image.src).toBe('/keep-me.svg');
	});

	it('restarts recoil class animation when recoil is triggered repeatedly', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.root.classList.add(WEAPON_HUD_RECOIL_CLASS);
		triggerWeaponHudRecoil(initialized.root);

		expect(initialized.root.classList.contains(WEAPON_HUD_RECOIL_CLASS)).toBe(
			true,
		);
	});

	it('handles null recoil roots safely', () => {
		expect(() => triggerWeaponHudRecoil(null)).not.toThrow();
	});

	it('strips bright neutral checker pixels while preserving non-neutral pixels', () => {
		const pixels = new Uint8ClampedArray([
			255, 255, 255, 255, 216, 216, 216, 255, 220, 230, 220, 255, 120, 122, 121,
			255, 230, 230, 232, 255, 180, 110, 90, 255, 90, 95, 105, 255,
		]);

		stripWeaponHudBackgroundPixels(pixels);

		expect(pixels[3]).toBe(0);
		expect(pixels[7]).toBe(0);
		expect(pixels[11]).toBe(0);
		expect(pixels[15]).toBe(255);
		expect(pixels[19]).toBe(0);
		expect(pixels[23]).toBe(255);
		expect(pixels[27]).toBe(255);
	});

	it('processes HUD image background transparency on image load', () => {
		const pixels = new Uint8ClampedArray([
			255, 255, 255, 255, 226, 226, 226, 255, 180, 110, 90, 255,
		]);
		const { documentLike, canvasContext } = createCanvasEnabledFakeDocument({
			imageData: pixels,
		});
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.image.onload?.(new Event('load'));

		expect(canvasContext.drawImage).toHaveBeenCalledTimes(1);
		expect(canvasContext.putImageData).toHaveBeenCalledTimes(1);
		expect(
			initialized.image.getAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR),
		).toBe('true');
		expect(initialized.image.src).toContain('data:image/png');
		expect(pixels[3]).toBe(0);
		expect(pixels[7]).toBe(0);
		expect(pixels[11]).toBe(255);
	});

	it('does not reprocess image when cleanup marker already exists', () => {
		const { documentLike, canvasContext } = createCanvasEnabledFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.image.setAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR, 'true');
		initialized.image.onload?.(new Event('load'));

		expect(canvasContext.drawImage).not.toHaveBeenCalled();
		expect(canvasContext.putImageData).not.toHaveBeenCalled();
	});

	it('resets cleanup marker when source asset changes', () => {
		const fakeDocument = createFakeDocument();
		const first = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
			assetUrl: '/one.png',
		});
		if (!first) {
			throw new Error('expected initialized weapon hud');
		}
		first.image.setAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR, 'true');

		const second = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
			assetUrl: '/two.png',
		});

		expect(second?.image.getAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR)).toBe(
			null,
		);
		expect(second?.image.src).toBe('/two.png');
	});

	it('logs warning when background cleanup throws', () => {
		const logger = { warn: vi.fn() };
		const { documentLike } = createCanvasEnabledFakeDocument({
			throwOnGetImageData: true,
		});
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
			logger,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.image.onload?.(new Event('load'));

		expect(logger.warn).toHaveBeenCalledWith(
			'weapon.hud.asset.background.cleanup.failed',
			expect.objectContaining({
				error: expect.any(Error),
			}),
		);
	});

	it('does not throw when cleanup fails and no logger is provided', () => {
		const { documentLike } = createCanvasEnabledFakeDocument({
			throwOnGetImageData: true,
		});
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		expect(() => initialized.image.onload?.(new Event('load'))).not.toThrow();
	});

	it('skips cleanup when image dimensions are zero', () => {
		const { documentLike, canvasContext } = createCanvasEnabledFakeDocument({
			imageWidth: 0,
			imageHeight: 0,
		});
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.image.onload?.(new Event('load'));

		expect(canvasContext.drawImage).not.toHaveBeenCalled();
		expect(
			initialized.image.getAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR),
		).toBe(null);
	});

	it('skips cleanup when canvas context API is unavailable', () => {
		const { documentLike, canvasContext } = createCanvasEnabledFakeDocument({
			canvasWithoutContext: true,
		});
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.image.onload?.(new Event('load'));

		expect(canvasContext.drawImage).not.toHaveBeenCalled();
		expect(
			initialized.image.getAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR),
		).toBe(null);
	});

	it('skips cleanup when 2D context is null', () => {
		const { documentLike, canvasContext } = createCanvasEnabledFakeDocument({
			contextReturnsNull: true,
		});
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.image.onload?.(new Event('load'));

		expect(canvasContext.drawImage).not.toHaveBeenCalled();
		expect(
			initialized.image.getAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR),
		).toBe(null);
	});

	it('does not rewrite source when cleaned data URL is empty', () => {
		const { documentLike } = createCanvasEnabledFakeDocument({
			toDataUrl: '',
		});
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}
		const before = initialized.image.src;

		initialized.image.onload?.(new Event('load'));

		expect(initialized.image.src).toBe(before);
		expect(
			initialized.image.getAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR),
		).toBe(null);
	});

	it('does not rewrite source when cleaned URL equals existing source', () => {
		const original = '/same.png';
		const { documentLike } = createCanvasEnabledFakeDocument({
			toDataUrl: original,
		});
		const initialized = initializeWeaponHud({
			documentLike: documentLike as unknown as Document,
			assetUrl: original,
		});
		if (!initialized) {
			throw new Error('expected initialized weapon hud');
		}

		initialized.image.onload?.(new Event('load'));

		expect(initialized.image.src).toBe(original);
		expect(
			initialized.image.getAttribute(WEAPON_HUD_BACKGROUND_CLEANED_ATTR),
		).toBe(null);
	});
});
