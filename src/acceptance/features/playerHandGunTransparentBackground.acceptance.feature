Feature: Player hand-and-gun HUD background transparency
  In order to keep the world view unobstructed
  As a player
  I want only the hand-and-gun silhouette visible without checkerboard background squares

  Scenario: HUD weapon image displays only hand-and-gun content
    Given the game is running in first-person mode
    And the weapon HUD image asset contains visible light gray and white square background pixels
    When the first gameplay frame is rendered
    Then the weapon HUD displays the hand-and-gun silhouette
    And the light gray and white square background pixels are not visible

  Scenario: Background cleanup does not break HUD fallback behavior
    Given the weapon HUD image asset fails to load
    When gameplay rendering initializes
    Then the game continues running without runtime errors
    And the existing weapon HUD fallback appearance is shown

  Scenario: Background cleanup keeps HUD anchoring and recoil behavior
    Given the weapon HUD is visible during active gameplay
    When the player fires while moving and looking around
    Then the weapon HUD remains anchored to the lower-center region
    And recoil animation remains visible
