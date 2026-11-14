# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Oil drum has a default health pool
  As a player
  I want each oil drum to have health
  So that it can support damage and destruction behavior

  Scenario: Oil drum defaults to 100 health
    Given a new oil drum entity is created
    When no explicit health override is provided
    Then the oil drum health is 100

  Scenario: Oil drum health is represented as current and maximum values
    Given a new oil drum entity is created
    When the oil drum health state is initialized
    Then the current health equals maximum health
    And the maximum health is 100

  Scenario: Oil drum health defaults are deterministic across spawns
    Given multiple oil drum entities are created at startup
    When each oil drum health state is initialized
    Then each oil drum starts with current health 100
    And each oil drum starts with maximum health 100
