# Approved by user on 2026-11-01. Do not modify without explicit user permission.
Feature: Crisp grid-aligned floor and outer wall textures
  In order to improve visual clarity in the default map
  As a player
  I want floor and outer wall textures to tile in a grid-like way instead of appearing blurry

  Scenario: Floor texture is tiled in a repeatable grid pattern
    Given the default world scene is initialized
    When the default floor texture is applied
    Then the floor texture uses repeat wrapping on both axes
    And the floor texture repeat values are greater than 1 on both axes
    And the floor surface appears as repeated concrete tiles instead of one stretched blur

  Scenario: Outer wall texture matches inner wall brick scale
    Given the default world scene is initialized
    And inner wall texture tiling is established
    When the default outer wall texture is applied
    Then the wall texture uses repeat wrapping on both axes
    And the wall texture repeat values are greater than 1 on both axes
    And outer wall brick scale matches the inner wall brick scale

  Scenario: Tiled textures remain stable while looking around
    Given tiled floor and outer wall textures are applied
    When the player changes camera yaw and pitch
    Then visible floor and outer wall surfaces continue showing a grid-like tile pattern
    And no texture stretching artifacts appear on those visible surfaces

  Scenario: Inner wall side faces render with clear non-squashed bricks
    Given the default world scene is initialized
    And inner walls are rendered with brick textures
    When the player looks at side faces of inner walls
    Then side-face textures use tiling based on side-face dimensions
    And side-face bricks are not visibly squashed or stretched

  Scenario: Outer wall faces render with clear non-squashed brick scale
    Given the default world scene is initialized
    And wall texture assets are loaded successfully
    When outer walls are rendered
    Then outer wall brick textures are not visibly squashed or stretched
    And outer wall brick scale remains consistent with previous clear appearance

  Scenario: Texture loading failure still uses safe fallback rendering
    Given either floor or wall texture cannot be loaded
    When material initialization runs
    Then the game continues rendering without runtime errors
    And each failed texture falls back to its configured solid color
