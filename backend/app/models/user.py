import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.utils.datetime import datetime_utcnow


class User(SQLModel, table=True):
	id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
	name: str
	avatar: str | None = Field(default=None)
	email: str = Field(index=True, unique=True)
	password: str
	is_admin: bool = Field(default=False)
	created_at: datetime = Field(default_factory=datetime_utcnow)
	updated_at: datetime = Field(default_factory=datetime_utcnow)
