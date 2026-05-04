@smoke
Feature: Callout linting

  Scenario: Unknown callout type reports OFM040
    Given a file "notes/index.md" containing:
      """
      > [!CUSTOM] My callout
      > content
      """
    And the config allowList is ["NOTE", "WARNING", "TIP", "IMPORTANT", "CAUTION"]
    When I run markdownlint-obsidian on "notes/index.md"
    Then the exit code is 1
    And error OFM040 is reported on line 1

  Scenario: Known callout type passes
    Given a file "notes/index.md" containing:
      """
      > [!NOTE] My note
      > content
      """
    When I run markdownlint-obsidian on "notes/index.md"
    Then the exit code is 0

  Scenario: Multi-paragraph callout separator does not report MD028
    Given a file "notes/index.md" containing:
      """
      > [!INFO] Test callout
      > Line one.
      >
      > Line two.
      """
    When I run markdownlint-obsidian on "notes/index.md"
    Then the exit code is 0
    And error MD028 is not reported

  Scenario: Custom callout type allowed via config
    Given a file "notes/index.md" containing:
      """
      > [!CUSTOM] My callout
      > content
      """
    And the config allowList includes "CUSTOM"
    When I run markdownlint-obsidian on "notes/index.md"
    Then the exit code is 0
