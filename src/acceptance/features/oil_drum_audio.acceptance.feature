Feature: Oil drum sound effects
  The oil drum should emit the correct one-shot audio cues as it transitions between fire and explosion states.

  Scenario: Fire sound plays once when the oil drum enters the fire state
    Given the oil drum is at full health
    And the oil drum is not already on fire
    When the oil drum health drops below 50 percent
    Then the oil_drum_fire sound plays once
    And the oil_drum_fire sound does not repeat while the oil drum remains below 50 percent health

  Scenario: Explosion sound plays once when the oil drum is destroyed
    Given the oil drum is burning
    When the oil drum health reaches zero
    Then the oil_drum_explosion sound plays once
    And the oil_drum_fire sound stops when the explosion starts
    And the oil_drum_explosion sound does not repeat while the drum remains destroyed
