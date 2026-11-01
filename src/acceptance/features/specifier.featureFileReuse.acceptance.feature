Feature: Specifier reuses existing feature files for matching feature intents
  In order to avoid duplicate acceptance contracts
  As a maintainer
  I want specifier to update existing matching feature file(s) instead of always creating new files

  Scenario: Detect matching existing feature file before creating a new one
    Given approved feature files already exist in src/acceptance/features
    When specifier receives a new feature request
    Then it evaluates existing feature files for semantic and naming match before proposing a new file

  Scenario: Update matching feature file when intent already exists
    Given one or more existing feature files match the requested feature intent
    When specifier prepares acceptance criteria changes
    Then it proposes updates to the matching existing feature file(s)
    And it does not create a new duplicate feature file for the same intent

  Scenario: Create a new feature file only when no match exists
    Given no existing feature file matches the requested feature intent
    When specifier generates acceptance criteria
    Then it proposes creation of a new feature file in src/acceptance/features

  Scenario: Preserve approval gate for updates to existing feature files
    Given specifier proposes updates to an existing feature file
    When changes are prepared
    Then explicit user approval is required before persisting those feature-file updates
