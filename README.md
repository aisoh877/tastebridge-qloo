# Taste Bridge — Cloudflare Worker edition

Taste Bridge helps a group compare film candidates while showing each person's rank and the coverage of each choice. The group makes the final decision. This JavaScript edition runs on Cloudflare Workers + Static Assets with a SQLite Durable Object. MIT licensed; no Node child process, agent framework, external model or MCP server is claimed.

## Try the published demo

https://tastebridge-demo.yagi-5e3.workers.dev

`/` provides synthetic ranking, partial overlap and explicit error/recovery controls. `/live` provides a clearly labeled recorded API replay: use Quiet Harbor, Orbit and Forest, select matches and explicitly confirm all three. Orbit has two invented matches. The replay reuses one previously observed public movie, Inglourious Basterds, for every list. It does not establish three independent real recommendations.

A standalone Insights request obtained that movie on October 30, 2026. Two later authorized Worker requests received HTTP 200 but did not produce a validated movie list. The latest diagnostic request on October 31 stopped at the 256 KiB body limit before JSON decoding: `stage=body_limit`, bounded bytesRead=262145. This determines the latest failure stage, not the exact stage of the earlier uninstrumented response. HTTP 200 alone does not establish valid JSON, authentication or movie recommendations. No retry occurred. The original reservation and two separately approved grant reservations are consumed and stopped, cumulative 3. A previous rejected Worker endpoint call made no observed additional upstream reservation.

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

The optional Qloo adapter accepts only a fixed public film UUID, calls only `https://hackathon.api.qloo.com/v2/insights`, uses verified platform HTTPS, an 8-second timeout and a 256 KiB response limit, and never retries or follows redirects. It validates success and movie records before caching. Public live gates require a Secret, explicit opt-in, stop=false, a bounded cap and a future deadline. A Secret alone never activates sending. Same-origin JSON, bounded input, text rendering and static CSP protect the UI.

A stable SQLite Durable Object serializes and durably reserves requests before sending. Unknown outcomes consume their reservation and stop. There is no reset route. A separately approved one-use capability has a short deadline, a memory-only random token, a deployed SHA-256 digest, independent server-side checks and one durable reservation. It cannot enable public live access. Read-only `/api/live/budget` and `/api/grant/readiness` never query Qloo; readiness compares Worker and ledger protocol/configuration before a send. Disabling removes the digest and restores the previous variables without extending old deadlines.

## Verification and limits

The deployed diagnostic/readiness lane passed 55/55 Worker tests, 3 local workerd mock cases and 4 execution-runner mock cases. Public HTTP regression and earlier desktop/mobile browser checks cover the fixture/replay UI. Production CPU time and Qloo pricing/quota are unmeasured; response latency does not establish CPU usage. The owner confirmed Workers Free. No plan upgrade, charge, new OAuth grant or contest submission was performed.

See DEPLOYMENT.md for deployed state and SUBMISSION.md for the English entry draft and remaining requirements.

## Response diagnostics and bounded verification

The official `results.entities` hierarchy with `type=urn:entity` and `subtype=urn:entity:movie` was already supported. Both the old and repaired validators accept a documented-field projection and a projection of the earlier verified summary. Neither is a captured HTTP response, and these checks do not establish the cause of the later failed response.

The diagnostic validator retains only fixed validation-stage enums, bounded byte/row counts, HTTP status, success/error flags and envelope kind. It never retains raw bodies, upstream field values, credential headers or raw exceptions. It distinguishes body limit/read, JSON decode, success/error, envelope, count, movie ID/type/title and credential-reflection failures. Failures still consume the reservation and stop. Readiness protocol 4 distinguishes this code and confirms matching grant configuration on the Worker and ledger before a send. The latest approved diagnostic grant was then consumed once and disabled; previous ledger entries were preserved. Never replay it or create another grant without explicit authorization.
