Feature: Cleaner enforces coverage quality threshold
  In order to prevent low-coverage changes from passing cleanup
  As a maintainer
  I want cleaner to enforce repository coverage thresholds during its coverage phase

  Scenario: Cleaner fails when branch coverage drops below threshold
    Given repository coverage thresholds are configured to 95 percent
    When cleaner runs coverage and branch coverage is below threshold
    Then cleaner fails with a clear threshold violation error

  Scenario: Cleaner passes when coverage meets configured thresholds
    Given repository coverage thresholds are configured to 95 percent
    When cleaner runs coverage and all thresholds are met
    Then cleaner continues to CRAP analysis and dependency checks

  Scenario: Cleaner uses the same thresholds as the primary Vitest coverage policy
    Given Vitest coverage thresholds are defined in project configuration
    When cleaner executes its coverage step
    Then cleaner does not override thresholds to lower values

  Scenario: Cleaner reporting preserves threshold context
    Given cleaner has run the coverage phase
    When coverage thresholds are evaluated
    Then output includes enough information to identify the failed metric and required threshold
