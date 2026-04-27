from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3001,http://127.0.0.1:3001"
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
