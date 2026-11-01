Feature: Hardener gates mutation runs by full test suite
  In order to avoid noisy or invalid mutation runs
  As a maintainer
  I want hardener to validate the full test suite before running scoped mutation testing

  Scenario: Identify branch changes against main
    Given the current branch differs from origin/main
    When hardener prepares execution
    Then it identifies changed files using branch diff against the base branch

  Scenario: Run the full test suite before mutation
    Given hardener is preparing mutation testing
    When hardener evaluates test readiness
    Then it runs the entire project test suite

  Scenario: Block mutation when any test fails
    Given the project test suite has failing tests
    When hardener evaluates readiness for mutation testing
    Then hardener blocks mutation execution
    And hardener reports that mutation testing is blocked because the test suite failed

  Scenario: Run branch-scoped mutation after full test suite passes
    Given the entire project test suite passes
    When hardener executes mutation testing
    Then it runs mutation testing with mutate targets scoped to changed implementation files

  Scenario: Mutation run executes only after full test pass gate
    Given the entire project test suite passes
    When hardener creates scoped mutation configuration
    Then the mutation test command runs with branch-scoped mutate targets
