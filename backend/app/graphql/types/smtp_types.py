from typing import Optional

import strawberry


@strawberry.type
class SMTPSettings:
	"""SMTP server configuration settings"""

	host: Optional[str] = strawberry.field(description='SMTP server hostname')
	port: Optional[int] = strawberry.field(description='SMTP server port')
	username: Optional[str] = strawberry.field(description='SMTP username')
	use_tls: Optional[bool] = strawberry.field(description='Whether to use TLS')
	use_ssl: Optional[bool] = strawberry.field(description='Whether to use SSL')
	from_email: Optional[str] = strawberry.field(description='Sender email address')
	from_name: Optional[str] = strawberry.field(description='Sender name')
	is_configured: Optional[bool] = strawberry.field(description='Whether SMTP is fully configured')


@strawberry.input
class SMTPSettingsInput:
	"""Input for updating SMTP settings"""

	host: str = strawberry.field(description='SMTP server hostname')
	port: int = strawberry.field(description='SMTP server port')
	username: str = strawberry.field(description='SMTP username')
	password: str = strawberry.field(description='SMTP password')
	use_tls: bool = strawberry.field(description='Whether to use TLS')
	use_ssl: bool = strawberry.field(description='Whether to use SSL')
	from_email: str = strawberry.field(description='Sender email address')
	from_name: Optional[str] = strawberry.field(default=None, description='Sender name')


@strawberry.input
class SendTestEmailInput:
	"""Input for sending a test email"""

	to_email: str = strawberry.field(description='Email address to send the test email to')
	subject: Optional[str] = strawberry.field(
		default='SMTP Test Email', description='Subject of the test email'
	)
