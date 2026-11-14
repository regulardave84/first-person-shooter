Feature: Entity jump-height blocking
  As a player
  I want entity traversal to be blocked when an entity is too tall for my jump
  So that I cannot unrealistically jump over tall obstacles

  Scenario: Equal-height entity blocks jump-over traversal
    Given an entity collider with top height equal to the player's maximum jump height
    And the player starts on one side of the entity
    When a jump movement frame attempts to cross the entity footprint
    Then horizontal traversal is blocked
    And the player does not pass through or over the entity footprint

  Scenario: Taller entity blocks jump-over traversal
    Given an entity collider with top height above the player's maximum jump height
    And the player starts on one side of the entity
    When a jump movement frame attempts to cross the entity footprint
    Then horizontal traversal is blocked
    And the player does not pass through or over the entity footprint

  Scenario: Shorter entity can still be jumped over
    Given an entity collider with top height below the player's maximum jump height
    And the player is airborne above the entity top height
    When horizontal movement resolves across the entity footprint
    Then movement is not blocked by that entity collider
