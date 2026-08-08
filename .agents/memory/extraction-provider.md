---
name: Extraction provider setup
description: Synapse keeps the extraction contract explicit when no AI provider is available.
---

The app must not fabricate extracted ideas when the provider is unavailable or over quota; return the provider's clear configuration/quota error while preserving the `extract_ideas` request and response shape. When the user pins a Gemini model, never substitute another model; surface the exact provider status and raw body.

**Why:** The built-in provider setup required an account upgrade, and the user explicitly requires `gemini-2.5-flash-lite` with no fallback. Silent local heuristics or model substitution would change the agreed extraction logic.

**How to apply:** If a provider becomes available later, implement it behind the existing extraction route without changing the front-end payload or the forced output schema.