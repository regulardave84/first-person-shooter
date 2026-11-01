# Approved by user on 2026-11-01. Do not modify without explicit user permission.
Feature: Ceiling skybox uses PNG asset without regressions
  In order to use the new sky artwork format
  As a player
  I want the default world ceiling skybox to load ceiling-sky.png and render as before

  Scenario: Default skybox points to PNG asset
    Given the default world ceiling skybox configuration is used
    When the sky texture URL is resolved
    Then the texture URL ends with "ceiling-sky.png"
    And the texture URL does not reference "ceiling-sky.svg"

  Scenario: Skybox still renders when PNG texture loads
    Given a world scene is initialized
    And the ceiling sky texture loader succeeds
    When default world ceiling skybox initialization runs
    Then a mesh named "default-world-ceiling-skybox" is added to the scene
    And the skybox uses a textured material on all faces

  Scenario: Existing skybox fallback behavior is preserved
    Given the ceiling sky texture loader fails
    When default world ceiling skybox initialization runs
    Then the game continues without throwing a runtime error
    And a warning is emitted with the texture URL and fallback color context
