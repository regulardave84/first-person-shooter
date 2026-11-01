Feature: Solid walls prevent player penetration

  Scenario: Player movement stops at the wall boundary
    Given the player has a collision radius of 0.9 units
    And the player is positioned outside a wall volume
    When the player attempts to move horizontally into that wall on the next frame
    Then the player does not pass through the wall
    And the player's horizontal position is clamped to the nearest valid point at the wall boundary

  Scenario: Player can slide along a wall without penetrating it
    Given the player is adjacent to a wall and moving parallel to its face
    When the movement vector would carry the player into the wall
    Then the player is prevented from entering the wall volume
    And the player keeps moving along the wall boundary instead of crossing through it

  Scenario: Jumping still respects wall collision while airborne
    Given the player is airborne with a collision radius of 0.9 units
    And a wall lies directly ahead of the player
    When the player moves toward that wall during the jump
    Then the player's horizontal position remains outside the wall volume
    And the player may continue vertical motion without passing through the wall
