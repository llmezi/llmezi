import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Optional

from sqlmodel import Session

from app.services.credential_service import CredentialService

logger = logging.getLogger(__name__)


class EmailService:
	"""
	Service for sending emails and checking SMTP connectivity.

	This service handles all email-related functionality including:
	- Checking SMTP server connectivity
	- Sending plain text and HTML emails
	- Managing email templates

	This service retrieves SMTP configuration exclusively from the database using the CredentialService.
	"""

	def __init__(self, db: Session):
		"""
		Initialize the Email Service with configuration from credentials in database.

		Args:
		    db: Database session for retrieving credentials (required).

		Raises:
		    ValueError: If database session is not provided.
		"""
		if db is None:
			raise ValueError('Database session is required for EmailService')

		self.db = db
		self.credential_service = CredentialService(db)

		# Initialize with default empty values
		self._host = None
		self._port = 587  # Default SMTP port if not specified
		self._username = None
		self._password = None
		self._use_tls = True
		self._use_ssl = False
		self._from_email = None
		self._from_name = None

		# Load credentials from database
		self._load_credentials_from_db()

	def _load_credentials_from_db(self):
		"""Load email configuration from credentials stored in the database."""
		# Get each credential with the same keys as previously used
		host = self.credential_service.get_credential_value('SMTP_HOST')
		if host:
			self._host = host

		port_str = self.credential_service.get_credential_value('SMTP_PORT')
		if port_str and port_str.isdigit():
			self._port = int(port_str)

		username = self.credential_service.get_credential_value('SMTP_USER')
		if username:
			self._username = username

		password = self.credential_service.get_credential_value('SMTP_PASSWORD')
		if password:
			self._password = password

		tls_str = self.credential_service.get_credential_value('SMTP_TLS')
		if tls_str:
			self._use_tls = tls_str.lower() in ('true', '1', 'yes')

		ssl_str = self.credential_service.get_credential_value('SMTP_SSL')
		if ssl_str:
			self._use_ssl = ssl_str.lower() in ('true', '1', 'yes')

		from_email = self.credential_service.get_credential_value('EMAILS_FROM_EMAIL')
		if from_email:
			self._from_email = from_email

		from_name = self.credential_service.get_credential_value('EMAILS_FROM_NAME')
		if from_name:
			self._from_name = from_name

	@property
	def host(self) -> Optional[str]:
		return self._host

	@property
	def port(self) -> int:
		return self._port

	@property
	def username(self) -> Optional[str]:
		return self._username

	@property
	def password(self) -> Optional[str]:
		return self._password

	@property
	def use_tls(self) -> bool:
		return self._use_tls

	@property
	def use_ssl(self) -> bool:
		return self._use_ssl

	@property
	def from_email(self) -> Optional[str]:
		return self._from_email

	@property
	def from_name(self) -> Optional[str]:
		return self._from_name

	def refresh_credentials(self):
		"""Reload credentials from the database."""
		self._load_credentials_from_db()

	def is_configured(self) -> bool:
		"""
		Check if the email service has the required configuration.

		Returns:
		    bool: True if all required SMTP settings are configured, False otherwise.
		"""
		return bool(self.host and self.port and self.username and self.password and self.from_email)

	def check_smtp_connection(self) -> bool:
		"""
		Test the SMTP connection by attempting to connect to the server.

		This method actually attempts to establish a connection to the
		configured SMTP server to verify if it's ready to send emails.

		Returns:
		    bool: True if connection is successful, False otherwise.
		"""
		if not self.is_configured():
			logger.warning('SMTP is not fully configured - cannot check connection')
			return False

		try:
			if self.use_ssl:
				# For SSL connections (usually port 465)
				context = ssl.create_default_context()
				with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=10) as server:
					server.login(self.username, self.password)
					logger.info(
						f'Successfully connected to SMTP server {self.host}:{self.port} via SSL'
					)
					return True
			else:
				# For non-SSL connections with optional STARTTLS (usually port 587)
				with smtplib.SMTP(self.host, self.port, timeout=10) as server:
					# Optional debugging
					# server.set_debuglevel(1)

					# Say hello to the server
					server.ehlo()

					# Start TLS encryption if configured
					if self.use_tls:
						context = ssl.create_default_context()
						server.starttls(context=context)
						server.ehlo()

					# Login to the server
					server.login(self.username, self.password)
					logger.info(f'Successfully connected to SMTP server {self.host}:{self.port}')
					return True

		except (smtplib.SMTPException, ConnectionRefusedError, TimeoutError) as e:
			logger.error(f'Failed to connect to SMTP server: {str(e)}')
			return False
		except Exception as e:
			logger.error(f'Unexpected error checking SMTP connection: {str(e)}')
			return False

	def send_email(
		self,
		to_email: str,
		subject: str,
		html_content: str,
		text_content: Optional[str] = None,
		cc: Optional[List[str]] = None,
		bcc: Optional[List[str]] = None,
		reply_to: Optional[str] = None,
		attachments: Optional[Dict] = None,
	) -> bool:
		"""
		Send an email through the configured SMTP server.

		Args:
		    to_email: Email address of the recipient
		    subject: Subject of the email
		    html_content: HTML body of the email
		    text_content: Plain text body of the email (auto-generated from HTML if None)
		    cc: List of CC email addresses
		    bcc: List of BCC email addresses
		    reply_to: Reply-to email address
		    attachments: Dictionary of attachments {filename: content}

		Returns:
		    bool: True if email was sent successfully, False otherwise
		"""
		if not self.is_configured():
			logger.warning('SMTP is not fully configured - cannot send email')
			return False

		# Validate the email service is ready
		if not self.check_smtp_connection():
			logger.error('Cannot send email - SMTP connection failed')
			return False

		try:
			# Create message
			message = MIMEMultipart('alternative')
			message['Subject'] = subject
			message['From'] = (
				f'{self.from_name} <{self.from_email}>' if self.from_name else self.from_email
			)
			message['To'] = to_email

			# Add CC and BCC if provided
			if cc:
				message['Cc'] = ', '.join(cc)
			if bcc:
				message['Bcc'] = ', '.join(bcc)

			# Add Reply-To if provided
			if reply_to:
				message['Reply-To'] = reply_to

			# Add plain text and HTML parts
			if text_content:
				message.attach(MIMEText(text_content, 'plain'))
			message.attach(MIMEText(html_content, 'html'))

			# Add attachments if any (simplified implementation)
			# A complete implementation would handle more attachment types
			if attachments:
				for filename, content in attachments.items():
					# This is simplified - would need expansion for different attachment types
					part = MIMEText(content)
					part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
					message.attach(part)

			# Determine all recipients
			recipients = [to_email]
			if cc:
				recipients.extend(cc)
			if bcc:
				recipients.extend(bcc)

			# Connect to SMTP server and send email
			if self.use_ssl:
				context = ssl.create_default_context()
				with smtplib.SMTP_SSL(self.host, self.port, context=context) as server:
					server.login(self.username, self.password)
					server.sendmail(self.from_email, recipients, message.as_string())
			else:
				with smtplib.SMTP(self.host, self.port) as server:
					if self.use_tls:
						context = ssl.create_default_context()
						server.starttls(context=context)
					server.login(self.username, self.password)
					server.sendmail(self.from_email, recipients, message.as_string())

			logger.info(f'Email sent successfully to {to_email}')
			return True

		except (smtplib.SMTPException, ConnectionRefusedError, TimeoutError) as e:
			logger.error(f'Failed to send email: {str(e)}')
			return False
		except Exception as e:
			logger.error(f'Unexpected error sending email: {str(e)}')
			return False
