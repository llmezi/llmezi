import json
import logging
import uuid
from typing import Any, Dict, Optional

# Create a custom logger for security events
logger = logging.getLogger('security')
logger.setLevel(logging.INFO)

# Create console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create a custom formatter that includes more details
formatter = logging.Formatter(
	'{"timestamp": "%(asctime)s", "level": "%(levelname)s", "event_type": "%(event_type)s", "message": "%(message)s", "details": %(details)s}',
	datefmt='%Y-%m-%d %H:%M:%S',
)
console_handler.setFormatter(formatter)

# Add the handlers to the logger
logger.addHandler(console_handler)


class SecurityLogger:
	"""
	A logger specifically for security-related events.
	Logs in a structured format to make it easier to analyze security events.
	"""

	@staticmethod
	def _format_log(
		event_type: str, message: str, details: Optional[Dict[str, Any]] = None
	) -> Dict[str, Any]:
		"""Format the log with extra fields for the custom formatter"""
		if details is None:
			details = {}

		# Add a unique ID for each security event for traceability
		details['event_id'] = str(uuid.uuid4())

		return {'event_type': event_type, 'message': message, 'details': json.dumps(details)}

	@staticmethod
	def log_login_attempt(
		email: str,
		success: bool,
		ip_address: Optional[str] = None,
		details: Optional[Dict[str, Any]] = None,
	) -> None:
		"""Log a login attempt"""
		log_details = details or {}
		log_details.update({'email': email, 'success': success, 'ip_address': ip_address})

		event_type = 'LOGIN_SUCCESS' if success else 'LOGIN_FAILURE'
		message = f'Login {"successful" if success else "failed"} for user {email}'

		logger.info(message, extra=SecurityLogger._format_log(event_type, message, log_details))

	@staticmethod
	def log_token_validation(
		token_type: str,
		success: bool,
		user_id: Optional[str] = None,
		details: Optional[Dict[str, Any]] = None,
	) -> None:
		"""Log a token validation"""
		log_details = details or {}
		if user_id:
			log_details['user_id'] = user_id

		event_type = f'TOKEN_VALIDATION_{token_type.upper()}'
		message = (
			f'{token_type.capitalize()} token validation {"successful" if success else "failed"}'
		)
		if user_id:
			message += f' for user {user_id}'

		logger.info(message, extra=SecurityLogger._format_log(event_type, message, log_details))

	@staticmethod
	def log_token_creation(
		token_type: str, user_id: str, details: Optional[Dict[str, Any]] = None
	) -> None:
		"""Log token creation"""
		log_details = details or {}
		log_details['user_id'] = user_id

		event_type = f'TOKEN_CREATION_{token_type.upper()}'
		message = f'Created {token_type} token for user {user_id}'

		logger.info(message, extra=SecurityLogger._format_log(event_type, message, log_details))

	@staticmethod
	def log_token_invalidation(
		token_type: str, user_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None
	) -> None:
		"""Log token invalidation"""
		log_details = details or {}
		if user_id:
			log_details['user_id'] = user_id

		event_type = f'TOKEN_INVALIDATION_{token_type.upper()}'
		message = f'Invalidated {token_type} token'
		if user_id:
			message += f' for user {user_id}'

		logger.info(message, extra=SecurityLogger._format_log(event_type, message, log_details))

	@staticmethod
	def log_rate_limit_hit(
		identifier: str, event_type: str, details: Optional[Dict[str, Any]] = None
	) -> None:
		"""Log when a rate limit is hit"""
		log_details = details or {}
		log_details['identifier'] = identifier

		event_type = f'RATE_LIMIT_{event_type.upper()}'
		message = f'Rate limit hit for {event_type.lower()} by {identifier}'

		logger.warning(message, extra=SecurityLogger._format_log(event_type, message, log_details))

	@staticmethod
	def log_security_event(
		event_type: str, message: str, details: Optional[Dict[str, Any]] = None
	) -> None:
		"""Generic method to log any security event"""
		logger.info(message, extra=SecurityLogger._format_log(event_type, message, details))


# Export a singleton instance
security_logger = SecurityLogger()
