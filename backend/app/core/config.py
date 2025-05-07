import secrets
from typing import Literal

from pydantic import (
	EmailStr,
	HttpUrl,
	PostgresDsn,
	computed_field,
)
from pydantic_core import MultiHostUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	model_config = SettingsConfigDict(
		# Use top level .env file (one level above ./backend/)
		env_file='../.env',
		env_ignore_empty=True,
		extra='ignore',
	)
	ENVIRONMENT: Literal['local', 'staging', 'production'] = 'local'
	JWT_ALGORITHM: str = 'HS256'
	# run openssl rand -base64 32 to generate
	JWT_SECRET: str = secrets.token_urlsafe(32)
	# run openssl rand -base64 32 to generate
	JWT_REFRESH_SECRET: str = secrets.token_urlsafe(32)
	# JWT audience claim - identifies intended recipients
	JWT_AUDIENCE: str = 'llmezi-api'
	# 30 minutes
	ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
	# 60 minutes * 24 hours * 28 days
	REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 28
	# 15 minutes for OTP authentication codes
	AUTH_CODE_EXPIRE_MINUTES: int = 15
	# optional
	SENTRY_DSN: HttpUrl | None = None

	# Frontend URL for CORS configuration
	FRONTEND_URL: str = 'http://localhost:5173'

	POSTGRES_SERVER: str
	POSTGRES_PORT: int = 5432
	POSTGRES_USER: str
	POSTGRES_PASSWORD: str = ''
	POSTGRES_DB: str = 'llmezi'

	DATABASE_POOL_SIZE: int = 10
	DATABASE_MAX_OVERFLOW: int = 20
	DATABASE_POOL_TIMEOUT: int = 30

	@computed_field  # type: ignore[prop-decorator]
	@property
	def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
		return MultiHostUrl.build(
			scheme='postgresql+psycopg',
			username=self.POSTGRES_USER,
			password=self.POSTGRES_PASSWORD,
			host=self.POSTGRES_SERVER,
			port=self.POSTGRES_PORT,
			path=self.POSTGRES_DB,
		)

	@computed_field  # type: ignore[prop-decorator]
	@property
	def CORS_ORIGINS(self) -> list[str]:
		"""
		Returns a list of allowed origins for CORS.
		In local environment, allows all origins for easier development.
		In other environments, uses the configured FRONTEND_URL.
		"""
		if self.ENVIRONMENT == 'local':
			return ['*']
		return [self.FRONTEND_URL] if self.FRONTEND_URL else []

	SMTP_TLS: bool = True
	SMTP_SSL: bool = False
	SMTP_PORT: int = 587
	SMTP_HOST: str | None = None
	SMTP_USER: str | None = None
	SMTP_PASSWORD: str | None = None
	EMAILS_FROM_EMAIL: EmailStr | None = None
	EMAILS_FROM_NAME: EmailStr | None = None


settings = Settings()  # type: ignore
