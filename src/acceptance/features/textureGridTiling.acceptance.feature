# Pending user approval on 2026-11-01. Do not implement until approved.
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

  Scenario: Outer wall texture preserves brick proportions through tiling
    Given the default world scene is initialized
    When the default outer wall texture is applied
    Then the wall texture uses repeat wrapping on both axes
    And the wall texture repeat values are greater than 1 on both axes
    And the brick pattern appears as multiple grid-aligned bricks per wall face

  Scenario: Tiled textures remain stable while looking around
    Given tiled floor and outer wall textures are applied
    When the player changes camera yaw and pitch
    Then visible floor and outer wall surfaces continue showing a grid-like tile pattern
    And no texture stretching artifacts appear on those visible surfaces

  Scenario: Texture loading failure still uses safe fallback rendering
    Given either floor or wall texture cannot be loaded
    When material initialization runs
    Then the game continues rendering without runtime errors
    And each failed texture falls back to its configured solid color
