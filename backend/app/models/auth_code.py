import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.core.config import settings
from app.utils.datetime import datetime_utcnow

if TYPE_CHECKING:
	from app.models.user import User


class AuthCodePurpose(str, Enum):
	"""Enum defining the different purposes for authentication codes"""

	LOGIN = 'login'
	PASSWORD_RESET = 'password_reset'


class AuthCode(SQLModel, table=True):
	"""
	Model for one-time authentication codes sent to users.
	Typically delivered via email for authentication purposes.
	"""

	id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
	code: str = Field(index=True)  # The actual OTP code
	purpose: AuthCodePurpose = Field(default=AuthCodePurpose.LOGIN)
	expires_at: datetime = Field(
		default_factory=lambda: datetime_utcnow()
		+ timedelta(minutes=settings.AUTH_CODE_EXPIRE_MINUTES)
	)
	is_used: bool = Field(default=False)  # Track if the code has been used
	created_at: datetime = Field(default_factory=datetime_utcnow)
	updated_at: datetime = Field(default_factory=datetime_utcnow)

	# Relationship to User
	user_id: uuid.UUID = Field(foreign_key='user.id')
	user: 'User' = Relationship(back_populates='auth_codes')
