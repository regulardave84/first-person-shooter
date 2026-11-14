# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum destroyed visual state
  As a player
  I want a destroyed oil drum graphic when drum health reaches zero
  So that destroyed drums are visually clear while remaining as inactive world props

  Scenario: Oil drum swaps to destroyed sprite at zero health
    Given an oil drum has current health 35 and max health 100
    And oil drum bullet damage is configured as 35
    And the oil drum uses asset oil_drum.png before destruction
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 0
    And the oil drum sprite asset becomes oil_drum_destroyed.png

  Scenario: Destroyed oil drum remains in scene and becomes inactive
    Given an oil drum has current health 35 and max health 100
    And oil drum bullet damage is configured as 35
    And the oil drum sprite is attached to the scene
    When a player bullet hits the oil drum once
    Then the oil drum sprite remains attached to the scene
    And the oil drum no longer participates in active combat interactions

  Scenario: Additional bullet hits do not apply after destruction
    Given an oil drum has current health 35 and max health 100
    And oil drum bullet damage is configured as 35
    When a player bullet hits the oil drum once
    And a player bullet hits the same oil drum again
    Then the first hit applies 35 damage
    And the second hit applies 0 damage
    And the oil drum current health remains 0

  Scenario: Destroyed-state transition logs damage and visual swap
    Given an oil drum has current health 35 and max health 100
    And oil drum bullet damage is configured as 35
    When a player bullet hits the oil drum once
    Then a damage log event is emitted with damage amount 35
    And a destroyed-visual log event is emitted for the oil drum
