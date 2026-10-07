Feature: Published TriCo website
  Visitors receive six validated pages from one atomically switched content manifest.

  @id:public.pages @backend-noop
  Scenario Outline: Browse a published page
    backend-noop: Public traffic reads immutable object-storage artifacts without calling the application backend.
    Given the current content manifest is available
    When I open "<route>"
    Then the "<page>" published content is rendered with deferred below-fold images
    And the browser title identifies the published page
    And only the requested page module is loaded at entry
    And anonymous entry keeps editor code out of the initial JavaScript transfer
    And its editable anniversary banner matches the Home presentation
    And shared public navigation shows every section without a secondary menu and moves focus to its keyboard-selected destination
    And unfinished public placeholder claims are suppressed
    And no CMS metadata is present in the page document
    And division footer links have comfortable mobile tap targets where present
    And public notice links and editable lists preserve accessible semantics
    And its anniversary announcement opens the community page and can be dismissed for this session

    Examples: Public pages
      | case_id             | route                | page                |
      | home                | /                    | home                |
      | property-management | /property-management | property-management |
      | real-estate         | /real-estate         | real-estate         |
      | construction        | /construction        | construction        |
      | storage             | /storage             | storage             |
      | development         | /development         | development         |

  @id:public.manifest-switch @backend-noop
  Scenario: Keep the previous site visible until a complete release exists
    backend-noop: The browser observes only the object-store manifest boundary; deployment failure behavior is exercised separately by the backend.
    Given a visitor loaded the current manifest
    When a replacement release has not completed
    Then every manifest page still resolves to the previous complete release

  @id:public.seed-if-empty-preserves-edits @frontend-noop
  Scenario: Preserve valid published edits during checksum-safe bootstrap
    frontend-noop: Re-running the backend bootstrap has no separate frontend execution path; existing page rendering scenarios cover the visible content.
    Given one current entity has published edits another has a known earlier seed and another is missing
    When deployment reruns seed-if-empty
    Then bootstrap preserves both existing entities without rewriting them
    And the missing entity receives its registered seed

  @id:public.seed-if-empty-rejects-unsafe-current @frontend-noop
  Scenario Outline: Refuse incompatible current entities during checksum-safe bootstrap
    frontend-noop: Rejecting malformed persisted entity rows is a backend bootstrap invariant with no independent frontend behavior.
    Given a current entity row has unsafe "<incompatibility>" data
    When deployment reruns seed-if-empty
    Then bootstrap rejects the unsafe current entity
    And the existing current row remains unchanged

    Examples: Unsafe current rows
      | case_id                 | incompatibility         |
      | wrong-entity-id         | entity ID               |
      | wrong-page              | page ID                 |
      | invalid-value           | registered value schema |
      | invalid-version         | entity version          |
      | epoch-baseline-mismatch | pristine baseline value |

  @id:public.home-mounted-composition @backend-noop
  Scenario: Render the complete mounted Home composition
    backend-noop: Home composition and responsive presentation are browser-owned; application delivery is exercised in public.health.
    Given the current content manifest is available
    When I open "/"
    Then the Home page presents ready sections in order without sample updates or eager leadership photos
    And all 18 Home entities remain editable with explicit public visibility controls
    And the Home resume form focuses validation and delivery feedback without creating a CMS entity
    And division links open their destination pages at the top

  @id:public.semantic-highlight-colors @backend-noop
  Scenario: Use one blue-led semantic highlight contract across the TriCo family
    backend-noop: Cross-site color roles and their rendered presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/"
    Then one shared semantic palette defines action highlight stat rating and brand accent roles
    And legacy presentation stylesheets are deleted in favor of the TriCo Tailwind theme
    And active pages auth and editor replace their old presentation with fullstack-ts primitives
    And Open Sans body copy and Lato headings are bundled with the supported visual-parity weights
    And Home Property Management Real Estate Construction Storage and Development render theme-backed card and action primitives
    And division hero statistics use the shared inverse theme surface
    And Construction sector actions use the shared primary action role when editable

  @id:public.shared-careers @backend-noop
  Scenario: Reuse one canonical careers experience across every public page
    backend-noop: Canonical career filtering, application prefill, navigation, and presentation are browser-owned behavior over published Home content.
    Given the current content manifest is available
    When I open "/"
    Then every public page renders the shared canonical careers section
    And the reference-preview openings are listed publicly by division
    And the resume invitation is clearly separated from opening results
    And an editable opening prefills the shared application form
    And every division navigation exposes Careers
    And retired legacy careers entities remain registered but are not rendered
    And careers copy does not claim an outdated division count

  @id:public.review-platform-contract @backend-noop
  Scenario: Present only ready review destinations while retaining their editor contract
    backend-noop: Review-platform branding, rating color, card geometry, and responsive presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then unready public review destinations are hidden across divisions
    And testimonial editors require explicit public visibility decisions
    And edit mode retains review platform and testimonial cards on the shared Card contract
    And editable review cards remain compact on mobile

  @id:public.development-measured-parity @backend-noop
  Scenario: Preserve verified Development content without placeholder partners or reviews
    backend-noop: Development copy and visual rhythm are browser-owned presentation behavior.
    Given the current content manifest is available
    When I open "/development"
    Then Development semantic seeds preserve verified copy and omit unready identities
    And Development project types and featured work are directly browseable from the hero action

  @id:public.accessible-select-field @backend-noop
  Scenario: Choose public-form options through one accessible styled selection contract
    backend-noop: Public-form select presentation, keyboard interaction, validation, and browser form serialization are frontend-owned behavior.
    Given the current content manifest is available
    When I open "/"
    Then the shared selection control supports focus choice and form serialization
    And Property Management Real Estate and Construction reuse the public selection contract
    And the public selection contract remains usable and valid on mobile

  @id:public.profile-card-contract @backend-noop
  Scenario: Present people with one resilient profile card contract
    backend-noop: Profile-card geometry, portrait cropping, unavailable-media presentation, and responsive editor-wrapper behavior are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then all six pages expose one shared profile card contract and Home uses the division badge treatment
    And every frozen Real Estate agent portrait resolves from managed media
    And Real Estate team categories are directly browseable with concise profiles on mobile
    And available portraits fill square card frames without stretching while unavailable portraits use one neutral accessible fallback
    And profile cards center names and plain roles with a compact Home leadership grid while retaining their geometry in edit mode

  @id:public.property-management-mounted-composition @backend-noop
  Scenario: Render the complete mounted Property Management composition
    backend-noop: Property Management composition and browser submission state are frontend-owned; the public intake route and outbound mail are exercised in public.health.
    Given the current content manifest is available
    When I open "/property-management"
    Then the Property Management page presents ready sections in order with a navigable process progress view
    And the Property Management hero presents an accessible primary and secondary action hierarchy
    And the Property Management hero uses relevant managed imagery with a neutral fallback
    And all 34 Property Management entities have an editable visual boundary
    And supplied Property Management portfolio images load while additional cards reveal on request without conflicting public metrics
    And Property Management portfolio categories fit their tab bar and remain directly browseable on mobile
    And the single Property Management analysis form delivers and restarts with focus without creating CMS entities
    And the Property Management contact details use labeled icon rows and remain visible after anchor navigation while the analysis form centers beside them on desktop
    And Property Management has no dead public footer links

  @id:public.real-estate-listing-gallery @backend-noop
  Scenario: Keep Featured Properties a curated and accessible listing gallery
    backend-noop: Listing-gallery geometry, status tabs, and external-action hierarchy are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then listing cards preserve their intended image ratio at desktop and mobile widths
    And Real Estate listing photos preserve their frozen source identities
    And listing tabs show active and sold counts in a keyboard-connected segmented control
    And each available external listing action remains accessible but visually subordinate
    And listing directory actions and the contact call to action complete the gallery
    And the single Real Estate contact form delivers only after a successful request

  @id:public.construction-collection-geometry @backend-noop
  Scenario: Keep editable collection grids structurally transparent
    backend-noop: Collection wrapper sizing and responsive grid presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/construction"
    Then public Construction collection grids retain their responsive columns while restricted plans stay hidden
    And unchanged unverified Construction project totals are hidden publicly
    And the Construction About card does not reserve space for a hidden statistic
    And entering edit mode preserves the Construction collection grid geometry
    And Construction project totals retain explicit approval controls in edit mode
    And shared collection sizing preserves Real Estate and Property Management service grids

  @id:public.storage-mounted-composition @backend-noop
  Scenario: Render the complete mounted Storage Management composition
    backend-noop: Storage composition and the browser's submission state are frontend-owned; the public intake route and outbound mail are exercised in public.health.
    Given the current content manifest is available
    When I open "/storage"
    Then Storage presents facility management for owners rather than consumer unit shopping
    And all 18 Storage entities have an editable visual boundary
    And the Storage hero, services, team, Our Why, reviews, contact, and footer render in order
    And Storage services and long bios expand on demand on mobile
    And the Storage contact form focuses delivery feedback and preserves values on failure without creating a CMS entity
    And Storage navigation remains usable at desktop and mobile widths

  @id:public.dedicated-division-composition @backend-noop
  Scenario Outline: Render a complete dedicated division composition
    backend-noop: Division composition and responsive presentation are browser-owned behavior.
    Given the current content manifest is available
    When I open "<route>"
    Then the dedicated "<division>" composition renders with <entity_count> editable entity boundaries
    And available division hero imagery is displayed
    And unavailable project actions are not shown as buttons
    And empty Construction project groups and restricted plan sets share honest inquiry paths
    And Construction bid and contact actions lead to one quote form

    Examples: Dedicated divisions
      | case_id     | route          | division    | entity_count |
      | real-estate | /real-estate   | Real Estate | 30           |
      | construction | /construction | Construction | 37           |
      | development | /development   | Development | 28           |

  @id:public.construction-empty @backend-noop
  Scenario: Show an honest empty construction project state
    backend-noop: Empty-state presentation is owned by the frontend.
    Given a construction project category has no published projects
    When I open that project category
    Then its editable anniversary banner matches the Home presentation
    And the project category uses the shared public header
    And its footer quick links have comfortable mobile tap targets
    And I see an empty state
    And fabricated project cards are not shown
    And a new Construction project starts hidden and cannot be approved with starter content

  @id:public.visual-baseline @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Compare against an immutable offline visual baseline
    backend-noop: Frozen screenshot integrity and pixel comparison are repository tooling behaviors, not backend application behavior.
    frontend-noop: The offline baseline gate evaluates captured artifacts rather than behavior inside the running React application.
    browser-noop: This deterministic gate uses its own offline browser image decoder and gives deployed browser agents no source or shell access.
    Given every frozen Lovable capture is recorded exactly once
    When a local capture set is compared without contacting Lovable
    Then baseline checksums and image dimensions must agree
    And desktop geometry differs by no more than 2 pixels
    And mobile geometry differs by no more than 3 pixels
    And each unmasked comparison region has structural similarity of at least 0.98

  @id:public.visual-difference-audit @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Attribute complete browser visual differences to shared styling causes
    backend-noop: Pixel analysis and browser CSS attribution are repository tooling behaviors, not backend application behavior.
    frontend-noop: The audit observes rendered frontend output without adding product behavior to the React application.
    browser-noop: The report-only audit owns its Playwright capture, image decoding, and CSS diagnostics rather than delegating source or shell access to a deployed browser agent.
    Given an immutable frozen baseline or authenticated live reference
    When every meaningful rendered element is compared across supported routes viewports and states
    Then every element is accounted for as matched reference-only candidate-only ignored or ambiguous
    And geometry typography paint content assets HTML SVG and pseudo-element presentation are compared directly
    And exact computed values remain distinct from semantic presentation roles
    And candidate author declarations identify their selector token stylesheet and source line when available
    And inherited default composited shorthand and unsupported values retain explicit ambiguity
    And screenshot pixels provide supporting crops and heatmaps without suppressing element differences
    And missing interactive-state controls fail with the named capture recipe
    And visual findings do not fail the report-only audit

  @id:public.health
  Scenario: Check public health and anonymous form delivery
    Given I am not signed in
    When I request the public health endpoint
    Then the response status is 200
    And the response body is exactly:
      """json
      {"status":"ok"}
      """
    When I submit a valid anonymous Storage inquiry
    Then delivery is acknowledged only after it reaches the configured mailbox
    And invalid cross-origin or excessive inquiries are rejected
    When I stage a valid anonymous PDF resume privately and submit a career application
    Then the final application request contains only an upload reference and the resume reaches the configured mailbox
    And invalid or replayed resumes and cross-origin or excessive career applications are rejected
