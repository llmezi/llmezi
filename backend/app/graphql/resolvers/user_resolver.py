import strawberry
from strawberry.types import Info

from app.graphql.types.auth_type import AuthResponse
from app.graphql.types.user_type import AdminRegistrationInput, User, db_user_to_graphql_user
from app.graphql.utils.auth_utils import ensure_authenticated
from app.services.exceptions import InvalidPasswordError, UserAlreadyExistsError
from app.services.user_service import UserService


@strawberry.type
class UserQuery:
	@strawberry.field
	def me(self, info: Info) -> User:
		"""Get the current authenticated user."""
		# Use the utility function to check authentication
		ensure_authenticated(info)

		db_user = info.context.get('user')
		# Convert DB user to GraphQL user using helper function
		return db_user_to_graphql_user(db_user)


@strawberry.type
class UserMutation:
	@strawberry.mutation
	def register_first_admin(self, input: AdminRegistrationInput, info: Info) -> AuthResponse:
		"""
		Register the first admin user if no users exist in the system.
		This can only be performed once when the database is empty.
		"""
		session = info.context['session']
		user_service = UserService(session)

		try:
			# Create the first admin and generate tokens
			user, access_token, refresh_token = user_service.create_first_admin(
				name=input.name, email=input.email, password=input.password
			)

			# Convert DB user to GraphQL user
			graphql_user = db_user_to_graphql_user(user)

			# Return auth response with tokens and user
			return AuthResponse(
				access_token=access_token, refresh_token=refresh_token, user=graphql_user
			)

		except (UserAlreadyExistsError, InvalidPasswordError) as e:
			# Re-raise as GraphQL error
			raise Exception(str(e))
