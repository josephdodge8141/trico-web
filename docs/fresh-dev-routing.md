# Fresh development document routing

This is an opt-in addition to the existing application stack. It does not create a second owner of the dev distribution and does not alter production routing.

## Ownership and bootstrap

Set the `application:dev:freshDevRouting` CDK context to an object with `releaseSha` and `documentPaths`. Keep actual environment values in ignored context/configuration. The bootstrap SHA must be the currently active immutable fresh release, with its index and deployment marker already present under `fresh-releases/<sha>/`. Confirm every bootstrap document path against that release before association.

The original application stack owns one KeyValueStore and viewer-request function. The import is bootstrap data, not the mutable active release. Preserve this original bootstrap configuration during later infrastructure updates. Changing the import can require replacing the store and must not be used as routine release activation.

The fresh repository's release role will update only this store's data. A release registers all exact document paths under `<sha>:<path>` before changing `active`. Earlier route sets and immutable assets remain available for rollback. The root entry must exist before any release is active. Invalid, absent or incomplete active data produces 503, never a guessed release.

## Behavior

- Exact registered page routes rewrite to `fresh-releases/<active>/index.html`.
- Unknown document paths return 404. Unsupported document methods return 405.
- `/deployment.json` identifies the active immutable release.
- Immutable release assets and ordinary file paths retain their original origin behavior and statuses.
- Both `/api` and `/api/*` bypass document rewriting.
- Only the opted-in dev distribution removes the inherited global 403/404-to-200 rewrite.

## Validation and activation gap

The existing application-stack test now executes the actual generated function with an outbound KeyValueStore substitute. It verifies known/unknown paths, method rejection, missing assets, release marker, rollback and malformed/incomplete registry failure. Existing synthesis verifies the API bypass, single ownership and rejection of this option for production.

`npm run check:ci` passes with the existing test/scenario counts and 204 canonical cases. The initial missing-option acceptance failure was observed before implementation. This branch has not activated the edge change: fresh release registry preparation/permissions, bootstrap validation, CloudFront test-function evidence and hosted status/rollback checks remain required before deployment.

References: [CloudFront KeyValueStore](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions.html), [event/response structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html).
