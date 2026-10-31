# Deployment and verification state

Demo: https://tastebridge-demo.yagi-5e3.workers.dev
Source: https://github.com/aisoh877/tastebridge-qloo
Worker: tastebridge-demo; existing owner-identified account and confirmed Workers Free. No new authentication, paid plan or charge was added. Qloo fees/quota and production CPU time remain unmeasured.

Latest deployment: a028dc75-e692-4872-af51-dae62d994711
Version: df50ed8c-a822-4599-b301-ba92c2b5952c
Created: October 31, 2026, 01:34:38 UTC. Traffic 100%.

## Successful bounded transport test

Read-only readiness confirmed matching Worker/DO protocol5, new approval ID, deadline and enabled state before sending. One approved application fetch at 01:20:04–05 UTC returned HTTP200, 443671 bytes, valid JSON, success=true, no application error and ten movie records. The first result was Pulp Fiction. The input was the fixed public Inglourious Basterds UUID; the target remained https://hackathon.api.qloo.com/v2/insights with take=10. No key retrieval, reinput or re-save occurred. No retries or redirects.

The finite body cap is 2097152 bytes (2 MiB), enforced while streaming; a one-byte overflow stops before JSON parsing. An overall 8-second deadline spans fetch and body reading. Exact-boundary, overflow, invalid JSON, stalled stream and valid movie extraction are tested. Diagnostic metadata uses fixed enums and bounded counts only; raw bodies, headers, credentials and raw exceptions are never saved.

The original ledger and three separate grants now total four consumed durable reservations. Old records were retained. Each is stopped and additionalQlooAllowed=false. At 01:20:44 UTC read-only readiness confirmed both Worker and DO had the restored disabled configuration. The one-use digest was removed; original variables, expired deadlines, Secret reference and namespace were preserved. There is no reset or retry endpoint. Provider-wide historical usage remains unknown.

## Public-demo scope

The public UI includes synthetic fixture comparison, labeled replay of the earlier single result and a separate ten-movie verified-result replay. The ten-movie result is now presented in a separate, clearly labeled recorded-result section on /live. Its button reads only the stored observation; no new Qloo request or individual personalization occurs. A successful bounded API transport does not establish three independent tastes or contest eligibility. Continuous live access is not authorized. The source-release config disables public/operator/grant access and excludes private run metadata. Only public/ is served as Static Assets.

Verification: Node59/59; local workerd3 fake-only cases including a payload above the old cap; runner4 fake-only safety cases. Public HTTP/UI checks are separate from the transport result. Wall latency is not CPU measurement.

## Reversible versions

Before the size repair, Worker deployment b0f21e73-29d5-4de4-9ca2-211680d07eef used version 1c5d037b-3d61-41d6-884f-99d240b8d665. Repository main was 6987952e9f32ee6aaf7665baa73b781d9a56771d. These identify rollback points; no rollback was performed. Any authorized rollback must preserve the existing namespace and consumed ledger, and must not reactivate access or reset counters. Use a normal revert commit for repository history rather than a forced push.

## Submission status

The source is public with MIT LICENSE, startup/testing instructions and an accurate English draft. Devpost submission remains unapproved and not completed. Functional Qloo-powered core features must be accessible to judges; the current stopped fixture/replay UI plus a transport test does not by itself establish that requirement. A separately approved fixed-result cache is a possible zero-additional-Qloo judging mode, with its limits made explicit. The narrow ten-movie replay was separately approved; no live opening or new Qloo request was part of its publication.

Official requirements: https://qloo.devpost.com/ and https://qloo.devpost.com/rules . Deadline October31, 2026 03:45UTC /12:45JST. Judge availability is required through November5, 2026 11:45pm Eastern Time. Video is not required. Do not infer authorization for continuous Qloo operation or contest submission from source publication.

## Separately approved recorded replay publication

The ten previously validated movies were published at 01:32 UTC under a new explicit approval. No Qloo request was made. Deployment settings, namespace, Secret reference and the complete four-reservation stopped budget matched before/after. GET /api/verified-sample returned exactly the observed ten name/ID pairs. The browser button presents this as a replay of previously retrieved real API results, never a live or individually personalized recommendation. Only the needed public facts and provenance are stored, with Qloo data rights retained.

Before this UI publication: Worker deployment f53fa1a5-0ca3-4d61-b553-3ddeb480a72f, version b2db161f-3920-400f-a17f-5763d4a45bee; repository commit d8c270d526c03d803f9f77658a1dadce5203457a. These are rollback points; no rollback or forced push occurred.

A browser check found that an early replay click could occur before its listener was attached while comparison readiness was loading. The recorded button now initializes first, independently of that status request. The final deployment passed 16 desktop/mobile Chromium checks (14 normal and 2 held-readiness regressions), with no JavaScript errors or horizontal overflow. Network interception observed zero Qloo requests and zero operator/grant calls. Separate public HTTP regression passed 21 cases. All four stopped ledger entries remained unchanged.
