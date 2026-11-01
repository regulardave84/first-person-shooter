Feature: Player machine-gun bullet firing
  In order to shoot through the level reliably
  As a player
  I want left-click firing to emit bullets rapidly while respecting world collisions

  Scenario: Single left click fires exactly one bullet immediately when pointer lock is active
    Given the game is running and player input is active
    And pointer lock is active on the renderer canvas
    And no firing cooldown is currently blocking a shot
    When the player presses and releases the left mouse button once
    Then exactly one bullet is spawned from the player firing origin
    And the bullet is rendered as a visible, thin, short white line projectile

  Scenario: Holding left mouse continuously fires at 2 bullets per second while pointer lock is active
    Given the game is running and player input is active
    And pointer lock is active on the renderer canvas
    And the left mouse button is held down
    When gameplay time advances
    Then bullets continue spawning at a cadence of 2 bullets per second
    And no more than one bullet is spawned per fire-rate interval

  Scenario: Releasing left mouse stops continuous firing
    Given continuous firing is currently active from holding left mouse
    When the player releases the left mouse button
    Then no additional bullets are spawned after release

  Scenario: Bullets stop and disappear on impact with world or entity geometry
    Given a bullet is traveling through the world
    When the bullet intersects a wall, floor, ceiling, or entity collider
    Then that bullet stops traveling at the impact point
    And that bullet is no longer updated as an active projectile

  Scenario: Firing input is ignored when pointer lock is inactive
    Given pointer lock is not active on the renderer canvas
    When the player clicks or holds the left mouse button
    Then no bullets are spawned
