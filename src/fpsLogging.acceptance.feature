Feature: Runtime logging for FPS debugging
  In order to debug runtime gameplay issues quickly
  As a maintainer
  I want structured, opt-in logging around key runtime events

  Scenario: Logging is disabled by default
    Given the game is bootstrapped without debug logging enabled
    When a frame is rendered and movement input is processed
    Then no debug logging output is emitted

  Scenario: Logging can be enabled through configuration
    Given debug logging is enabled
    When the player presses movement keys and moves the mouse
    Then structured debug log entries are emitted for input and look updates

  Scenario: Pointer lock transitions are logged
    Given debug logging is enabled
    When pointer lock is requested and then acquired or released
    Then debug log entries capture each pointer lock transition

  Scenario: Frame timing and movement application are logged
    Given debug logging is enabled
    When frame updates are processed
    Then debug log entries include delta time and resulting player position

  Scenario: Error-level logging is available for exceptional runtime states
    Given debug logging is enabled
    When a runtime operation fails or returns an invalid state
    Then an error-level log entry is emitted with contextual details
