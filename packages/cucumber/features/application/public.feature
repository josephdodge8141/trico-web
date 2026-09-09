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

  @id:public.construction-empty @backend-noop
  Scenario: Show an honest empty construction project state
    backend-noop: Empty-state presentation is owned by the frontend.
    Given a construction project category has no published projects
    When I open that project category
    Then I see an empty state
    And fabricated project cards are not shown

  @id:public.health
  Scenario: Check the public backend health
    Given I am not signed in
    When I request the public health endpoint
    Then the response status is 200
    And the response body is exactly:
      """json
      {"status":"ok"}
      """
