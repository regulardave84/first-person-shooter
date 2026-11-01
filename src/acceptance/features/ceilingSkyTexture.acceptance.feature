# Approved by user on 2026-11-01. Do not modify without explicit user permission.
Feature: Blue sky visible above default map walls
  In order to improve outdoor atmosphere in the default map
  As a player
  I want the blue sky texture to render above wall height rather than as a flat interior ceiling

  Scenario: Default map renders blue sky above wall height
    Given the default world scene is initialized
    And a blue sky texture asset exists for the sky rendering
    When the first render frame is produced
    Then sky is visible in regions above the top edge of default map walls
    And the sky texture appears stretched rather than tiled
    And no opaque ceiling surface blocks the sky above the walls

  Scenario: Looking around keeps sky visible above walls
    Given the default world sky is rendered above wall height
    When the player changes camera yaw and pitch
    Then sky remains visible above walls where line of sight is unobstructed
    And no missing-texture placeholder appears in the sky region

  Scenario: Sky rendering does not change floor or wall materials
    Given default world floor and wall materials are initialized
    When blue sky rendering above walls is applied
    Then wall materials remain unchanged
    And floor materials remain unchanged
    And sky appearance remains neutral without extra tinting

  Scenario: Texture loading failure uses current fallback appearance
    Given the blue sky texture asset cannot be loaded
    When sky initialization runs
    Then the game uses the current sky or background color appearance as fallback
    And the game continues rendering without runtime errors
