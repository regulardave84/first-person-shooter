# QA Procedure: Bullet holes appear on impacted world surfaces

> Scope: Manual UI verification checklist for bullet-hole impact feedback.
> Gate: Run this procedure only after acceptance scenarios are approved.

## Pass/Fail Policy

- Mark **Pass** only when all expected results for a manual test are observed.
- Mark **Fail** if any expected result is missing or incorrect.

## Manual Test 1: Wall impact spawns a bullet hole decal

- Source scenario: Wall impact spawns a bullet hole decal

### Setup

- Start the game and load into a level area with a visible wall.
- Ensure the player has a firearm and can shoot.

### UI Actions

1. Aim at a wall surface in front of the player.
2. Fire one shot.

### Expected Results

- A bullet hole mark appears at or near the wall impact point.
- The bullet hole visual uses the bullet hole texture asset.

### Pass/Fail Criteria

- Pass: a bullet hole appears on wall impact and uses the correct asset.
- Fail: no mark appears, or the wrong visual appears.

## Manual Test 2: Floor impact spawns a bullet hole decal

- Source scenario: Floor impact spawns a bullet hole decal

### Setup

- Keep the game running in a walkable area with visible floor.

### UI Actions

1. Aim downward at the floor.
2. Fire one shot.

### Expected Results

- A bullet hole mark appears at or near the floor impact point.
- The bullet hole visual uses the bullet hole texture asset.

### Pass/Fail Criteria

- Pass: floor impacts create a visible bullet hole with the correct texture.
- Fail: floor impacts produce no mark or incorrect texture.

## Manual Test 3: Oil drum impact does not spawn a bullet hole mark

- Source scenario: Oil drum impact does not spawn a bullet hole mark

### Setup

- Locate an active oil drum entity.

### UI Actions

1. Aim directly at the oil drum body.
2. Fire one shot.

### Expected Results

- No bullet hole mark appears on the oil drum.

### Pass/Fail Criteria

- Pass: oil drum impacts produce no bullet-hole decal.
- Fail: any bullet-hole decal appears on the oil drum.

## Manual Test 4: Repeated wall and floor hits accumulate bullet holes up to a safe cap

- Source scenario: Repeated wall and floor hits accumulate bullet holes up to a safe cap

### Setup

- Stay in an area where wall and floor can both be shot.

### UI Actions

1. Fire repeated shots into walls and floor to create many marks.
2. Continue firing until older marks begin disappearing.

### Expected Results

- New bullet hole marks continue to appear during sustained shooting.
- When capacity is exceeded, oldest marks are removed first.

### Pass/Fail Criteria

- Pass: mark count is capped without blocking new marks, with FIFO removal behavior.
- Fail: marks grow without bound, or new marks stop appearing unexpectedly.

## Manual Test 5: Non-hit shots do not create bullet holes

- Source scenario: Non-hit shots do not create bullet holes

### Setup

- Position the player so shots can be fired into open space away from walls and floor.

### UI Actions

1. Aim into non-intersecting open space.
2. Fire one shot.

### Expected Results

- No bullet hole mark is created.

### Pass/Fail Criteria

- Pass: missed shots produce no bullet-hole marks.
- Fail: a mark appears without a valid impact on wall or floor.
