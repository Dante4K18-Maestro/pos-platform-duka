"""POST /chat — tenant-scoped.

Route before you think: deterministic intent match against ~15 curated
questions runs first and answers straight from a rollup table with zero
model calls. The LLM is only reached for genuinely novel phrasing. This is
also what keeps "what did I sell today?" working after the free quota is
spent for the day.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("")
async def chat(payload: dict):
    # TODO: agent.router.match_intent(payload["message"]) first;
    # fall through to agent.graph.run(...) only on a miss.
    return {"answer": "TODO", "tool_calls": []}
