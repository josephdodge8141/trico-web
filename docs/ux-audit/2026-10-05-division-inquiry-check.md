# Five-division inquiry journey check

The running Compose preview at `http://app.localhost:18090/` was checked in fresh
headless Chromium pages at a 390 × 844 viewport. Each public form was filled
through its rendered controls and submitted to the real local backend and
Mailpit connection. This is a local journey check, not evidence of production
SES delivery or representative visitor task completion.

| Page                | Submitted kind         | Live response | Visible result  |
| ------------------- | ---------------------- | ------------- | --------------- |
| Property Management | `property-analysis`    | 200           | Thank-you state |
| Real Estate         | `real-estate-contact`  | 200           | Thank-you state |
| Construction        | `construction-bid`     | 200           | Thank-you state |
| Storage             | `storage-consultation` | 200           | Thank-you state |
| Development         | `development-contact`  | 200           | Thank-you state |

A second fresh-browser pass aborted each inquiry request before it reached the
backend. All five forms showed the delivery error, retained the entered first
name, and showed no success message. Existing Compose behavior independently
covers the Storage delivery path and backend rate limits. The five-page pass
adds rendered-browser coverage for the other division forms without adding a
test file or Cucumber scenario.

The checks did not measure actual visitor comprehension, screen reader output,
or production mailbox delivery. Approved production recipients and email
identity are still required before that last delivery check.
