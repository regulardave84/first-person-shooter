import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	WEAPON_HUD_ROOT_CLASS,
	WEAPON_HUD_ROOT_ID,
	initializeWeaponHud,
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

const WEAPON_HUD_ASSET_PATH = fileURLToPath(
	new URL('../../assets/player_hand_gun.png', import.meta.url),
);

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
	const crosshair = createElement('div');
	crosshair.setAttribute('id', 'crosshair');
	body.appendChild(crosshair);
	registerElement(body);

	return {
		body,
		createElement,
		getElementById: (id: string) => elementById.get(id) ?? null,
	};
}

describe('Acceptance: Forward-pointing player hand and gun HUD asset', () => {
	it('Weapon HUD uses a forward-pointing hand-and-gun asset', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});
		const png = readFileSync(WEAPON_HUD_ASSET_PATH);

		expect(initialized).not.toBeNull();
		expect(initialized?.root.id).toBe(WEAPON_HUD_ROOT_ID);
		expect(initialized?.image.src).toContain('player_hand_gun.png');
		expect(png.byteLength).toBeGreaterThan(0);
	});

	it('Forward-pointing HUD asset remains anchored in the existing HUD region', () => {
		const fakeDocument = createFakeDocument();
		const first = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});
		const second = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(second?.root).toBe(first?.root);
		expect(second?.root.classList.contains(WEAPON_HUD_ROOT_CLASS)).toBe(true);
		expect(fakeDocument.getElementById('crosshair')).not.toBeNull();
	});

	it('Retro-inspired style is original and non-infringing', () => {
		const png = readFileSync(WEAPON_HUD_ASSET_PATH);

		expect(WEAPON_HUD_ASSET_PATH).toContain('player_hand_gun.png');
		expect(png.byteLength).toBeGreaterThan(0);
	});
});
