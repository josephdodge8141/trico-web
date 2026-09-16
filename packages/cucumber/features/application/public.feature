Feature: Published TriCo website
  Visitors receive six validated pages from one atomically switched content manifest.

  @id:public.pages @backend-noop
  Scenario Outline: Browse a published page
    backend-noop: Public traffic reads immutable object-storage artifacts without calling the application backend.
    Given the current content manifest is available
    When I open "<route>"
    Then the "<page>" published content is rendered
    And no CMS metadata is present in the page document

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

  @id:public.home-mounted-composition @backend-noop
  Scenario: Render the complete mounted Home composition
    backend-noop: Home composition, responsive presentation, and the client-only resume form are browser-owned behavior.
    Given the current content manifest is available
    When I open "/"
    Then the Home page presents every mounted section in its intended order
    And all 18 Home entities have an editable visual boundary
    And the Home resume form validates locally without creating a CMS entity

  @id:public.home-division-blue-treatment @backend-noop
  Scenario: Preserve the approved blue treatment on Home division cards
    backend-noop: Home division-card color and hover presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/"
    Then every Home division card uses the approved blue text border icon and action treatment

  @id:public.semantic-highlight-colors @backend-noop
  Scenario: Use one blue-led semantic highlight contract across the TriCo family
    backend-noop: Cross-site color roles and their rendered presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/"
    Then one shared semantic palette defines action highlight stat rating and brand accent roles
    And all page stylesheets source their colors exclusively from the global palette
    And page stylesheets contain no typography declarations
    And Open Sans body copy and Lato headings are bundled with the supported visual-parity weights
    And Home Property Management Real Estate Construction Storage and Development use the shared blue highlight role
    And division statistics use the shared blue stat role while intentional brand accents remain gold
    And Construction sector actions use the shared slate blue action role

  @id:public.division-hero-media-contract @backend-noop
  Scenario: Keep division hero media consistent across content states and breakpoints
    backend-noop: Hero media geometry, image cropping, fallback presentation, and responsive visibility are browser-owned behavior.
    Given the current content manifest is available
    When I open "/property-management"
    Then Property Management Real Estate Construction and Storage expose one shared hero media contract
    And available division hero images crop consistently while missing images use one neutral fallback
    And division hero media remains visible at desktop width and yields to the content below 1024 pixels

  @id:public.shared-section-rhythm @backend-noop
  Scenario: Keep supporting sections readable with one shared vertical rhythm
    backend-noop: Section spacing, card density, and responsive line measure are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then Real Estate Property Management and Development use one shared section rhythm contract
    And representative headings use the frozen 60 48 and 36 pixel roles
    And representative service cards use the shared vertical density and readable copy measure
    And shared card title roles preserve the reference hierarchy
    And shared eyebrow compact action review form and footer roles preserve their reference type
    And compact and standard form controls use explicit shared reference geometry
    And repeated section eyebrows use one borderless semantic role
    And shared header and primary actions use the reference geometry
    And shared navigation form labels and actions use the frozen medium weight and six-pixel corners
    And shared supporting content follows the reference start alignment contract
    And Development preserves the complete legacy copy and footer inventory
    And Development uses the reference card and footer rhythm
    And shared section rhythm remains balanced at desktop and tablet widths

  @id:public.review-platform-contract @backend-noop
  Scenario: Present review destinations with one accessible platform contract
    backend-noop: Review-platform branding, rating color, card geometry, and responsive presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then Real Estate Property Management Construction Storage and Development use one review platform card contract
    And Google Facebook and Yelp use accessible platform-specific brand treatments
    And review ratings use the shared blue rating role
    And review platform descriptions use the shared compact copy role
    And review platform cards remain balanced at desktop and compact on mobile

  @id:public.development-measured-parity @backend-noop
  Scenario: Preserve the measured Development content and vertical rhythm
    backend-noop: Development copy and visual rhythm are browser-owned presentation behavior.
    Given the current content manifest is available
    When I open "/development"
    Then Development semantic seeds preserve the exact mounted legacy copy
    And Development headings hero prose and feedback use measured rhythm roles
    And Development profile and review cards use their measured densities

  @id:public.development-partner-composition @backend-noop
  Scenario: Preserve the Development partner composition
    backend-noop: Development partner geometry and responsive presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/development"
    Then Development partners use the frozen desktop composition
    And Development partners remain contained on mobile

  @id:public.development-about-composition @backend-noop
  Scenario: Preserve the Development About composition
    backend-noop: Development About geometry and responsive editor-wrapper presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/development"
    Then Development About uses the frozen desktop composition
    And Development About remains contained with transparent editor wrappers on mobile

  @id:public.shared-form-footer-geometry @backend-noop
  Scenario: Keep client forms actions and division footers on one shared geometry contract
    backend-noop: Form, action, contact-grid, and footer geometry are browser-owned presentation behavior.
    Given the current content manifest is available
    When I open "/"
    Then shared client forms use the frozen inquiry standard and wide measures
    And client form surfaces do not leak card padding into semantic forms
    And client form submit actions use the frozen full-width and intrinsic geometry
    And division contact grids use the shared desktop measure and gap
    And standard and compact division footers use the frozen grid and legal rhythm

  @id:public.accessible-select-field @backend-noop
  Scenario: Choose public-form options through one accessible styled selection contract
    backend-noop: Public-form select presentation, keyboard interaction, validation, and browser form serialization are frontend-owned behavior.
    Given the current content manifest is available
    When I open "/"
    Then the Home resume division uses the measured accessible selection control
    And the shared selection control supports keyboard choice dismissal and form serialization
    And Property Management Real Estate and Construction reuse the public selection contract
    And the public selection contract remains usable and valid on mobile

  @id:public.home-broad-parity @backend-noop
  Scenario: Preserve the Home page desktop frame typography and timeline rhythm
    backend-noop: Home page frame, typography, form spacing, and timeline geometry are browser-owned presentation behavior.
    Given the current content manifest is available
    When I open "/"
    Then Home uses the frozen desktop content frame and section rhythm
    And Home hero and section descriptions use their measured type roles
    And Home resume actions use one grid spacing contract
    And Home timeline uses the measured desktop tracks and copy density

  @id:public.property-management-broad-parity @backend-noop
  Scenario: Preserve Property Management supporting-section geometry
    backend-noop: Property Management frames, portal, reviews, contact, testimonial, and FAQ geometry are browser-owned presentation behavior.
    Given the current content manifest is available
    When I open "/property-management"
    Then Property Management broad sections use the frozen desktop frame
    And the Property Management portal uses the measured frame card and action density
    And Property Management reviews use the measured grid and feedback rhythm
    And Property Management contact uses the compact copy detail and form contracts
    And Property Management testimonial and FAQ rows use their measured type and density

  @id:public.profile-card-contract @backend-noop
  Scenario: Present people with one resilient profile card contract
    backend-noop: Profile-card geometry, portrait cropping, unavailable-media presentation, and responsive editor-wrapper behavior are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then Real Estate Property Management and Development expose one shared profile card contract
    And available portraits crop consistently while unavailable portraits use one neutral accessible fallback
    And profile cards remain balanced at desktop and mobile widths and retain their geometry in edit mode

  @id:public.property-management-mounted-composition @backend-noop
  Scenario: Render the complete mounted Property Management composition
    backend-noop: Property Management composition, responsive presentation, and its two client-only forms are browser-owned behavior.
    Given the current content manifest is available
    When I open "/property-management"
    Then the Property Management page presents every mounted section in its intended order
    And the Property Management hero presents an accessible primary and secondary action hierarchy
    And the Property Management hero uses the approved neutral unavailable-image treatment
    And the Property Management hero actions stack at full content width on mobile
    And Property Management cards and team portraits retain the intended responsive geometry
    And all 35 Property Management entities have an editable visual boundary
    And supplied Property Management portfolio images load while unavailable images use the neutral placeholder
    And the Property Management client-only forms validate locally without creating CMS entities
    And the Property Management contact details use labeled icon rows and remain visible after anchor navigation
    And the Property Management license decoration has no visible or accessible text fallback
    And Property Management supporting components match the mounted desktop contracts

  @id:public.real-estate-card-geometry @backend-noop
  Scenario: Keep Real Estate card collections centered at their intended desktop width
    backend-noop: Real Estate card layout and editor-wrapper transparency are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then Real Estate services team and testimonials use centered three-column desktop grids
    And Real Estate services preserve the complete legacy descriptions and audited card rhythm
    And Real Estate supporting content and selective desktop composition match the mounted reference
    And entering edit mode preserves the Real Estate card grid geometry

  @id:public.real-estate-listing-gallery @backend-noop
  Scenario: Keep Featured Properties a curated and accessible listing gallery
    backend-noop: Listing-gallery geometry, status tabs, and external-action hierarchy are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then the Real Estate listing gallery is centered and constrained at desktop width
    And listing cards preserve their intended image ratio at desktop and mobile widths
    And listing tabs show the active and sold counts in a light segmented control
    And each available external listing action remains accessible but visually subordinate
    And Real Estate listings process and FAQ match their mounted desktop contracts
    And listing directory actions and the contact call to action complete the gallery

  @id:public.real-estate-inverse-surfaces @backend-noop
  Scenario: Preserve the Real Estate inverse-surface presentation
    backend-noop: Real Estate About and footer color, typography, responsive containment, and editor-wrapper behavior are browser-owned presentation behavior.
    Given the current content manifest is available
    When I open "/real-estate"
    Then Real Estate About uses the mounted inverse gradient heading and prose roles
    And the Real Estate footer uses the mounted inverse heading copy and link rhythm
    And Real Estate inverse surfaces preserve their geometry editor wrappers and mobile containment

  @id:public.construction-collection-geometry @backend-noop
  Scenario: Keep editable collection grids structurally transparent
    backend-noop: Collection wrapper sizing and responsive grid presentation are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/construction"
    Then Construction services plans pros and reviews fill their centered desktop grids
    And Construction service and pro card rows use the frozen desktop rhythm
    And Construction sectors people and about use the frozen desktop presentation contracts
    And Construction collection grids retain their responsive column templates
    And entering edit mode preserves the Construction collection grid geometry
    And shared collection sizing preserves Real Estate and Property Management service grids

  @id:public.construction-residual-composition @backend-noop
  Scenario: Preserve the remaining Construction desktop section rhythm
    backend-noop: Plan Room, form, career, review, and contact geometry are browser-owned visual behavior.
    Given the current content manifest is available
    When I open "/construction"
    Then Construction long-form sections preserve their frozen desktop height and density contracts

  @id:public.storage-about-rhythm @backend-noop
  Scenario: Preserve the measured Storage Our Why rhythm
    backend-noop: Storage About prose, action, responsive geometry, and editor-wrapper transparency are browser-owned presentation behavior.
    Given the current content manifest is available
    When I open "/storage"
    Then Storage Our Why uses the measured desktop prose and action rhythm
    And Storage Our Why preserves its geometry in edit mode without overflowing on mobile

  @id:public.storage-mounted-composition @backend-noop
  Scenario: Render the complete mounted Storage Management composition
    backend-noop: Storage composition, responsive presentation, and its client-only consultation form are browser-owned behavior.
    Given the current content manifest is available
    When I open "/storage"
    Then Storage presents facility management for owners rather than consumer unit shopping
    And all 18 Storage entities have an editable visual boundary
    And the Storage hero, services, team, Our Why, reviews, contact, and footer render in order
    And Storage uses the frozen desktop hero heading and service-card geometry
    And Storage uses its frozen theme frames portrait cards and text roles
    And the Storage contact form validates locally without creating a CMS entity
    And Storage navigation remains usable at desktop and mobile widths

  @id:public.dedicated-division-composition @backend-noop
  Scenario Outline: Render a complete dedicated division composition
    backend-noop: Division composition and responsive presentation are browser-owned behavior.
    Given the current content manifest is available
    When I open "<route>"
    Then the dedicated "<division>" composition renders with <entity_count> editable entity boundaries

    Examples: Dedicated divisions
      | case_id     | route          | division    | entity_count |
      | real-estate | /real-estate   | Real Estate | 31           |
      | construction | /construction | Construction | 49           |
      | development | /development   | Development | 28           |

  @id:public.construction-empty @backend-noop
  Scenario: Show an honest empty construction project state
    backend-noop: Empty-state presentation is owned by the frontend.
    Given a construction project category has no published projects
    When I open that project category
    Then I see an empty state
    And fabricated project cards are not shown

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

  @id:public.health
  Scenario: Check the public backend health
    Given I am not signed in
    When I request the public health endpoint
    Then the response status is 200
    And the response body is exactly:
      """json
      {"status":"ok"}
      """
