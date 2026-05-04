---
title: vscode-markdownlint User Requirements - Fixes And Formatting
tags:
  - research/vscode
  - research/markdownlint
  - requirements/user
updated: 2026-05-04
sources:
  - ../functional/fixes-formatting.md
  - ../../tests/index.md
---

# Fixes And Formatting

```text
Tag: UserMarkdownlint.QuickFix
Need: As a Markdown author, I need quick fixes for auto-fixable lint violations, so I can correct a single issue from the light bulb without editing Markdown syntax by hand.
Derived from: Markdownlint.CodeActions; Markdownlint.FixLine.
Acceptance cue: Eligible markdownlint diagnostics offer a preferred quick fix that applies the same single-line change as markdownlint's fix engine.
```

```text
Tag: UserMarkdownlint.FixAll
Need: As a Markdown author, I need one command to fix all supported violations in the current document, so routine style cleanup is fast and reversible.
Derived from: Markdownlint.CodeActions; Markdownlint.FixAll; test-ui fix-all smoke coverage.
Acceptance cue: `markdownlint.fixAll` applies all supported fixes, can be filtered by rule from code actions, and leaves non-Markdown or no-op contexts unchanged.
```

```text
Tag: UserMarkdownlint.FormatWithFixes
Need: As a VS Code user, I need markdownlint fixes to participate in the editor formatting workflow, so lint cleanup can fit into familiar Format Selection or documented formatting commands.
Derived from: Markdownlint.RangeFormatting.
Acceptance cue: Range-formatting requests apply supported markdownlint fixes only for violations inside the requested range and return no edit when no text changes.
```

```text
Tag: UserMarkdownlint.RuleHelp
Need: As a Markdown author, I need quick access to rule documentation from a reported violation, so I can understand why the rule fired and decide whether to fix or configure it.
Derived from: Markdownlint.CodeActions; Markdownlint.Diagnostics.
Acceptance cue: Diagnostics with rule information expose a quick action or diagnostic code target that opens the relevant markdownlint rule reference.
```
