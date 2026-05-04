@smoke
Feature: Standard markdownlint rule adapter

  Scenario: Whole-line markdownlint fixes do not surface OFM901
    Given a file "notes/index.md" containing:
      """
      # Test


      paragraph
      """
    When I run markdownlint-obsidian on "notes/index.md"
    Then the exit code is 0
    And error MD012 is reported
    And error OFM901 is not reported
