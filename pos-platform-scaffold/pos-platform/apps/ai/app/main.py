"""FastAPI bootstrap for the AI service.

This service has no write path and no other database role than read-only.
A prompt injection here cannot refund a sale — that boundary is enforced by
running under a different Postgres role than apps/api, not by application
code alone.
"""
from fastapi import FastAPI

from app.api import chat, health, insights

app = FastAPI(title="pos-ai")

app.include_router(health.router)
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])
