Feature: Managed media and external listing synchronization
  Editors can retain public media and safely synchronize configured list items.

  @id:media.presign @frontend-noop
  Scenario: Request a constrained direct image upload
    frontend-noop: Presign constraints and durable references are exercised through the backend adapter; the browser transport is covered by frontend unit tests.
    Given I am an authenticated editor
    When I request an upload for an allowed image MIME type and size
    Then I receive a short-lived presigned PUT URL
    And I receive its durable public media reference

  @id:media.reject @frontend-noop
  Scenario Outline: Reject an unsafe upload request
    frontend-noop: MIME and size rejection occur before browser upload and are exercised by the backend adapter.
    Given I am an authenticated editor
    When I request an upload with "<condition>"
    Then the request is rejected before a presigned URL is created

    Examples: Unsafe uploads
      | case_id    | condition              |
      | wrong-mime | a disallowed MIME type |
      | too-large  | a file above 20 MiB    |

  @id:media.library-confirm @frontend-noop
  Scenario: Confirm an uploaded image in the managed library
    frontend-noop: Persistence and object-existence validation are backend invariants; browser selection remains deferred until a page entity exposes a managed image field.
    Given a requested image upload now exists in managed object storage
    When the editor confirms it with a friendly name and alternative text
    Then the image appears in the first managed-library page
    And the editor-facing result contains no bucket or object key

  @id:media.library-pagination @frontend-noop
  Scenario: Page through the managed media library
    frontend-noop: Deterministic cursor pagination is exercised by the backend adapter; browser pagination will be exercised when the first page media field is integrated.
    Given the managed media library contains more images than one requested page
    When the editor follows the returned media cursor
    Then each image appears exactly once in creation order

  @id:media.editor-select @backend-noop
  Scenario: Select managed media from a semantic image field
    backend-noop: Upload persistence and safe asset responses are already exercised by the managed-media backend scenarios; this scenario owns the browser editor integration.
    Given I am signed in and editing a semantic image field
    When I upload and select an image from the managed media library
    Then its friendly name and preview are shown without storage details
    And saving the form updates the private image and its description

  @id:sync.field-override @frontend-noop
  Scenario: Preserve manually overridden listing fields
    frontend-noop: Field-level merge semantics are a scheduled backend invariant; pause and resume request transport is covered by focused frontend transport tests.
    Given a synchronized listing has a manually overridden price
    When scheduled synchronization returns a new price and status
    Then the manual price is preserved
    And the non-overridden status is updated

  @id:sync.resume-field @frontend-noop
  Scenario: Resume automatic updates for one listing field
    frontend-noop: Persisted source configuration is exercised through the backend adapter; the browser control remains disabled until a listing editor is mounted.
    Given a source mapping has paused automatic updates for price and status
    When the editor resumes automatic updates for price
    Then only status remains manually overridden

  @id:sync.source-unique @frontend-noop
  Scenario: Keep one source mapping per list item
    frontend-noop: Conditional source uniqueness is a backend persistence invariant exercised by the backend adapter.
    Given a list item already has an external source
    When an editor creates another source for that item
    Then the request is rejected as a conflict
    And the existing source remains unchanged

  @id:sync.pending-lock @frontend-noop
  Scenario: Skip a locked entity before external network access
    frontend-noop: Scheduled synchronization has no browser execution path and is exercised by the backend adapter.
    Given an enabled source belongs to an entity with a pending change
    When scheduled synchronization runs
    Then the whole entity is skipped
    And no request is made to any of its source URLs

  @id:sync.ssrf @frontend-noop @browser-noop-eligible
  Scenario Outline: Reject a source that can reach a private network
    frontend-noop: Redirect and address resolution protections are enforced by the backend HTTP adapter.
    browser-noop: Private-network probes are not permitted browser acceptance setup.
    Given an external source URL has "<network_case>"
    When the bounded HTTPS fetch is attempted
    Then synchronization rejects that source
    And processing continues for other sources

    Examples: Unsafe source networks
      | case_id          | network_case                        |
      | private-address  | a private or loopback destination   |
      | private-redirect | a redirect to a private destination |

  @id:sync.token-match @frontend-noop
  Scenario: Avoid AI work when source validation tokens still match
    frontend-noop: AI short-circuiting has no browser execution path and is exercised by the backend adapter.
    Given every configured token is present in the fetched source text
    When scheduled synchronization checks the item
    Then the item is unchanged
    And the AI provider is not called

  @id:sync.batch-publish @frontend-noop
  Scenario: Batch changed items into one automatic publication
    frontend-noop: Scheduled batching and automatic publication have no browser execution path and are exercised by the backend adapter.
    Given multiple source items in one unlocked entity require valid replacements
    When scheduled synchronization completes synthesis
    Then one complete parent-list pending change is conditionally created
    And it is automatically published once

  @id:sync.human-race @frontend-noop @browser-noop-eligible
  Scenario: Let a human edit win a synchronization race
    frontend-noop: Conditional creation after provider work is a backend concurrency invariant.
    browser-noop: Reliably interleaving scheduled provider work with a database write requires the backend test adapter.
    Given synchronization found a changed source while the entity was unlocked
    When a human pending change appears before the system change is created
    Then the system conditional create fails
    And the human pending change is not overwritten

  @id:sync.partial-failure @frontend-noop
  Scenario: Continue after one external source fails
    frontend-noop: Per-source job isolation has no browser execution path and is exercised by the backend adapter.
    Given one source fails fetch or structured-output validation
    And another source produces a valid changed item
    When scheduled synchronization finishes the entity
    Then the failure is recorded without its unsafe replacement
    And valid replacements are still batched and published
