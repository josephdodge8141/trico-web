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

  @id:content.semantic-editor-contract @frontend-noop @browser-noop-eligible
  Scenario: Adopt semantic editor contracts without overstating migration coverage
    frontend-noop: Shared contract validation is exercised before frontend components consume the metadata.
    browser-noop: Registry completeness and serializability are build-time invariants rather than browser interactions.
    Given a page-owned semantic entity module
    When its editor metadata and visual catalog are validated incrementally
    Then every field control is explicit and browser-safe
    And every migrated entity has exactly one primary visual slot
    And complete validation rejects missing semantic entities and visual slots

  @id:content.home-semantic-migration @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Migrate Home content to novice-safe semantic contracts
    backend-noop: The pure Home migration planner is exercised in the shared contract package before backend persistence can accept version 2 values.
    frontend-noop: Home contract and migration validation runs in the shared contract package before the page consumes version 2 values.
    browser-noop: Deterministic seed conversion and pending-change refusal are build-time migration invariants rather than browser interactions.
    Given the 18 canonical Home entities and their mounted legacy content
    When I prepare the version 1 to version 2 Home content migration
    Then all 18 Home values use strict semantic schemas and explicit editor metadata
    And each Home entity has one primary visual slot
    And the migration report is deterministic and dry-runnable
    And unresolved version 1 pending changes block migration unless disposable local reset is explicit

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

  @id:content.list-identity @backend-noop
  Scenario: Edit a list while retaining stable item identities
    backend-noop: Item-level controls and hidden identity behavior are browser presentation behavior; complete list validation is exercised through the real content API.
    Given I am signed in and editing a Home collection with UUID-backed items
    When I add and edit an item with friendly fields
    And I reorder it with keyboard controls
    And I delete and undo the deletion
    Then retained items keep their UUIDs
    And new items receive UUIDs
    And the complete replacement list passes its registered schema
    And no item UUID is shown to me

  @id:content.empty-list-add @backend-noop
  Scenario: Add the first item to an empty collection
    backend-noop: The empty-list affordance and semantic item sheet are browser presentation behavior; persistence uses the existing complete-replacement API.
    Given I am signed in and previewing an empty Home collection
    When I use its add control and save the first item
    Then the new item appears in my private preview
    And its generated identity remains hidden

  @id:content.editor-ownership-state @backend-noop
  Scenario: Explain when another editor owns a section
    backend-noop: Ownership enforcement is already exercised at the backend boundary; this scenario covers its novice-safe browser presentation.
    Given another editor has a pending change for a Home collection
    When I enter edit mode on Home
    Then that collection renders the other editor's change
    And its item controls are disabled with a plain-language ownership message
    And no owner identifier is shown to me

  @id:content.editor-stale-conflict @backend-noop
  Scenario: Keep a draft when the saved revision changes
    backend-noop: Conditional stale-revision rejection is already exercised at the backend boundary; this scenario covers browser recovery.
    Given I am editing one of my pending Home collection items
    When that pending change advances before I save my draft
    Then my draft remains in the editor
    And I can reload the latest saved value or cancel

  @id:content.preview-hydration @backend-noop
  Scenario: Restore pending preview state when edit mode starts
    backend-noop: Preview assembly is already exercised at the backend boundary; this scenario covers browser hydration and rendering.
    Given I have a saved pending Home change from an earlier visit
    When I enter edit mode on Home
    Then my pending value is rendered without another save
    And it is marked as an unpublished change

  @id:content.novice-inline-editor @backend-noop
  Scenario: Edit semantic content without exposing technical representations
    backend-noop: Hover affordances, friendly form controls, and draft handling are browser presentation behavior.
    Given I am signed in and editing a component with a semantic contract
    When I open that component's edit control
    Then a friendly labeled form opens beside the page
    And no technical content representation is shown
    When I change a field and cancel
    Then the saved preview remains unchanged
    When I change a field and save
    Then the validated value appears in my private preview
