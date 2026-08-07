---
name: Extraction provider setup
description: Synapse keeps the extraction contract explicit when no AI provider is available.
---

The app must not fabricate extracted ideas when the provider is unavailable or over quota; return the provider's clear configuration/quota error while preserving the `extract_ideas` request and response shape.

**Why:** The built-in provider setup required an account upgrade, and the user's Gemini key currently reports zero generation quota, so silent local heuristics would change the agreed extraction logic.

**How to apply:** If a provider becomes available later, implement it behind the existing extraction route without changing the front-end payload or the forced output schema.