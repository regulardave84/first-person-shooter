# Approved by user on 2026-11-01. Do not modify without explicit user permission.
Feature: First-person right-hand gun HUD view
  In order to reinforce first-person shooter feedback
  As a player
  I want to see a right hand holding a gun in the UI while playing

  Scenario: 2D right-hand gun HUD visual is visible in lower-center during gameplay
    Given the game is running in first-person mode
    And a 2D right-hand-with-gun visual asset is available
    When the first gameplay frame is rendered
    Then a right hand holding a gun is visible in the player's view
    And the visual appears in a fixed lower-center HUD region
    And the visual does not replace the world floor wall or sky rendering
    And the visual remains visible regardless of pointer lock state

  Scenario: 2D right-hand gun HUD visual remains anchored while moving and looking around
    Given the right-hand-with-gun visual is rendered in active gameplay
    When the player walks, jumps, and changes camera yaw and pitch
    Then the right-hand-with-gun visual remains visible and anchored to the lower-center HUD region
    And the visual does not drift to unrelated screen regions

  Scenario: Right-hand gun HUD visual coexists with crosshair and firing behavior
    Given the crosshair is rendered
    And weapon firing behavior is enabled
    When the player fires while the right-hand-with-gun visual is visible
    Then firing behavior still works as currently defined
    And the crosshair remains visible
    And the right-hand-with-gun visual remains visible

  Scenario: Right-hand gun HUD visual includes idle and firing recoil animation
    Given the right-hand-with-gun visual is rendered in active gameplay
    When the player is not firing
    Then an idle animation is visible on the right-hand-with-gun visual
    When the player fires
    Then a firing recoil animation is visible on the right-hand-with-gun visual

  Scenario: Missing right-hand gun asset falls back without runtime failure
    Given the right-hand-with-gun visual asset cannot be loaded
    When gameplay rendering initializes
    Then the game continues running without runtime errors
    And a defined fallback appearance is used for weapon HUD/view-model rendering

  Scenario: Project includes a created right-hand gun visual asset
    Given the feature is implemented
    When project assets are inspected
    Then a right-hand-with-gun visual asset exists for HUD rendering
