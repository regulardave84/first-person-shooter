import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	HEALTH_HUD_CLASS,
	initializeHealthHud,
} from '../../app/healthHud';

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
	textContent: string;
	appendChild: (child: FakeElement) => FakeElement;
	setAttribute: (name: string, value: string) => void;
	removeAttribute: (name: string) => void;
	getAttribute: (name: string) => string | null;
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
			textContent: '',
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

describe('Acceptance: Player health HUD in bottom-right corner', () => {
	it('Health HUD displays default placeholder value', () => {
		const fakeDocument = createFakeDocument();

		const initialized = initializeHealthHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(initialized).not.toBeNull();
		expect(initialized?.root.classList.contains(HEALTH_HUD_CLASS)).toBe(true);
		expect(initialized?.root.textContent).toBe('Health: 100');
	});

	it('Health HUD is anchored to the bottom-right corner', () => {
		const styles = readFileSync(STYLE_PATH, 'utf8');

		expect(styles).toContain('.health-hud');
		expect(styles).toContain('position: fixed;');
		expect(styles).toContain('right: 16px;');
		expect(styles).toContain('bottom: 16px;');
		expect(styles).toContain('text-shadow: 0 0 8px rgb(2 6 23 / 80%);');
	});

	it('Health HUD is independent of the weapon HUD', () => {
		const fakeDocument = createFakeDocument();

		const initialized = initializeHealthHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(initialized).not.toBeNull();
		expect(initialized?.root.textContent).toBe('Health: 100');
		expect(fakeDocument.getElementById('weapon-hud')).toBeNull();
	});
});
