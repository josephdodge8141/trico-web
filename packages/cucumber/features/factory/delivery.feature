Feature: Immutable application delivery
  The factory builds one reviewed release and promotes the same artifacts through development and production.

  @id:factory.delivery.release-identity @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Publish one SHA-addressed release manifest
    backend-noop: Release publication is factory delivery behavior outside the generated application backend.
    frontend-noop: Release publication has no generated application frontend interaction.
    browser-noop: Artifact identity is verified before the public application is deployed.
    Given a validated main branch release SHA
    When development publishes the backend image and frontend archive
    Then one strict manifest records the SHA backend digest frontend key and frontend checksum
    And every deployment step uses that validated release SHA

  @id:factory.delivery.promote-exact @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Promote production without rebuilding or substituting artifacts
    backend-noop: Release promotion is factory delivery behavior outside the generated application backend.
    frontend-noop: Release promotion has no generated application frontend interaction.
    browser-noop: Artifact promotion is verified before browser smoke tests run.
    Given a development-tested release manifest for a main branch SHA
    When production promotion is approved
    Then production resolves the exact recorded backend digest and frontend checksum
    And production executes no application build or artifact publication step

  @id:factory.delivery.foundation @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Synthesize an environment-scoped delivery trust boundary
    backend-noop: Delivery IAM and artifact storage are factory infrastructure outside the generated backend.
    frontend-noop: Delivery IAM and artifact storage have no generated frontend interaction.
    browser-noop: A delivery-foundation template has no public page interaction.
    Given generic GitHub repository and notification configuration
    When the factory synthesizes the delivery foundation without AWS credentials
    Then it creates environment-scoped OIDC roles and protected release stores
    And routine workflows cannot assume the foundation owner role

  @id:factory.delivery.disabled-external-sync @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Omit external AI access when synchronization is disabled
    backend-noop: Disabled external synchronization is enforced by deployment configuration and IAM.
    frontend-noop: No external synchronization control is exposed in the generated frontend.
    browser-noop: The absence of an IAM grant is verified in the synthesized application template.
    Given external synchronization is disabled for an application environment
    When the factory synthesizes the application stack
    Then the backend receives fixture-mode configuration without a model identifier
    And the backend role receives no Bedrock inference permissions

  @id:factory.delivery.seeded-operator @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Seed one explicitly configured external operator
    backend-noop: The deployment bootstrap creates the operator before application behavior is exercised.
    frontend-noop: The existing authenticated editor interface accepts the resulting verified principal.
    browser-noop: The deployed smoke suite covers login for the protected seeded operator.
    Given a protected environment configures one external operator email
    When deployment performs checksum-safe bootstrap
    Then only that exact external address may bypass the TriCo seed-domain check
    And ordinary self-registration remains restricted to @tricoinc.com
