# Approved by user on 2026-11-01. Do not modify without explicit user permission.
Feature: Dark grey concrete texture on default map floor
  In order to improve environmental realism in the default map
  As a player
  I want the floor to render with a dark grey concrete texture

  Scenario: Default map floor renders with a new dark grey concrete texture
    Given the default world scene is initialized
    And a new dark grey concrete texture asset exists
    When the first render frame is produced
    Then the default map floor renders with the dark grey concrete texture
    And floor texture mapping is stretched rather than tiled
    And the floor is not rendered as a flat untextured color

  Scenario: Concrete floor texture remains visible while looking around
    Given the default map floor renders with a dark grey concrete texture
    When the player changes camera yaw and pitch
    Then visible floor surfaces continue to display the concrete texture
    And no missing-texture placeholder appears on the floor

  Scenario: Floor concrete texture does not replace wall or sky rendering
    Given default world wall and sky rendering are initialized
    When the dark grey concrete floor texture is applied
    Then wall rendering remains unchanged
    And sky rendering remains unchanged
    And the floor keeps a neutral dark grey concrete appearance with no tint

  Scenario: Texture loading failure uses a defined floor fallback appearance
    Given the dark grey concrete texture asset cannot be loaded
    When floor material initialization runs
    Then the game uses the current floor color appearance as fallback
    And the game continues rendering without runtime errors
