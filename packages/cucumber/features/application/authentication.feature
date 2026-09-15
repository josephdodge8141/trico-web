Feature: TriCo editor authentication
  Only verified TriCo employees can establish fixed-duration editor sessions.

  @id:auth.public-before-login @backend-noop
  Scenario: Browse the public site without an editor session
    backend-noop: Public page rendering is observed through the frontend and browser using immutable content artifacts.
    Given I have no authenticated editor session
    When I open the TriCo site
    Then I can browse every public division page
    And editing controls are not shown

  @id:auth.edit-mode-login-redirect @backend-noop
  Scenario: Sign in before entering edit mode
    backend-noop: Redirecting an unauthenticated edit-mode request and restoring its public route are browser navigation behavior.
    Given I have no authenticated editor session
    And I opened the property management page
    When I enter edit mode
    Then I am sent to editor sign in
    And successful sign in returns me to the property management page

  @id:auth.edit-mode-login-resume @backend-noop
  Scenario: Resume edit mode after signing in
    backend-noop: Preserving an edit-mode request across browser authentication is frontend navigation state.
    Given I have no authenticated editor session
    And I opened the property management page
    When I enter edit mode
    Then I am sent to editor sign in
    And successful sign in returns me to the property management page
    And edit mode is already active

  @id:auth.edit-mode-reload-resume @backend-noop
  Scenario: Keep edit mode available after reloading an authenticated page
    backend-noop: Remembering the current tab's edit-mode intent across a browser reload is frontend session behavior.
    Given I sign in as the preview editor
    And I opened the property management page
    When I enter edit mode and reload that page
    Then the content editor returns without a blank side bar
    And the edit mode launcher does not disappear between states

  @id:auth.register @frontend-noop
  Scenario: Register a TriCo editor
    frontend-noop: The full registration and Mailpit verification journey is exercised by the Compose Playwright suite; token persistence is exercised by the backend adapter.
    Given an unused @tricoinc.com email address
    When I register with a valid password
    Then an unverified account is created
    And a single-use verification message is sent
    And no authenticated session is created

  @id:auth.register-domain @frontend-noop
  Scenario: Reject registration outside the TriCo domain
    frontend-noop: Browser error rendering is covered by the auth-page tests while domain enforcement is exercised by the backend adapter.
    Given an unused email address outside @tricoinc.com
    When I attempt to register
    Then registration is rejected with FORBIDDEN_EMAIL_DOMAIN
    And no account is created

  @id:auth.verify-single-use @frontend-noop
  Scenario: Verify an account exactly once
    frontend-noop: The browser verification journey is covered by Compose Playwright and single-use enforcement is exercised by the backend adapter.
    Given a valid unconsumed verification token
    When I verify the account
    Then the account becomes verified
    And replaying the token is rejected

  @id:auth.verify-expired @frontend-noop
  Scenario: Reject an expired verification token
    frontend-noop: Token expiry is a backend persistence invariant with no distinct browser interaction beyond typed error rendering.
    Given a verification token older than 24 hours
    When I verify the account
    Then verification is rejected
    And the account remains unverified

  @id:auth.login-valid @frontend-noop
  Scenario: Log in with a verified TriCo account
    frontend-noop: Seeded-editor login and authenticated edit-mode entry are exercised by the Compose Playwright suite.
    Given a verified TriCo editor account
    When I log in with valid credentials
    Then a fixed 30 day session is established
    And the application reports that editor as authenticated

  @id:auth.login-nondisclosing @frontend-noop
  Scenario Outline: Reject invalid login without account disclosure
    frontend-noop: The nondisclosing browser message is exercised by Compose Playwright and both credential cases are exercised by the backend adapter.
    Given I have "<credential_case>"
    When I attempt to log in
    Then login is rejected with the same public credential error
    And no authenticated session is created

    Examples: Invalid credentials
      | case_id        | credential_case       |
      | unknown-user   | an unknown email       |
      | wrong-password | an incorrect password  |
      | unverified     | an unverified account  |

  @id:auth.csrf @frontend-noop
  Scenario: Require origin and CSRF validation for editor mutations
    frontend-noop: Origin and synchronizer-token rejection is a backend security invariant exercised by the backend adapter.
    Given I have an authenticated editor session
    When I submit a mutation without an accepted origin and CSRF token
    Then the mutation is rejected
    And no application state changes

  @id:auth.logout @frontend-noop
  Scenario: End the current editor session
    frontend-noop: The opaque-session logout journey is exercised by the Compose Playwright suite.
    Given I have an authenticated editor session
    When I log out
    Then the current session is deleted
    And replaying its opaque cookie is rejected

  @id:auth.logout-all @frontend-noop
  Scenario: End every editor session
    frontend-noop: Cross-session revocation is a backend persistence invariant exercised by the backend adapter.
    Given my account has multiple authenticated sessions
    When I log out from all devices
    Then every session belonging to my account is deleted

  @id:auth.reset-single-use @frontend-noop
  Scenario: Reset a password and revoke existing sessions
    frontend-noop: The Mailpit reset journey is exercised by Compose Playwright and token/session invariants by the backend adapter.
    Given a valid unconsumed password reset token
    And the account has authenticated sessions
    When I choose a valid replacement password
    Then the password is replaced
    And the reset token cannot be reused
    And all previous sessions are rejected

  @id:auth.reset-expired @frontend-noop
  Scenario: Reject an expired password reset token
    frontend-noop: Token expiry and password preservation are backend persistence invariants exercised by the backend adapter.
    Given a password reset token older than one hour
    When I attempt to reset the password
    Then the reset is rejected
    And the existing password remains valid
