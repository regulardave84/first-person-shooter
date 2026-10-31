# Approved by user on 2026-10-31. Do not modify without explicit user permission.
Feature: Dependency checker enforces approved dependency policy

  Scenario: Scan source files to discover used dependencies
    Given the repository contains source files with import or require statements
    When the dependency checker runs
    Then it produces a list of discovered external dependencies used by the source code

  Scenario: Compare discovered dependencies against policy lists
    Given a dependency policy defines allowed and disallowed dependency lists
    And the dependency checker has discovered dependencies from source files
    When policy validation runs
    Then each discovered dependency is classified as allowed, disallowed, or unlisted

  Scenario: Reject disallowed dependencies
    Given one or more discovered dependencies are in the disallowed list
    When policy validation completes
    Then the checker reports each disallowed dependency as a violation
    And the check result is marked as failed

  Scenario: Flag unlisted dependencies for review
    Given one or more discovered dependencies are not in the allowed or disallowed lists
    When policy validation completes
    Then the checker reports each unlisted dependency for policy review

  Scenario: Protect policy list changes behind explicit permission
    Given dependency policy files are under change review
    When a change modifies allowed or disallowed dependency lists
    Then the change requires explicit user approval before it is accepted
