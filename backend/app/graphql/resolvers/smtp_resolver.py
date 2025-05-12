import strawberry
from strawberry.types import Info

from app.graphql.types.smtp_types import SendTestEmailInput, SMTPSettings, SMTPSettingsInput
from app.graphql.utils.auth_utils import ensure_admin
from app.services.credential_service import CredentialService
from app.services.email_service import EmailService
from app.utils.email_templates import get_test_email
from app.utils.smtp_cache import SMTPStatusCache


@strawberry.type
class SMTPMutation:
	@strawberry.mutation
	def update_smtp_settings(self, info: Info, settings: SMTPSettingsInput) -> bool:
		"""
		Update SMTP server settings

		Args:
		    settings: New SMTP configuration settings

		Returns:
		    True if settings were updated successfully

		Raises:
		    InvalidTokenError: If the user is not authenticated or not an admin
		"""
		# Ensure the user is an admin before allowing SMTP settings changes
		ensure_admin(info)

		session = info.context['session']
		credential_service = CredentialService(session)

		# Store each setting as a separate credential
		credential_service.set_credential(
			'SMTP_HOST', settings.host, should_encrypt=False, description='SMTP server hostname'
		)
		credential_service.set_credential(
			'SMTP_PORT', str(settings.port), should_encrypt=False, description='SMTP server port'
		)
		credential_service.set_credential(
			'SMTP_USER', settings.username, should_encrypt=False, description='SMTP username'
		)
		credential_service.set_credential(
			'SMTP_PASSWORD', settings.password, should_encrypt=True, description='SMTP password'
		)
		credential_service.set_credential(
			'SMTP_TLS',
			str(settings.use_tls).lower(),
			should_encrypt=False,
			description='Whether to use TLS',
		)
		credential_service.set_credential(
			'SMTP_SSL',
			str(settings.use_ssl).lower(),
			should_encrypt=False,
			description='Whether to use SSL',
		)
		credential_service.set_credential(
			'EMAILS_FROM_EMAIL',
			settings.from_email,
			should_encrypt=False,
			description='Sender email address',
		)

		if settings.from_name:
			credential_service.set_credential(
				'EMAILS_FROM_NAME',
				settings.from_name,
				should_encrypt=False,
				description='Sender name',
			)

		# Clear the SMTP cache so the next status check will test the new settings
		smtp_cache = SMTPStatusCache(session)
		smtp_cache.last_check = None

		return True

	@strawberry.mutation
	def test_smtp_connection(self, info: Info) -> bool:
		"""
		Test the SMTP connection with current settings

		Returns:
		    True if connection is successful

		Raises:
		    InvalidTokenError: If the user is not authenticated or not an admin
		"""
		# Ensure the user is an admin before allowing SMTP testing
		ensure_admin(info)

		session = info.context['session']
		email_service = EmailService(session)

		# Force a fresh connection check
		return email_service.check_smtp_connection()

	@strawberry.mutation
	def send_test_email(self, info: Info, input: SendTestEmailInput) -> bool:
		"""
		Send a test email to verify SMTP settings

		Args:
		    input: Input containing the recipient email address and optional subject

		Returns:
		    True if email was sent successfully, False otherwise

		Raises:
		    InvalidTokenError: If the user is not authenticated or not an admin
		"""
		# Ensure the user is an admin before allowing to send test emails
		ensure_admin(info)

		session = info.context['session']
		email_service = EmailService(session)

		# Check if SMTP is configured
		if not email_service.is_configured():
			return False

		# Generate test email content using the template
		html_content, text_content = get_test_email()

		# Send the test email
		result = email_service.send_email(
			to_email=input.to_email,
			subject=input.subject,
			html_content=html_content,
			text_content=text_content,
		)

		return result


@strawberry.type
class SMTPQuery:
	@strawberry.field
	def get_smtp_settings(self, info: Info) -> SMTPSettings:
		"""
		Get current SMTP server settings

		Returns:
		    Current SMTP configuration

		Raises:
		    InvalidTokenError: If the user is not authenticated or not an admin
		"""
		# Ensure the user is an admin before revealing SMTP settings
		ensure_admin(info)

		session = info.context['session']
		email_service = EmailService(session)

		# Refresh credentials from DB to ensure we have latest values
		email_service.refresh_credentials()

		return SMTPSettings(
			host=email_service.host,
			port=email_service.port,
			username=email_service.username,
			use_tls=email_service.use_tls,
			use_ssl=email_service.use_ssl,
			from_email=email_service.from_email,
			from_name=email_service.from_name,
			is_configured=email_service.is_configured(),
		)
