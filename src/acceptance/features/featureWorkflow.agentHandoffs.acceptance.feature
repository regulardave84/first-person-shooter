# Approved by user on 2026-11-15. Do not modify without explicit user permission.
Feature: Feature workflow runs each phase in a dedicated agent with explicit handoffs

  Scenario: Run specifier in a dedicated agent first
    Given a feature request starts the workflow
    When orchestration begins
    Then the specifier phase is executed by a dedicated specifier agent
    And no implementer work starts before specifier completes successfully

  Scenario: Handoff from specifier to implementer with required artifacts
    Given the specifier agent completes successfully
    When control is handed to implementation
    Then the handoff includes approved acceptance artifact references
    And the implementer agent starts using those artifacts as the contract

  Scenario: Run implementer then hand off to cleaner
    Given the implementer agent completes successfully
    When implementation results are handed off
    Then the cleaner phase is executed by a dedicated cleaner agent
    And the cleaner handoff includes changed-files and verification summary

  Scenario: Run cleaner then hand off to hardener
    Given the cleaner agent completes successfully
    When cleanup results are handed off
    Then the hardener phase is executed by a dedicated hardener agent
    And hardener receives mutation-scope inputs from the handoff

  Scenario: Block downstream phases on failed handoff status
    Given any phase reports a blocked or failed status
    When orchestration evaluates next-phase eligibility
    Then downstream phase agents are not started
    And the workflow reports the blocking phase and reason

  Scenario: Produce final chained workflow report
    Given all phase agents complete successfully
    When the workflow finishes
    Then a final report includes each phase status and handoff outputs in order
