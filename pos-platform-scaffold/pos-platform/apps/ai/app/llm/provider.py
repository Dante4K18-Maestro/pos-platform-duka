"""One interface, swappable vendor. The abstraction is the actual decision;
the vendor is a config value.

Gemini free tier is primary (permanent free quota, no card). OpenRouter is
wired up as fallback for when that quota is spent. Both sit behind this
module so nothing above it ever imports a vendor SDK directly.

Degrade to useful, never to broken:
  - a per-tenant daily call cap (budget.py) stops one chatty merchant
    draining the shared quota;
  - identical questions are cached, so a retried or repeated question never
    costs a second call;
  - the deterministic router (agent/router.py) answers most questions with
    zero model calls regardless of quota state;
  - the nightly rollup job is plain SQL and produces proactive insights
    whether or not any LLM provider is reachable at all.

TODO: implement generate(), with gemini.py tried first and openrouter.py
(then groq.py) tried in order on quota/availability errors. Every fallback
transition should be logged — silent degradation is still degradation.
"""
from typing import Protocol


class LLMProvider(Protocol):
    async def generate(self, prompt: str, *, tenant_id: str) -> str: ...


async def generate(prompt: str, *, tenant_id: str) -> str:
    raise NotImplementedError
