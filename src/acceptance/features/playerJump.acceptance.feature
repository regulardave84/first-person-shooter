Feature: Player jumping

  Scenario: Pressing Space while grounded initiates a jump
    Given the player is standing on the ground
    And the player is not already airborne
    When the player presses the Space key
    Then the player's vertical velocity becomes upward
    And the player's Y position begins to increase away from the ground

  Scenario: A jump rises and then lands back on the ground
    Given the player has initiated a jump
    When the animation loop advances through time
    Then the player's Y position rises above the ground level
    And gravity pulls the player downward
    And the player's Y position eventually returns to the ground level
    And the player is considered grounded again

  Scenario: A jump cannot be triggered again while the player is already airborne
    Given the player is currently airborne from a jump
    When the player presses the Space key again before landing
    Then no additional jump is triggered
    And the player continues the current jump arc
