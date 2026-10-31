# Taste Bridge — English submission draft (not submitted)

Taste Bridge helps small groups choose a film without hiding disagreement. It compares candidate lists, exposes each person's rank and candidate coverage, and asks the group to discuss choices when there is no shared result. The people make the final decision.

This Cloudflare Workers edition provides a browser UI and callable retrieval-and-comparison tools. It validates explicit film confirmations, uses deterministic ranking, and implements a fixed-destination Qloo Insights adapter backed by durable aggregate reservations. No agent framework, external LLM or MCP server is claimed. The callable workflow is intended as an agentic tool; eligibility has not been established.

The public demo currently offers synthetic fixtures and a labeled replay of one previously observed public movie response. Invented inputs reuse the same list; this does not demonstrate three independent real taste profiles. A standalone Qloo request succeeded on October 30. The repaired Worker transport also succeeded on October 31: one approved request returned HTTP200, valid JSON, success=true and ten validated movie records from a 443671-byte response. Sending stopped after that one request. This result verifies the narrow fixed-film transport, not independent group preferences. The browser UI now shows those ten public movie results as an explicitly recorded replay, separate from the invented group-comparison example. Viewing it makes no new Qloo request and is not a live or individually personalized recommendation. We do not claim this limited demo yet satisfies the functional-Qloo submission requirement.

Built with JavaScript, Cloudflare Workers, Static Assets, SQLite Durable Objects, deterministic ranking and AI coding assistance. MIT license. Reproducible setup and tests are in README.md; measured limitations and deployment state are in DEPLOYMENT.md.

Demo: https://tastebridge-demo.yagi-5e3.workers.dev
Source repository: https://github.com/aisoh877/tastebridge-qloo (owner-authorized MIT publication).

Testing: open `/live`, click “Show recorded results” and inspect the ten recorded movies, real input seed, retrieval time and no-new-request disclosure. Replay the same stored result again. Then open `/`, compare the three synthetic participants, exercise partial overlap and recover from the simulated error. Open `/live`, use Quiet Harbor, Orbit and Forest, inspect the ambiguous Orbit choices, confirm all three and compare the recorded replay. Every replay result is labeled. These actions make zero new Qloo calls.

Before submitting: verify the public source repository, MIT detection, demo and these instructions; decide whether this accurately disclosed recorded-result workflow meets the event requirements; complete the remaining Devpost fields and verify the final submission confirmation. Repository publication is separately authorized; contest entry submission has not been authorized or completed.

Official overview and rules, checked October 31, 2026: https://qloo.devpost.com/ and https://qloo.devpost.com/rules . Deadline 03:45 UTC / 12:45 JST on October 31. A video is not required. Working external hosting and judge access through the judging period are required. No continuous Qloo access has been authorized.
