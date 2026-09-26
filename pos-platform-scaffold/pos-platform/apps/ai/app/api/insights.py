"""GET /insights/restock, /insights/trends — the proactive side.

Written by the nightly daily-rollup job in apps/api and read here, never
computed live against transaction tables.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/restock")
async def restock():
    return {"items": []}


@router.get("/trends")
async def trends():
    return {"items": []}
