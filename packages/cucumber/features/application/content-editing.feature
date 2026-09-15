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

  @id:content.property-management-semantic-migration @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Migrate Property Management content to novice-safe semantic contracts
    backend-noop: The pure Property Management migration planner is exercised in the shared contract package before backend persistence can accept version 2 values.
    frontend-noop: Property Management contract and migration validation runs in the shared contract package before the page consumes version 2 values.
    browser-noop: Deterministic seed conversion and pending-change refusal are build-time migration invariants rather than browser interactions.
    Given the 35 canonical Property Management entities and their mounted legacy content
    When I prepare the version 1 to version 2 Property Management content migration
    Then all 35 Property Management values use strict semantic schemas and explicit editor metadata
    And each Property Management entity has one primary visual slot
    And the Property Management migration report is deterministic and dry-runnable
    And unresolved Property Management version 1 pending changes block migration unless disposable local reset is explicit

  @id:content.division-semantic-migration @frontend-noop @browser-noop-eligible
  Scenario Outline: Complete a remaining division's novice-safe semantic migration
    frontend-noop: Strict schema, seed, editor-descriptor, and migration-plan validation run in the shared contract package before the page consumes version 2 values.
    browser-noop: Deterministic conversion and pending-change refusal are build-time migration invariants; mounted friendly forms are covered separately in browser scenarios.
    Given the <entity_count> canonical "<division>" entities and their version 2 module
    When I prepare the "<division>" version 1 to version 2 migration
    Then all <entity_count> "<division>" values use strict semantic schemas and explicit editor metadata
    And each "<division>" entity has one primary visual slot
    And the "<division>" migration report is deterministic and dry-runnable
    And unresolved "<division>" version 1 pending changes block migration unless disposable local reset is explicit

    Examples: Remaining divisions
      | case_id    | division    | entity_count |
      | real-estate | Real Estate | 31           |
      | construction | Construction | 65           |
      | development | Development | 28           |

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

  @id:content.collection-reorder-undo
  Scenario: Remove a collection change when its published order is restored
    Given I own a pending Home collection reorder
    And that reorder is hidden from my persisted preview
    When I save the collection in its original published order at the expected revision
    Then the JSON-equivalent pending change is removed
    And its persisted preview exclusion is removed
    And the published collection remains unchanged

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

  @id:content.property-management-object-launchers @backend-noop
  Scenario: Open Property Management object editors from fixed and hero sections
    backend-noop: Object editor launchers, friendly forms, and draft cancellation are browser presentation behavior.
    Given I am signed in and editing Property Management on desktop
    When I open the Page header editor
    Then the Page header friendly form opens without technical representations
    And I can cancel the Page header editor without changing the page
    When I reopen and save a friendly Page header change
    Then the saved Page header value appears in my private preview
    When I open the Opening section editor
    Then the Opening section friendly form opens without technical representations
    And I can cancel the Opening section editor without changing the page
    When I reopen and save a friendly Opening section change
    Then the saved Opening section value appears in my private preview

  @id:content.property-management-mobile-opening-launcher @backend-noop @touch
  Scenario: Open the Property Management opening editor on mobile
    backend-noop: Touch launcher reachability and full-screen editor presentation are browser presentation behavior.
    Given I am signed in and editing Property Management on mobile
    When I open the Opening section editor
    Then the Opening section friendly form fills the mobile viewport
    And I can cancel the Opening section editor without changing the page

  @id:content.remaining-division-object-launchers @backend-noop
  Scenario Outline: Open a novice-safe semantic editor on each remaining division
    backend-noop: Friendly field presentation and mounted page rendering are browser behavior; persistence still uses the existing validated content API.
    Given I am signed in and editing the "<division>" division
    When I open the "<editor>" editor from its visible section
    Then the "<field>" friendly field is shown without technical representations
    When I save a new value in the "<field>" friendly field
    Then the saved remaining-division value appears in my private preview

    Examples: Remaining division object editors
      | case_id      | division    | editor | field   |
      | real-estate  | Real Estate | Hero   | Heading |
      | construction | Construction | Hero   | Heading |
      | storage      | Storage      | Hero   | Heading |
      | development  | Development | Hero   | Heading |

  @id:content.touch-inline-controls @backend-noop @touch
  Scenario: Use novice-readable inline controls on a touch screen
    backend-noop: Persistent touch affordances, touch-target sizing, clipping, keyboard operation, and public layout isolation are browser presentation behavior.
    Given I am signed in and editing Home at a 390 by 844 touch viewport
    Then component and collection item actions remain visibly labeled and unclipped
    And touch editing actions meet their minimum target size
    When I operate the visible item controls with the keyboard
    Then the friendly item editor opens and the saved page layout remains unchanged

  @id:content.mobile-editor-chrome @backend-noop @touch
  Scenario: Keep mobile editor chrome compact and reachable
    backend-noop: Launcher, toolbar, sheet scrolling, and focus behavior are browser presentation concerns.
    Given I am signed in on Home at a 390 by 844 touch viewport
    When I tap the edit mode launcher
    Then the compact editor status does not cover the page content
    And every approved editor action is reachable from the compact toolbar
    When I open a long semantic editor on mobile
    Then I can scroll every field above the Save and Cancel actions
    And keyboard focus stays within the editor until I close it

  @id:content.desktop-editor-chrome @backend-noop
  Scenario: Keep desktop editor chrome compact and reachable
    backend-noop: Toolbar geometry and focus behavior are browser presentation concerns.
    Given I am signed in on Home at a 1425 by 1100 desktop viewport
    When I enter edit mode from the desktop launcher
    Then the desktop editor toolbar is exactly 64 pixels tall
    And every desktop editor action remains visible and available actions are keyboard reachable

  @id:content.review-publish-prominence @backend-noop
  Scenario: Make publishing the obvious final action when reviewing changes
    backend-noop: Visual hierarchy and accessible action context in the review panel are browser presentation concerns.
    Given I have one unpublished Home change to review
    When I open the review and publish panel
    Then the publish action is the panel's visually prominent primary action
    And the publish action explains that it makes the reviewed change public

  @id:content.editor-feedback-placement @backend-noop
  Scenario: Keep editor feedback before the edit-mode actions
    backend-noop: Toolbar feedback placement is browser presentation behavior.
    Given I am signed in on Home at a 1425 by 1100 desktop viewport
    When I enter edit mode from the desktop launcher
    Then editor feedback does not appear to the right of the edit-mode buttons

  @id:content.searchable-icon-library @backend-noop
  Scenario: Choose any supported icon from a searchable visual library
    backend-noop: The backend validates the shared icon contract through normal content replacement; searching and visual selection are browser presentation behavior.
    Given I am signed in and editing a Home collection with icon fields
    When I open an item's icon chooser
    Then the chooser offers the complete public icon library with graphical previews
    And I can search the icon library by its friendly name
    When I choose the "Tractor" icon and save the item
    Then the selected "Tractor" icon renders in my private preview without a fallback symbol

  @id:content.home-opening-center-stability @backend-noop
  Scenario: Keep the canonical Home opening message centered in public and edit views
    backend-noop: Text geometry and editor-wrapper layout isolation are browser presentation behavior.
    Given I have canonical Home opening content with no saved draft
    When I open the public Home page at desktop width
    Then the canonical Home opening heading is horizontally centered
    When I enter edit mode with the canonical Home opening content
    Then the canonical Home opening heading remains horizontally centered
    And the editor wrapper does not change the Home opening geometry
