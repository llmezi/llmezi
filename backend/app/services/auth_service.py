import random
import string
import uuid
from dataclasses import dataclass
from datetime import timedelta

import jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.core.config import settings
from app.models import AuthCode, RefreshToken, User
from app.models.auth_code import AuthCodePurpose
from app.services.email_service import EmailService
from app.services.exceptions import (
	AuthCodeExpiredError,
	AuthCodeInvalidError,
	EmailNotRegisteredError,
	InvalidTokenError,
	RefreshTokenExpiredError,
	RefreshTokenInvalidError,
	TokenExpiredError,
	TooManyRequestsError,
)
from app.utils.datetime import datetime_utcnow
from app.utils.email_templates import (
	get_auth_code_email,
	get_password_reset_email,
)
from app.utils.rate_limiter import auth_rate_limiter
from app.utils.security_logger import security_logger


@dataclass
class AuthenticationResult:
	"""Standardized result for authentication methods."""

	access_token: str
	refresh_token: str  # Changed from RefreshToken to str
	user: User


class AuthService:
	def __init__(self, db: Session):
		"""
		Initialize the authentication service.

		Args:
			db: The database session to use for database operations
		"""
		self.db = db
		# Using bcrypt directly with rounds parameter to avoid passlib bcrypt version issues
		self.pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto', bcrypt__rounds=12)
		self.email_service = EmailService()

	# 1. Password Methods
	def get_password_hash(self, password: str) -> str:
		"""
		Generate a password hash using bcrypt.

		Args:
			password: The plain text password to hash

		Returns:
			The hashed password string
		"""
		return self.pwd_context.hash(password)

	def verify_password(self, plain_password: str, hashed_password: str) -> bool:
		"""
		Verify a plain text password against a hashed password.

		Args:
			plain_password: The plain text password to verify
			hashed_password: The hashed password to check against

		Returns:
			True if the password matches, False otherwise
		"""
		return self.pwd_context.verify(plain_password, hashed_password)

	def hash_token(self, token: str) -> str:
		"""
		Generate a hash of a token using the same hashing mechanism as passwords.

		Args:
			token: The token string to hash

		Returns:
			The hashed token string
		"""
		return self.pwd_context.hash(token)

	def verify_token_hash(self, plain_token: str, hashed_token: str) -> bool:
		"""
		Verify a plain token against a hashed token.

		Args:
			plain_token: The plain token to verify
			hashed_token: The hashed token to check against

		Returns:
			True if the token matches, False otherwise
		"""
		return self.pwd_context.verify(plain_token, hashed_token)

	# 2. Token Creation Methods
	def create_access_token(
		self, subject: str | uuid.UUID, expires_delta: timedelta | None = None
	) -> str:
		"""
		Create a JWT access token for a user.

		Args:
			subject: The user ID or subject identifier for the token
			expires_delta: Optional custom expiration time delta, defaults to settings.ACCESS_TOKEN_EXPIRE_MINUTES

		Returns:
			The encoded JWT access token string
		"""
		if expires_delta:
			expire = datetime_utcnow() + expires_delta
		else:
			expire = datetime_utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

		# Get current time for both iat (Issued At) and nbf (Not Before) claims
		current_time = datetime_utcnow()

		to_encode = {
			'exp': expire,
			'sub': str(subject),
			'iat': current_time,
			'nbf': current_time,  # Not Before claim to prevent token reuse attacks
			'typ': 'access',  # Token type claim
			'aud': settings.JWT_AUDIENCE,  # Audience claim
			'jti': str(uuid.uuid4()),  # Add a unique JWT ID for tracking/revocation
		}
		encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

		# Log access token creation
		security_logger.log_token_creation('access', str(subject))
		return encoded_jwt

	def create_refresh_token(
		self, user_id: uuid.UUID, expires_delta: timedelta | None = None
	) -> str:
		"""
		Create a JWT refresh token for a user and store its hash in the database.

		Args:
			user_id: The user's ID to associate with the token
			expires_delta: Optional custom expiration time delta, defaults to settings.REFRESH_TOKEN_EXPIRE_MINUTES

		Returns:
			The refresh token string
		"""
		if expires_delta:
			expire = datetime_utcnow() + expires_delta
		else:
			expire = datetime_utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)

		# Get current time for both iat and nbf claims
		current_time = datetime_utcnow()

		# Create JWT payload for refresh token
		to_encode = {
			'exp': expire,
			'sub': str(user_id),
			'iat': current_time,
			'nbf': current_time,  # Not Before claim to prevent token reuse attacks
			'typ': 'refresh',  # Token type claim
			'aud': settings.JWT_AUDIENCE,  # Audience claim
			'jti': str(uuid.uuid4()),  # Add a unique JWT ID for tracking/revocation
		}
		# Encode using the REFRESH secret
		encoded_refresh_jwt = jwt.encode(
			to_encode, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM
		)

		# Generate a hash of the token to store in the database
		token_hash = self.hash_token(encoded_refresh_jwt)

		# Store the hash of the JWT in the database record, not the token itself
		db_refresh_token = RefreshToken(
			token=token_hash,  # Store the HASH of the JWT, not the plaintext token
			user_id=user_id,
			expires_at=expire,  # Keep DB expiry for potential cleanup/secondary checks
		)
		self.db.add(db_refresh_token)
		self.db.commit()
		self.db.refresh(db_refresh_token)

		# Log refresh token creation
		security_logger.log_token_creation('refresh', str(user_id))

		# Return the plaintext token directly
		return encoded_refresh_jwt

	# 3. Token Verification & User Retrieval Methods
	def verify_token_payload(self, token: str) -> dict:
		"""
		Verify and decode a JWT access token.

		Args:
			token: The JWT access token to verify

		Returns:
			The decoded token payload as a dictionary

		Raises:
			TokenExpiredError: If the token has expired
			InvalidTokenError: If the token is invalid
		"""
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
		"""
		Retrieve a user based on a token payload.

		Args:
			payload: The decoded JWT payload dictionary containing the user ID in the 'sub' field

		Returns:
			The User object for the token subject

		Raises:
			InvalidTokenError: If the payload is invalid or the user is not found/inactive
		"""
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
	def authenticate_user(self, email: str, password: str) -> User | AuthenticationResult | None:
		"""
		Authenticate a user with email and password.

		Args:
			email: The user's email address
			password: The user's plain text password

		Returns:
			An AuthenticationResult object containing the user and tokens if authentication is successful, None otherwise

		Note:
			This method includes rate limiting to prevent brute force attacks
		"""
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

		# Generate tokens
		access_token = self.create_access_token(subject=user.id)
		refresh_token = self.create_refresh_token(user_id=user.id)

		# Return the complete authentication result
		return AuthenticationResult(
			access_token=access_token, refresh_token=refresh_token, user=user
		)

	def refresh_access_token(self, refresh_token_str: str) -> AuthenticationResult:
		"""
		Refresh an access token using a valid refresh token, implementing token rotation.

		Args:
			refresh_token_str: The refresh token string to use for refreshing

		Returns:
			An AuthenticationResult containing the new access token, refresh token, and the user

		Raises:
			RefreshTokenExpiredError: If the refresh token has expired
			RefreshTokenInvalidError: If the refresh token is invalid
			InvalidTokenError: If the token payload is invalid
		"""
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
			security_logger.log_token_validation('refresh', False, details={'reason': 'expired'})
			raise RefreshTokenExpiredError('Refresh token has expired') from e
		except (jwt.InvalidTokenError, ValueError) as e:  # Catch decode errors and UUID errors
			security_logger.log_token_validation(
				'refresh', False, details={'reason': 'invalid_format'}
			)
			raise RefreshTokenInvalidError('Invalid refresh token') from e

		# --- Step 2: Find tokens for this user and verify the token hash ---
		# Instead of looking for exact token, we need to find tokens for this user and verify hashes
		statement = select(RefreshToken).where(RefreshToken.user_id == token_user_id)
		user_tokens = self.db.exec(statement).all()

		db_refresh_token = None
		for token in user_tokens:
			if self.verify_token_hash(refresh_token_str, token.token):
				db_refresh_token = token
				break

		if not db_refresh_token:
			# If no matching token hash found
			security_logger.log_token_validation(
				'refresh',
				False,
				user_id=token_user_id_str,
				details={'reason': 'token_not_found_in_db'},
			)
			raise RefreshTokenInvalidError('Refresh token has been invalidated')

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

		# Create a new access token
		new_access_token = self.create_access_token(subject=user_id)

		# Get the user
		user = self.db.get(User, user_id)

		return AuthenticationResult(
			access_token=new_access_token, refresh_token=new_refresh_token, user=user
		)

	# 5. Token Invalidation Methods
	def invalidate_refresh_token(self, refresh_token_str: str) -> bool:
		"""
		Invalidate a specific refresh token.

		Args:
			refresh_token_str: The refresh token string to invalidate

		Returns:
			True if the token was found and invalidated, False otherwise
		"""
		try:
			# First decode the token to get the user ID
			payload = jwt.decode(
				refresh_token_str,
				settings.JWT_REFRESH_SECRET,
				algorithms=[settings.JWT_ALGORITHM],
				audience=settings.JWT_AUDIENCE,
				options={'verify_signature': True, 'verify_aud': True},
			)

			user_id_str = payload.get('sub')
			if not user_id_str:
				return False

			user_id = uuid.UUID(user_id_str)

			# Find tokens for this user and check hashes
			statement = select(RefreshToken).where(RefreshToken.user_id == user_id)
			user_tokens = self.db.exec(statement).all()

			for token in user_tokens:
				if self.verify_token_hash(refresh_token_str, token.token):
					self.db.delete(token)
					self.db.commit()
					security_logger.log_token_invalidation(
						'refresh', user_id=user_id_str, details={'reason': 'manual_invalidation'}
					)
					return True

			return False
		except (jwt.InvalidTokenError, ValueError):
			# If the token is invalid or expired, just return False
			return False

	def invalidate_all_refresh_tokens_for_user(self, user_id: uuid.UUID) -> int:
		"""
		Invalidate all refresh tokens for a specific user.

		Args:
			user_id: The user ID whose tokens should be invalidated

		Returns:
			The number of tokens that were invalidated
		"""
		statement = select(RefreshToken).where(RefreshToken.user_id == user_id)
		tokens_to_delete = self.db.exec(statement).all()
		count = 0
		for token in tokens_to_delete:
			self.db.delete(token)
			count += 1
		if count > 0:
			self.db.commit()
		return count

	# 6. OTP Authentication Methods
	def generate_auth_code(
		self, email: str, purpose: AuthCodePurpose = AuthCodePurpose.LOGIN
	) -> str:
		"""
		Generate a random authentication code for a user and save its hash to the database.

		Args:
			email: The email address of the user
			purpose: The purpose of the authentication code

		Returns:
			The generated authentication code

		Raises:
			EmailNotRegisteredError: If no user is found with the provided email
			TooManyRequestsError: If too many code requests have been made for this email
		"""
		# Check if this email is rate limited for code generation
		is_limited, attempts_remaining = auth_rate_limiter.is_rate_limited(f'auth_code:{email}')
		if is_limited:
			security_logger.log_rate_limit_hit(
				email, 'AUTH_CODE_GENERATION', {'attempts_remaining': 0}
			)
			raise TooManyRequestsError('Too many code requests. Try again later.')

		# Find the user by email
		statement = select(User).where(User.email == email)
		user = self.db.exec(statement).first()

		if not user:
			# Record attempt for non-existent user (but don't reveal this to client)
			auth_rate_limiter.record_attempt(f'auth_code:{email}')
			security_logger.log_event(
				'AUTH_CODE_GENERATION',
				success=False,
				details={'reason': 'email_not_found', 'email': email},
			)
			raise EmailNotRegisteredError('No user found with this email address.')

		# Invalidate any existing unused auth codes for this user and purpose
		self._invalidate_existing_auth_codes(user.id, purpose)

		# Generate a random 6-digit code
		code = ''.join(random.choices(string.digits, k=6))

		# Hash the code before storing it in the database
		code_hash = self.hash_token(code)

		# Create a new auth code record with the hashed code
		auth_code = AuthCode(
			code=code_hash,  # Store the hash, not the plaintext code
			purpose=purpose,
			user_id=user.id,
		)

		self.db.add(auth_code)
		self.db.commit()

		# Record this request to rate limit future requests
		auth_rate_limiter.record_attempt(f'auth_code:{email}')

		security_logger.log_event(
			'AUTH_CODE_GENERATION',
			success=True,
			details={'user_id': str(user.id), 'purpose': purpose},
		)

		return code

	def _invalidate_existing_auth_codes(self, user_id: uuid.UUID, purpose: AuthCodePurpose) -> None:
		"""
		Invalidate all existing unused auth codes for a user with the specified purpose.

		Args:
			user_id: The user's ID
			purpose: The purpose of the authentication codes to invalidate
		"""
		statement = select(AuthCode).where(
			AuthCode.user_id == user_id,
			AuthCode.purpose == purpose,
			AuthCode.is_used == False,  # noqa: E712
		)

		existing_codes = self.db.exec(statement).all()
		for code in existing_codes:
			code.is_used = True

		if existing_codes:
			self.db.commit()

	def send_auth_code_email(
		self, email: str, purpose: AuthCodePurpose = AuthCodePurpose.LOGIN
	) -> bool:
		"""
		Generate an authentication code and send it via email.

		Args:
			email: The email address to send the code to
			purpose: The purpose of the authentication code

		Returns:
			True if the email was sent successfully, False otherwise
		"""
		try:
			# Generate a new code
			code = self.generate_auth_code(email, purpose)

			# Get user for personalization
			statement = select(User).where(User.email == email)
			user = self.db.exec(statement).first()

			# Generate email content based on purpose
			subject = 'Your Authentication Code'
			html_content, text_content = get_auth_code_email(
				user_name=user.name, code=code, expires_minutes=settings.AUTH_CODE_EXPIRE_MINUTES
			)

			if purpose == AuthCodePurpose.PASSWORD_RESET:
				subject = 'Your Password Reset Code'
				html_content, text_content = get_password_reset_email(
					user_name=user.name,
					code=code,
					expires_minutes=settings.AUTH_CODE_EXPIRE_MINUTES,
				)

			# Send the email
			success = self.email_service.send_email(
				to_email=email,
				subject=subject,
				html_content=html_content,
				text_content=text_content,
			)

			if success:
				security_logger.log_event(
					'AUTH_CODE_EMAIL_SENT',
					success=True,
					details={'user_id': str(user.id), 'purpose': purpose},
				)
			else:
				security_logger.log_event(
					'AUTH_CODE_EMAIL_SENT',
					success=False,
					details={
						'user_id': str(user.id),
						'purpose': purpose,
						'reason': 'email_send_failed',
					},
				)

			return success

		except (EmailNotRegisteredError, TooManyRequestsError) as e:
			# Don't reveal to the client whether the email exists or not for security
			security_logger.log_event(
				'AUTH_CODE_EMAIL_SENT', success=False, details={'email': email, 'reason': str(e)}
			)
			# Re-raise the exception for the API layer to handle
			raise

	def verify_auth_code(
		self, email: str, code: str, purpose: AuthCodePurpose = AuthCodePurpose.LOGIN
	) -> User:
		"""
		Verify an authentication code and return the associated user if valid.

		Args:
			email: The email address associated with the code
			code: The authentication code to verify
			purpose: The purpose of the authentication code

		Returns:
			The User object associated with the verified code

		Raises:
			AuthCodeInvalidError: If the code is invalid
			AuthCodeExpiredError: If the code has expired
			AuthCodeUsedError: If the code has already been used
		"""
		# Find the user by email
		statement = select(User).where(User.email == email)
		user = self.db.exec(statement).first()

		if not user:
			security_logger.log_event(
				'AUTH_CODE_VERIFICATION',
				success=False,
				details={'reason': 'user_not_found', 'email': email},
			)
			raise AuthCodeInvalidError('Invalid authentication code.')

		# Find all auth codes for this user and purpose
		statement = select(AuthCode).where(
			AuthCode.user_id == user.id,
			AuthCode.purpose == purpose,
			AuthCode.is_used == False,  # noqa: E712
		)

		auth_codes = self.db.exec(statement).all()

		# Use constant-time comparison through our hash verification
		matching_code = None
		for auth_code in auth_codes:
			if self.verify_token_hash(code, auth_code.code):
				matching_code = auth_code
				break

		if not matching_code:
			security_logger.log_event(
				'AUTH_CODE_VERIFICATION',
				success=False,
				details={'reason': 'code_not_found', 'user_id': str(user.id)},
			)
			raise AuthCodeInvalidError('Invalid authentication code.')

		# Check if the code has expired
		current_time = datetime_utcnow()
		if matching_code.expires_at < current_time:
			matching_code.is_used = True
			self.db.commit()

			security_logger.log_event(
				'AUTH_CODE_VERIFICATION',
				success=False,
				details={'reason': 'code_expired', 'user_id': str(user.id)},
			)
			raise AuthCodeExpiredError('Authentication code has expired.')

		# Mark the code as used
		matching_code.is_used = True
		self.db.commit()

		security_logger.log_event(
			'AUTH_CODE_VERIFICATION',
			success=True,
			details={'user_id': str(user.id), 'purpose': purpose},
		)

		return user

	def authenticate_with_auth_code(self, email: str, code: str) -> AuthenticationResult:
		"""
		Authenticate a user with an email and authentication code.

		Args:
			email: The user's email address
			code: The authentication code

		Returns:
			An AuthenticationResult object containing user, access token and refresh token

		Raises:
			AuthCodeInvalidError: If the code is invalid
			AuthCodeExpiredError: If the code has expired
			AuthCodeUsedError: If the code has already been used
		"""
		# Verify the authentication code
		user = self.verify_auth_code(email, code)

		# Generate tokens
		access_token = self.create_access_token(subject=user.id)
		refresh_token = self.create_refresh_token(user_id=user.id)

		security_logger.log_event(
			'AUTH_CODE_LOGIN', success=True, details={'user_id': str(user.id)}
		)

		# Return the complete authentication result
		return AuthenticationResult(
			access_token=access_token, refresh_token=refresh_token, user=user
		)
