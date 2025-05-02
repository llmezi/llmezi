from enum import Enum

import strawberry

from app.graphql.types.user_type import User


@strawberry.enum
class AuthCodePurpose(Enum):
	LOGIN = 'login'
	PASSWORD_RESET = 'password_reset'


@strawberry.type
class AuthResponse:
	"""Response type for authentication operations."""

	access_token: str
	refresh_token: str
	user: User


@strawberry.input
class LoginInput:
	"""Input type for email/password login."""

	email: str
	password: str


@strawberry.input
class AuthCodeRequestInput:
	"""Input type for requesting an authentication code."""

	email: str
	purpose: AuthCodePurpose


@strawberry.input
class AuthCodeLoginInput:
	"""Input type for login with authentication code."""

	email: str
	code: str


@strawberry.input
class RefreshTokenInput:
	"""Input type for refreshing an access token."""

	refresh_token: str


@strawberry.input
class ResetPasswordInput:
	"""Input type for resetting a password."""

	email: str
	code: str
	new_password: str
