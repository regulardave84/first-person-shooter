# Approved by user on 2026-11-01. Do not modify without explicit user permission.
Feature: Ceiling sky uses a single-texture sky dome
  In order to avoid duplicated skybox side panels
  As a player
  I want the default sky to render on a dome so one texture appears continuous

  Scenario: Default sky uses dome geometry instead of a box
    Given the default world scene is initialized
    And the sky texture asset "ceiling-sky.png" loads successfully
    When sky rendering is initialized
    Then a sky mesh named "default-world-ceiling-skydome" is added to the scene
    And the sky mesh uses spherical dome-style geometry

  Scenario: Sky texture appears once without side duplication
    Given the default world sky is rendered as a dome
    When the player rotates camera yaw across the horizon
    Then the sky texture appears continuous around the player
    And no repeated box-side panel seams are visible

  Scenario: Existing fallback behavior is preserved on texture load failure
    Given the sky texture asset fails to load
    When sky rendering is initialized
    Then the game continues without runtime errors
    And a warning is emitted with texture URL and fallback color context
