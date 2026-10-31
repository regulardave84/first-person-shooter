Feature: Hardener scopes mutation testing to current branch changes
  In order to get meaningful mutation feedback per feature branch
  As a maintainer
  I want hardener to mutate implementation files changed on the current branch

  Scenario: Select changed implementation files as mutation targets
    Given a branch with changed TypeScript implementation files under src
    When hardener prepares mutation testing
    Then it builds the mutate target list from those changed implementation files

  Scenario: Exclude non-implementation files from mutation target list
    Given a branch with changed test files and documentation files
    When hardener prepares mutation testing
    Then only changed implementation source files are included as mutate targets

  Scenario: Fallback when no implementation files changed
    Given a branch with no changed implementation source files
    When hardener prepares mutation testing
    Then hardener reports mutation scope as blocked with a clear explanation

  Scenario: Run mutation command with branch-scoped mutate configuration
    Given a branch with changed implementation source files
    When hardener executes mutation testing
    Then mutation testing runs using the branch-scoped mutate target list

  Scenario: Report mutation scope for traceability
    Given hardener completes mutation execution
    When hardener reports results
    Then the report includes base branch, changed files considered, and final mutate target list
