import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	WEAPON_HUD_RECOIL_CLASS,
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
	naturalWidth: number;
	naturalHeight: number;
	src: string;
	alt: string;
	decoding: 'async' | 'auto' | 'sync';
	onload: null | ((event: Event) => void);
	onerror: null | ((event: Event) => void);
};

type FakeDocument = {
	body: FakeElement;
	createElement: (tagName: string) => FakeElement;
	getElementById: (id: string) => FakeElement | null;
};

const STYLE_PATH = fileURLToPath(new URL('../../style.css', import.meta.url));

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
			naturalWidth: tagName.toLowerCase() === 'img' ? 4 : 0,
			naturalHeight: tagName.toLowerCase() === 'img' ? 1 : 0,
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

	return {
		body,
		createElement,
		getElementById: (id: string) => elementById.get(id) ?? null,
	};
}

describe('Acceptance: Player hand-and-gun HUD bottom alignment', () => {
	it('Weapon HUD bottom edge aligns to viewport bottom', () => {
		const styles = readFileSync(STYLE_PATH, 'utf8');

		expect(styles).toContain('.weapon-hud');
		expect(styles).toContain('bottom: 0;');
		expect(styles).not.toContain('bottom: 0.2rem;');
	});

	it('Bottom alignment keeps existing HUD behavior', () => {
		const fakeDocument = createFakeDocument();
		const initialized = initializeWeaponHud({
			documentLike: fakeDocument as unknown as Document,
		});
		if (!initialized) {
			throw new Error('expected initialized HUD');
		}

		triggerWeaponHudRecoil(initialized.root);

		expect(fakeDocument.getElementById('crosshair')).not.toBeNull();
		expect(initialized.root.classList.contains('weapon-hud')).toBe(true);
		expect(initialized.root.classList.contains(WEAPON_HUD_RECOIL_CLASS)).toBe(
			true,
		);
	});
});
