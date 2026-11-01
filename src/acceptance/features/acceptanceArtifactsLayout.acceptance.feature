Feature: Organise acceptance artifacts into dedicated folders

  Scenario: Move acceptance feature files into a dedicated features folder
    Given acceptance feature files are currently mixed with source files in src
    When acceptance artifacts are reorganised
    Then all .acceptance.feature files are located in src/acceptance/features

  Scenario: Move acceptance test files into a dedicated tests folder
    Given acceptance test files are currently mixed with unit tests in src
    When acceptance artifacts are reorganised
    Then all .acceptance.test.ts files are located in src/acceptance/tests
    And all .acceptance.generated.test.ts files are located in src/acceptance/tests/generated

  Scenario: Keep test discovery and quality gates working after reorganisation
    Given acceptance artifacts have moved to dedicated folders
    When test and lint configurations are evaluated
    Then acceptance tests are still discovered by acceptance test configuration
    And unit test configuration continues excluding acceptance tests

  Scenario: Update specifier skill output paths for new acceptance artifact locations
    Given future feature work should follow repository conventions
    When the specifier skill generates acceptance artifacts
    Then it writes feature files to src/acceptance/features
    And it writes generated acceptance tests to src/acceptance/tests/generated
    And it writes QA procedure documents to src/acceptance/qa
