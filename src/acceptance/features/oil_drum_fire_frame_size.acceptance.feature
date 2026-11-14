# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum burning frames preserve default visual size
  As a player
  I want burning oil drum frames to match the normal oil drum visual footprint
  So that entering fire state does not make the drum appear shrunken

  # Defaulted implementation assumptions approved by user:
  # - Use runtime auto-scaling in fire state based on visible alpha bounds.
  # - Preserve aspect ratio while matching default oil-drum visual size.
  # - Keep looping fire animation behavior unchanged.
  # - If image data is unavailable, fall back to existing sprite scale.

  Scenario: Fire visual keeps same apparent size as default drum
    Given an oil drum uses default visual state with default scale
    And a burning frame has a smaller visible alpha footprint than the default image
    When the oil drum enters fire visual state
    Then the fire visual is scaled so its visible footprint matches the default drum

  Scenario: Fire animation continues while scale compensation is active
    Given an oil drum is in fire visual state
    And fire scale compensation has been applied
    When render updates progress over time
    Then fire animation still loops across available frames

  Scenario: Missing image-data metadata falls back safely
    Given an oil drum enters fire visual state
    And visible alpha bounds cannot be computed
    When fire visuals are applied
    Then the sprite keeps the existing scale without errors

  Scenario: Destroyed visual removes fire scale compensation
    Given an oil drum is in fire visual state with scale compensation
    When the oil drum health reaches zero
    Then the oil drum visual becomes oil_drum_destroyed.png
    And the sprite scale returns to the default oil drum scale
