Feature: Player walking footstep sound
  In order to receive movement feedback while traversing the level
  As a player
  I want footstep audio to play while I am walking

  Background:
    Given a walking footstep clip is available at "src/assets/sounds/footsteps_walking.wav"
    And footstep audio uses a single shared surface sound
    And footstep playback defaults to a low ambient volume

  Scenario: Footstep audio starts when walking begins
    Given gameplay is running
    And movement input produces non-zero horizontal movement
    When the first walking frame is processed
    Then walking footstep audio starts playing
    And walking footstep audio is configured to loop

  Scenario: Footstep audio remains playing while movement continues
    Given walking footstep audio is already playing
    When movement input continues producing non-zero horizontal movement
    Then walking footstep audio continues playing
    And no duplicate playback instance is created

  Scenario: Footstep audio stops when walking ends
    Given walking footstep audio is currently playing
    When movement input no longer produces horizontal movement
    Then walking footstep audio stops
    And playback position is reset for a clean next start

  Scenario: Footstep audio does not play while stationary
    Given gameplay is running
    And no movement input is active
    When a frame is processed
    Then walking footstep audio is not playing

  Scenario: Footstep controls are safe when browser audio is unavailable
    Given browser audio APIs are unavailable
    When walking starts and stops
    Then no runtime error is thrown
    And footstep playback operations are treated as no-op
