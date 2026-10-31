Feature: First person shooter current behavior

  Scenario: Player can request pointer lock by clicking the game canvas
    Given the game renderer canvas is visible
    When the player clicks the renderer canvas
    Then the renderer canvas requests pointer lock

  Scenario: Mouse movement is ignored when pointer lock is not active
    Given pointer lock is not active on the renderer canvas
    When a mousemove event is received
    Then yaw and pitch are not updated

  Scenario: Mouse movement updates camera look while pointer lock is active
    Given pointer lock is active on the renderer canvas
    And current yaw and pitch values are tracked
    When a mousemove event with movementX and movementY is received
    Then yaw and pitch are updated using updateLookAngles
    And camera rotation is set using YXZ order

  Scenario: Movement keys are tracked from keyboard events
    Given movement keys W A S D are initialized to false
    When keydown is triggered for a movement key
    Then that movement key state becomes true
    When keyup is triggered for the same movement key
    Then that movement key state becomes false

  Scenario: Animation loop applies movement delta to camera position
    Given the animation loop is running
    And moveSpeed is DEFAULT_MOVE_SPEED
    When a frame is processed
    Then dt is read from the clock
    And movement delta is computed using getMovementDelta with keys yaw dt and moveSpeed
    And camera x and z positions are updated by that movement delta

  Scenario: Player height is locked every frame
    Given PLAYER_HEIGHT is defined
    When a frame is processed in the animation loop
    Then camera y position is set to PLAYER_HEIGHT

  Scenario: Window resize updates projection and renderer size
    Given the camera and renderer are initialized
    When the browser window is resized
    Then camera aspect is updated from the new window dimensions
    And camera projection matrix is updated
    And renderer size is updated to the new window dimensions

  Scenario: Scene starts with expected world geometry layout
    Given the scene is initialized
    When world geometry is created
    Then one floor mesh is added
    And four outer walls are added
    And two inner walls are added
