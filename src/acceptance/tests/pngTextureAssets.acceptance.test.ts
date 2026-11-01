import { describe, expect, it } from 'vitest';
import { DEFAULT_WORLD_FLOOR_TEXTURE_PATH } from '../../app/floorTexture';
import { DEFAULT_WORLD_WALL_TEXTURE_PATH } from '../../app/wallTexture';
import { DEFAULT_WEAPON_HUD_ASSET_PATH } from '../../app/weaponHud';

describe('Acceptance: PNG world texture assets are loaded by default', () => {
	it('Floor texture default points to PNG asset', () => {
		expect(DEFAULT_WORLD_FLOOR_TEXTURE_PATH).toContain('floor-concrete.png');
	});

	it('Wall texture default points to PNG asset', () => {
		expect(DEFAULT_WORLD_WALL_TEXTURE_PATH).toContain('wall-brick.png');
	});

	it('Weapon HUD default remains PNG', () => {
		expect(DEFAULT_WEAPON_HUD_ASSET_PATH).toContain('player_hand_gun.png');
	});
});
