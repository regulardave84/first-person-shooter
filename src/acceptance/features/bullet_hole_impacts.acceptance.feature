# Approved by user on 2026-11-15 (updated same day). Do not modify without explicit user permission.
Feature: Bullet holes appear on impacted world surfaces
  As a player
  I want to see visible bullet hole marks when shots hit walls and floors
  So that firing feedback is clear without floating decals on the oil drum

  Scenario: Wall impact spawns a bullet hole decal
    Given the player fires a shot that intersects a solid wall
    When the hit is resolved
    Then a bullet hole mark is created at the wall impact position
    And the bullet hole uses the "bullet_hole.png" asset

  Scenario: Floor impact spawns a bullet hole decal
    Given the player fires a shot that intersects the floor
    When the hit is resolved
    Then a bullet hole mark is created at the floor impact position
    And the bullet hole uses the "bullet_hole.png" asset

  Scenario: Oil drum impact does not spawn a bullet hole mark
    Given a destructible oil drum is active in the scene
    And the player fires a shot that intersects the oil drum
    When the hit is resolved
    Then no bullet hole mark is created on the oil drum

  Scenario: Repeated wall and floor hits accumulate bullet holes up to a safe cap
    Given the player repeatedly hits walls and floors with bullets
    When the total bullet hole count exceeds the configured maximum
    Then the oldest bullet hole marks are removed first
    And newly created bullet hole marks continue to appear

  Scenario: Non-hit shots do not create bullet holes
    Given the player fires a shot that does not intersect wall or floor geometry
    When the shot is resolved
    Then no bullet hole mark is created
