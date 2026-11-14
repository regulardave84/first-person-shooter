# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum explosion visual bug fixes
  As a player
  I want oil drum explosion visuals to render cleanly and stay floor-aligned
  So that the effect looks grounded and artifact-free

  # Defaulted implementation assumptions approved by user:
  # - Apply alpha-safe sprite/material settings to reduce visible rectangular image borders.
  # - Keep explosion visuals floor-locked using the same bottom-alignment approach used for burning frames.
  # - After explosion completes, transition to the existing destroyed sprite baseline behavior.

  Scenario: Oil drum sprite rendering avoids visible rectangle border artifacts
    Given an oil drum sprite uses transparent PNG textures
    When the sprite is rendered in default, fire, and explosion states
    Then rectangular border artifacts around the image are not visible

  Scenario: Explosion animation remains floor-aligned
    Given an oil drum enters the explosion state from floor-aligned fire visuals
    When explosion frames advance over time
    Then the oil drum visual bottom remains aligned to the floor

  Scenario: Explosion completion still transitions to destroyed baseline
    Given an oil drum explosion animation reaches its final frame
    When explosion playback completes
    Then the oil drum visual transitions to the existing destroyed sprite baseline
