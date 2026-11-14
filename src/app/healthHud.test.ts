import { describe, expect, it } from 'vitest';
import {
	DEFAULT_HEALTH_HUD_TEXT,
	HEALTH_HUD_CLASS,
	HEALTH_HUD_ID,
	initializeHealthHud,
} from './healthHud';

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
	body: FakeElement | null;
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

function createFakeDocument(config?: { withBody?: boolean }): FakeDocument {
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

	const body = config?.withBody === false ? null : createElement('body');

	return {
		body,
		createElement,
		getElementById: (id: string) => elementById.get(id) ?? null,
	};
}

describe('healthHud', () => {
	it('creates a text-only health HUD in the document body', () => {
		const fakeDocument = createFakeDocument();

		const initialized = initializeHealthHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(initialized).not.toBeNull();
		expect(initialized?.root.id).toBe(HEALTH_HUD_ID);
		expect(initialized?.root.classList.contains(HEALTH_HUD_CLASS)).toBe(true);
		expect(initialized?.root.textContent).toBe(DEFAULT_HEALTH_HUD_TEXT);
	});

	it('reuses existing HUD node and keeps exact text contract', () => {
		const fakeDocument = createFakeDocument();

		const first = initializeHealthHud({
			documentLike: fakeDocument as unknown as Document,
		});
		const second = initializeHealthHud({
			documentLike: fakeDocument as unknown as Document,
			text: 'Health: 100',
		});

		expect(second?.root).toBe(first?.root);
		expect(second?.root.textContent).toBe('Health: 100');
	});

	it('returns null when document body is unavailable', () => {
		const fakeDocument = createFakeDocument({ withBody: false });

		const initialized = initializeHealthHud({
			documentLike: fakeDocument as unknown as Document,
		});

		expect(initialized).toBeNull();
	});
});
