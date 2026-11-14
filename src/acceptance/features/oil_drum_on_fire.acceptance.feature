# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum fire visual below half health
  As a player
  I want a damaged oil drum to appear on fire before destruction
  So that drum damage progression is visually clear

  # Defaulted implementation assumptions approved by user:
  # - Fire starts when current health is strictly less than 50% of max health.
  # - Fire is shown for 0 < health < 50% of max health.
  # - Destroyed state at 0 health overrides fire state.
  # - oil_drum_on_fire.png is treated as a horizontal sprite strip animation.
  # - Animation defaults: 8 frames at 12 FPS.

  Scenario: Oil drum enters fire visual state below half health
    Given an oil drum has current health 65 and max health 100
    And oil drum bullet damage is configured as 35
    And oil drum uses oil_drum.png at or above half health
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 30
    And the oil drum visual switches to animated oil_drum_on_fire.png

  Scenario: Fire animation advances while oil drum remains below half health
    Given an oil drum has current health 30 and max health 100
    And the oil drum visual is animated oil_drum_on_fire.png with 8 frames at 12 FPS
    When render updates progress over time
    Then the oil drum fire animation frame advances in a looping sequence

  Scenario: Oil drum does not enter fire visual state at half health or above
    Given an oil drum has current health 100 and max health 100
    And oil drum bullet damage is configured as 50
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 50
    And the oil drum visual remains non-fire

  Scenario: Destroyed visual overrides fire visual at zero health
    Given an oil drum has current health 35 and max health 100
    And oil drum bullet damage is configured as 35
    And the oil drum is eligible for fire visual below half health
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 0
    And the oil drum visual becomes oil_drum_destroyed.png
    And oil_drum_on_fire.png animation is no longer active
