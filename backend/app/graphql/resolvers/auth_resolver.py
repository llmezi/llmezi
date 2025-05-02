import strawberry
from strawberry.types import Info

from app.graphql.types.auth_type import (
	AuthCodeLoginInput,
	AuthCodePurpose,
	AuthCodeRequestInput,
	AuthResponse,
	LoginInput,
	RefreshTokenInput,
	ResetPasswordInput,
)
from app.graphql.types.user_type import db_user_to_graphql_user
from app.models.auth_code import AuthCodePurpose as DBAuthCodePurpose
from app.services.auth_service import AuthService
from app.services.exceptions import (
	AuthCodeExpiredError,
	AuthCodeInvalidError,
	BadRequestError,
	EmailNotRegisteredError,
	InvalidPasswordError,
	InvalidTokenError,
	RefreshTokenExpiredError,
	RefreshTokenInvalidError,
	TooManyRequestsError,
)
from app.utils.password_validator import validate_password


@strawberry.type
class AuthMutation:
	@strawberry.mutation
	def login(self, input: LoginInput, info: Info) -> AuthResponse:
		"""Login with email and password."""
		session = info.context['session']
		auth_service = AuthService(session)

		# Authenticate the user with the new method that returns AuthenticationResult
		auth_result = auth_service.authenticate_user(input.email, input.password)
		if not auth_result:
			raise BadRequestError('Invalid email or password')

		# Convert DB user to GraphQL user using helper function
		graphql_user = db_user_to_graphql_user(auth_result.user)

		return AuthResponse(
			access_token=auth_result.access_token,
			refresh_token=auth_result.refresh_token,  # Now directly using the string
			user=graphql_user,
		)

	@strawberry.mutation
	def refresh_token(self, input: RefreshTokenInput, info: Info) -> AuthResponse:
		"""Refresh access token using refresh token."""
		session = info.context['session']
		auth_service = AuthService(session)

		try:
			# Refresh the token - now returns AuthenticationResult with user included
			auth_result = auth_service.refresh_access_token(input.refresh_token)

			# Convert DB user to GraphQL user using helper function
			graphql_user = db_user_to_graphql_user(auth_result.user)

			return AuthResponse(
				access_token=auth_result.access_token,
				refresh_token=auth_result.refresh_token,  # Now directly using the string
				user=graphql_user,
			)

		except (RefreshTokenExpiredError, RefreshTokenInvalidError, InvalidTokenError) as e:
			raise InvalidTokenError(str(e))

	@strawberry.mutation
	def logout(self, refresh_token: str, info: Info) -> bool:
		"""Invalidate a refresh token (logout)."""
		session = info.context['session']
		auth_service = AuthService(session)

		success = auth_service.invalidate_refresh_token(refresh_token)
		return success

	@strawberry.mutation
	def request_auth_code(self, input: AuthCodeRequestInput, info: Info) -> bool:
		"""Request an authentication code for login or password reset."""
		session = info.context['session']
		auth_service = AuthService(session)

		# Convert GraphQL enum to DB enum
		db_purpose = DBAuthCodePurpose.LOGIN
		if input.purpose == AuthCodePurpose.PASSWORD_RESET:
			db_purpose = DBAuthCodePurpose.PASSWORD_RESET

		try:
			success = auth_service.send_auth_code_email(input.email, purpose=db_purpose)
			return success
		except (EmailNotRegisteredError, TooManyRequestsError):
			# For security reasons, always return True even if there was an error
			# This prevents email enumeration attacks
			return True

	@strawberry.mutation
	def login_with_auth_code(self, input: AuthCodeLoginInput, info: Info) -> AuthResponse:
		"""Login with email and authentication code."""
		session = info.context['session']
		auth_service = AuthService(session)

		try:
			# Authenticate with auth code using the improved method that returns AuthenticationResult
			auth_result = auth_service.authenticate_with_auth_code(input.email, input.code)

			# Convert DB user to GraphQL user using helper function
			graphql_user = db_user_to_graphql_user(auth_result.user)

			return AuthResponse(
				access_token=auth_result.access_token,
				refresh_token=auth_result.refresh_token,  # Now directly using the string
				user=graphql_user,
			)

		except (AuthCodeInvalidError, AuthCodeExpiredError) as e:
			raise InvalidTokenError(str(e))

	@strawberry.mutation
	def reset_password(self, input: ResetPasswordInput, info: Info) -> bool:
		"""Reset password using authentication code."""
		session = info.context['session']
		auth_service = AuthService(session)

		try:
			# Validate password meets security requirements
			is_valid, error_messages = validate_password(input.new_password)
			if not is_valid:
				raise InvalidPasswordError(
					f'Password validation failed: {", ".join(error_messages)}'
				)

			# Verify the auth code
			user = auth_service.verify_auth_code(
				input.email, input.code, purpose=DBAuthCodePurpose.PASSWORD_RESET
			)

			# Update the password
			user.password = auth_service.get_password_hash(input.new_password)
			session.add(user)
			session.commit()

			# Invalidate all refresh tokens for this user
			auth_service.invalidate_all_refresh_tokens_for_user(user.id)

			return True

		except (AuthCodeInvalidError, AuthCodeExpiredError, InvalidPasswordError) as e:
			raise InvalidTokenError(str(e))
