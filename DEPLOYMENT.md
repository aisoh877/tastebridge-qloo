# Deployment and operator state

Public app: https://tastebridge-demo.yagi-5e3.workers.dev
Worker: tastebridge-demo. Workers.dev subdomain: yagi-5e3. The owner identified the account and confirmed Workers Free. Use only the already approved account and existing authentication for an authorized deployment; never create a new grant or accept an upgrade automatically.

Latest deployment: `b0f21e73-29d5-4de4-9ca2-211680d07eef`.
Version: `1c5d037b-3d61-41d6-884f-99d240b8d665`.
Created: October 31, 2026, 01:02:07 UTC. Traffic: 100%.

Only public/ is served as Static Assets. Worker source, local evidence and private operator scripts are not public assets. QLOO_API_KEY is an existing Worker Secret; no value was retrieved or re-saved during the revised test. `wrangler deploy --keep-vars` retained the original variables and stable SQLite namespace/object identity. The portable source release uses disabled example variables instead of operator run metadata.

## Current measured stop state

Public live=false, stop=true, public cap=0 and original public deadline expired. Old operator deadline unchanged and expired. The temporary capability is disabled and its digest empty. The old ledger is used=1, pending=true, stopped=true. A distinct approved grant is used=1, pending=true, stopped=true, additionalQlooAllowed=false, upstream HTTP 200, failureCode=QLOO_CONTRACT. A second separately approved diagnostic grant is also used=1, pending=true, stopped=true, additionalQlooAllowed=false, upstream HTTP 200, validation stage=body_limit, bytesRead=262145. Cumulative durable reservations: 3. The prior rejected endpoint call made no observed extra durable reservation. Global provider/account usage is unknown.

Read-only readiness confirmed both Worker and Durable Object used protocol 4 and the exact new grant configuration before the single send. After disabling, read-only readiness confirmed both had the previous disabled configuration, and both old/new ledger stops remained set. No retry, quota reset, namespace recreation or old-expiry extension occurred.

## Test outcome and remaining uncertainty

The revised attempt reached Qloo and recorded HTTP 200. Response validation rejected the payload. No raw response or detailed failed validation stage was retained, so the exact size/JSON/success/movie-schema condition cannot be reconstructed. HTTP 200 alone does not establish authentication success, valid JSON or valid movie recommendations. Do not replay the consumed grant or infer a movie list from an earlier request.

Regression: Node 55/55; local workerd 3 fake-only cases; execution runner 4 fake-only cases. Public mock/replay verification is separate from live-Qloo success. CPU time, Qloo billing/quota and provider-side request totals are unmeasured. No paid plan, Containers, new authentication or contest submission occurred.

## Future deployment and judging availability

The latest diagnostic attempt definitively exceeded the 256 KiB response limit before JSON decoding. Its JSON, success flag and movie records were not validated. This is the latest observed failure, not retrospective proof of the earlier response condition.

A deployment can take time to reach an active Durable Object. Readiness must confirm matching protocol, grant ID, expiry and enabled state on both sides before any separately approved send. Readiness polling never queries Qloo. A failure or uncertain send is consumed; never retry it automatically.

Do not enable continuous API access under the current one-request approval. A future bounded plan could obtain a validated fixed-film result once and expose its clearly labeled cache throughout judging without new Qloo traffic. That narrow sample does not establish independent three-person tastes or contest eligibility. Richer distinct-seed comparisons require verified seed IDs, separate bounded API authorization and successful cached lists. Preserve caps, no-retry behavior, fixed upstream and deadline controls.

Official requirements: https://qloo.devpost.com/ and https://qloo.devpost.com/rules . Deadline October 31, 2026 03:45 UTC / 12:45 JST. Judges must be able to use the project throughout the judging period, ending November 5, 2026 at 11:45 pm Eastern Time. Functional external hosting, public source with an OSS license, English description/testing instructions and actual core features remain required. A video is not required. A stopped synthetic/replay demo plus a transport HTTP 200 does not prove compliance.

## Completed diagnostic deployment — October 31, 2026

55/55 Node tests, 3 fake-only local workerd cases and 4 fake-only runner safety cases passed. Protocol 4 was deployed under explicit owner approval. Read-only readiness established Worker/DO protocol, grant ID, expiry and enabled state before the single send. At 01:02:02 UTC the request reserved its distinct diagnostic slot; at 01:02:03 UTC it failed at body_limit after HTTP 200. No retry occurred. At 01:02:23 UTC both Worker and DO reflected the restored disabled configuration; all three reservations remained stopped.

Only fixed enums, bounded byte/row counts and HTTP status are retained as validation diagnostics. Raw bodies, field values, headers, credentials and raw exception messages are never retained. Official nested movie fields and the earlier summary projection are accepted by both the old and current validator, so a hierarchy defect was not established.

Any future attempt requires a separately approved bounded grant preserving all consumed records. Reducing take may reduce payload size; it has not been tested in the current Worker. Do not raise the limit or resend automatically. Continuous API operation remains unapproved.
