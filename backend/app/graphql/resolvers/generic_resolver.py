import strawberry
from strawberry.types import Info

from app.utils.smtp_cache import smtp_cache


@strawberry.type
class GenericQuery:
	@strawberry.field
	def hello(self) -> str:
		return 'Hello World'

	@strawberry.field
	def is_smtp_ready(self) -> bool:
		"""
		Check if the SMTP server is ready to send emails.

		Uses a cached result that refreshes periodically.
		"""
		return smtp_cache.get_status()

	@strawberry.field
	def is_first_admin_created(self, info: Info) -> bool:
		"""
		Check if the first admin user has already been created.

		This is useful for first-time setup screens or initialization flows.

		Returns:
			bool: True if any user exists in the system, False otherwise
		"""
		from app.services.user_service import UserService

		user_service = UserService(info.context['session'])
		return user_service.is_first_admin_created()
