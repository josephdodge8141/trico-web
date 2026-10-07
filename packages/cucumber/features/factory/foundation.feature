Feature: Permanent preview foundation
  A generated repository can synthesize the small shared AWS foundation that future dynamic preview commands will use.

  @id:factory.foundation.synth @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Synthesize the permanent foundation without credentials
    backend-noop: Foundation synthesis is factory infrastructure behavior outside the generated application backend.
    frontend-noop: Foundation synthesis is factory infrastructure behavior outside the generated application frontend.
    browser-noop: A CloudFormation template has no public preview page interaction.
    Given generic preview foundation configuration
    When the factory synthesizes the CDK application without AWS credentials
    Then the template contains the permanent network cluster image state logging and routing foundations
    And the foundation exposes immutable images and a bounded task execution role
    And the foundation holds an AIStor license in a protected secret readable only by preview task execution
    And the template does not contain a running preview workload or preview DNS record

  @id:factory.foundation.config @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject invalid foundation configuration before synthesis
    backend-noop: Foundation configuration is factory infrastructure behavior outside the generated application backend.
    frontend-noop: Foundation configuration is factory infrastructure behavior outside the generated application frontend.
    browser-noop: Configuration validation failure has no public preview page interaction.
    Given foundation configuration with invalid "<field>"
    When the factory validates the foundation configuration
    Then validation fails before CDK synthesis

    Examples: Invalid permanent configuration
      | case_id          | field             |
      | application-name | application name  |
      | zone-name        | preview zone name |
      | zone-id          | preview zone ID   |
