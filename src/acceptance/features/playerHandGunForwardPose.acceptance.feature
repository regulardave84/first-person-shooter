Feature: Forward-pointing player hand and gun HUD asset
  In order to better match classic FPS readability
  As a player
  I want the HUD hand-and-gun asset to point forward with a retro-inspired silhouette

  Scenario: Weapon HUD uses a forward-pointing hand-and-gun asset
    Given the game is running in first-person mode
    When the first gameplay frame is rendered
    Then the weapon HUD image shows a right hand aiming the gun forward toward screen center
    And the hand-and-gun silhouette remains visually distinct from world geometry

  Scenario: Forward-pointing HUD asset remains anchored in the existing HUD region
    Given the weapon HUD is visible during active gameplay
    When the player moves and rotates the camera
    Then the forward-pointing hand-and-gun asset remains anchored to the lower-center HUD region
    And existing crosshair visibility is preserved

  Scenario: Retro-inspired style is original and non-infringing
    Given the HUD hand-and-gun visual references classic retro FPS framing
    When the asset is reviewed
    Then it uses an original, project-specific drawing
    And it does not copy proprietary artwork from any third-party game
