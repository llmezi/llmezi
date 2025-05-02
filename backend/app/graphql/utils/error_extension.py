from enum import Enum

from strawberry.extensions import SchemaExtension

from app.services.exceptions import (
	AuthCodeError,
	AuthCodeExpiredError,
	AuthCodeInvalidError,
	AuthCodeUsedError,
	AuthenticationError,
	BadRequestError,
	EmailNotRegisteredError,
	InvalidTokenError,
	RefreshTokenError,
	RefreshTokenExpiredError,
	RefreshTokenInvalidError,
	TokenError,
	TokenExpiredError,
	TooManyRequestsError,
)


class ErrorCode(str, Enum):
	"""GraphQL error codes for client error handling"""

	# Authentication errors
	UNAUTHENTICATED = 'UNAUTHENTICATED'
	UNAUTHORIZED = 'UNAUTHORIZED'

	# Token errors
	TOKEN_EXPIRED = 'TOKEN_EXPIRED'
	INVALID_TOKEN = 'INVALID_TOKEN'
	REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED'
	REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID'

	# Auth code errors
	AUTH_CODE_EXPIRED = 'AUTH_CODE_EXPIRED'
	AUTH_CODE_INVALID = 'AUTH_CODE_INVALID'
	AUTH_CODE_USED = 'AUTH_CODE_USED'

	# Other errors
	BAD_REQUEST = 'BAD_REQUEST'
	NOT_FOUND = 'NOT_FOUND'
	CONFLICT = 'CONFLICT'
	TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS'
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'


# Map exception types to error codes
ERROR_CODE_MAPPING = {
	# Auth errors
	AuthenticationError: ErrorCode.UNAUTHENTICATED,
	# Token errors
	TokenError: ErrorCode.INVALID_TOKEN,
	TokenExpiredError: ErrorCode.TOKEN_EXPIRED,
	InvalidTokenError: ErrorCode.UNAUTHENTICATED,
	RefreshTokenError: ErrorCode.INVALID_TOKEN,
	RefreshTokenExpiredError: ErrorCode.REFRESH_TOKEN_EXPIRED,
	RefreshTokenInvalidError: ErrorCode.REFRESH_TOKEN_INVALID,
	# Auth code errors
	AuthCodeError: ErrorCode.BAD_REQUEST,
	AuthCodeExpiredError: ErrorCode.AUTH_CODE_EXPIRED,
	AuthCodeInvalidError: ErrorCode.AUTH_CODE_INVALID,
	AuthCodeUsedError: ErrorCode.AUTH_CODE_USED,
	# Other errors
	EmailNotRegisteredError: ErrorCode.NOT_FOUND,
	TooManyRequestsError: ErrorCode.TOO_MANY_REQUESTS,
	BadRequestError: ErrorCode.BAD_REQUEST,
}


def get_error_code(exception: Exception) -> str:
	"""Get the appropriate error code for an exception type"""
	# First check for exact type match
	if type(exception) in ERROR_CODE_MAPPING:
		return ERROR_CODE_MAPPING[type(exception)].value

	# Then check for inherited types
	for exception_type, error_code in ERROR_CODE_MAPPING.items():
		if isinstance(exception, exception_type):
			return error_code.value

	# Default error code
	return ErrorCode.INTERNAL_SERVER_ERROR.value


class ErrorExtension(SchemaExtension):
	"""
	Strawberry extension that adds error codes to GraphQL errors
	based on the original exception type.
	"""

	def on_operation(self):
		# This is called for each GraphQL operation
		yield

		# After operation execution, process any errors
		result = self.execution_context.result
		if not result or not result.errors:
			return

		# Add error codes to the extensions
		for error in result.errors:
			exception = error.original_error
			if not exception:
				continue

			# Get error code for this exception
			error_code = get_error_code(exception)

			# Initialize extensions dict if needed
			if not hasattr(error, 'extensions') or not error.extensions:
				error.extensions = {}

			# Add the error code to extensions
			error.extensions['code'] = error_code
