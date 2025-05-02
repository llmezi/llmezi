import uuid
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.core.config import settings
from app.utils.datetime import datetime_utcnow

if TYPE_CHECKING:
	from app.models.user import User


class RefreshToken(SQLModel, table=True):
	id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
	token: str = Field(index=True, unique=True)
	expires_at: datetime = Field(
		default_factory=lambda: datetime_utcnow()
		+ timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
	)
	created_at: datetime = Field(default_factory=datetime_utcnow)
	updated_at: datetime = Field(default_factory=datetime_utcnow)

	user_id: uuid.UUID = Field(foreign_key='user.id')
	user: 'User' = Relationship(back_populates='refresh_tokens')
