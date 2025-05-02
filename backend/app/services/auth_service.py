import uuid
from datetime import timedelta

import jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.core.config import settings
from app.models import RefreshToken, User
from app.services.exceptions import (
	InvalidTokenError,
	RefreshTokenExpiredError,
	RefreshTokenInvalidError,
	TokenExpiredError,
)
from app.utils.datetime import datetime_utcnow
from app.utils.rate_limiter import auth_rate_limiter
from app.utils.security_logger import security_logger


class AuthService:
	def __init__(self, db: Session):
		self.db = db
		self.pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

	# 1. Password Methods
	def get_password_hash(self, password: str) -> str:
		return self.pwd_context.hash(password)

	def verify_password(self, plain_password: str, hashed_password: str) -> bool:
		return self.pwd_context.verify(plain_password, hashed_password)

	# 2. Token Creation Methods
	def create_access_token(
		self, subject: str | uuid.UUID, expires_delta: timedelta | None = None
	) -> str:
		if expires_delta:
			expire = datetime_utcnow() + expires_delta
		else:
			expire = datetime_utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
		to_encode = {
			'exp': expire,
			'sub': str(subject),
			'iat': datetime_utcnow(),
			'typ': 'access',  # Token type claim
			'aud': settings.JWT_AUDIENCE,  # Audience claim
		}
		encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

		# Log access token creation
		security_logger.log_token_creation('access', str(subject))
		return encoded_jwt

	def create_refresh_token(
		self, user_id: uuid.UUID, expires_delta: timedelta | None = None
	) -> RefreshToken:
		if expires_delta:
			expire = datetime_utcnow() + expires_delta
		else:
			expire = datetime_utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)

		# Create JWT payload for refresh token
		to_encode = {
			'exp': expire,
			'sub': str(user_id),
			'iat': datetime_utcnow(),
			'typ': 'refresh',  # Token type claim
			'aud': settings.JWT_AUDIENCE,  # Audience claim
		}
		# Encode using the REFRESH secret
		encoded_refresh_jwt = jwt.encode(
			to_encode, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM
		)

		# Store the JWT in the database record
		db_refresh_token = RefreshToken(
			# Store the JWT string as the token
			token=encoded_refresh_jwt,
			user_id=user_id,
			expires_at=expire,  # Keep DB expiry for potential cleanup/secondary checks
		)
		self.db.add(db_refresh_token)
		self.db.commit()
		self.db.refresh(db_refresh_token)

		# Log refresh token creation
		security_logger.log_token_creation('refresh', str(user_id))
		return db_refresh_token

	# 3. Token Verification & User Retrieval Methods
	def verify_token_payload(self, token: str) -> dict:
		try:
			# Add audience verification and specify expected token type
			payload = jwt.decode(
				token,
				settings.JWT_SECRET,
				algorithms=[settings.JWT_ALGORITHM],
				audience=settings.JWT_AUDIENCE,
				options={'verify_signature': True, 'verify_aud': True},
			)

			# Verify token type is 'access'
			if payload.get('typ') != 'access':
				security_logger.log_token_validation(
					'access', False, details={'reason': 'invalid_token_type'}
				)
				raise InvalidTokenError('Invalid token type')

			user_id = payload.get('sub')
			security_logger.log_token_validation('access', True, user_id=user_id)
			return payload
		except jwt.ExpiredSignatureError as e:
			security_logger.log_token_validation('access', False, details={'reason': 'expired'})
			raise TokenExpiredError('Token has expired') from e
		except jwt.InvalidTokenError as e:
			security_logger.log_token_validation('access', False, details={'reason': 'invalid'})
			raise InvalidTokenError('Invalid token') from e

	def get_user_from_token_payload(self, payload: dict) -> User | None:
		user_id_str = payload.get('sub')
		if not user_id_str:
			raise InvalidTokenError('Invalid token payload: Subject missing')

		try:
			user_id = uuid.UUID(user_id_str)
		except ValueError as e:
			raise InvalidTokenError('Invalid token payload: Invalid subject UUID format') from e

		user = self.db.get(User, user_id)

		# Check if user exists and is active
		if not user:
			raise InvalidTokenError('User not found')
		if not user.is_active:
			raise InvalidTokenError('User account is inactive')

		return user

	# 4. Authentication & Refresh Methods
	def authenticate_user(self, email: str, password: str) -> User | None:
		# Check if this email is rate limited
		is_limited, attempts_remaining = auth_rate_limiter.is_rate_limited(email)
		if is_limited:
			# The rate limiter has detected too many failed attempts
			security_logger.log_rate_limit_hit(email, 'AUTH_ATTEMPT', {'attempts_remaining': 0})
			return None

		statement = select(User).where(User.email == email)
		user = self.db.exec(statement).first()

		if not user:
			# Record failed attempt for non-existent user
			auth_rate_limiter.record_attempt(email)
			security_logger.log_login_attempt(email, False, details={'reason': 'user_not_found'})
			return None

		if not self.verify_password(password, user.password):
			# Record failed attempt for incorrect password
			auth_rate_limiter.record_attempt(email)
			security_logger.log_login_attempt(
				email, False, details={'reason': 'invalid_password', 'user_id': str(user.id)}
			)
			return None

		# Successful login - reset the rate limiter for this email
		auth_rate_limiter.reset(email)
		security_logger.log_login_attempt(email, True, details={'user_id': str(user.id)})
		return user

	def refresh_access_token(self, refresh_token_str: str) -> tuple[str, RefreshToken]:
		# --- Step 1: Decode the JWT refresh token ---
		try:
			payload = jwt.decode(
				refresh_token_str,
				settings.JWT_REFRESH_SECRET,  # Use REFRESH secret
				algorithms=[settings.JWT_ALGORITHM],
				audience=settings.JWT_AUDIENCE,
				options={'verify_signature': True, 'verify_aud': True},
			)

			# Verify token type is 'refresh'
			if payload.get('typ') != 'refresh':
				security_logger.log_token_validation(
					'refresh', False, details={'reason': 'invalid_token_type'}
				)
				raise RefreshTokenInvalidError('Invalid refresh token type')

			token_user_id_str = payload.get('sub')
			if not token_user_id_str:
				security_logger.log_token_validation(
					'refresh', False, details={'reason': 'missing_subject'}
				)
				raise InvalidTokenError('Refresh token payload missing subject')
			token_user_id = uuid.UUID(token_user_id_str)

			# Log successful JWT validation
			security_logger.log_token_validation(
				'refresh', True, user_id=token_user_id_str, details={'validation': 'jwt_decode'}
			)

		except jwt.ExpiredSignatureError as e:
			# If JWT itself is expired, try to clean up DB record if it exists
			statement = select(RefreshToken).where(RefreshToken.token == refresh_token_str)
			db_token = self.db.exec(statement).first()
			if db_token:
				user_id = str(db_token.user_id)
				self.db.delete(db_token)
				self.db.commit()
				security_logger.log_token_invalidation(
					'refresh', user_id=user_id, details={'reason': 'expired'}
				)
			else:
				security_logger.log_token_validation(
					'refresh', False, details={'reason': 'expired'}
				)
			raise RefreshTokenExpiredError('Refresh token has expired') from e
		except (jwt.InvalidTokenError, ValueError) as e:  # Catch decode errors and UUID errors
			security_logger.log_token_validation(
				'refresh', False, details={'reason': 'invalid_format'}
			)
			raise RefreshTokenInvalidError('Invalid refresh token') from e

		# --- Step 2: Verify the token exists in the database (hasn't been invalidated) ---
		statement = select(RefreshToken).where(RefreshToken.token == refresh_token_str)
		db_refresh_token = self.db.exec(statement).first()

		if not db_refresh_token:
			# If JWT was valid but not in DB, it means it was invalidated (logout, rotation)
			security_logger.log_token_validation(
				'refresh',
				False,
				user_id=token_user_id_str,
				details={'reason': 'token_not_found_in_db'},
			)
			raise RefreshTokenInvalidError('Refresh token has been invalidated')

		# Optional: Double-check user ID match between decoded token and DB record
		if db_refresh_token.user_id != token_user_id:
			# This case should ideally not happen if DB is consistent
			self.db.delete(db_refresh_token)  # Clean up inconsistent state
			self.db.commit()
			security_logger.log_token_validation(
				'refresh',
				False,
				user_id=token_user_id_str,
				details={'reason': 'user_id_mismatch', 'db_user_id': str(db_refresh_token.user_id)},
			)
			raise RefreshTokenInvalidError('Refresh token user mismatch')

		# Check token expiry in database as a secondary measure
		current_time = datetime_utcnow()
		if db_refresh_token.expires_at < current_time:
			self.db.delete(db_refresh_token)  # Clean up expired token
			self.db.commit()
			security_logger.log_token_invalidation(
				'refresh', user_id=str(token_user_id), details={'reason': 'db_expiry'}
			)
			raise RefreshTokenExpiredError('Refresh token has expired according to database')

		# Log successful DB validation
		security_logger.log_token_validation(
			'refresh', True, user_id=str(token_user_id), details={'validation': 'database'}
		)

		user_id = db_refresh_token.user_id  # Use user_id confirmed from DB record

		# --- Step 3: Refresh Token Rotation ---
		# Delete the old token record from the database
		self.db.delete(db_refresh_token)
		# We must commit here to ensure the old token is invalidated
		self.db.commit()

		security_logger.log_token_invalidation(
			'refresh', user_id=str(user_id), details={'reason': 'rotation'}
		)

		# Create a new refresh token (generates new JWT, saves new DB record)
		new_refresh_token = self.create_refresh_token(user_id=user_id)
		# Note: create_refresh_token commits the session

		# Create a new access token
		new_access_token = self.create_access_token(subject=user_id)

		return new_access_token, new_refresh_token

	# 5. Token Invalidation Methods
	def invalidate_refresh_token(self, refresh_token_str: str) -> bool:
		statement = select(RefreshToken).where(RefreshToken.token == refresh_token_str)
		db_refresh_token = self.db.exec(statement).first()
		if db_refresh_token:
			self.db.delete(db_refresh_token)
			self.db.commit()
			return True
		return False

	def invalidate_all_refresh_tokens_for_user(self, user_id: uuid.UUID) -> int:
		statement = select(RefreshToken).where(RefreshToken.user_id == user_id)
		tokens_to_delete = self.db.exec(statement).all()
		count = 0
		for token in tokens_to_delete:
			self.db.delete(token)
			count += 1
		if count > 0:
			self.db.commit()
		return count
