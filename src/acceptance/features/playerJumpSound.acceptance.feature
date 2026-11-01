Feature: Jump sound effect

  Scenario: A jump sound plays when the player initiates a valid jump
    Given the player is grounded
    And the player presses the Space key
    Then the jump sound effect is triggered once

  Scenario: A jump sound does not play when the player cannot jump
    Given the player is airborne
    When the player presses the Space key again before landing
    Then no additional jump sound is triggered

  Scenario: A jump sound only plays when the jump is successfully initiated
    Given the player is grounded
    And a valid jump input is received
    Then the audio system plays the jump sound effect
    And the audio system does not play a landing sound during the same jump event
