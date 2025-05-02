# backend/app/services/exceptions.py


class AuthServiceError(Exception):
	"""Base class for exceptions in this module."""

	pass


class AuthenticationError(AuthServiceError):
	"""Raised when user authentication fails (wrong email/password)."""

	pass


class TokenError(AuthServiceError):
	"""Base class for token-related errors."""

	pass


class TokenExpiredError(TokenError):
	"""Raised when a token has expired."""

	pass


class InvalidTokenError(TokenError):
	"""Raised when a token is invalid (bad signature, format, missing claims, etc.)."""

	pass


class RefreshTokenError(TokenError):
	"""Base class for refresh token specific errors."""

	pass


class RefreshTokenInvalidError(RefreshTokenError):
	"""Raised when a refresh token is not found or invalid."""

	pass


class RefreshTokenExpiredError(RefreshTokenError):
	"""Raised when a refresh token has expired."""

	pass
