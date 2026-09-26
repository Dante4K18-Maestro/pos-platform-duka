"""pydantic-settings config, fails fast on a missing required var."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url_readonly: str
    ai_service_token: str

    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    groq_api_key: str | None = None
    llm_primary_provider: str = "gemini"
    llm_fallback_provider: str = "openrouter"
    llm_daily_call_cap_per_tenant: int = 200

    class Config:
        env_file = ".env"


settings = Settings()
