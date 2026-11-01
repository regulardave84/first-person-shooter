# Approved by user on 2026-10-31. Do not modify without explicit user permission.
Feature: Specifier generates a manual UI QA procedure from approved feature requirements

  Scenario: Generate QA procedure document after acceptance approval
    Given a feature request has approved Gherkin acceptance scenarios
    When the specifier completes acceptance generation
    Then it writes a QA procedure document for manual UI verification

  Scenario: Include actionable manual test steps and expected outcomes
    Given the specifier is writing a QA procedure document
    When it describes each accepted scenario
    Then each manual test includes setup, step-by-step UI actions, and expected results
    And each manual test includes clear pass/fail criteria

  Scenario: Preserve traceability between scenarios and manual tests
    Given an approved acceptance scenario list
    When the QA procedure document is generated
    Then each manual test references its source scenario name

  Scenario: Do not require additional approval for QA procedure output
    Given acceptance tests have been approved by the user
    When the QA procedure document is generated
    Then implementation changes can proceed without separate QA procedure approval
