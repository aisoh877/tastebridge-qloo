# Taste Bridge — English submission draft (not submitted)

Taste Bridge helps small groups choose a film without hiding disagreement. It compares candidate lists, exposes each person's rank and candidate coverage, and asks the group to discuss choices when there is no shared result. The people make the final decision.

This Cloudflare Workers edition provides a browser UI and callable retrieval-and-comparison tools. It validates explicit film confirmations, uses deterministic ranking, and implements a fixed-destination Qloo Insights adapter backed by durable aggregate reservations. No agent framework, external LLM or MCP server is claimed. The callable workflow is intended as an agentic tool; eligibility has not been established.

The public demo currently offers synthetic fixtures and a labeled replay of one previously observed public movie response. Invented inputs reuse the same list; this does not demonstrate three independent real taste profiles. A standalone Qloo request succeeded on October 30. Later bounded Worker requests reached Qloo and received HTTP 200 on October 31, but no valid new recommendation list was confirmed. The latest diagnostic request exceeded the 256 KiB body limit before JSON decoding and stopped without retry. All additional sending is stopped. We do not claim this limited demo yet satisfies the functional-Qloo submission requirement.

Built with JavaScript, Cloudflare Workers, Static Assets, SQLite Durable Objects, deterministic ranking and AI coding assistance. MIT license. Reproducible setup and tests are in README.md; measured limitations and deployment state are in DEPLOYMENT.md.

Demo: https://tastebridge-demo.yagi-5e3.workers.dev
Source repository: https://github.com/aisoh877/tastebridge-qloo (owner-authorized MIT publication).

Testing: open `/`, compare the three synthetic participants, exercise partial overlap and recover from the simulated error. Open `/live`, use Quiet Harbor, Orbit and Forest, inspect the ambiguous Orbit choices, confirm all three and compare the recorded replay. Every replay result is labeled. These actions make zero new Qloo calls.

Before submitting: provide a public repository containing all source/assets/start instructions and a detectable MIT LICENSE; establish a functional Qloo-powered core workflow available to judges; enter the accurate English description and testing steps on Devpost; verify the final submission confirmation. Repository publication is separately authorized; contest entry submission has not been authorized or completed.

Official overview and rules, checked October 31, 2026: https://qloo.devpost.com/ and https://qloo.devpost.com/rules . Deadline 03:45 UTC / 12:45 JST on October 31. A video is not required. Working external hosting and judge access through the judging period are required. No continuous Qloo access has been authorized.
