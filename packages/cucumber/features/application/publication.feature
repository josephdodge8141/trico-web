Feature: Page publication and recovery
  Editors publish exact reviewed revisions into immutable page releases.

  @id:publication.exact-selection @frontend-noop
  Scenario: Publish an exact multi-page selection
    frontend-noop: Atomic selection and manifest ordering are backend deployment invariants exercised by the backend adapter.
    Given selected pending changes still exist at their reviewed revisions
    When an authenticated editor publishes the selection
    Then all selected entities and page snapshots are committed atomically
    And unselected pending changes remain pending
    And immutable page files are written before the manifest is switched
    And the operation becomes LIVE after the manifest switch

  @id:publication.stale-selection @frontend-noop
  Scenario: Reject a selection containing one stale revision
    frontend-noop: Exact revision validation is a backend concurrency invariant exercised by the backend adapter.
    Given one selected pending change no longer matches its reviewed revision
    When an authenticated editor publishes the selection
    Then the entire request fails with PUBLISH_SELECTION_STALE
    And none of the selected changes are published

  @id:publication.transaction-budget @frontend-noop @browser-noop-eligible
  Scenario: Reject a selection exceeding the DynamoDB action budget
    frontend-noop: Transaction action calculation is backend persistence behavior surfaced as a typed error.
    browser-noop: Constructing a selection over the persistence action limit is covered deterministically at the backend boundary.
    Given a publish selection would require more than 100 transaction actions
    When the backend calculates the transaction before writing
    Then it rejects the request with PUBLISH_SELECTION_TOO_LARGE
    And no transaction is attempted

  @id:publication.page-size @frontend-noop @browser-noop-eligible
  Scenario: Reject a page snapshot beyond its conservative size ceiling
    frontend-noop: Serialized DynamoDB item sizing is owned by the backend.
    browser-noop: A deliberately oversized snapshot is a backend contract case without a useful browser interaction.
    Given an assembled publication snapshot exceeds the configured page ceiling
    When publication is validated
    Then it is rejected with PAGE_SNAPSHOT_TOO_LARGE
    And no publication transaction is attempted

  @id:publication.deploy-failure @frontend-noop
  Scenario: Preserve the live manifest after deployment failure
    frontend-noop: Injected object-store failure and global blocking are backend deployment invariants exercised by the backend adapter.
    Given a publication transaction committed
    And writing an affected immutable page fails
    When deployment failure is recorded
    Then the previous manifest remains live
    And the operation becomes DEPLOY_FAILED
    And publish, rollback, and automatic publication are blocked
    But editing and preview remain available

  @id:publication.retry @frontend-noop
  Scenario: Retry a failed deployment from authoritative entities
    frontend-noop: Authoritative rebuild and manifest ordering are backend deployment invariants exercised by the backend adapter.
    Given a publish operation is DEPLOY_FAILED
    When an authenticated editor retries it
    Then every affected page is rebuilt from current entities
    And the manifest switches only after every page write succeeds
    And the operation becomes LIVE

  @id:publication.rollback @frontend-noop
  Scenario: Roll back one page while preserving compatible pending work
    frontend-noop: Snapshot restoration and pending-change rebasing are backend transaction invariants exercised by the backend adapter.
    Given a historical publication and current pending changes for its page
    When an authenticated editor confirms rollback
    Then the historical snapshot becomes a new publication
    And surviving changes retain replacement values and revisions against the restored baseline
    And changes and sources for missing targets are removed
    And only that page's manifest entry is switched
