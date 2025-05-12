import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.utils.datetime import datetime_utcnow


class Credential(SQLModel, table=True):
	"""
	Model for storing credentials with optional encryption.
	Used to store key-value pairs where values might need to be encrypted.
	"""

	id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
	key: str = Field(index=True)  # The credential key/name
	value: str = Field()  # The credential value
	is_value_encrypted: bool = Field(default=False)  # Whether the value is encrypted
	created_at: datetime = Field(default_factory=datetime_utcnow)
	updated_at: datetime = Field(default_factory=datetime_utcnow)

	# Optional description for the credential
	description: Optional[str] = Field(default=None)
