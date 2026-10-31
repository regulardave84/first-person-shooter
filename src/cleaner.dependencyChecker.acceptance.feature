# Approved by user on 2026-10-31. Do not modify without explicit user permission.
Feature: Cleaner runs dependency checker at the correct workflow stage

  Scenario: Execute dependency checker after code review and before cleanup refactors
    Given the cleaner workflow has completed high-risk code review
    When the cleaner workflow proceeds to pre-cleanup validation
    Then the dependency checker is executed before any cleanup refactor begins

  Scenario: Fail cleaner workflow when dependency checker finds policy violations
    Given the dependency checker reports one or more disallowed dependency violations
    When cleaner evaluates pre-cleanup validation results
    Then cleaner marks the run as failed
    And cleanup refactor steps are not executed

  Scenario: Continue cleaner workflow when dependency checker passes
    Given the dependency checker reports no disallowed dependency violations
    When cleaner evaluates pre-cleanup validation results
    Then cleaner continues to cleanup refactor steps

  Scenario: Include dependency checker outcome in cleaner reporting
    Given cleaner completes a workflow run
    When final cleaner output is written
    Then the report includes dependency checker status and findings summary
