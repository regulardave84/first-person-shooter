Feature: Cleaner performs directory structure assessment before cleanup work
  In order to prevent architecture drift and misplaced artifacts
  As a maintainer
  I want cleaner to assess directory structure first as part of general code review

  Scenario: Directory structure assessment runs before all other cleaner stages
    Given cleaner is invoked for a review and cleanup run
    When cleaner starts its general code review phase
    Then it performs a directory structure assessment first
    And no cleanup refactor step runs before that assessment completes

  Scenario: Cleaner validates expected repository layout conventions
    Given project directory layout conventions are defined
    When cleaner evaluates the current repository structure
    Then it reports missing required directories
    And it reports acceptance artifacts that are outside approved acceptance folders

  Scenario: Cleaner reports actionable structure findings
    Given directory structure assessment has completed
    When cleaner produces its review output
    Then the report includes a summary status for directory structure
    And each structure issue includes path, rule violated, and recommended action

  Scenario: Cleaner blocks cleanup refactors on critical structure violations
    Given directory structure assessment identifies critical violations
    When cleaner evaluates whether to continue
    Then cleaner marks the run as failed
    And cleanup refactor work does not proceed until violations are addressed
