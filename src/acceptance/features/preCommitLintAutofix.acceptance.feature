Feature: Pre-commit lint auto-fix
  As a developer
  I want pre-commit checks to auto-fix lint issues
  So that trivial formatting and lint problems do not block commits

  Scenario: Pre-commit auto-fixes lint errors before validation
    Given I have staged files with auto-fixable ESLint issues
    When the pre-commit hook runs
    Then ESLint auto-fix is executed before lint validation
    And the hook validates code quality after auto-fixes are applied

  Scenario: Pre-commit still blocks on non-fixable lint failures
    Given I have staged files with non-fixable lint issues
    When the pre-commit hook runs
    Then the commit is blocked
    And the hook output includes the lint failure details
