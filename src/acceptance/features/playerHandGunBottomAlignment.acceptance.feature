Feature: Player hand-and-gun HUD bottom alignment
  In order to keep weapon framing consistent
  As a player
  I want the hand-and-gun HUD sprite to touch the bottom edge of the screen

  Scenario: Weapon HUD bottom edge aligns to viewport bottom
    Given the game is running in first-person mode
    And the hand-and-gun HUD sprite is visible
    When the gameplay frame is rendered
    Then the bottom edge of the hand-and-gun HUD sprite is aligned to the bottom of the viewport
    And no visible gap appears between the sprite and the viewport bottom edge

  Scenario: Bottom alignment keeps existing HUD behavior
    Given the weapon HUD sprite is aligned to the bottom edge
    When the player moves looks around and fires
    Then the HUD remains anchored in the lower-center region
    And crosshair visibility is unchanged
    And recoil animation remains visible
