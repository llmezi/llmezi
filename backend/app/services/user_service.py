from sqlmodel import Session, select

from app.models.user import User
from app.services.auth_service import AuthService
from app.services.exceptions import InvalidPasswordError, UserAlreadyExistsError
from app.utils.password_validator import validate_password


class UserService:
	def __init__(self, db: Session):
		"""
		Initialize the user service.

		Args:
		    db: The database session to use for database operations
		"""
		self.db = db
		self.auth_service = AuthService(db)

	def is_first_admin_created(self) -> bool:
		"""
		Check if the first admin user has already been created.

		Returns:
			bool: True if any user exists in the system, False otherwise
		"""
		statement = select(User)
		existing_user = self.db.exec(statement).first()
		return existing_user is not None

	def create_first_admin(self, name: str, email: str, password: str) -> tuple[User, str, str]:
		"""
		Create the first admin user in the system, only if no users exist.

		Args:
		    name: The name of the admin user
		    email: The email of the admin user
		    password: The plain text password for the admin user

		Returns:
		    A tuple containing the created User, access token, and refresh token

		Raises:
		    UserAlreadyExistsError: If any user already exists in the system
		    InvalidPasswordError: If the password doesn't meet security requirements
		"""
		# Check if any users exist
		statement = select(User)
		existing_user = self.db.exec(statement).first()

		if existing_user:
			raise UserAlreadyExistsError(
				'Admin cannot be registered: users already exist in the system'
			)

		# Validate password against security requirements
		is_valid, error_messages = validate_password(password)
		if not is_valid:
			raise InvalidPasswordError(f'Password validation failed: {", ".join(error_messages)}')

		# Hash the password
		hashed_password = self.auth_service.get_password_hash(password)

		# Create the user with admin privileges
		user = User(name=name, email=email, password=hashed_password, is_admin=True)

		self.db.add(user)
		self.db.commit()
		self.db.refresh(user)

		# Generate tokens for auto login
		access_token = self.auth_service.create_access_token(subject=user.id)
		refresh_token = self.auth_service.create_refresh_token(user_id=user.id)

		return user, access_token, refresh_token
