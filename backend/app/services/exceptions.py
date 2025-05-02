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


class AuthCodeError(AuthServiceError):
	"""Base class for authentication code related errors."""

	pass


class AuthCodeExpiredError(AuthCodeError):
	"""Raised when an authentication code has expired."""

	pass


class AuthCodeInvalidError(AuthCodeError):
	"""Raised when an authentication code is invalid or not found."""

	pass


class AuthCodeUsedError(AuthCodeError):
	"""Raised when an authentication code has already been used."""

	pass


class EmailNotRegisteredError(AuthServiceError):
	"""Raised when trying to generate an auth code for an unregistered email."""

	pass


class TooManyRequestsError(AuthServiceError):
	"""Raised when rate limits are exceeded."""

	pass


class UserAlreadyExistsError(Exception):
	"""Raised when trying to create a user that already exists."""

	pass


class InvalidPasswordError(Exception):
	"""Raised when a password does not meet the security requirements."""

	pass


class BadRequestError(Exception):
	"""Raised when a bad request is made by the user."""

	pass
