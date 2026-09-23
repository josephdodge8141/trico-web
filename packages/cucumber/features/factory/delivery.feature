Feature: Immutable application delivery
  The factory builds one reviewed release and promotes the same artifacts through development and production.

  @id:factory.delivery.automatic-main-delivery @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Automatically deliver one enabled main SHA through verified development to production
    backend-noop: Automatic environment promotion is repository deployment workflow behavior outside the generated backend.
    frontend-noop: Automatic promotion does not add a generated frontend interaction.
    browser-noop: The same release SHA is verified in development and production before delivery completes.
    Given automatic application delivery is enabled for main
    When a commit is pushed to main
    Then development builds and publishes the release artifacts for that exact SHA
    And production starts only after development has verified its backend and frontend for that SHA
    And production deploys the same immutable artifacts without building or publishing them again

  @id:factory.delivery.automatic-main-disabled @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Do not automatically deliver main when automatic delivery is disabled
    backend-noop: Automatic deployment enablement is repository workflow configuration.
    frontend-noop: The disabled deployment path does not change the generated frontend.
    browser-noop: No public deployment occurs when the repository disables automatic delivery.
    Given automatic application delivery is disabled for main
    When a commit is pushed to main
    Then neither development nor production application deployment starts

  @id:factory.delivery.automatic-main-stale @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Stop an automatic release that is no longer the main branch head
    backend-noop: Stale release prevention is repository deployment workflow behavior.
    frontend-noop: A stale release does not update the generated frontend.
    browser-noop: A superseded SHA cannot replace the currently delivered main release.
    Given an automatic main release SHA is no longer the main branch head
    When its deployment stage is ready to activate
    Then that stage stops before changing the environment
    And a later main release may proceed through its own verified stages

  @id:factory.delivery.promote-unverified-dev-rejects @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject production promotion without successful development verification
    backend-noop: The production workflow requires a development verification receipt before mutation.
    frontend-noop: A release that failed development smoke does not change production frontend files.
    browser-noop: Production cannot publish a release manifest that was never verified in development.
    Given a main release manifest exists but development deployment or smoke failed
    When production promotion selects that release SHA
    Then the workflow rejects it without a matching successful development verification receipt
    And it stops before the production backup or application deployment

  @id:factory.delivery.promote-historical-dev-verified @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Allow rollback to a historical release verified in development
    backend-noop: Historical promotion is deployment workflow behavior outside the generated backend.
    frontend-noop: The rollback uses the exact immutable frontend archive already verified in development.
    browser-noop: Production smoke verifies the historical release after activation.
    Given a main-branch ancestor has a strict development verification receipt matching its release manifest
    When an operator dispatches production promotion for that historical SHA
    Then production may continue through its image scan and backup gates
    And it resolves the same backend digest and frontend checksum recorded by the receipt

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

  @id:factory.delivery.ses-feedback-policy @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Route verified SES bounce and complaint feedback through operations alerts
    backend-noop: SES identity notifications and the operations SNS policy are factory infrastructure behavior outside the generated backend.
    frontend-noop: Email feedback monitoring has no generated frontend interaction.
    browser-noop: Feedback delivery is verified from the infrastructure template and operator runbook.
    Given a verified SES sending identity and the operations SNS topic
    When the delivery foundation is synthesized and SES feedback is configured
    Then the topic permits SES publishing only for that identity in the current AWS account
    And the setup sends bounce and complaint notifications to the topic while keeping email forwarding enabled

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

  @id:factory.delivery.dependency-audit @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Block high or critical dependency advisories before privileged deployment
    backend-noop: Dependency admission is enforced by factory CI and deployment workflows before backend activation.
    frontend-noop: Dependency admission has no generated frontend interaction.
    browser-noop: Dependency admission happens before a public release is deployed.
    Given the dependency audit reports a "<severity>" vulnerability
    When an unprivileged pull request candidate or application release is checked
    Then the check fails before deployment credentials are issued
    And no dependency vulnerability bypass is applied

    Examples: Blocking vulnerability severities
      | case_id  | severity |
      | high     | high     |
      | critical | critical |

  @id:factory.delivery.dependency-audit-clear @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Continue admission when no high or critical dependency advisory is reported
    backend-noop: Dependency admission is enforced by factory CI and deployment workflows before backend activation.
    frontend-noop: Dependency admission has no generated frontend interaction.
    browser-noop: Dependency admission happens before a public release is deployed.
    Given the dependency audit reports no high or critical vulnerability
    When an unprivileged pull request candidate or application release is checked
    Then the check may continue to its remaining validations

  @id:factory.delivery.dependency-audit-rollback @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Keep dependency admission fail-closed during existing-release reactivation
    backend-noop: The workflow audits the selected release lockfile before deployment credentials are issued.
    frontend-noop: Existing-release activation has no distinct dependency-audit frontend interaction.
    browser-noop: A blocked reactivation does not change the public release.
    Given an existing development release previously passed dependency admission
    And the package registry now reports a high or critical advisory for its locked dependencies
    When development selects the existing release SHA
    Then dependency admission blocks reactivation before deployment credentials are issued
    And the workflow has no silent advisory bypass

  @id:factory.delivery.trusted-control-dependency-audit @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Audit the independent trusted workflow-control dependency tree
    backend-noop: Trusted workflow-control dependencies are deployment orchestration behavior.
    frontend-noop: Trusted workflow-control dependency admission has no generated frontend behavior.
    browser-noop: Dependency rejection happens before any release mutation.
    Given deployment installs dependencies for a separate trusted workflow-control checkout
    When the control dependency lockfile is audited
    Then HIGH and CRITICAL advisories block before deployment credentials are issued
    And the trusted control dependency audit has no bypass

  @id:factory.delivery.image-scan-gate @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Gate release activation on the exact backend image scan
    backend-noop: Release image scanning is deployment infrastructure behavior outside the generated backend.
    frontend-noop: Release image scanning has no generated frontend interaction.
    browser-noop: A rejected image never becomes the active release at the public origin.
    Given a "<path>" activation selects one immutable backend digest
    When the workflow checks that digest's ECR Basic Scan
    Then it "<decision>" before application deployment

    Examples: Release image scan outcomes
      | case_id              | path                 | decision                                                      |
      | dev-clean            | standard development | continues after COMPLETE with no HIGH or CRITICAL findings   |
      | prod-clean           | production promotion | continues after COMPLETE with no HIGH or CRITICAL findings   |
      | redeploy-clean       | existing dev release | continues after COMPLETE with no HIGH or CRITICAL findings   |
      | high-finding         | production promotion | stops when COMPLETE reports a HIGH finding                   |
      | critical-finding     | standard development | stops when COMPLETE reports a CRITICAL finding               |
      | pending-timeout      | existing dev release | stops when the scan remains pending at the deadline          |
      | unavailable-findings | production promotion | stops when scan findings are unavailable                     |
      | findings-query-error | production promotion | stops when the findings query fails                         |

  @id:factory.delivery.historical-control-tools @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Run release control gates from trusted workflow source for a historical SHA
    backend-noop: Release tool provenance is deployment workflow behavior outside the generated backend.
    frontend-noop: Release tool provenance has no generated frontend interaction.
    browser-noop: The release stays unchanged if trusted control tools are unavailable.
    Given a tested main release SHA predating the required control tools
    When the workflow activates that exact SHA for "<path>"
    Then it runs "<gates>" from the trusted workflow control checkout
    And application code, CDK synthesis, and artifacts remain pinned to the selected SHA

    Examples: Historical release activation paths
      | case_id                          | path                    | gates                                 |
      | historical-dev-redeploy-control  | development reactivation | ECR scan gate                         |
      | historical-prod-promotion-control | production promotion    | ECR scan and production backup gates |
