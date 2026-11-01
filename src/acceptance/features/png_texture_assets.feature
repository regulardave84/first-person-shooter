Feature: PNG world texture assets are loaded by default
  As a player
  I want the game to load the updated PNG texture assets
  So that floor and wall textures render after asset replacement

  Scenario: Floor texture default points to PNG asset
    Given the default floor texture path constant
    When the floor texture path is resolved
    Then it references "floor-concrete.png"

  Scenario: Wall texture default points to PNG asset
    Given the default wall texture path constant
    When the wall texture path is resolved
    Then it references "wall-brick.png"

  Scenario: Weapon HUD default remains PNG
    Given the default weapon HUD asset path constant
    When the HUD asset path is resolved
    Then it references "player_hand_gun.png"
