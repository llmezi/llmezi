from typing import Any, Dict


async def get_context() -> Dict[str, Any]:
	"""
	Create and return the GraphQL context.

	This function is called for each request to create a fresh context.
	"""
	return {'context': ''}
