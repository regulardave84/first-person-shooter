Feature: Player jump uses jump_grunt sound effect
  In order to use the intended jump audio cue
  As a player
  I want successful jump initiation to play jump_grunt

  Scenario: Successful jump initiation plays jump_grunt once
    Given the player is grounded
    When the player initiates a jump
    Then the audio system plays the jump_grunt sound effect once

  Scenario: Airborne jump input does not replay jump sound
    Given the player is airborne
    When the player presses jump again before landing
    Then the audio system does not play an additional jump sound

  Scenario: jump_grunt uses existing playback defaults
    Given jump_grunt is available for playback
    When the player initiates a jump
    Then the audio system uses default volume and playback rate

  Scenario: Missing or failed jump_grunt playback falls back silently
    Given jump_grunt is unavailable or fails to play
    When the player initiates a jump
    Then no alternate jump sound is played
    And gameplay continues without throwing an error
