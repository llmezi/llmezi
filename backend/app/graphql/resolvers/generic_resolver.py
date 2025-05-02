import strawberry

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
