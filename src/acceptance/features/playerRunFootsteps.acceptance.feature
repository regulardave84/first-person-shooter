Feature: Player footsteps while walking and running
  In order to hear movement state clearly
  As a player
  I want step-timed footsteps that switch between walking and running sounds

  Scenario: Running footsteps use the running asset while sprint input is active
    Given the player is grounded and moving horizontally
    And sprint input is active
    When the footstep scheduler advances to the next step timing
    Then the audio system plays the running footstep sound from "footsteps_running.wav"
    And the walking footstep sound is not played for that step

  Scenario: Walking footsteps use the walking asset when sprint is not active
    Given the player is grounded and moving horizontally
    And sprint input is not active
    When the footstep scheduler advances to the next step timing
    Then the audio system plays the walking footstep sound from "footsteps_walking.wav"
    And the running footstep sound is not played for that step

  Scenario: Footsteps stop immediately when movement stops
    Given a footstep cadence is currently active
    When the player has no horizontal movement
    Then no additional footstep sound is played
    And any active footstep playback stops immediately
