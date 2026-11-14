# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum fire scaling preserves floor contact
  As a player
  I want a burning oil drum to stay grounded when fire scaling is applied
  So that the drum does not sink into or float above the floor

  # Defaulted implementation assumptions approved by user:
  # - Fix is limited to fire-state visual transform logic.
  # - Collision and spawn Y values remain unchanged.
  # - Floor contact is preserved using the default oil drum baseline.
  # - Prioritize stable floor contact over frame-to-frame vertical jitter.

  Scenario: Entering fire state keeps oil drum bottom aligned to floor
    Given an oil drum has default visual scale and baseline position
    And fire scale compensation increases sprite height
    When the oil drum enters fire visual state
    Then the oil drum bottom edge remains at the default floor-contact baseline

  Scenario: Fire animation frame changes keep floor alignment
    Given an oil drum is in fire visual state with floor alignment compensation
    When render updates progress over time
    Then frame changes do not push the oil drum below the default floor-contact baseline

  Scenario: Destroyed visual restores default transform baseline
    Given an oil drum is in fire visual state with floor alignment compensation
    When the oil drum health reaches zero
    Then the oil drum visual becomes oil_drum_destroyed.png
    And the oil drum position and scale return to the default baseline transform
