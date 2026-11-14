# Approved by user on 2026-11-14. Do not modify without explicit user permission.
Feature: Destroyed oil drum preserves movement collision
  As a player
  I want destroyed oil drums to keep collision blocking
  So that world navigation remains consistent after visual destruction

  Scenario: Destroyed oil drum keeps same movement collider after health reaches zero
    Given an oil drum has current health 35 and max health 100
    And oil drum bullet damage is configured as 35
    And the oil drum has a movement collider registered before destruction
    When a player bullet hits the oil drum once
    Then the oil drum current health becomes 0
    And the oil drum movement collider remains registered
    And the oil drum movement collider dimensions and position are unchanged

  Scenario: Destroyed oil drum still blocks player movement in all locomotion states
    Given an oil drum is destroyed and remains in the scene
    And the oil drum movement collider remains registered
    When the player attempts to move through the oil drum while walking
    And the player attempts to move through the oil drum while running
    And the player attempts to move through the oil drum while jumping
    Then traversal through the oil drum collider is blocked in each locomotion state

  Scenario: Destroyed oil drum no longer participates in projectile collision interactions
    Given an oil drum is destroyed and remains in the scene
    When active projectiles are stepped for collision checks
    Then the destroyed oil drum is excluded from projectile entity colliders
    And the destroyed oil drum receives no additional bullet damage
