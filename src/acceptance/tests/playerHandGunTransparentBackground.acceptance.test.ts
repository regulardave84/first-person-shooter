import { describe, expect, it } from 'vitest';
import {
	WEAPON_HUD_FALLBACK_CLASS,
	WEAPON_HUD_RECOIL_CLASS,
	initializeWeaponHud,
	stripWeaponHudBackgroundPixels,
	triggerWeaponHudRecoil,
} from '../../app/weaponHud';

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

describe('Acceptance: Player hand-and-gun HUD background transparency', () => {
	it('HUD weapon image displays only hand-and-gun content', () => {
		const pixels = new Uint8ClampedArray([
			255, 255, 255, 255, 226, 226, 226, 255, 184, 113, 96, 255,
		]);

		stripWeaponHudBackgroundPixels(pixels);

		expect(pixels[3]).toBe(0);
		expect(pixels[7]).toBe(0);
		expect(pixels[11]).toBe(255);
	});

	it('Background cleanup does not break HUD fallback behavior', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
			assetUrl: '/missing/asset.png',
		});
		initialized?.image.onerror?.(new Event('error'));

		expect(
			initialized?.root.classList.contains(WEAPON_HUD_FALLBACK_CLASS),
		).toBe(true);
	});

	it('Background cleanup keeps HUD anchoring and recoil behavior', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized HUD');
		}

		triggerWeaponHudRecoil(initialized.root);

		expect(initialized.root.classList.contains('weapon-hud')).toBe(true);
		expect(initialized.root.classList.contains(WEAPON_HUD_RECOIL_CLASS)).toBe(
			true,
		);
	});
});
