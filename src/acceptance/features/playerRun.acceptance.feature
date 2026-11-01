Feature: Player running with Shift hold
  In order to move faster during gameplay
  As a player
  I want holding the Shift key to make movement run instead of walk

  Scenario: Holding Shift while moving doubles player movement speed
    Given the player is moving using W, A, S, or D input
    And normal movement speed is active at base move speed
    When the player holds the Shift key
    Then movement speed switches to run speed at 2.0 times the base move speed
    And the player covers more distance per frame than at normal movement speed in forward, backward, and strafe directions

  Scenario: Releasing Shift while moving restores normal movement speed
    Given the player is moving using W, A, S, or D input
    And run speed is active because Shift is held
    When the player releases the Shift key
    Then movement speed returns to normal movement speed

  Scenario: Holding Shift without movement input does not move the player
    Given no movement keys are currently pressed
    When the player holds the Shift key
    Then the player's position does not change from movement input alone

  Scenario: Either Shift key can enable run speed while held
    Given the player is moving using W, A, S, or D input
    When the player holds Left Shift or Right Shift
    Then run speed is enabled while that Shift key remains held

  Scenario: Running has no stamina or cooldown limit
    Given the player is moving using W, A, S, or D input
    And the player holds Left Shift or Right Shift continuously
    When gameplay time advances
    Then run speed stays active without stamina depletion
    And no cooldown is required to keep or resume running while Shift is held

  Scenario: Jumping while running carries farther than jumping while walking
    Given the player can jump while moving in forward, backward, and strafe directions
    And one jump is initiated while moving at normal walking speed
    And another jump is initiated while moving at run speed with Shift held at takeoff
    When both jumps are observed from takeoff to landing under the same conditions
    Then the run-speed jump travels at least 10% farther horizontally than the walk-speed jump
    And both jumps use the same vertical jump height
