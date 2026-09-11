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

  @id:public.property-management-mounted-composition @backend-noop
  Scenario: Render the complete mounted Property Management composition
    backend-noop: Property Management composition, responsive presentation, and its two client-only forms are browser-owned behavior.
    Given the current content manifest is available
    When I open "/property-management"
    Then the Property Management page presents every mounted section in its intended order
    And the Property Management hero presents an accessible primary and secondary action hierarchy
    And all 35 Property Management entities have an editable visual boundary
    And supplied Property Management portfolio images load while unavailable images use the neutral placeholder
    And the Property Management client-only forms validate locally without creating CMS entities
    And the Property Management contact details use labeled icon rows and remain visible after anchor navigation

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
