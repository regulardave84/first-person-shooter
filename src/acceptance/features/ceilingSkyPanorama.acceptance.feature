# Approved by user on 2026-11-01. Do not modify without explicit user permission.
Feature: Ceiling sky appears as a continuous real sky
  In order to make the sky feel natural while playing
  As a player
  I want ceiling-sky.png to render without mirrored or repeated side panels

  Scenario: Sky uses a continuous panoramic mapping
    Given the default world scene is initialized
    And the sky texture asset "ceiling-sky.png" loads successfully
    When sky rendering is initialized
    Then the sky is rendered as one continuous panorama around the player
    And the same sky image is not duplicated as four separate wall-like sides

  Scenario: Sky remains stable while looking around
    Given the sky is rendered as a continuous panorama
    When the player changes camera yaw and pitch
    Then sky details move naturally with camera rotation
    And no visible seams appear at former skybox side boundaries

  Scenario: Texture load failure preserves existing fallback behavior
    Given the sky texture asset fails to load
    When sky rendering is initialized
    Then the game continues without runtime errors
    And a warning is emitted with texture URL and fallback color context
