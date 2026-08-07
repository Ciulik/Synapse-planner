---
name: Extraction provider setup
description: Synapse keeps the extraction contract explicit when no AI provider is available.
---

The app must not fabricate extracted ideas when the provider is unavailable; return a clear configuration error while preserving the `extract_ideas` request and response shape.

**Why:** The built-in provider setup required an account upgrade and the user declined providing a personal API key, so silent local heuristics would change the agreed extraction logic.

**How to apply:** If a provider becomes available later, implement it behind the existing extraction route without changing the front-end payload or the forced output schema.