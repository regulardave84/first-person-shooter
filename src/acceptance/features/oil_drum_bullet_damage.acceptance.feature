# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum takes configurable bullet damage
  As a player
  I want bullets to damage oil drums
  So that drums can be destroyed and removed from play

  Scenario: Bullet hit applies configured damage to oil drum health
    Given an oil drum with current health 100 and max health 100
    And oil drum bullet damage is configured as 35
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 65

  Scenario: Repeated bullet hits stack damage independently
    Given an oil drum with current health 100 and max health 100
    And oil drum bullet damage is configured as 35
    When player bullets hit the oil drum 2 times
    Then the oil drum current health becomes 30

  Scenario: Oil drum becomes inactive when health reaches zero or below from bullets
    Given an oil drum is present in the scene with current health 35
    And oil drum bullet damage is configured as 35
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 0
    And the oil drum entity remains in the scene as a destroyed inactive prop

  Scenario: Bullet-only damage does not apply from non-bullet sources
    Given an oil drum with current health 100 and max health 100
    And oil drum bullet damage is configured as 35
    When a non-bullet interaction is processed against the oil drum
    Then the oil drum current health remains 100

  Scenario: Oil drum damage and destroyed-visual events are logged
    Given an oil drum with current health 35 and max health 100
    And oil drum bullet damage is configured as 35
    When a player bullet hits the oil drum once
    Then a damage log event is emitted with damage amount 35
    And a destroyed-visual log event is emitted for the destroyed oil drum
