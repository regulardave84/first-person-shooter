Feature: Player health HUD in bottom-right corner
  In order to view player status during gameplay
  As a player
  I want a health HUD shown in the bottom-right corner of the screen

  Scenario: Health HUD displays default placeholder value
    Given the game is running in first-person mode
    When the gameplay HUD is rendered
    Then a health HUD label is visible with the exact text "Health: 100"

  Scenario: Health HUD is anchored to the bottom-right corner
    Given the health HUD label is visible
    When the viewport is rendered
    Then the health HUD is positioned in the bottom-right corner of the screen
    And the label remains readable over the gameplay view

  Scenario: Health HUD is independent of the weapon HUD
    Given the health HUD is visible during active gameplay
    When no weapon HUD dependency is initialized
    Then the health HUD still renders with text-only content
