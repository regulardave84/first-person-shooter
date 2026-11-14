Feature: Oil drum collision respects body and top blocking
  As a player
  I want the oil drum to block body-level and top-level jump-over attempts
  So that I cannot pass through or over the barrel footprint unrealistically

  Scenario: Player cannot pass through oil drum body at ground height
    Given an oil drum collider at the default spawn location
    And the player is within the drum vertical collision span
    When horizontal movement resolves through the oil drum center
    Then the player position remains outside the oil drum collision radius

  Scenario: Player cannot pass over oil drum when above top height
    Given an oil drum collider at the default spawn location
    And the player is airborne above the drum top height
    When horizontal movement resolves across the oil drum footprint
    Then movement is blocked by the oil drum collider

  Scenario: Jump arc cannot tunnel through oil drum body in a single frame
    Given an oil drum collider at the default spawn location
    And a jump frame crosses from one side of the oil drum to the other
    When the movement segment intersects the oil drum footprint and body height span
    Then the resolved movement does not pass through the oil drum body
