Feature: Bounded preview lifecycle
  The factory keeps one preview for the exact admitted pull request revision and cleans it up safely.

  @id:factory.lifecycle.current-admission @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Admit the exact current pull request revision
    backend-noop: Preview admission is factory runtime behavior outside the generated application backend.
    frontend-noop: Preview admission has no generated application frontend interaction.
    browser-noop: Reducer state and idempotent start work are not observable through the public preview page.
    Given a trusted factory event for the current repository pull request revision
    When the lifecycle admits that revision
    Then it creates one deterministic generation with immutable repository pull request and generation ownership
    And it emits idempotent start work for that generation

  @id:factory.lifecycle.replace-revision @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Replace a preview only while bounded cleanup is available
    backend-noop: Revision replacement and cleanup scheduling are factory runtime behavior outside the generated application backend.
    frontend-noop: Revision replacement has no generated application frontend interaction.
    browser-noop: Retiring-generation state is not observable through the public preview page.
    Given an admitted preview for an older revision
    When a newer ordered revision is admitted
    Then it becomes the active generation and schedules ownership-checked cleanup of the old generation
    And another revision is retryably rejected until that retiring cleanup completes

  @id:factory.lifecycle.fixed-expiry @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Record one fixed expiry after timely health
    backend-noop: Preview deadline accounting is factory runtime behavior outside the generated application backend.
    frontend-noop: Preview deadline accounting has no generated application frontend interaction.
    browser-noop: Health and expiry timestamps are not observable through the public preview page.
    Given the active generation reports its first successful health before startup deadline
    When duplicate health reports arrive
    Then the first health records one four hour expiry without extension
    And startup timeout or expiry schedules ownership-checked cleanup when due

  @id:factory.lifecycle.readmit-after-expiry @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Admit a different revision after expiry cleanup completes
    backend-noop: Re-admission after cleanup is factory lifecycle behavior outside the generated application backend.
    frontend-noop: Re-admission after cleanup has no generated application frontend interaction.
    browser-noop: Generation counters and cleanup completion are not observable through the public preview page.
    Given an open pull request whose healthy preview generation expired and was cleaned
    When a different current revision is admitted after cleanup completes
    Then it creates the next deterministic generation and emits idempotent start work

  @id:factory.lifecycle.same-sha-expiry-fence @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Do not restart the same successful revision after expiry
    backend-noop: The successful revision fence is factory lifecycle behavior outside the generated application backend.
    frontend-noop: The successful revision fence has no generated application frontend interaction.
    browser-noop: Revision history and fixed expiry are not observable through the public preview page.
    Given an open pull request whose healthy revision expired and was cleaned
    When a newer ordered event requests the same revision again
    Then it is recorded as a duplicate without creating a generation or start work
    And its four hour lifetime is not reset

  @id:factory.lifecycle.closed-cleanup-fence @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Keep a fully cleaned closed pull request closed
    backend-noop: Closed pull request admission is factory lifecycle behavior outside the generated application backend.
    frontend-noop: Closed pull request admission has no generated application frontend interaction.
    browser-noop: Closed lifecycle state is not observable through the public preview page.
    Given a closed pull request whose generation cleanup completed
    When a later ordered event attempts to admit a revision
    Then admission remains rejected as closed without start work

  @id:factory.lifecycle.wait-for-retiring-cleanup @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Wait for retiring cleanup before re-admission
    backend-noop: Retiring generation cleanup is factory lifecycle behavior outside the generated application backend.
    frontend-noop: Retiring generation cleanup has no generated application frontend interaction.
    browser-noop: Retiring generation state is not observable through the public preview page.
    Given the active generation was cleaned but an older retiring generation remains
    When a newer revision is admitted
    Then admission is retryably rejected until retiring cleanup completes
    And no new start work is emitted

  @id:factory.lifecycle.delayed-admission-fence @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject delayed externally ordered lifecycle events
    backend-noop: Ordered admission fencing is factory lifecycle behavior outside the generated application backend.
    frontend-noop: Ordered admission fencing has no generated application frontend interaction.
    browser-noop: Event sequence and state revision checks are not observable through the public preview page.
    Given a newer lifecycle event was already recorded
    When a delayed admission arrives with an older event sequence or stale state revision
    Then it is rejected without replacing the current generation or emitting start work
    And a delayed close with an older event sequence cannot close or alter current state

  @id:factory.lifecycle.owned-cleanup @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Keep cleanup completion bound to its generation
    backend-noop: Cleanup work and completion are factory runtime behavior outside the generated application backend.
    frontend-noop: Cleanup work has no generated application frontend interaction.
    browser-noop: Generation ownership and cleanup completion are not observable through the public preview page.
    Given an active or retiring generation needs cleanup after close timeout expiry or replacement
    When a completion or delayed event names a generation
    Then only the tracked matching generation can change bounded lifecycle state
    And stale state revisions out-of-order events and duplicate commands cannot revive a preview

  @id:factory.lifecycle.reconcile @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Re-emit required idempotent work
    backend-noop: Reconciliation is factory runtime behavior outside the generated application backend.
    frontend-noop: Reconciliation has no generated application frontend interaction.
    browser-noop: Adapter retries are not observable through the public preview page.
    Given an active start or tracked cleanup remains required
    When reconciliation is requested with the current ordered state
    Then it re-emits only the currently required idempotent start or cleanup work

  @id:factory.lifecycle.provider-ownership @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Refuse provider mutation without exact generation ownership
    backend-noop: AWS preview ownership is factory runtime behavior outside the generated application backend.
    frontend-noop: AWS preview ownership has no generated application frontend interaction.
    browser-noop: Provider ownership checks are not observable through the public preview page.
    Given provider resources for another repository pull request or generation
    When replacement or cleanup is requested
    Then no task DNS record task definition or lifecycle row is mutated
    And the lifecycle command remains retryable for reconciliation

  @id:factory.lifecycle.provider-failure @backend-noop @frontend-noop @browser-noop-eligible
  Scenario Outline: Retain authoritative state when one cleanup effect fails
    backend-noop: AWS preview cleanup is factory runtime behavior outside the generated application backend.
    frontend-noop: AWS preview cleanup has no generated application frontend interaction.
    browser-noop: Cleanup retry state is not observable through the public preview page.
    Given a generation whose owned resources require cleanup
    When cleanup fails while removing the "<resource>"
    Then the generation remains recorded as cleaning
    And reconciliation retries only its ownership-checked cleanup

    Examples: Provider cleanup failures
      | case_id        | resource        |
      | dns-failure    | DNS record      |
      | task-missing   | ECS task        |
      | task-def-fail  | task definition |

  @id:factory.lifecycle.cleanup-terminal-receipt @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Retain a terminal receipt after generation cleanup
    backend-noop: Dynamic preview resource cleanup is factory runtime behavior outside the generated application backend.
    frontend-noop: Terminal cleanup receipts have no generated application frontend interaction.
    browser-noop: Provider generation receipts are not observable through the public preview page.
    Given an owned generation whose resources have been cleaned successfully
    When its cleanup command is replayed
    Then the provider retains a terminal cleaned receipt for that generation
    And replay does not repeat provider mutations or remove the terminal receipt

  @id:factory.lifecycle.cleaned-generation-replay @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Reject start replay for a cleaned generation
    backend-noop: Dynamic preview resource replay is factory runtime behavior outside the generated application backend.
    frontend-noop: Replayed generation start has no generated application frontend interaction.
    browser-noop: Replayed generation start is not observable through the public preview page.
    Given a terminal cleaned receipt for a generation
    When an ensure command is replayed for that same generation
    Then the provider rejects the replay as terminal
    And it does not register a task launch another task or recreate DNS
