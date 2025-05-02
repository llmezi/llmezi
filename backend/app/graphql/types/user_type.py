import uuid
from datetime import datetime
from typing import Optional

import strawberry

from app.models.user import User as DBUser


@strawberry.type
class User:
	"""GraphQL User type that maps to the database User model."""

	id: uuid.UUID
	name: str
	email: str
	avatar: Optional[str] = None
	is_admin: bool
	is_active: bool
	created_at: datetime
	updated_at: datetime


@strawberry.input
class AdminRegistrationInput:
	"""Input type for first admin registration."""

	name: str
	email: str
	password: str


def db_user_to_graphql_user(db_user: DBUser) -> User:
	"""
	Convert a database User model to a GraphQL User type.

	Args:
	    db_user: The database User model

	Returns:
	    A GraphQL User type
	"""
	return User(
		id=db_user.id,
		name=db_user.name,
		email=db_user.email,
		avatar=db_user.avatar,
		is_admin=db_user.is_admin,
		is_active=db_user.is_active,
		created_at=db_user.created_at,
		updated_at=db_user.updated_at,
	)
