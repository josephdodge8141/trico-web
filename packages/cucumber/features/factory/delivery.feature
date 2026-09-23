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

  @id:factory.delivery.prod-backup-ready @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Require an available snapshot before production deployment
    backend-noop: Production snapshots are deployment infrastructure behavior outside the generated application backend.
    frontend-noop: Production snapshots have no generated application frontend interaction.
    browser-noop: Backup readiness is verified by the deployment workflow before public deployment.
    Given the production stack exists and exposes its application table
    When production deployment creates a pre-deployment backup
    Then the backup must reach AVAILABLE before application deployment starts

  @id:factory.delivery.prod-first-deploy @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Allow a verified first production deployment without a snapshot
    backend-noop: First-deployment detection is deployment infrastructure behavior outside the generated application backend.
    frontend-noop: First-deployment detection has no generated application frontend interaction.
    browser-noop: First-deployment detection is verified before the public application exists.
    Given CloudFormation confirms that the production stack does not exist
    When production deployment prepares its backup gate
    Then deployment may proceed without a snapshot

  @id:factory.delivery.prod-backup-lookup-failure @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Stop production deployment when stack lookup fails unexpectedly
    backend-noop: CloudFormation lookup failure handling is deployment infrastructure behavior outside the generated application backend.
    frontend-noop: CloudFormation lookup failure handling has no generated application frontend interaction.
    browser-noop: Lookup failures must stop deployment before the public application is changed.
    Given CloudFormation cannot determine whether the production stack exists
    When production deployment prepares its backup gate
    Then deployment must fail without treating the error as a first deployment

  @id:factory.delivery.prod-backup-create-failure @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Stop production deployment when backup creation or readiness fails
    backend-noop: Backup creation and readiness are deployment infrastructure behavior outside the generated application backend.
    frontend-noop: Backup creation and readiness have no generated application frontend interaction.
    browser-noop: Failed snapshots must stop deployment before the public application is changed.
    Given the production stack exists and exposes its application table
    When backup creation fails or the backup does not become AVAILABLE
    Then production application deployment must not start

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

  @id:factory.delivery.redeploy-existing @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Redeploy an existing exact development release
    backend-noop: Release reactivation is deployment workflow behavior outside the generated application backend.
    frontend-noop: Release reactivation does not add a separate generated application frontend interaction.
    browser-noop: The workflow verifies the public release marker and protected session after activating both artifacts.
    Given an immutable backend image and frontend archive exist for a main branch SHA
    When development redeployment selects that exact SHA
    Then the workflow verifies the strict manifest backend digest and frontend checksum before deployment
    And it builds and publishes no artifacts and does not run the checked-out release seed bootstrap
    And the deployed backend and served frontend identify the same release SHA

  @id:factory.delivery.redeploy-existing-rejects @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject an incomplete or substituted existing release before activation
    backend-noop: Existing release verification is deployment workflow behavior before generated backend interaction.
    frontend-noop: Rejected release artifacts are not activated in the generated frontend.
    browser-noop: A deployment that fails artifact verification does not expose a new public release marker.
    Given an existing development release has an invalid "<failure>"
    When development redeployment selects that release SHA
    Then deployment stops before CloudFormation and frontend activation
    And it does not build, publish, or seed the selected release

    Examples: Existing release failures
      | case_id                  | failure                   |
      | missing-manifest         | manifest is missing       |
      | substituted-sha          | manifest SHA differs      |
      | corrupt-frontend-archive | frontend checksum differs |
      | missing-backend-image    | backend digest is missing |

  @id:factory.delivery.redeploy-existing-dev-only @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject existing-release reactivation for production
    backend-noop: Dev-only release reactivation is rejected before application stack mutation.
    frontend-noop: The rejected dev-only path does not change production frontend files.
    browser-noop: The production deployment path retains its independent backup and promotion checks.
    Given existing-release reactivation was selected for production
    When the workflow validates its deployment inputs
    Then it rejects the dev-only path before assuming the production deployment role
    And ordinary production promotion retains its pre-deployment state snapshot
