from strawberry.types import Info

from app.services.exceptions import InvalidTokenError


def ensure_authenticated(info: Info) -> None:
	"""
	Check if the user is authenticated.

	Args:
	    info: The GraphQL request info containing context

	Raises:
	    InvalidTokenError: If the user is not authenticated
	"""
	if not info.context.get('user'):
		raise InvalidTokenError('Authentication required')


def ensure_admin(info: Info) -> None:
	"""
	Check if the user is an admin.

	Args:
	    info: The GraphQL request info containing context

	Raises:
	    InvalidTokenError: If the user is not authenticated or not an admin
	"""
	user = info.context.get('user')
	if not user:
		raise InvalidTokenError('Authentication required')
	if not user.is_admin:
		raise InvalidTokenError('Admin privileges required')
