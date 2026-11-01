Feature: Bullet firing sound
  In order to receive immediate audio feedback while shooting
  As a player
  I want a firing sound to play each time a bullet is fired

  Background:
    Given bullet audio uses a synthesized constant pew tone
    And bullet audio volume is fixed at 1.0

  Scenario: A firing sound plays for a single valid left-click shot
    Given pointer lock is active on the renderer canvas
    And firing input produces one valid bullet shot
    When the shot is emitted
    Then the bullet firing sound is played exactly once

  Scenario: Holding left mouse plays one sound per emitted bullet at fire cadence
    Given pointer lock is active on the renderer canvas
    And the left mouse button is held
    When bullets are emitted continuously
    Then the bullet firing sound is played once for each emitted bullet

  Scenario: Releasing left mouse stops additional firing sounds
    Given continuous firing is active
    When the player releases the left mouse button
    Then no additional bullet firing sound is played after the final emitted bullet

  Scenario: No firing sound is played when firing input is ignored
    Given pointer lock is not active on the renderer canvas
    When the player clicks or holds the left mouse button
    Then no bullets are emitted
    And no bullet firing sound is played

  Scenario: Sound trigger is coupled to bullet emission only
    Given gameplay is running
    When zero bullets are emitted in a frame
    Then zero bullet firing sounds are played in that frame
    When N bullets are emitted in a frame
    Then exactly N bullet firing sounds are played in that frame
