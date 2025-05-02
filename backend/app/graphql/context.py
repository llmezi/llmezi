from typing import Any, Dict, Optional

from sqlmodel import Session

from app.core.database import get_session
from app.services.auth_service import AuthService
from app.services.exceptions import InvalidTokenError, TokenExpiredError


async def get_context(request=None, session: Optional[Session] = None) -> Dict[str, Any]:
	"""
	Create and return the GraphQL context.

	This function is called for each request to create a fresh context.
	It extracts the JWT token from the Authorization header if present,
	validates it, and adds the authenticated user to the context.

	Args:
	    request: The incoming HTTP request
	    session: Database session (injected by FastAPI if available)

	Returns:
	    A dictionary containing the context information
	"""
	context = {}

	# Use the provided session or create a new one
	if session is None:
		# For non-FastAPI contexts or when session isn't provided
		session = next(get_session())

	context['session'] = session

	# If there's no request (e.g., during testing), return early
	if not request:
		return context

	# Extract the Authorization header
	auth_header = request.headers.get('Authorization')
	if not auth_header or not auth_header.startswith('Bearer '):
		# No valid auth header, return context without user
		return context

	# Extract the token
	token = auth_header.replace('Bearer ', '')

	# Validate the token and get the user
	try:
		auth_service = AuthService(session)
		payload = auth_service.verify_token_payload(token)
		user = auth_service.get_user_from_token_payload(payload)
		context['user'] = user
	except (InvalidTokenError, TokenExpiredError):
		# Token is invalid or expired, continue without user in context
		pass

	return context
