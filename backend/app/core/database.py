from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, create_engine

from app.core.config import settings

engine = create_engine(
	str(settings.SQLALCHEMY_DATABASE_URI),
	pool_size=settings.DATABASE_POOL_SIZE,
	max_overflow=settings.DATABASE_MAX_OVERFLOW,
	pool_timeout=settings.DATABASE_POOL_TIMEOUT,
	echo=settings.ENVIRONMENT == 'local',  # Enable SQL echo in local/dev
)


def get_session():
	try:
		with Session(engine) as session:
			yield session
	except Exception as e:
		# Optionally, add logging here
		raise RuntimeError(f'Database session error: {e}')


SessionDep = Annotated[Session, Depends(get_session)]
