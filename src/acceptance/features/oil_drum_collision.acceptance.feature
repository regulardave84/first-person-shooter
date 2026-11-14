Feature: Oil drum collision blocks player movement
  As a player
  I want the oil drum to behave like a solid world entity
  So that I cannot move through it

  Scenario: Oil drum exports a stable collider size contract
    Given the oil drum entity collision constants
    When the collider dimensions are resolved
    Then the collider uses a fixed horizontal radius
    And the collider uses a fixed vertical span

  Scenario: Oil drum collider is created at spawn position
    Given the default player spawn position
    When the oil drum is spawned near the player
    Then one oil drum collider is registered at the same world position

  Scenario: Player movement is blocked by the oil drum
    Given the player starts near a spawned oil drum collider
    When movement resolves toward the oil drum center
    Then the resolved position does not overlap the oil drum collider
    And the player remains outside the oil drum collision radius
