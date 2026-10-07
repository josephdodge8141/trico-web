# Resume upload transport limit

The prior public careers form accepted a 10 MiB PDF or Word file, converted it
to base64, and posts it inside `/api/v1/applications` JSON. A 10 MiB file
becomes **13,981,016 base64 bytes** before JSON overhead. Local Express accepts
15 MB, so the old local Mailpit journey succeeded, but the deployed HTTP API has a
[10 MB request payload limit](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html)
and its synchronous Lambda integration has a
[6 MB invocation payload limit](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html).
The 10 MiB promise therefore could not work through that production path.

The [SES v2 attachment limit](https://docs.aws.amazon.com/ses/latest/dg/attachments.html)
is 40 MB per message. The inbound API transport is the limiting layer here.

The implemented path stages the resume through a short lived signed PUT into a
private, unversioned object bucket; send only an opaque upload ID and form fields
through the application API; verify the stored file's declared size, MIME type,
and signature; deliver it as the existing mail attachment; then delete the
staged object. A one-day bucket lifecycle cleans up abandoned uploads. The
anonymous upload reservation and final submission have separate rate limits,
and the reservation is claimed once. The production bucket permits browser PUT
from the configured site origin. Local MinIO keeps resumes in a separate
private bucket while published content remains accessible.

**Local evidence:** the revised existing public health behavior passed on
`app.localhost:18090` with a 10 MiB PDF, a small final JSON request, and a
Mailpit attachment. The backend behavior confirms forged and replayed IDs
cannot send mail, bad signatures are rejected, and processed objects are
removed. An anonymous GET against the separate résumé bucket returned 403.
The existing Home form behavior also checks that delivery failure leaves the
form and selected file ready for retry. These checks do not establish
production SES delivery; approved recipients and mailbox retention rules remain
owner decisions.
