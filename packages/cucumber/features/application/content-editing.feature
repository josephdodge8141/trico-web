Feature: In-page content editing and preview
  Authenticated editors propose complete entity replacements while public content remains unchanged.

  @id:content.registry @frontend-noop @browser-noop-eligible
  Scenario: Validate the canonical entity registry
    frontend-noop: Registry structural validation runs in the shared contract package before frontend execution.
    browser-noop: Compile-time registry structure is not meaningfully observable through browser interaction.
    Given the six canonical page definitions
    When the editable entity registry is validated
    Then it contains exactly 195 globally unique entity IDs
    And its page counts are 18, 35, 31, 65, 18, and 28
    And every ID namespace, page ID, public path, kind, schema, label, and seed agree
    And none of the nine hard-coded form configurations is editable

  @id:content.create-change @frontend-noop
  Scenario: Save a complete replacement as a pending change
    frontend-noop: In-page editor entry and mutation transport are exercised by Compose Playwright; replacement persistence is exercised by the backend adapter.
    Given I am an authenticated editor
    And an entity has no pending change
    When I save a schema-valid complete replacement
    Then revision 1 is owned by me
    And the published entity is unchanged
    And the change is enabled in every editor's preview by default

  @id:content.concurrent-create @frontend-noop @browser-noop-eligible
  Scenario: Allow only one owner to create the first pending change
    frontend-noop: The competing conditional writes are a DynamoDB service invariant; the frontend only displays the resulting conflict.
    browser-noop: Reliably interleaving two conditional database writes requires the backend test adapter.
    Given two editors concurrently save the same unchanged entity
    When both conditional creates reach DynamoDB
    Then exactly one pending change is created
    And the other request receives a conflict

  @id:content.update-owned @frontend-noop
  Scenario: Update an owned pending change at its expected revision
    frontend-noop: Revision mutation semantics are backend concurrency invariants exercised by the backend adapter.
    Given I own a pending change at revision 2
    When I save a replacement expecting revision 2
    Then its replacement is updated at revision 3
    And its published entity is unchanged

  @id:content.update-stale @frontend-noop
  Scenario: Reject a stale pending-change update
    frontend-noop: Stale revision rejection is a backend concurrency invariant exercised by the backend adapter.
    Given I own a pending change at revision 3
    When I save a replacement expecting revision 2
    Then the request is rejected as a conflict
    And revision 3 remains unchanged

  @id:content.change-ownership @frontend-noop
  Scenario Outline: Protect a pending change owned by another editor
    frontend-noop: Author ownership is enforced and exercised at the backend boundary; the UI only renders the resulting read-only state.
    Given another editor owns the entity's pending change
    When I try to "<action>" that pending change
    Then the request is rejected
    And the pending change remains unchanged

    Examples: Protected operations
      | case_id | action  |
      | update  | update  |
      | discard | discard |

  @id:content.preview-toggle @frontend-noop
  Scenario: Toggle one pending change in my preview
    frontend-noop: Per-user preview assembly and isolation are backend state invariants exercised by the backend adapter.
    Given a page has pending changes from multiple editors
    When I disable one entity in my preview
    Then my assembled preview uses its published value
    And the other pending replacements remain visible
    And another editor's preview preferences are unchanged

  @id:content.list-identity @frontend-noop
  Scenario: Edit a list while retaining stable item identities
    frontend-noop: UUID retention and registered-schema validation are shared-contract and backend invariants exercised outside this browser adapter.
    Given an editable list has UUID-backed items
    When I add, remove, and reorder list items before saving
    Then retained items keep their UUIDs
    And new items receive UUIDs
    And the complete replacement list passes its registered schema
