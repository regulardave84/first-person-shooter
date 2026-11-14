# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum fire animation uses individual frame PNG files
  As a player
  I want the burning oil drum animation to use separate frame images
  So that the fire effect is visually correct and smooth

  # Implementation assumptions from user input:
  # - Fire animation loops continuously while in fire state.
  # - Missing/failed frame assets are skipped.
  # - Use the existing frame set in src/assets/oil_drum_burning_frames with 8 ordered files.
  # - Performance preference: minimize runtime stutter (load frame sequence once, then reuse).

  Scenario: Fire visual switches to frame-sequence animation below half health
    Given an oil drum has current health 65 and max health 100
    And oil drum bullet damage is configured as 35
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 30
    And the oil drum visual switches to a looping fire animation sourced from oil_drum_burning_frames

  Scenario: Frame animation loops across available burning frame files
    Given an oil drum is in fire visual state
    And fire frames are loaded from oil_drum_burning_frames in ascending order
    When render updates progress over time
    Then the active frame advances at the configured FPS in a loop

  Scenario: Missing frame files are skipped without breaking the animation
    Given an oil drum is in fire visual state
    And one or more burning frame files fail to load
    When render updates progress over time
    Then the animation continues using only successfully loaded frames

  Scenario: Destroyed visual overrides frame-sequence fire animation at zero health
    Given an oil drum has current health 35 and max health 100
    And oil drum bullet damage is configured as 35
    And the oil drum is eligible for fire visual below half health
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 0
    And the oil drum visual becomes oil_drum_destroyed.png
    And frame-sequence fire animation is no longer active
