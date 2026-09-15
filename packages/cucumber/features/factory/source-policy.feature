Feature: Ordinary source boundaries
  The starter keeps source placement and transport boundaries simple and visible.

  @id:factory.source-policy.boundaries @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject obvious source boundary violations
    backend-noop: The source gate inspects repository structure rather than application request behavior.
    frontend-noop: The source gate inspects repository structure rather than application page behavior.
    browser-noop: Static source-policy failures have no public preview page interaction.
    Given the known application source directories and TypeScript projects
    When the source policy examines authored source
    Then it rejects unknown source placement backend import inversions frontend transport outside services suppression directives and visual styling outside the shared design system
