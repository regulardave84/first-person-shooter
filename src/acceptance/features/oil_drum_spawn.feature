Feature: Oil drum sprite appears near the player at game start
  As a player
  I want to see an oil drum prop near my starting position
  So that the world includes a nearby point-of-interest immediately

  Scenario: Oil drum sprite asset path uses oil_drum.png
    Given the default oil drum sprite asset path constant
    When the oil drum sprite asset path is resolved
    Then it references "oil_drum.png"

  Scenario: Oil drum is added to the scene on bootstrap
    Given the game bootstrap runs successfully
    When the initial world scene is created
    Then exactly one oil drum sprite is added to the scene

  Scenario: Oil drum starts close to the player
    Given the player starts at the default initial position
    When the oil drum spawn position is resolved
    Then the oil drum is within 6 world units of the player
    And the oil drum is in front of the player on the forward axis
