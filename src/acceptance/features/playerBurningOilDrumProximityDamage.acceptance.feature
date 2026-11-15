# Approved by user on 2026-11-15. Do not modify without explicit user permission.
Feature: Player takes proximity damage from burning oil drums
  As a player
  I want being too close to a burning oil drum to hurt me
  So that burning hazards affect survival and positioning

  # Defaulted implementation assumptions:
  # - Damage is applied in discrete one-second ticks while in range.
  # - Proximity uses horizontal world-space distance (x/z plane).
  # - A drum is "burning" when its health is below 50% and above 0.
  # - Damage stops immediately when no burning drum is within range.
  # - Player health is clamped to a minimum of 0.

  Scenario: Player takes 15 damage after one second within one meter of a burning oil drum
    Given the player has health 100
    And at least one oil drum is burning
    And the player is within 1 meter of a burning oil drum
    When 1 second of game time elapses
    Then the player health becomes 85

  Scenario: Player does not take proximity damage while outside one meter
    Given the player has health 100
    And at least one oil drum is burning
    And the player is farther than 1 meter from every burning oil drum
    When 2 seconds of game time elapse
    Then the player health remains 100

  Scenario: Proximity damage stops immediately after leaving range
    Given the player has health 100
    And one oil drum is burning
    And the player remains within 1 meter for 0.5 seconds
    When the player moves outside 1 meter for 0.5 seconds
    Then the player health remains 100

  Scenario: Proximity damage can reduce health to zero but not below
    Given the player has health 10
    And one oil drum is burning
    And the player is within 1 meter of the burning oil drum
    When 1 second of game time elapses
    Then the player health becomes 0
    And the player health is not negative
