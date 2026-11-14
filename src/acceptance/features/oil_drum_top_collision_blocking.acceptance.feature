Feature: Oil drum top collision blocking
  As a player
  I want the oil drum collider to block forward jump-over attempts
  So that I cannot pass over the top section of the barrel unrealistically

  Scenario: Oil drum blocks forward jump-over near the top section
    Given the player starts in front of an oil drum
    And the oil drum is configured as a non-jumpable obstacle
    When the player performs a forward jump that crosses the oil drum footprint
    Then horizontal traversal is blocked by the oil drum collider
    And the player remains on the near side of the oil drum

  Scenario: Oil drum collider height supports non-jumpable behavior
    Given the default oil drum movement collider
    When collision checks are evaluated during a jump frame
    Then the oil drum collider is treated as jump-over blocking by default
