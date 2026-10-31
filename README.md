# Taste Bridge — Cloudflare Worker edition

Taste Bridge helps a group compare film candidates while showing each person's rank and the coverage of each choice. The group makes the final decision. This JavaScript edition runs on Cloudflare Workers + Static Assets with a SQLite Durable Object. MIT licensed; no Node child process, agent framework, external model or MCP server is claimed.

## Try the published demo

https://tastebridge-demo.yagi-5e3.workers.dev

`/` provides synthetic ranking, partial overlap and explicit error/recovery controls. `/live` provides a clearly labeled recorded API replay: use Quiet Harbor, Orbit and Forest, select matches and explicitly confirm all three. Orbit has two invented matches. The replay reuses one previously observed public movie, Inglourious Basterds, for every list. It does not establish three independent real recommendations.

A standalone Insights request obtained that movie on October 30, 2026. A separately approved Worker request on October 31 at 01:20 UTC then succeeded: HTTP 200, valid JSON, success=true and ten validated movie records. Its 443,671-byte response fit the repaired finite 2 MiB cap and total 8-second deadline. Earlier 256 KiB-limited requests had stopped before valid movie extraction. The original reservation and three distinct one-use grant reservations are consumed and stopped, cumulative 4. No automatic retry occurred.

This verifies the fixed public-film Worker transport only. It does not verify independent three-person tastes or the public UI's live workflow. The browser demo now provides a separate ten-movie recorded-result replay alongside the older synthetic/replay examples. It makes zero new Qloo requests and is not a new or individually personalized recommendation. Click “Show recorded results” on /live.

The QLOO_API_KEY Secret exists server-side and is absent from source and browser assets. Public live access is disabled, the public send cap is zero and the original deadline remains expired. The one-use capability was disabled and its hash removed. This public fixture/replay demo is not established as meeting the contest's functional-Qloo requirement. Source publication to https://github.com/aisoh877/tastebridge-qloo is owner-approved. Contest submission remains unapproved and has not occurred.

## Run locally

Use Node 24.18+ and an existing Wrangler installation. No npm dependencies or build step are needed.

```sh
npm run check
npm test
npm run dev
```

Open the loopback URL printed by Wrangler. Use `wrangler dev --local`; do not use remote mode for offline QA. Compatibility date 2026-07-15 works with the verified existing Wrangler 4.110.0 runtime. Tests use fake credentials and controlled mock responses, not Qloo. The source release config intentionally disables live, operator and one-use grant lanes; no credentials are included.

## Callable workflow

`GET /api/tools` describes `resolve_movie` and `compare_confirmed_movies`. POST `/api/tools/call` with JSON `{"name":"resolve_movie","arguments":{"participant":0,"query":"Quiet Harbor"}}` to retrieve fixed local catalog matches. Compare exactly three explicit confirmations from the current catalog. These are custom HTTP function tools for an agent or UI to call; there is no automatic remote resolver. Immutable catalog membership avoids shared mutable visitor selection slots.

The optional Qloo adapter accepts only a fixed public film UUID, calls only `https://hackathon.api.qloo.com/v2/insights`, uses verified platform HTTPS, an 8-second timeout and a 2 MiB streaming response limit, and never retries or follows redirects. It validates success and movie records before caching. Public live gates require a Secret, explicit opt-in, stop=false, a bounded cap and a future deadline. A Secret alone never activates sending. Same-origin JSON, bounded input, text rendering and static CSP protect the UI.

A stable SQLite Durable Object serializes and durably reserves requests before sending. Unknown outcomes consume their reservation and stop. There is no reset route. A separately approved one-use capability has a short deadline, a memory-only random token, a deployed SHA-256 digest, independent server-side checks and one durable reservation. It cannot enable public live access. Read-only `/api/live/budget` and `/api/grant/readiness` never query Qloo; readiness compares Worker and ledger protocol/configuration before a send. Disabling removes the digest and restores the previous variables without extending old deadlines.

## Verification and limits

The response/replay edition passed 59/59 Worker tests, 3 local workerd mock cases and 4 execution-runner mock cases. Public HTTP regression passed 21 cases. Actual Chromium desktop/mobile verification passed 16 checks including delayed readiness, duplicate-free replay, network failure/manual recovery, existing invented comparison and fixture error recovery. No JavaScript errors, Qloo requests or operator/grant calls were observed. Production CPU time and Qloo pricing/quota are unmeasured; response latency does not establish CPU usage. The owner confirmed Workers Free. No plan upgrade, charge, new OAuth grant or contest submission was performed.

See DEPLOYMENT.md for deployed state and SUBMISSION.md for the English entry draft and remaining requirements.

## Response diagnostics and bounded verification

The official `results.entities` hierarchy with `type=urn:entity` and `subtype=urn:entity:movie` was already supported. Both the old and repaired validators accept a documented-field projection and a projection of the earlier verified summary. Neither is a captured HTTP response, and these checks do not establish the cause of the later failed response.

The diagnostic validator retains only fixed validation-stage enums, bounded byte/row counts, HTTP status, success/error flags and envelope kind. It never retains raw bodies, upstream field values, credential headers or raw exceptions. It distinguishes body limit/read, JSON decode, success/error, envelope, count, movie ID/type/title and credential-reflection failures. Failures still consume the reservation and stop. Readiness protocol 5 distinguishes this code and confirms matching grant configuration on the Worker and ledger before a send. The latest approved size-repair grant was then consumed once and disabled; previous ledger entries were preserved. Never replay it or create another grant without explicit authorization.

## Recorded-result replay and data rights

On `/live`, “Replay of previously retrieved real API results” identifies the real seed, retrieval time and limits. “Show recorded results” reads the ten previously validated public movie names/IDs from `/api/verified-sample`; it never invokes the ledger or Qloo. Replaying it again reads the same observation. The invented three-person comparison remains separate and does not personalize these ten results.

Only minimal public movie facts and provenance are retained, with no images, descriptions, personal data or credentials. Qloo's event [access guide](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/API_ACCESS.md) advises caching only needed data; its [safe-use guide](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/SAFE_USE.md) calls for source and limitations. [Qloo terms](https://www.qloo.com/legal/terms) and any applicable event terms remain in effect. MIT licenses this project's code; it grants no additional rights to Qloo data, marks or third-party content. This narrow replay does not guarantee contest eligibility.
