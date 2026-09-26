# AI assistant

Deterministic intent routing first, ~15 curated SQL tool functions second, free-form generated SQL never. redaction.py strips PII before anything reaches the model. Gemini primary, OpenRouter fallback, both behind llm/provider.py, degrading to useful rather than broken when the quota runs out.
