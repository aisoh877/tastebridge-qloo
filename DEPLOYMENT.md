# Deployment and verification state

Demo: https://tastebridge-demo.yagi-5e3.workers.dev
Source: https://github.com/aisoh877/tastebridge-qloo
Worker: tastebridge-demo; existing owner-identified account and confirmed Workers Free. No new authentication, paid plan or charge was added. Qloo fees/quota and production CPU time remain unmeasured.

Latest deployment: f53fa1a5-0ca3-4d61-b553-3ddeb480a72f
Version: b2db161f-3920-400f-a17f-5763d4a45bee
Created: October 31, 2026, 01:20:09 UTC. Traffic 100%.

## Successful bounded transport test

Read-only readiness confirmed matching Worker/DO protocol5, new approval ID, deadline and enabled state before sending. One approved application fetch at 01:20:04–05 UTC returned HTTP200, 443671 bytes, valid JSON, success=true, no application error and ten movie records. The first result was Pulp Fiction. The input was the fixed public Inglourious Basterds UUID; the target remained https://hackathon.api.qloo.com/v2/insights with take=10. No key retrieval, reinput or re-save occurred. No retries or redirects.

The finite body cap is 2097152 bytes (2 MiB), enforced while streaming; a one-byte overflow stops before JSON parsing. An overall 8-second deadline spans fetch and body reading. Exact-boundary, overflow, invalid JSON, stalled stream and valid movie extraction are tested. Diagnostic metadata uses fixed enums and bounded counts only; raw bodies, headers, credentials and raw exceptions are never saved.

The original ledger and three separate grants now total four consumed durable reservations. Old records were retained. Each is stopped and additionalQlooAllowed=false. At 01:20:44 UTC read-only readiness confirmed both Worker and DO had the restored disabled configuration. The one-use digest was removed; original variables, expired deadlines, Secret reference and namespace were preserved. There is no reset or retry endpoint. Provider-wide historical usage remains unknown.

## Public-demo scope

The public UI remains synthetic fixture comparison and labeled replay of the earlier single result. The newly validated ten-movie result has not been published in the UI. A successful bounded API transport does not establish three independent tastes or contest eligibility. Continuous live access is not authorized. The source-release config disables public/operator/grant access and excludes private run metadata. Only public/ is served as Static Assets.

Verification: Node58/58; local workerd3 fake-only cases including a payload above the old cap; runner4 fake-only safety cases. Public HTTP/UI checks are separate from the transport result. Wall latency is not CPU measurement.

## Reversible versions

Before the size repair, Worker deployment b0f21e73-29d5-4de4-9ca2-211680d07eef used version 1c5d037b-3d61-41d6-884f-99d240b8d665. Repository main was 6987952e9f32ee6aaf7665baa73b781d9a56771d. These identify rollback points; no rollback was performed. Any authorized rollback must preserve the existing namespace and consumed ledger, and must not reactivate access or reset counters. Use a normal revert commit for repository history rather than a forced push.

## Submission status

The source is public with MIT LICENSE, startup/testing instructions and an accurate English draft. Devpost submission remains unapproved and not completed. Functional Qloo-powered core features must be accessible to judges; the current stopped fixture/replay UI plus a transport test does not by itself establish that requirement. A separately approved fixed-result cache is a possible zero-additional-Qloo judging mode, with its limits made explicit. No such new public behavior has been deployed.

Official requirements: https://qloo.devpost.com/ and https://qloo.devpost.com/rules . Deadline October31, 2026 03:45UTC /12:45JST. Judge availability is required through November5, 2026 11:45pm Eastern Time. Video is not required. Do not infer authorization for continuous Qloo operation or contest submission from source publication.
