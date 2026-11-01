# Approved by user on 2026-11-01. Do not modify without explicit user permission.
Feature: Red brick wall texture on all default map walls
  In order to improve visual detail in the default map
  As a player
  I want default map walls to render with a brick wall texture

  Scenario: All default map walls render with a new red brick texture
    Given the default world scene is initialized
    And a new red brick wall texture asset exists
    When the first render frame is produced
    Then each outer and inner default map wall renders with the red brick texture
    And wall texture mapping is tiled with repeat x = 2 and y = 1
    And walls are not rendered as a flat untextured color

  Scenario: Red brick texture remains visible while looking around
    Given default map walls render with the red brick texture
    When the player changes camera yaw and pitch
    Then visible wall surfaces continue to display the brick texture
    And no missing-texture placeholder appears on wall surfaces

  Scenario: Wall brick texture does not replace floor or sky rendering
    Given default world floor and sky rendering are initialized
    When the red brick wall texture is applied to walls
    Then floor rendering remains unchanged
    And sky rendering remains unchanged
    And wall appearance keeps a red brick look without non-red tint shifts

  Scenario: Texture loading failure uses a defined wall fallback appearance
    Given the red brick texture asset cannot be loaded
    When wall material initialization runs
    Then the game uses the current wall color appearance as fallback
    And the game continues rendering without runtime errors
