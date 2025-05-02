import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import datetime_utcnow

# Add type checking block for RefreshToken
if TYPE_CHECKING:
	from app.models.refresh_token import RefreshToken


class User(SQLModel, table=True):
	id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
	name: str
	avatar: str | None = Field(default=None)
	email: str = Field(index=True, unique=True)
	password: str
	is_admin: bool = Field(default=False)
	is_active: bool = Field(default=True)  # Adding user account status field
	created_at: datetime = Field(default_factory=datetime_utcnow)
	updated_at: datetime = Field(default_factory=datetime_utcnow)

	# Add relationship to RefreshToken
	refresh_tokens: List['RefreshToken'] = Relationship(back_populates='user')
