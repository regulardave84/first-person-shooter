import { describe, expect, it } from 'vitest';
import {
	WEAPON_HUD_FALLBACK_CLASS,
	WEAPON_HUD_RECOIL_CLASS,
	WEAPON_HUD_ROOT_ID,
	initializeWeaponHud,
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

describe('Acceptance: First-person right-hand gun HUD view', () => {
	it('2D right-hand gun HUD visual is visible in lower-center during gameplay', () => {
		const fakeDocument = createFakeDocument();

		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(initialized).not.toBeNull();
		expect(fakeDocument.getElementById(WEAPON_HUD_ROOT_ID)).toBe(
			initialized?.root,
		);
		expect(initialized?.root.classList.contains('weapon-hud')).toBe(true);
		expect(initialized?.image.tagName.toLowerCase()).toBe('img');
	});

	it('2D right-hand gun HUD visual remains anchored while moving and looking around', () => {
		const fakeDocument = createFakeDocument();

		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});
		const firstRoot = initialized?.root;
		const again = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(again?.root).toBe(firstRoot);
		expect(again?.root.id).toBe(WEAPON_HUD_ROOT_ID);
	});

	it('Right-hand gun HUD visual coexists with crosshair and firing behavior', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized HUD');
		}

		triggerWeaponHudRecoil(initialized.root);

		expect(fakeDocument.getElementById('crosshair')).not.toBeNull();
		expect(initialized.root.classList.contains(WEAPON_HUD_RECOIL_CLASS)).toBe(
			true,
		);
	});

	it('Right-hand gun HUD visual includes idle and firing recoil animation', () => {
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

	it('Missing right-hand gun asset falls back without runtime failure', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
			assetUrl: '/missing/asset.svg',
		});
		initialized?.image.onerror?.(new Event('error'));

		expect(
			initialized?.root.classList.contains(WEAPON_HUD_FALLBACK_CLASS),
		).toBe(true);
	});

	it('Project includes a created right-hand gun visual asset', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(initialized?.image.src).toContain('player_hand_gun.png');
	});
});
