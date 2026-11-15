Feature: Runtime allocation optimizations without gameplay changes
  As a player
  I want runtime allocation hotspots reduced
  So that frame-time overhead decreases without changing gameplay behavior

  Scenario: Projectile visuals are updated in place across frames
    Given an active projectile already has a rendered line visual
    When the next frame updates that projectile position
    Then the same line visual instance is reused
    And the line geometry point data is updated to the new segment endpoints

  Scenario: Oil-drum projectile collider and proximity hazard inputs are reused
    Given the oil drum remains active and stationary
    When multiple consecutive frames are simulated
    Then projectile collision checks reuse the same oil-drum collider object
    And burning-drum proximity checks reuse the same drum-position container
    And player burn damage outcomes remain unchanged

  Scenario: Projectile spawning appends without replacing active projectile state containers
    Given there are active projectiles in flight
    When additional shots are spawned in a later frame
    Then new projectiles are appended to the existing active projectile container
    And projectile simulation and impact behavior remain unchanged
