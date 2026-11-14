# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum burn damage and explosion lifecycle
  As a player
  I want burning oil drums to self-damage and explode into a destroyed state
  So that hazardous barrels behave consistently and visibly

  # Defaulted implementation assumptions approved by user:
  # - Burn damage is time-based (delta-time accumulation), not frame-count based.
  # - While on fire, the drum takes 5 damage each elapsed 1 second.
  # - Explosion starts immediately when health reaches 0 or below.
  # - Explosion animation uses oil_drum_explosion_frames/* and cadence logic matching fire frames.
  # - Explosion animation plays once, then remains in destroyed state.
  # - After explosion/destroyed state, no further damage processing is applied.

  Scenario: Burning oil drum takes 5 damage every second
    Given an oil drum with health 30 out of 100 is currently on fire
    When game time advances by 1 second
    Then the oil drum health becomes 25

  Scenario: Partial elapsed time accumulates before applying burn damage
    Given an oil drum with health 30 out of 100 is currently on fire
    When game time advances by 0.5 seconds twice
    Then the oil drum health becomes 25

  Scenario: Burn damage triggers explosion at zero health
    Given an oil drum with health 5 out of 100 is currently on fire
    When game time advances by 1 second
    Then the oil drum health becomes 0
    And the oil drum starts explosion animation using explosion frame assets

  Scenario: Explosion animation advances and then completes once
    Given an oil drum is exploding with 8 explosion frames at 12 FPS
    When render updates progress over time past the final frame
    Then the explosion frame sequence does not loop
    And the oil drum remains in destroyed visual state

  Scenario: Destroyed drum no longer takes burn damage
    Given an oil drum health is 0 and visual state is destroyed
    When game time advances by 5 seconds
    Then the oil drum health remains 0
