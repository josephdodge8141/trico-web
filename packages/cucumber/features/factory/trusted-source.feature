Feature: Trusted source boundary
  Privileged factory execution uses reviewed control code while candidate application inputs remain pinned to the admitted candidate.

  @id:factory.trusted-source-selection @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Keep control execution separate from candidate inputs
    backend-noop: Source selection is factory orchestration behavior outside the backend application.
    frontend-noop: Source selection is factory orchestration behavior outside the frontend application.
    browser-noop: Repository source selection has no browser-observable application surface.
    Given an admitted candidate revision and a verified control revision
    When privileged preview orchestration begins
    Then application features Compose and build inputs come from the candidate revision
    And orchestration evaluator browser code and dependency installation come from the control revision
    And no candidate-controlled executable runs with privileged credentials

  @id:factory.trusted-source.reject-non-main-deployment-control @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject privileged deployment dispatch from a non-main control revision
    backend-noop: Workflow-ref admission is factory orchestration behavior outside the backend.
    frontend-noop: Workflow-ref admission is factory orchestration behavior outside the frontend.
    browser-noop: Rejected workflow control source never reaches an application deployment.
    Given a privileged deployment is manually dispatched from a non-main ref
    When the workflow derives its release identity
    Then it rejects the control ref before checking out application code or requesting deployment credentials

  @id:factory.trusted-preview.image-scan-gate @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Gate preview admission on both exact candidate image scans
    backend-noop: Candidate image scanning is trusted preview infrastructure behavior.
    frontend-noop: Candidate image scanning has no generated frontend interaction.
    browser-noop: A candidate preview is not launched when either image scan is rejected.
    Given preview admission selected exact backend and frontend digests
    When the trusted workflow checks both ECR Basic Scans
    Then it "<decision>" before task launch

    Examples: Preview image scan outcomes
      | case_id              | decision                                                       |
      | clean-candidate      | admits after both COMPLETE scans have no HIGH or CRITICAL      |
      | backend-high         | stops when the backend scan reports HIGH                       |
      | frontend-critical    | stops when the frontend scan reports CRITICAL                  |
      | scan-timeout         | stops when either scan remains pending at the deadline         |
      | findings-unavailable | stops when either image scan findings are unavailable          |
      | findings-query-error | stops when either findings query fails                         |
