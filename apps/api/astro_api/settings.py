from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    cors_origins: str = "http://localhost,http://localhost:5173"
    database_url: str = "sqlite:///./astrofoto.sqlite3"
    profile_database_url: str = "sqlite:///./astrofoto.sqlite3"
    redis_url: str = "redis://localhost:6379/0"
    open_meteo_forecast_url: str = "https://api.open-meteo.com/v1/forecast"
    forecast_cache_ttl_seconds: int = 900
    forecast_timeout_seconds: float = 4.0
    target_image_cache_dir: str = ".cache/target-images"
    target_image_cache_ttl_seconds: int = 604800
    target_image_timeout_seconds: float = 8.0
    fits_library_root: str = "data/fits"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
