from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Session

from app.services.email_service import EmailService


class SMTPStatusCache:
	"""Cache for SMTP status to avoid frequent connection checks"""

	def __init__(
		self, db: Optional[Session] = None, cache_ttl_seconds: int = 300
	):  # 5 minutes cache by default
		self.status: Optional[bool] = None
		self.last_check: Optional[datetime] = None
		self.cache_ttl = timedelta(seconds=cache_ttl_seconds)
		self.db = db
		self._email_service = EmailService(db)

	def get_status(self) -> bool:
		"""Get cached status or check SMTP connection if cache expired"""
		current_time = datetime.now()

		# If we've never checked or the cache has expired
		if self.last_check is None or (current_time - self.last_check) > self.cache_ttl:
			self.status = self._email_service.check_smtp_connection()
			self.last_check = current_time

		return self.status
