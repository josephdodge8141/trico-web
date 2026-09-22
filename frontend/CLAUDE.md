# frontend instructions

## Purpose

The React application, top-level pages and browser acceptance support.

## Required boundaries

Keep most feature behavior in pages and validate every API response in services.

Do not store browser tokens. Exercise the real TriCo cookie, origin, CSRF, DynamoDB Local, and Mailpit flows in acceptance.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
